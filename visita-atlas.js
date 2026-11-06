// Madrecita · catálogo administrado.
import { loadPublicCollection } from './archivo/coleccion-viva.js';
import {otherCollection} from './archivo/otros.js';
import {exhibirPieza} from './expositor-atlas.js';
export async function abrirVitrina({THREE,scene,ready,id,locate,addObstacle}){
 const $=id=>document.getElementById(id),box=$('vit-panel'),title=$('vit-name'),note=$('vit-note'),prev=$('vit-prev'),next=$('vit-next'),read=$('vit-passport'),back=$('vit-back'),query=new URL(location.href).searchParams;
 box.hidden=false;box.setAttribute('aria-busy','true');title.textContent='Preparando la vitrina…';
 let active=null,last=null,token=0;
 const fail=msg=>{title.textContent='Vitrina no disponible';note.textContent=msg;box.setAttribute('aria-busy','false');prev.hidden=next.hidden=read.hidden=$('vit-face').hidden=true;back.href='archivo/#atlas';};
 try{
 const {catalog,producers:index,geography:geo,locations}=await loadPublicCollection(),byId=new Map(catalog.records.map(r=>[r.id,r])),r0=byId.get(id);
 if(!r0){fail('Esta pieza no está disponible en la exposición.');return}
 const other=locations.unplaced.includes(id)?otherCollection(catalog.records,locations.unplaced):null;
 const maker=other?.makers.find(group=>group.ids.includes(id))||index.producers.find(p=>p.id===query.get('productor')&&p.ids.includes(id))||index.producers.find(p=>p.ids.includes(id)),region=other||(maker&&geo.regions.find(r=>r.slug===maker.region)),ids=maker?maker.ids:[id];
 function urls(r){const u=new URL('archivo/',document.baseURI);if(region)u.searchParams.set('region',region.slug);if(maker)u.searchParams.set('productor',maker.id);u.searchParams.set('muestra',r.id);u.hash='atlas';back.href=u.href;u.searchParams.set('pieza',r.id);read.href=u.href;const here=new URL(location.href);here.searchParams.set('exhibir',r.id);if(region)here.searchParams.set('region',region.slug);if(maker)here.searchParams.set('productor',maker.id);history.replaceState(null,'',here)}
 async function display(n){const k=++token,r=byId.get(ids[n]);active=n;urls(r);title.textContent=r.name;$('vit-source').textContent=[region?.name,maker?.name||r.producer].filter(Boolean).join(' / ');$('vit-id').textContent=r.id+' · '+(n+1)+' / '+ids.length;prev.hidden=next.hidden=ids.length<2;prev.disabled=n===0;next.disabled=n===ids.length-1;box.setAttribute('aria-busy','true');box.dataset.record=r.id;box.dataset.status='loading';note.textContent=ready?'Preparando la cédula…':'WebGL no está disponible en este navegador. Puedes abrir el pasaporte de esta pieza.';if(!ready){$('vit-face').hidden=true;box.dataset.status='fallback';box.setAttribute('aria-busy','false');return}
 const result=await exhibirPieza({THREE,scene,record:r});if(k!==token){result.dispose();return}last?.dispose();last=result;box.dataset.status=result.photoStatus;note.textContent=result.photoStatus==='available'?'Fotografía de archivo en una vitrina virtual.':result.photoStatus==='missing'?'Sin foto de la pieza · Referencia: Reserva Retana.':'Foto no disponible · Referencia: Reserva Retana.';box.setAttribute('aria-busy','false');locate(r);};
 if(ready)addObstacle([5.05,7.35,-3.65,-2.38]);prev.onclick=()=>{if(active>0)display(active-1).catch(()=>fail('No se pudo mostrar la pieza.'))};next.onclick=()=>{if(active<ids.length-1)display(active+1).catch(()=>fail('No se pudo mostrar la pieza.'))};$('vit-face').onclick=()=>locate(byId.get(ids[active]));await display(ids.indexOf(id));
 }catch(e){console.error(e);fail('No se pudo cargar esta vitrina. Vuelve al atlas para elegir una pieza.')}
}

