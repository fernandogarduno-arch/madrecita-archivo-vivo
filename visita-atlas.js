import {loadPublicCollection} from './archivo/coleccion-viva.js';
import {houseCaption, newImageLabel, showRecordImage} from './archivo/foto-publica.js';
import {otherCollection} from './archivo/otros.js';
import {settingFor, settings, distinction} from './archivo/curaduria.js';
import {exhibirPieza} from './expositor-atlas.js';

export async function abrirVitrina({THREE,scene,ready,id,locate,addObstacle}) {
  const $=id=>document.getElementById(id);
  const box=$('vit-panel'), title=$('vit-name'), note=$('vit-note'), world=$('world');
  const prev=$('vit-prev'), next=$('vit-next'), read=$('vit-passport'), back=$('vit-back');
  const face=$('vit-face'), studio=$('vit-studio'), turn=$('vit-turn'), photo=$('vit-photo');
  const query=new URL(location.href).searchParams;
  let active=0,current=null,last=null,revision=0,drag=null;
  document.body.dataset.exhibit='';
  box.hidden=false;
  box.setAttribute('aria-busy','true');
  title.textContent='Preparando la vitrina…';
  back.href='archivo/#atlas';
  prev.hidden=next.hidden=read.hidden=face.hidden=true;

  function setModel(on) {
    studio.hidden=turn.hidden=!on;
    world.toggleAttribute('data-turnable',on);
    if(on){
      world.tabIndex=0;
      world.setAttribute('aria-label','Girar la botella arrastrando o con las flechas izquierda y derecha');
    } else {
      world.removeAttribute('tabindex');
      world.setAttribute('aria-label','Sala tridimensional de la colección');
    }
  }
  function photographicView() {
    if(!current)return;
    setModel(false);face.hidden=true;photo.hidden=false;world.hidden=true;
    box.dataset.status='fallback';box.dataset.model='false';
    box.setAttribute('aria-busy','false');
    showRecordImage(photo.querySelector('img'),current,source=>{
      note.textContent=source?.editorial?source.view+' · '+source.caption:
        source?'Vista fotográfica del archivo.':houseCaption+' · Fotografía de la pieza pendiente.';
    });
  }
  window.addEventListener('madrecita:vista-fotografica',()=>{ready=false;++revision;last?.dispose();last=null;photographicView();});
  world.addEventListener('pointerdown',event=>{
    if(!last?.model || !event.isPrimary || event.button!==0)return;
    drag={id:event.pointerId,x:event.clientX};world.setPointerCapture(drag.id);
  });
  world.addEventListener('pointermove',event=>{
    if(drag?.id!==event.pointerId)return;
    last?.turn((event.clientX-drag.x)*.012);drag.x=event.clientX;
  });
  world.addEventListener('lostpointercapture',()=>{drag=null;});
  world.addEventListener('keydown',event=>{
    if(last?.model && ['ArrowLeft','ArrowRight'].includes(event.key)){
      event.preventDefault();last.turn((event.key==='ArrowLeft'?-1:1)*Math.PI/12);
    }
  });
  turn.onclick=()=>last?.turn(Math.PI/6);

  function fail(message) {
    setModel(false);prev.hidden=next.hidden=read.hidden=face.hidden=true;
    title.textContent='Vitrina no disponible';note.textContent=message;
    box.setAttribute('aria-busy','false');
  }
  try {
    const {catalog,producers:index,geography:geo,locations}=await loadPublicCollection();
    const byId=new Map(catalog.records.map(r=>[r.id,r])),first=byId.get(id);
    if(!first){fail('Esta pieza no está disponible en la exposición.');return;}
    const requested=query.get('montaje');
    const special=Object.hasOwn(settings,requested)&&distinction(first);
    const setting=settingFor(special?requested:'vitrina');
    if(special)box.querySelector('.overline').textContent='Gabinete · '+setting.label;
    const other=locations.unplaced.includes(id)?otherCollection(catalog.records,locations.unplaced):null;
    const maker=other?.makers.find(g=>g.ids.includes(id))||
      index.producers.find(p=>p.id===query.get('productor')&&p.ids.includes(id))||
      index.producers.find(p=>p.ids.includes(id));
    const region=other||(maker&&geo.regions.find(r=>r.slug===maker.region));
    const ids=special?[id]:maker?maker.ids:[id];
    function links(r) {
      const atlas=new URL('archivo/',document.baseURI);
      if(region)atlas.searchParams.set('region',region.slug);
      if(maker)atlas.searchParams.set('productor',maker.id);
      atlas.searchParams.set('muestra',r.id);atlas.hash='atlas';
      back.href=special?'especiales/':atlas.href;
      if(special)back.textContent='Volver al gabinete';
      atlas.searchParams.set('pieza',r.id);read.href=atlas.href;read.hidden=false;
      studio.href='especiales/?modelo='+encodeURIComponent(r.id);
      const here=new URL(location.href);
      here.searchParams.set('exhibir',r.id);
      if(region)here.searchParams.set('region',region.slug);
      if(maker)here.searchParams.set('productor',maker.id);
      history.replaceState(null,'',here);
    }
    async function display(n) {
      const ticket=++revision,r=byId.get(ids[n]);
      active=n;current=r;drag=null;setModel(false);face.hidden=true;links(r);
      title.textContent=r.name;
      $('vit-source').textContent=[region?.name,maker?.name||r.producer].filter(Boolean).join(' / ');
      $('vit-id').textContent=r.id+(ids.length>1?' · '+(n+1)+' / '+ids.length:'');
      prev.hidden=next.hidden=ids.length<2;prev.disabled=n===0;next.disabled=n===ids.length-1;
      box.dataset.record=r.id;box.dataset.status='loading';box.dataset.model='false';
      box.setAttribute('aria-busy','true');note.textContent='Preparando la pieza…';
      if(!ready || document.documentElement.dataset.entry==='light'){photographicView();return;}
      let result;
      try {result=await exhibirPieza({THREE,scene,record:r,montaje:special?requested:'vitrina'});}
      catch {if(ticket===revision)photographicView();return;}
      if(ticket!==revision){result.dispose();return;}
      last?.dispose();last=result;photo.hidden=true;world.hidden=false;
      setModel(result.model);face.hidden=result.model;
      box.dataset.model=String(result.model);box.dataset.status=result.photoStatus;
      note.textContent=result.model?result.modelCaption:result.photoStatus==='ai'?'Recreación IA de una presentación de referencia.':
        result.photoStatus==='comparison'?'Fotografía de otra presentación del archivo.':
        result.photoStatus==='available'?(result.newImage?newImageLabel+' · Fotografía de archivo.':'Fotografía de archivo en una vitrina virtual.'):
        result.photoStatus==='missing'?'Sin foto de la pieza · Referencia: Reserva Retana.':'Foto no disponible · Referencia: Reserva Retana.';
      box.setAttribute('aria-busy','false');locate(r,setting);
    }
    if(ready&&setting!==settings.mesa){
      const [x,,z]=setting.position,s=setting.scale;
      addObstacle([x-1.15*s,x+1.15*s,z-.65*s,z+.62*s]);
    }
    prev.onclick=()=>{if(active>0)display(active-1);};
    next.onclick=()=>{if(active<ids.length-1)display(active+1);};
    face.onclick=()=>locate(current,setting);
    await display(ids.indexOf(id));
  } catch(error) {
    console.error(error);fail('No se pudo cargar la vitrina. Puedes elegir otra pieza en el atlas.');
  }
}
