import {API_BASE} from './config.js';

const $ = id => document.getElementById(id);
const form = $('bottle-form');
const editor = $('editor');
const PAGE_SIZE = 18;
const FIELDS = ['brand', 'model', 'category', 'producer', 'place', 'region', 'origin', 'acquisition', 'acquiredOn', 'source', 'notes'];
const count = n => new Intl.NumberFormat('es-MX').format(n);
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const state = {token:'', records:[], regions:[], filter:'all', page:0, record:null, requestId:'', photo:null, photoTask:0, resizing:false, dirty:false, busy:false, stale:false, historyTask:0};

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function status(id, message='', error=false) {
  const target = $(id);
  target.textContent = message;
  target.classList.toggle('error', error);
}

async function api(path, method='GET', payload) {
  const headers = {Accept:'application/json'};
  if (state.token) headers.Authorization = 'Bearer ' + state.token;
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(String(API_BASE).replace(/\/$/, '') + path, {
      method, headers, credentials:'omit', cache:'no-store',
      body:payload === undefined ? undefined : JSON.stringify(payload)
    });
  } catch {
    throw new Error('No se pudo conectar con la colección. Comprueba tu conexión y vuelve a intentarlo.');
  }
  const result = await response.json().catch(()=>({}));
  if (!response.ok) {
    const fallback = response.status === 429 ? 'Demasiados intentos. Espera unos minutos antes de volver a entrar.' : 'No se pudo completar la solicitud.';
    const error = new Error(typeof result.error === 'string' ? result.error : fallback);
    error.status = response.status;
    if (response.status === 401 && path !== '/api/login' && path !== '/api/logout') {
      closeSession('La sesión ha vencido. Vuelve a entrar para continuar.');
    }
    throw error;
  }
  return result;
}

function closeSession(message='') {
  state.token = ''; state.records = []; state.regions = []; state.record = null;
  state.photo = null; state.dirty = false; state.busy = false; state.stale = false;
  state.photoTask++; state.historyTask++; state.resizing = false;
  if ($('confirm-state').open) $('confirm-state').close();
  if (editor.open) editor.close();
  form.reset();
  for (const id of ['bottles','brands','categories','history','photo-preview','region','folio','summary','count','page','editor-title','confirm-description']) $(id).replaceChildren();
  $('password').value = ''; $('password').type = 'password';
  $('reveal-password').textContent = 'Mostrar'; $('reveal-password').setAttribute('aria-label','Mostrar contraseña'); $('reveal-password').setAttribute('aria-pressed','false');
  $('collection').hidden = true; $('login-panel').hidden = false; $('logout').hidden = true;
  $('search').value = ''; state.filter = 'all'; state.page = 0;
  $('list-region').value = ''; $('list-acquisition').value = '';
  status('login-status',message); status('main-status'); syncButtons();
  $('password').focus();
}

function safePhoto(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    const base = API_BASE && value.startsWith('/') ? API_BASE : new URL('../',location.href).href;
    const url = new URL(value,base);
    return ['https:','http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function picture(container, url, empty='Sin foto') {
  container.replaceChildren();
  if (!url) { container.append(document.createTextNode(empty)); return; }
  const image = node('img');
  image.alt = ''; image.loading = 'lazy'; image.src = url;
  image.addEventListener('error',()=>container.replaceChildren(document.createTextNode('Foto no disponible')),{once:true});
  container.append(image);
}

function regionName(slug) {
  return state.regions.find(region=>region.slug===slug)?.name || slug || '';
}
function displayName(record) {
  return record.model || record.brand || record.id;
}
function stateBadge(active) {
  return node('span',active ? 'En exhibición' : 'Inactiva',active ? 'badge' : 'badge inactive');
}
function option(value, label) {
  return new Option(label,value);
}

async function refresh() {
  const currentToken = state.token;
  const data = await api('/api/admin');
  if (!currentToken || state.token !== currentToken) return;
  if (!Array.isArray(data.records) || !Array.isArray(data.regions)) throw new Error('El servicio no devolvió el inventario completo.');
  state.regions = data.regions;
  state.records = data.records;
  updateOptions();
  render();
}

function updateOptions() {
  for (const [id, field] of [['brands','brand'],['categories','category']]) {
    const values = [...new Set(state.records.map(row=>row[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    $(id).replaceChildren(...values.map(v=>option(v,v)));
  }
  $('region').replaceChildren(option('','Por documentar / no aplica'), ...state.regions.map(r=>option(r.slug,r.name)));
  const selectedRegion = $('list-region').value;
  $('list-region').replaceChildren(option('','Todas las regiones'), ...state.regions.map(r=>option(r.slug,r.name)), option('__other','Otros'));
  $('list-region').value = selectedRegion;
  const selectedAcquisition = $('list-acquisition').value;
  $('list-acquisition').replaceChildren(option('','Todas las formas'), ...Array.from(form.elements.acquisition.options,o=>option(o.value,o.text)));
  $('list-acquisition').value = selectedAcquisition;
}

function render() {
  const terms = normalize($('search').value).trim().split(/\s+/).filter(Boolean);
  const region = $('list-region').value;
  const acquisition = $('list-acquisition').value;
  const rows = state.records.filter(row=>{
    if (state.filter !== 'all' && Boolean(row.active) !== (state.filter === 'active')) return false;
    if (region && region !== (row.region || '__other')) return false;
    if (acquisition && acquisition !== (row.acquisition || 'desconocido')) return false;
    const haystack = normalize([row.id,row.brand,row.model,row.category,row.producer,row.place,regionName(row.region),row.origin].join(' '));
    return terms.every(term=>haystack.includes(term));
  });
  const pages = Math.max(1, Math.ceil(rows.length/PAGE_SIZE));
  state.page = Math.min(state.page,pages-1);
  const active = state.records.filter(row=>row.active).length;
  $('summary').textContent = count(state.records.length)+' fichas · '+count(active)+' en exhibición · '+count(state.records.length-active)+' inactivas';
  $('count').textContent = count(rows.length)+' '+(rows.length===1?'resultado':'resultados');
  $('page').textContent = (state.page+1)+' / '+pages;
  $('previous').disabled = !state.page; $('next').disabled = state.page+1>=pages;
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===state.filter)));
  const list = $('bottles'); list.replaceChildren();
  for (const row of rows.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE)) {
    const b = node('button',null,'entry'); b.type='button'; b.dataset.id=row.id;
    b.setAttribute('aria-label','Editar '+displayName(row)+' · '+row.id);
    const thumb = node('span',null,'thumb'); picture(thumb,safePhoto(row.photo));
    const info = node('span'); info.append(node('span',row.id,'meta'),node('strong',displayName(row)));
    info.append(node('small',[row.brand===row.model?'':row.brand,row.category].filter(Boolean).join(' · ')));
    b.append(thumb,info,node('span',[row.place,regionName(row.region)].filter(Boolean).join(' · '),'location'),stateBadge(row.active));
    b.onclick=()=>openEditor(row);
    list.append(b);
  }
  if (!rows.length) list.append(node('p','Ninguna botella coincide con esta búsqueda.','muted'));
}

function syncButtons() {
  $('save').disabled = state.busy || state.resizing || state.stale;
  $('change-state').disabled = state.busy || state.resizing || state.dirty || state.stale;
  $('close-editor').disabled = state.busy;
  editor.querySelector('.editor-scroll').inert = state.busy;
}

function openEditor(record=null, focus=true) {
  state.record = record; state.photo = null; state.photoTask++; state.historyTask++;
  state.dirty = false; state.resizing = false; state.stale=false; state.busy=false;
  state.requestId = record ? '' : crypto.randomUUID();
  form.reset();
  for (const field of FIELDS) {
    const control = form.elements.namedItem(field);
    const value = record?.[field] || (field==='acquisition' ? 'desconocido' : '');
    if (control.tagName==='SELECT' && value && ![...control.options].some(o=>o.value===value)) control.add(option(value,value));
    control.value = value;
  }
  form.elements.active.checked = record ? Boolean(record.active) : true;
  $('folio').textContent = record ? record.id+' · versión '+record.version : 'Alta de colección';
  $('editor-title').textContent = record ? displayName(record) : 'Registrar botella';
  $('save').textContent = record ? 'Guardar cambios' : 'Registrar botella';
  $('existing-state').hidden = !record; $('new-state').hidden = !!record;
  $('history-section').hidden = !record;
  $('history').replaceChildren(); $('history').hidden = true; $('view-history').setAttribute('aria-expanded','false'); $('view-history').textContent='Ver historial';
  if (record) {
    $('current-state').replaceChildren(stateBadge(record.active));
    $('change-state').textContent = record.active ? 'Desactivar botella' : 'Reactivar botella';
  }
  $('undo-photo').hidden=true; $('refresh-record').hidden=true;
  status('edit-status'); status('photo-status'); picture($('photo-preview'),safePhoto(record?.photo));
  syncButtons();
  if (!editor.open) editor.showModal();
  if (focus) form.elements.model.focus({preventScroll:true});
}

function closeEditor() {
  if (state.busy) return;
  if (state.dirty && !window.confirm('¿Cerrar la ficha y descartar los cambios sin guardar?')) return;
  editor.close();
}

editor.addEventListener('cancel',event=>{event.preventDefault();closeEditor()});
$('close-editor').onclick=closeEditor;
editor.addEventListener('close',()=>{
  state.record=null; state.photo=null; state.dirty=false; state.photoTask++; state.historyTask++;
  form.reset(); $('photo-preview').replaceChildren(); $('history').replaceChildren();
});
form.addEventListener('input',()=>{state.dirty=true;syncButtons()});
form.addEventListener('change',()=>{state.dirty=true;syncButtons()});

async function resizePhoto(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Elige una foto JPG, PNG o WebP.');
  if (file.size>12*1024*1024) throw new Error('La foto supera 12 MB. Elige una versión de menor tamaño.');
  const url=URL.createObjectURL(file);
  try {
    const image=new Image(); image.src=url;
    try { await image.decode(); } catch { throw new Error('No se pudo leer esta imagen. Elige otra foto.'); }
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('La imagen no tiene dimensiones válidas.');
    let edge=1200;
    for (let attempt=0;attempt<4;attempt++) {
      const ratio=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio)); canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
      const ctx=canvas.getContext('2d'); if (!ctx) throw new Error('El navegador no pudo preparar la fotografía.');
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const result=canvas.toDataURL('image/jpeg',.84-attempt*.07);
      if (result.startsWith('data:image/jpeg;base64,') && (result.length-23)*.75 <= 480*1024) return result;
      edge=Math.round(edge*.76);
    }
    throw new Error('La foto sigue siendo demasiado grande. Prueba con una imagen más pequeña.');
  } finally { URL.revokeObjectURL(url); }
}

$('file').onchange=async()=>{
  const file=$('file').files[0]; if (!file) return;
  const task=++state.photoTask; state.resizing=true; state.dirty=true;
  syncButtons(); status('photo-status','Preparando fotografía…');
  try {
    const photo=await resizePhoto(file);
    if (task!==state.photoTask || !editor.open) return;
    state.photo=photo; picture($('photo-preview'),photo); $('undo-photo').hidden=false; status('photo-status','Fotografía lista para guardar.');
  } catch(e) {
    if (task===state.photoTask) { status('photo-status',e.message,true); $('file').value=''; }
  } finally {
    if (task===state.photoTask) { state.resizing=false; syncButtons(); }
  }
};
$('undo-photo').onclick=()=>{
  state.photoTask++; state.photo=null; state.resizing=false; $('file').value=''; $('undo-photo').hidden=true;
  picture($('photo-preview'),safePhoto(state.record?.photo)); status('photo-status'); syncButtons();
};

function replaceRecord(record) {
  if (!record?.id) throw new Error('El servicio no confirmó la ficha. Actualiza el inventario antes de repetir.');
  const i=state.records.findIndex(row=>row.id===record.id);
  if (i<0) state.records.unshift(record);
  else state.records[i]=record;
  updateOptions(); render();
}

function handleWriteError(error) {
  if (!state.token) return;
  if (error.status===409) {
    state.stale=true; $('refresh-record').hidden=false;
    status('edit-status','Otra sesión cambió esta ficha. Carga la versión actual antes de editarla de nuevo.',true);
  } else { status('edit-status',error.message,true); }
}

$('refresh-record').onclick=async()=>{
  if (state.dirty && !window.confirm('¿Descartar este borrador y cargar la ficha actual?')) return;
  const id=state.record?.id;
  try {
    await refresh();
    const row=state.records.find(r=>r.id===id);
    if (row && state.token) openEditor(row);
  } catch(e) { status('edit-status',e.message,true); }
};

form.onsubmit=async event=>{
  event.preventDefault();
  if (state.busy || state.resizing || state.stale || !form.reportValidity()) return;
  const record=state.record;
  const payload = record ? {version:record.version} : {requestId:state.requestId,active:form.elements.active.checked};
  for (const field of FIELDS) {
    const value=form.elements.namedItem(field).value.trim();
    if (!record || value!==(record[field]||'')) payload[field]=value;
  }
  if (state.photo) payload.image=state.photo;
  if (record && Object.keys(payload).length===1) { status('edit-status','La ficha ya está actualizada.'); return; }
  state.busy=true;syncButtons();status('edit-status','Guardando…');
  try {
    const result=await api(record?'/api/bottles/'+encodeURIComponent(record.id):'/api/bottles',record?'PATCH':'POST',payload);
    replaceRecord(result.record);state.dirty=false;editor.close();
    status('main-status',(record?'Cambios guardados en ':'Botella registrada con folio ')+result.record.id+'.');
  } catch(e) { handleWriteError(e); }
  finally { state.busy=false;syncButtons(); }
};

$('change-state').onclick=()=>{
  const r=state.record;if (!r||state.dirty||state.busy||state.stale) return;
  $('confirm-title').textContent=r.active?'Desactivar botella':'Reactivar botella';
  $('confirm-description').textContent=r.active?displayName(r)+' saldrá de exhibición y se conservará en el inventario.':displayName(r)+' volverá a exhibirse en el museo.';
  $('accept-state').textContent=r.active?'Desactivar':'Reactivar'; $('confirm-state').showModal();
};
$('cancel-state').onclick=()=>$('confirm-state').close();
$('accept-state').onclick=async()=>{
  const r=state.record; if (!r||state.busy) return;
  $('confirm-state').close(); state.busy=true;syncButtons();status('edit-status','Actualizando estado…');
  try {
    const data=await api('/api/bottles/'+encodeURIComponent(r.id),'PATCH',{version:r.version,active:!r.active});
    replaceRecord(data.record);openEditor(data.record,false);
    status('edit-status',data.record.active?'La pieza está en exhibición.':'La pieza quedó inactiva.');
  } catch(e) {handleWriteError(e)}
  finally {state.busy=false;syncButtons()}
};

const actionLabels={create:'Alta',created:'Alta',update:'Edición',updated:'Edición',activate:'Reactivación',reactivate:'Reactivación',activated:'Reactivación',deactivate:'Desactivación',deactivated:'Desactivación',import:'Registro de archivo'};
const fieldLabels={brand:'marca',model:'modelo o nombre',category:'clasificación',producer:'productor',place:'localidad',region:'región',origin:'origen',acquisition:'forma de adquisición',acquiredOn:'fecha de adquisición',source:'procedencia privada',notes:'notas privadas',photo:'fotografía',image:'fotografía',active:'estado'};
function historyDate(value) {
  const date=new Date(value);return Number.isNaN(+date)?String(value||''):date.toLocaleString('es-MX');
}
$('view-history').onclick=async()=>{
  const r=state.record;
  if (!r) return;
  const panel=$('history'),task=++state.historyTask;
  if (!panel.hidden) {panel.hidden=true;$('view-history').setAttribute('aria-expanded','false');$('view-history').textContent='Ver historial';return}
  panel.hidden=false; $('view-history').setAttribute('aria-expanded','true'); $('view-history').textContent='Ocultar historial'; panel.textContent='Consultando historial…';
  try {
    const data=await api('/api/bottles/'+encodeURIComponent(r.id)+'/history');
    if (state.historyTask!==task||!state.token) return;
    panel.replaceChildren();
    for (const item of data.history || []) {
      const entry=node('article'); entry.append(node('strong',(actionLabels[item.action]||item.action||'Movimiento')+' · versión '+item.version));
      entry.append(node('span',historyDate(item.at),'muted'));
      if (Array.isArray(item.changes)&&item.changes.length) entry.append(node('span',item.changes.map(k=>fieldLabels[k]||k).join(', ')));
      panel.append(entry);
    }
    if (!panel.childNodes.length) panel.textContent='Esta ficha todavía no tiene movimientos de administración.';
  } catch(e) { if (state.historyTask===task&&state.token) panel.textContent=e.message; }
};

$('login-form').onsubmit=async event=>{
  event.preventDefault();
  if ($('login-submit').disabled) return;
  $('login-submit').disabled=true; status('login-status','Abriendo el inventario…');
  try {
    const {token}=await api('/api/login','POST',{password:$('password').value});
    if (typeof token!=='string' || !token) throw new Error('No se pudo iniciar sesión.');
    state.token=token; $('password').value=''; await refresh();
    if (!state.token) return;
    $('login-panel').hidden=true; $('collection').hidden=false; $('logout').hidden=false;
    $('search').focus(); status('login-status');
  } catch(e) {
    if (state.token) { await api('/api/logout','POST').catch(()=>{}); state.token=''; }
    status('login-status',e.message,true);
  } finally { $('login-submit').disabled=false; }
};
$('reveal-password').onclick=()=>{
  const input=$('password'),show=input.type==='password';input.type=show?'text':'password';
  $('reveal-password').textContent=show?'Ocultar':'Mostrar';
  $('reveal-password').setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');
  $('reveal-password').setAttribute('aria-pressed',String(show));
};
$('logout').onclick=async()=>{
  if (state.busy || (state.dirty&&!window.confirm('¿Salir y descartar los cambios sin guardar?'))) return;
  $('logout').disabled=true;
  try {await api('/api/logout','POST'); closeSession('Sesión cerrada.');}
  catch{closeSession('Sesión cerrada en este dispositivo. El servicio no confirmó su cierre remoto.');}
  finally{$('logout').disabled=false}
};
$('add-bottle').onclick=()=>openEditor();
$('search').oninput=()=>{state.page=0;render()};
for (const id of ['list-region','list-acquisition']) $(id).onchange=()=>{state.page=0;render()};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;state.page=0;render()});
for (const [id,delta] of [['previous',-1],['next',1]]) $(id).onclick=()=>{state.page+=delta;render();document.querySelector('.list-heading').scrollIntoView({block:'start'})};
