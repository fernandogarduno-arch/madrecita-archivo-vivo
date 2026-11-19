import {loadPublicCollection} from '../archivo/coleccion-viva.js';
import {showRecordImage} from '../archivo/foto-publica.js';
import {distinction, distinctionNote, settings} from '../archivo/curaduria.js';

const byId = id => document.getElementById(id);
function element(tag, value) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  return node;
}
function link(title, href) {
  const anchor = element('a', title);
  anchor.href = href;
  return anchor;
}
const passport = r => '../archivo/?pieza='+encodeURIComponent(r.id);
import {modelCatalog,modelFor,showroomSelection} from './catalogo-modelos.js';
let models={};
function inspect(r){
  import('./estudio-3d.js').then(m=>m.openStudio(r,modelFor(r,models))).catch(()=>{byId('result').textContent='No se pudo abrir el estudio de la pieza.';});
}
function modelButton(r){
  const b=element('button','Examinar en 3D');b.type='button';b.className='inspect-model';b.onclick=()=>inspect(r);return b;
}
let rotation = 0;
try {
  const [publication,manifest] = await Promise.all([loadPublicCollection(),modelCatalog().catch(()=>({}))]);models=manifest;
  const {catalog}=publication;
  const entries = catalog.records.filter(distinction);
  const groups = [...new Set(entries.map(distinction))];
  groups.forEach(value => byId('group').add(new Option(value,value)));
  function renderList() {
    const visible = entries.filter(r => !byId('group').value || distinction(r) === byId('group').value);
    byId('result').textContent = visible.length+' fichas · '+entries.length+' en el gabinete';
    byId('entries').replaceChildren(...visible.map(r => {
      const row = element('article');
      row.append(element('small',distinction(r)), link(r.name,passport(r)), element('p',r.id+' · '+(r.detail || r.category)));
      if(modelFor(r,models))row.append(modelButton(r));
      return row;
    }));
  }
  function mount() {
    const mounts = [];
    for (const {key,record:r} of showroomSelection(entries,models,rotation)) {
      const setting = settings[key];
      const card = element('article');
      card.className = 'mount '+key;
      card.id = key;
      const name = element('h3',setting.label);
      const picture = element('figure');
      const img = element('img'), caption = element('figcaption');
      if(modelFor(r,models)){const show=element('button');show.className='bottle-preview';show.setAttribute('aria-label','Examinar '+r.name+' en 3D');show.onclick=()=>inspect(r);show.append(img);picture.append(show,caption);}else picture.append(img,caption);
      showRecordImage(img,r,p => {caption.textContent=p?.editorial ? p.view : p ? 'Fotografía del archivo' : 'Referencia de la casa'});
      const title = element('h4',r.name), type = element('small',distinction(r));
      const actions = element('div');
      actions.className = 'actions';
      if(modelFor(r,models))actions.append(modelButton(r));
      actions.append(link('Pasaporte',passport(r)),link('Ver en la sala ↗','../?exhibir='+encodeURIComponent(r.id)+'&montaje='+key));
      card.append(name,picture,type,title,element('p',distinctionNote(r)),actions);
      mounts.push(card);
    }
    byId('mounts').replaceChildren(...mounts);
  }
  byId('rotate').disabled = showroomSelection(entries,models).length < 2;
  byId('rotate').onclick = () => {rotation++; mount()};
  byId('group').onchange = renderList;
  mount(); renderList();
  const wanted=new URLSearchParams(location.search).get('modelo');
  const piece=entries.find(r=>r.id===wanted);
  if(piece && modelFor(piece,models))inspect(piece);else if(wanted)byId('result').textContent='Este modelo no está disponible en la exposición actual.';
  if (Object.hasOwn(settings, location.hash.slice(1))) byId(location.hash.slice(1))?.scrollIntoView();
} catch {
  byId('result').textContent = 'No se pudo consultar la exposición. Recarga la página para volver a intentar.';
}
