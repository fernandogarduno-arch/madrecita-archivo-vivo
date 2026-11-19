import {API_BASE} from './config.js';
import {housePhoto,houseCaption,newImageLabel,resolvePublicPhoto} from '../archivo/foto-publica.js';

import {readLabel} from './etiqueta.js';
import {studioPhoto} from './estudio.js';
import {tableJournal} from './mesa.js';
const $ = id => document.getElementById(id);
const form = $('bottle-form');
const editor = $('editor');
const PAGE_SIZE = 18;
const FIELDS = ['brand', 'model', 'category', 'producer', 'place', 'region', 'origin', 'acquisition', 'acquiredOn', 'source', 'notes', 'nom','agave','volume','comments','price','shelf'];
const count = n => new Intl.NumberFormat('es-MX').format(n);
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const state = {token:'', records:[], regions:[], filter:'all', page:0, record:null, requestId:'', photo:null, photoTask:0, resizing:false, dirty:false, busy:false, stale:false, historyTask:0};

let directory;
let lastSuggestion={};
const regionsByTown=new Map();
let suggestedRegion='';
let sourceFile;
const journal=tableJournal({api,records:()=>state.records});
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
  journal.clear(); directory=null; sourceFile=null;
  state.token = ''; state.records = []; state.regions = []; state.record = null;
  state.photo = null; state.dirty = false; state.busy = false; state.stale = false;
  state.photoTask++; state.historyTask++; state.resizing = false;
  if ($('confirm-state').open) $('confirm-state').close();
  if (editor.open) editor.close();
  form.reset();
  for (const id of ['bottles','brands','categories','family-distillery-list','family-distillery-count','nom-options','places','producers','shelves','volumes','history','photo-preview','region','folio','summary','count','page','editor-title','confirm-description']) $(id).replaceChildren();
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

let archiveImages;
async function loadArchiveImages() {
  if (archiveImages) return;
  try {
    const response = await fetch(new URL('../archivo/datos/catalogo.json', import.meta.url));
    if (response.ok) {
      const catalog = await response.json();
      archiveImages = new Map(catalog.records.map(r => [r.id, r.photos]));
    }
  } catch { /* Se puede editar usando la foto del servicio aunque falle el catálogo. */ }
}
function picture(container, url, id) {
  const image = node('img'), label = node('small','Referencia');
  const photos = archiveImages?.get(id) || [];
  const archive = photos.map(resolvePublicPhoto);
  const urls = [...new Set((url && !url.startsWith('https://raw.githubusercontent.com/') ? [url,...archive] : [...archive,url]).filter(Boolean))];
  image.loading = 'lazy';
  container.replaceChildren(image, label);
  function next() {
    const src = urls.shift();
    const fresh = src && photos.some((photo,i) => photo.newImage && archive[i] === src);
    label.hidden = Boolean(src) && !fresh;
    label.textContent = fresh ? newImageLabel : 'Referencia';
    image.alt = src ? 'Fotografía de la colección' : houseCaption;
    image.onerror = src ? next : null;
    image.src = src || housePhoto;
  }
  next();
}

function regionName(slug) {
  return state.regions.find(region=>region.slug===slug)?.name || slug || '';
}
function displayName(record) {
  return [record.brand,record.model].filter((s,i,a)=>s && a.indexOf(s)===i).join(' · ') || record.id;
}
function stateBadge(active) {
  return node('span',active ? 'En exhibición' : 'Inactiva',active ? 'badge' : 'badge inactive');
}
function option(value, label) {
  return new Option(label,value);
}

async function refresh() {
  const currentToken = state.token;
  const [data,nomDirectory] = await Promise.all([api('/api/admin'),api('/api/admin/nom'),loadArchiveImages()]);
  if (!currentToken || state.token !== currentToken) return;
  if (!Array.isArray(data.records) || !Array.isArray(data.regions)) throw new Error('El servicio no devolvió el inventario completo.');
  directory=nomDirectory;
  state.regions = data.regions;
  state.records = data.records;
  regionsByTown.clear();
  function learn(place,region) {
    if (!place || !region) return;
    const key=normalize(place).trim(),seen=regionsByTown.get(key);
    regionsByTown.set(key,seen===undefined || seen===region?region:null);
  }
  for(const candidates of Object.values(directory.entries)) for(const r of candidates) learn(r.place,r.region);
  for(const r of state.records) if(r.version===0 && r.state==='Jalisco') learn(r.place,r.region);
  updateOptions();
  render();
  void journal.load();
}

function updateOptions() {
  for (const [id, field] of [['brands','brand'],['producers','producer'],['places','place'],['shelves','shelf'],['volumes','volume']]) {
    const values = [...new Set(state.records.map(row=>row[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    $(id).replaceChildren(...values.map(v=>option(v,v)));
  }
  const classes=[...new Set(['Blanco','Joven','Reposado','Añejo','Extra añejo',...state.records.map(r=>r.category).filter(Boolean)])];
  $('categories').replaceChildren(option('','Por documentar'),...classes.map(v=>option(v,v)));
  $('nom-options').replaceChildren(...Object.keys(directory.entries).map(v=>option(v,v)));
  journal.options();
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
    const haystack = normalize([row.id,row.brand,row.model,row.category,row.producer,row.place,regionName(row.region),row.origin,row.shelf,row.nom].join(' '));
    return terms.every(term=>haystack.includes(term));
  });
  const pages = Math.max(1, Math.ceil(rows.length/PAGE_SIZE));
  state.page = Math.min(state.page,pages-1);
  const active = state.records.filter(row=>row.active).length;
  $('summary').textContent = count(state.records.length)+' botellas en la colección · '+count(active)+' en exhibición · '+count(state.records.length-active)+' inactivas';
  $('count').textContent = count(rows.length)+' '+(rows.length===1?'resultado':'resultados');
  $('page').textContent = (state.page+1)+' / '+pages;
  $('previous').disabled = !state.page; $('next').disabled = state.page+1>=pages;
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===state.filter)));
  const list = $('bottles'); list.replaceChildren();
  for (const row of rows.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE)) {
    const b = node('button',null,'entry'); b.type='button'; b.dataset.id=row.id;
    b.setAttribute('aria-label','Editar '+displayName(row)+' · '+row.id);
    const thumb = node('span',null,'thumb'); picture(thumb,safePhoto(row.photo),row.id);
    const info = node('span'); info.append(node('span',row.id,'meta'),node('strong',displayName(row)));
    if (row.category) info.append(node('small',row.category));
    if (row.shelf) info.append(node('small','Repisa · '+row.shelf));
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
  sourceFile=null; lastSuggestion={}; suggestedRegion=''; $('photo-preview').dataset.finish=record?.photoFinish || 'original';
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
  $('region-hint').textContent='';
  form.elements.brand.required=!record?.model;
  $('photo-finish').value=record?.photoFinish || 'white';
  const oldMatch=directory?.entries[record?.nom];
  if (oldMatch?.length===1) lastSuggestion=oldMatch[0];
  describeNom(false);
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
  status('edit-status'); status('photo-status'); picture($('photo-preview'),safePhoto(record?.photo),record?.id);
  syncButtons();
  if (!editor.open) editor.showModal();
  const related=/^\d{4}$/.test(record?.nom||'')?state.records.filter(r=>r.nom===record.nom):[];
  $('family-distillery').hidden=!related.length;
  $('family-distillery-count').textContent=count(related.length)+' en la colección con este NOM';
  $('family-distillery-list').replaceChildren(...related.map(row=>{
    const li=node('li'),button=node('button',displayName(row)+' · '+row.id+' · '+(row.active?'En exhibición':'En reserva'),'inline-link');
    button.type='button';button.disabled=row.id===record.id;button.onclick=()=>{if (!state.dirty || confirm('¿Descartar los cambios y abrir la otra pieza?')) openEditor(row);};li.append(button);return li;
  }));
  if (focus) form.elements.brand.focus({preventScroll:true});
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
  sourceFile=null;
  form.reset(); $('photo-preview').replaceChildren(); $('history').replaceChildren();
});
form.addEventListener('input',()=>{state.dirty=true;syncButtons()});
form.addEventListener('change',()=>{state.dirty=true;syncButtons()});

function describeNom(apply) {
  const matches=directory?.entries[form.elements.nom.value.trim()] || [];
  const entry=matches.length===1 ? matches[0] : null;
  if (apply) {
    for (const field of ['producer','place','region']) {
      const input=form.elements[field];
      if (!input.value || input.value===lastSuggestion[field]) input.value=entry?.[field] || '';
    }
    lastSuggestion=entry || {};
  }
  const box=$('nom-status');box.replaceChildren();
  if (!form.elements.nom.value.trim()) return;
  const note=entry ? entry.producer+(entry.place?' · Región sugerida por el domicilio registrado en '+entry.place+'. Confirma la planta con la etiqueta.':'') :
    matches.length?'Hay varias coincidencias. Coteja el productor y la localidad con la etiqueta.':'Sin coincidencia en este corte. Se conservará como NOM consignado.';
  box.append(note+' · ');
  const link=node('a','Directorio CRT · '+directory.date);link.href=directory.source;link.target='_blank';link.rel='noopener';box.append(link);
  if (entry && ['producer','place','region'].some(k=>entry[k] && form.elements[k].value!==entry[k])) {
    const use=node('button','Usar datos del directorio','inline-link');use.type='button';use.onclick=()=>{for(const field of ['producer','place','region']) if (entry[field]) form.elements[field].value=entry[field];lastSuggestion=entry;state.dirty=true;describeNom(false);syncButtons();};box.append(' ',use);
  }
}
form.elements.place.addEventListener('input',()=>{
  const region=regionsByTown.get(normalize(form.elements.place.value).trim()) || '';
  if (!form.elements.region.value || form.elements.region.value===suggestedRegion) {
    form.elements.region.value=region;suggestedRegion=region;
  }
  $('region-hint').textContent=region?'El atlas vincula esta localidad con '+regionName(region)+'.':'';
});
form.elements.region.addEventListener('change',()=>{suggestedRegion='';});
form.elements.nom.addEventListener('input',()=>describeNom(true));
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

async function preparePhoto(file) {
  if (!file) return;
  sourceFile=file;
  state.photo=null;
  const task=++state.photoTask; state.resizing=true; state.dirty=true;
  syncButtons(); status('photo-status','Preparando fotografía…');
  try {
    const original=await resizePhoto(file);
    if (task!==state.photoTask || !editor.open) return;
    const finish=$('photo-finish').value;
    let photo=original, notice='Fotografía lista. Se subirá al guardar la ficha.';
    let reading='';
    if (!form.elements.nom.value.trim()) {
      status('photo-status','Buscando el NOM en la etiqueta…');
      const candidate=await readLabel(file,original);
      if (task!==state.photoTask || !editor.open) return;
      if (candidate && !form.elements.nom.value.trim()) {
        form.elements.nom.value=candidate;describeNom(true);
        reading=' La etiqueta parece indicar NOM '+candidate+'. Confírmalo antes de guardar.';
      } else if (!form.elements.nom.value.trim()) reading=' Puedes escribir el NOM si está en la contraetiqueta.';
    }
    if (finish!=='original') {
      status('photo-status','Recortando la botella en este dispositivo…');
      try {photo=await studioPhoto(original);}
      catch {notice='No se pudo completar el recorte. Revisa la foto original antes de guardar.';}
    }
    if (task!==state.photoTask || !editor.open) return;
    $('photo-preview').dataset.finish=photo.startsWith('data:image/webp')?finish:'original';
    state.photo=photo; picture($('photo-preview'),photo); $('undo-photo').hidden=false; status('photo-status',notice+reading);
  } catch(e) {
    if (task===state.photoTask) { status('photo-status',e.message,true); $('file').value=''; }
  } finally {
    if (task===state.photoTask) { state.resizing=false; syncButtons(); }
  }
}
for (const id of ['file','camera']) $(id).onchange=()=>preparePhoto($(id).files[0]);
$('photo-finish').onchange=()=>preparePhoto(sourceFile);
$('undo-photo').onclick=()=>{
  sourceFile=null; $('camera').value=''; state.photoTask++; state.photo=null; state.resizing=false; $('file').value=''; $('undo-photo').hidden=true;
  $('photo-preview').dataset.finish=state.record?.photoFinish || 'original';picture($('photo-preview'),safePhoto(state.record?.photo),state.record?.id); status('photo-status'); syncButtons();
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
  if (state.photo) {payload.image=state.photo;payload.photoFinish=state.photo.startsWith('data:image/webp') ? $('photo-finish').value : 'original';}
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
const fieldLabels={brand:'marca',nom:'NOM',agave:'agave',volume:'volumen',price:'precio de compra',comments:'comentarios',shelf:'repisa',model:'presentación',category:'clasificación',producer:'productor',place:'localidad',region:'región',origin:'origen',acquisition:'forma de adquisición',acquiredOn:'fecha de adquisición',source:'procedencia privada',notes:'notas privadas',photo:'fotografía',image:'fotografía',active:'estado'};
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
    const wanted=new URLSearchParams(location.search).get('pieza');
    let term='';try{term=sessionStorage.getItem('retana-busqueda-inventario')||'';sessionStorage.removeItem('retana-busqueda-inventario');}catch{}
    if (wanted || term) {$('search').value=wanted || term;render();}
    const piece=wanted && state.records.find(r=>r.id===wanted);
    if (piece) {openEditor(piece,false);form.elements.shelf.focus();}
    else if (location.hash==='#memorias') $('memorias').scrollIntoView();
    else $('search').focus();
    status('login-status');
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
