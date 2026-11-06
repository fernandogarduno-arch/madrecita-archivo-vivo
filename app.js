// Madrecita · catálogo administrado.
import * as THREE from './vendor/three.module.js';
import {welcomePath, easeBetween} from './recorrido-bienvenida.js';
import {mountPlaque, entranceView} from './placa-madrecita.js';
import {createCasona} from './casona-real.js';

const $=id=>document.getElementById(id);
import {pieces as inaugural} from './seleccion.js';
import {loadPublicCollection} from './archivo/coleccion-viva.js';
import {resolvePublicPhoto} from './archivo/foto-publica.js';
let publication;
try {
  publication = await loadPublicCollection();
} catch (error) {
  console.warn('Estaciones de colección indisponibles', error);
}
const activeRecords = new Map((publication?.catalog.records || []).map(row => [row.id,row]));
const pieces = inaugural.flatMap((source,station)=>{
  const row = activeRecords.get(source.id);
  if (!row) return [];
  const image = row.photos[0];
  return [{
    ...source, station, x:-9.8, z:12-station*5,
    name:row.name, producer:row.producer, nom:row.nomSource||row.nom,
    intro:[row.category,row.volume,row.detail].filter(Boolean).join(' · '),
    photo:resolvePublicPhoto(image), folio:image?.folio || 'Sin folio consignado'
  }];
});
let renderer,scene,camera,clock,ready=false,entered=false,yaw=0,pitch=0,tween=null,selected=-1,guided=false,locked=false,drag=null,frames=0,nearest=-1;
const keys=new Set(),bottles=[],markers=[],seen=new Set();
let plaque, casona;const film=document.createElement("video");film.src="assets/pelicula.mp4?ed=retana";film.preload="none";film.playsInline=true;film.crossOrigin="anonymous";
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{JSON.parse(localStorage.getItem('madrecita-pasaportes-v3')||'[]').filter(id=>pieces.some(piece=>piece.id===id)).forEach(id=>seen.add(id));}catch{}
const isModal=()=>!!document.querySelector('dialog[open]');
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function showDialog(id){keys.clear();document.exitPointerLock?.();$(id).showModal();}
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.close').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
$('curator').onclick=()=>showDialog('curator-dialog');$('collection').onclick=()=>showDialog('collection-dialog');$('help').onclick=()=>showDialog('help-dialog');$('fallback-list').onclick=()=>showDialog('collection-dialog');
document.querySelector('#collection .count').textContent=String(pieces.length).padStart(2,'0');
if(!pieces.length) $('piece-list').textContent=publication?'No hay piezas activas en esta exposición.':'La colección no se pudo confirmar. Recarga para volver a intentarlo.';
pieces.forEach((p,i)=>{const b=document.createElement('button');b.className='piece-card';for(const [tag,value] of [['span','0'+(i+1)+' / '+p.theme],['h3',p.name],['p','Descubrir esta pieza ↗']]){const n=document.createElement(tag);n.textContent=value;b.append(n);}b.onclick=()=>{$('collection-dialog').close();if(ready){enter();goTo(i);}else openPiece(i);};$('piece-list').append(b);});
function updateSeen(){ $('visited').textContent=`${seen.size} / ${pieces.length}`;markers.forEach((m,i)=>m.classList.toggle('seen',seen.has(pieces[i].id)));try{localStorage.setItem('madrecita-pasaportes-v3',JSON.stringify([...seen]));}catch{}}
function openPiece(i){if(i<0||i>=pieces.length)return;selected=i;const p=pieces[i];seen.add(p.id);updateSeen();$('detail-id').textContent='PASAPORTE / '+p.id;$('detail-index').textContent='0'+(i+1);$('detail-title').textContent=p.name;$('detail-theme').textContent=p.theme;$('detail-intro').textContent=p.intro;$('detail-note').textContent=p.note;$('detail-photo').src=p.photo;$('full-passport').href='archivo/?pieza='+p.id;$('detail-fields').replaceChildren();for(const [k,v] of [['Productor',p.producer],['NOM consignado',p.nom],['Libro','Sheet3 · fila '+p.row],['Folio fotográfico',p.folio]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v||'Sin dato';$('detail-fields').append(dt,dd);}showDialog('detail');}
$('detail-next').onclick=()=>{$('detail').close();if(ready){enter();goTo((selected+1)%pieces.length);}else openPiece((selected+1)%pieces.length);};
const audio = $('identity-audio');
const welcomeKey = 'madrecita-jingle-bienvenida-v1';
let welcomePlayed = false;
let waitingForGesture = false;
let startingWelcome = false;
try { welcomePlayed = sessionStorage.getItem(welcomeKey) === '1'; } catch {}

function rememberWelcome() {
  welcomePlayed = true;
  waitingForGesture = false;
  try { sessionStorage.setItem(welcomeKey, '1'); } catch {}
}

function updateSoundButton() {
  const playing = !audio.paused && !audio.ended;
  $('sound').setAttribute('aria-pressed', String(playing));
  $('sound').title = playing ? 'Pausar el jingle' : 'Escuchar el jingle';
  $('sound').querySelector('span').textContent = playing ? '●' : '○';
}

audio.addEventListener('playing', () => { rememberWelcome(); updateSoundButton(); });
audio.addEventListener('pause', updateSoundButton);
audio.addEventListener('ended', updateSoundButton);

async function playWelcome() {
  if (!entered || welcomePlayed || startingWelcome || isModal() || !film.paused) return;
  startingWelcome = true;
  waitingForGesture = false;
  try {
    await audio.play();
    rememberWelcome();
  } catch (error) {
    waitingForGesture = error.name === 'NotAllowedError';
  } finally {
    startingWelcome = false;
  }
}

function retryWelcome(event) {
  if (!waitingForGesture || !event.isTrusted || !entered || isModal()) return;
  if (event.target.closest?.('#sound, #screen-toggle, #trailer-open, #home, dialog')) return;
  void playWelcome();
}
document.addEventListener('click', retryWelcome);
document.addEventListener('keydown', retryWelcome);
document.addEventListener('pointerup', event => {
  if (event.target.closest?.('#world, .mobile-move')) retryWelcome(event);
});

$('sound').onclick = async () => {
  waitingForGesture = false;
  if (!audio.paused) { audio.pause(); return; }
  film.pause();
  $('screen-toggle').textContent = 'Ver película ▶';
  $('screen-toggle').setAttribute('aria-pressed', 'false');
  try { await audio.play(); } catch { toast('Pulsa de nuevo para activar el sonido.'); }
};


const trailer = $('trailer-player');
const trailerDialog = $('trailer-dialog');

function openTrailer(play) {
  waitingForGesture = false;
  audio.pause();
  film.pause();
  $('sound').innerHTML = 'Sonido <span>○</span>';
  $('sound').setAttribute('aria-pressed', 'false');
  $('screen-toggle').textContent = 'Ver película ▶';
  $('screen-toggle').setAttribute('aria-pressed', 'false');
  if (!trailerDialog.open) showDialog('trailer-dialog');
  if (play) trailer.play().catch(() => toast('Pulsa reproducir para escuchar la película.'));
}

$('trailer-open').addEventListener('click', event => {
  event.preventDefault();
  history.replaceState(history.state, '', '#pelicula');
  openTrailer(true);
});
trailerDialog.addEventListener('close', () => {
  trailer.pause();
  if (location.hash === '#pelicula') history.replaceState(history.state, '', location.pathname + location.search);
});
if (location.hash === '#pelicula') openTrailer(false);

function build(){
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.08,100);camera.rotation.order='YXZ';[yaw,pitch]=entranceView(camera);
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.84;renderer.outputColorSpace=THREE.SRGBColorSpace;$('world').append(renderer.domElement);
 casona=createCasona(scene,renderer,pieces,film);plaque=mountPlaque(scene,renderer);bottles.push(...casona.selectables,plaque.face);
 pieces.forEach((p,i)=>{const marker=document.createElement('button');marker.className='marker';marker.textContent=`0${i+1}`;marker.setAttribute('aria-label',`Ir a ${p.name}`);marker.onclick=()=>goTo(i);$('markers').append(marker);markers.push(marker);});
 clock=new THREE.Clock();ready=true;$('enter').disabled=false;$('guided').disabled=pieces.length===0;$('tour').disabled=pieces.length===0;$('enter').textContent='Entrar a la casona  →';updateSeen();animate();
}

function enter() {
  if (!ready || entered) return;
  entered = true;
  $('hero-background').hidden = true;
  $('hero-video').pause();
  $('welcome').hidden = true;
  $('hud').hidden = false;
  $('markers').hidden = false;
  void playWelcome();
}
function reset(){if(!ready)return;document.exitPointerLock?.();keys.clear();tween=null;guided=false;selected=-1;nearest=-1;[yaw,pitch]=entranceView(camera);$('piece-hint').hidden=true;$('tour-caption').textContent='Explora a tu ritmo.';$('tour').textContent='Recorrido guiado';}
$('home').onclick=e=>{e.preventDefault();reset();entered=false;$('welcome').hidden=false;$('hud').hidden=true;$('markers').hidden=true;showHero();};$('reset').onclick=reset;$('enter').onclick=()=>{enter();$('tour-caption').textContent=innerWidth<750?'Desliza para mirar · Flechas para caminar':'Arrastra para mirar · W A S D para caminar';};$('guided').onclick=()=>{enter();goTo(0);};$('curator-tour').onclick=()=>{$('curator-dialog').close();if(ready){enter();goTo(0);}else showDialog('collection-dialog');};$('tour').onclick=()=>{if(guided){guided=false;tween=null;$('tour').textContent='Recorrido guiado';$('tour-caption').textContent='Explora a tu ritmo.';}else goTo(selected<0?0:selected);};
function routeTo(to,target,welcome=false){
 const from=camera.position.clone();const candidates=[from,to];for(const x of [-8.3,.5,4,8.7])for(const z of [-16,-12,-7,-4,0,2,10.8,13,16.7])if(allowed(x,z))candidates.push(new THREE.Vector3(x,2.55,z));
 const clear=(a,b)=>{const n=Math.ceil(a.distanceTo(b)/.2);for(let i=1;i<=n;i++){const t=i/n;if(!allowed(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;};
 const ds=candidates.map(()=>Infinity),prev=[],done=new Set();ds[0]=0;
 while(done.size<candidates.length){let u=-1;ds.forEach((d,i)=>{if(!done.has(i)&&(u<0||d<ds[u]))u=i;});if(u<0||!Number.isFinite(ds[u])||u===1)break;done.add(u);candidates.forEach((v,i)=>{if(done.has(i)||!clear(candidates[u],v))return;const d=ds[u]+candidates[u].distanceTo(v);if(d<ds[i]){ds[i]=d;prev[i]=u;}});}
 let path=[to];if(Number.isFinite(ds[1])){let i=1;path=[];while(i!==undefined){path.unshift(candidates[i]);i=prev[i];}}else{toast('Acércate al pasillo lateral para continuar el recorrido.');return;}
 const dx=target.x-to.x,dz=target.z-to.z,y=Math.atan2(-dx,-dz),diff=((y-yaw+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
 tween={path,dist:0,total:ds[1],yaw0:yaw,yaw1:yaw+diff,pitch0:pitch,pitch1:Math.atan2(target.y-to.y,Math.hypot(dx,dz)),t:0,duration:reduced?0:Math.max(1.4,Math.min(5,ds[1]/5))};
 if (welcome) {
   tween.welcome = welcomePath(path, allowed);
   tween.duration = reduced || !tween.welcome.curves.length ? 0 : 8.5;
   tween.focus = target;
 }
 return true;
}
function goTo(i){if(!ready||i<0||i>=pieces.length)return;enter();document.exitPointerLock?.();keys.clear();selected=i;guided=true;const p=pieces[i];const to=new THREE.Vector3(-8.3,2.55,p.z+1.15);routeTo(to,new THREE.Vector3(p.x,2.6,p.z));$('tour').textContent='Salir de la visita guiada';$('tour-caption').textContent=`Mirada ${i+1} de ${pieces.length} · ${p.theme.split(' / ')[0].toLowerCase()}`;hint(i);}
function visitZone(zone){enter();keys.clear();guided=true;selected=-1;hint(-1);const views={walls:{from:[-8.25,2.65,11.25],to:[3.65,2.65,-2.1],text:'El comedor y la pantalla'},bar:{from:[.4,2.55,11.8],to:[-3.6,1.65,15],text:'La barra · piedra verde y luz de cobre, frente a la televisión'},dining:{from:[.5,2.55,12.7],to:[5.3,1.7,6.8],text:'El comedor · la mesa rectangular del lugar'},lounge:{from:[.5,2.55,4],to:[-4.2,1.5,3],text:'El lounge · frente al muro de la colección'},screen:{from:[4,2.55,-12.5],to:[.1,2.3,-15.8],text:'La pantalla · memoria en movimiento'}};const v=views[zone];routeTo(new THREE.Vector3(...v.from),new THREE.Vector3(...v.to));$('tour-caption').textContent=v.text;$('tour').textContent='Salir de la visita guiada';}
$('bar').onclick=()=>visitZone('bar');$('lounge').onclick=()=>visitZone('lounge');$('dining').onclick=()=>visitZone('dining');
async function toggleFilm(){if(!ready)return;if(film.paused){waitingForGesture=false;audio.pause();$('sound').innerHTML='Sonido <span>○</span>';$('sound').setAttribute('aria-pressed','false');visitZone('screen');try{await film.play();casona.playScreen();$('screen-toggle').textContent='Pausar película';$('screen-toggle').setAttribute('aria-pressed','true');}catch{toast('Pulsa de nuevo para reproducir la película.');}}else{film.pause();$('screen-toggle').textContent='Ver película ▶';$('screen-toggle').setAttribute('aria-pressed','false');}}
$('screen-toggle').onclick=toggleFilm;film.onended=()=>{$('screen-toggle').textContent='Ver película ▶';$('screen-toggle').setAttribute('aria-pressed','false');};

function hint(i){if(i<0){$('piece-hint').hidden=true;return;}$('piece-hint').hidden=false;$('hint-number').textContent=`0${i+1} / ${String(pieces.length).padStart(2,'0')} · ${seen.has(pieces[i].id)?'DESCUBIERTA':'POR DESCUBRIR'}`;$('hint-title').textContent=pieces[i].name;$('inspect').onclick=()=>openPiece(i);$('next').onclick=()=>goTo((i+1)%pieces.length);}
$('gaming').onclick=()=>{if(!ready)return;enter();if(document.pointerLockElement)document.exitPointerLock();else renderer.domElement.requestPointerLock?.();};document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer?.domElement;$('gaming').textContent=locked?'Liberar ratón · Esc':'Modo gaming';$('gaming').setAttribute('aria-pressed',String(locked));$('crosshair').hidden=!locked;keys.clear();});document.addEventListener('pointerlockerror',()=>toast('Puedes seguir mirando al arrastrar el ratón.'));
function cancelTour(){tween=null;if(guided){guided=false;$('tour').textContent='Recorrido guiado';$('tour-caption').textContent='Explora a tu ritmo.';}}
document.addEventListener('keydown',e=>{if(!entered||isModal()||/INPUT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','e'].includes(k)){e.preventDefault();if(k==='e'){openPiece(guided?selected:nearest);return;}keys.add(k);cancelTour();}});document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();drag=null;});document.addEventListener('visibilitychange',()=>{clock?.getDelta();if(document.hidden){keys.clear();drag=null;}});
const world=$('world');world.addEventListener('pointerdown',e=>{if(!entered||isModal())return;drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:0};if(!locked)world.setPointerCapture(e.pointerId);});world.addEventListener('pointermove',e=>{if(!entered||isModal())return;if(locked){cancelTour();yaw-=e.movementX*.0022;pitch=Math.max(-.65,Math.min(.7,pitch-e.movementY*.0022));}else if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);if(drag.moved>4){cancelTour();yaw-=dx*.004;pitch=Math.max(-.65,Math.min(.7,pitch-dy*.004));}drag.x=e.clientX;drag.y=e.clientY;}});world.addEventListener('pointerup',e=>{if(drag&&drag.moved<6&&ready){const ray=new THREE.Raycaster();ray.setFromCamera(locked?new THREE.Vector2(0,0):new THREE.Vector2((e.clientX/innerWidth)*2-1,1-(e.clientY/innerHeight)*2),camera);const hits=ray.intersectObjects(bottles);if(hits[0]){if(hits[0].object.userData.action==='dedication')readDedication();else if(hits[0].object.userData.action==='screen')toggleFilm();else openPiece(hits[0].object.userData.piece);}}drag=null;});world.addEventListener('pointercancel',()=>drag=null);
document.querySelectorAll('[data-move]').forEach(b=>{const k={forward:'w',back:'s',left:'a',right:'d'}[b.dataset.move];b.onpointerdown=e=>{e.preventDefault();keys.add(k);cancelTour();b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>keys.delete(k);b.onlostpointercapture=()=>keys.delete(k);});
function allowed(x,z){if(x< -8.9||x>8.9||z< -16.6||z>16.9)return false;return !casona?.obstacles.some(([l,r,a,b])=>x>l-.25&&x<r+.25&&z>a-.25&&z<b+.25);}

function move(dt){let f=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),s=(keys.has('d')?1:0)-(keys.has('a')?1:0);if(keys.has('arrowleft'))yaw+=dt*1.3;if(keys.has('arrowright'))yaw-=dt*1.3;if(!f&&!s)return;const norm=Math.hypot(f,s);f/=norm;s/=norm;const speed=(keys.has('shift')?4.8:2.8)*dt,dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed;const x=camera.position.x,z=camera.position.z;if(allowed(x+dx,z))camera.position.x+=dx;if(allowed(camera.position.x,z+dz))camera.position.z+=dz;}
const map=$('map').getContext('2d');function mapDraw(){map.clearRect(0,0,140,190);const xx=x=>70+x*4.8,zz=z=>15+(z+18)*4.5;map.strokeStyle='#a99b7966';map.strokeRect(16,9,108,172);map.fillStyle='#b3966044';for(const [l,r,a,b] of casona.obstacles)map.fillRect(xx(l),zz(a),(r-l)*4.8,(b-a)*4.5);pieces.forEach((p,i)=>{map.fillStyle=seen.has(p.id)?'#dcc096':'#83917d';map.fillRect(xx(p.x)-3,zz(p.z)-3,6,6);});map.save();map.translate(xx(camera.position.x),zz(camera.position.z));map.rotate(-yaw);map.fillStyle='#f5efde';map.beginPath();map.moveTo(0,-6);map.lineTo(4.5,5);map.lineTo(0,3);map.lineTo(-4.5,5);map.closePath();map.fill();map.restore();}

const projection=new THREE.Vector3();function updateMarkers(){plaque.update(camera,entered&&!isModal()&&!locked&&!tween?.welcome);markers.forEach((m,i)=>{const p=pieces[i];projection.copy(casona.markerPoints[i]);projection.y=2.24;projection.x=-9.50;projection.project(camera);const visible=entered&&!isModal()&&projection.z<1&&projection.z>0&&Math.abs(projection.x)<.95&&Math.abs(projection.y)<.8;m.hidden=!visible;if(visible){m.style.left=`${(projection.x*.5+.5)*innerWidth}px`;m.style.top=`${(-projection.y*.5+.5)*innerHeight}px`;m.classList.toggle('selected',i===(guided?selected:nearest));}});}
function advanceCamera(dt, elapsed) {
  const trip = tween;
  trip.t += trip.welcome ? elapsed : dt;
  const progress = trip.duration ? Math.min(1, trip.t / trip.duration) : 1;
  if (trip.welcome) {
    const distance = easeBetween(progress, .06, .94);
    if (trip.welcome.curves.length) trip.welcome.getPoint(distance, camera.position);
    // Turn away from the plaque first, then settle on the illuminated shelves.
    const turn = easeBetween(progress, 0, .80);
    const dx = trip.focus.x-camera.position.x, dz = trip.focus.z-camera.position.z;
    const heading = Math.atan2(-dx,-dz);
    const difference = Math.atan2(Math.sin(heading-trip.yaw0), Math.cos(heading-trip.yaw0));
    yaw = trip.yaw0 + difference*turn;
    pitch = THREE.MathUtils.lerp(trip.pitch0, Math.atan2(trip.focus.y-camera.position.y, Math.hypot(dx,dz)), turn);
    if (progress === 1) {
      cancelTour();
      $('tour-caption').textContent = 'El lounge · Estantes de la colección';
    }
    return;
  }
  const eased = progress*progress*(3-2*progress);
  let distance = eased*trip.total;
  for (let k=1; k<trip.path.length; k++) {
    const start = trip.path[k-1], end = trip.path[k], length = start.distanceTo(end);
    if (distance<=length || k===trip.path.length-1) {
      camera.position.lerpVectors(start, end, length ? Math.min(distance/length,1) : 1);
      break;
    }
    distance-=length;
  }
  yaw=THREE.MathUtils.lerp(trip.yaw0,trip.yaw1,eased);
  pitch=THREE.MathUtils.lerp(trip.pitch0,trip.pitch1,eased);
  if(progress===1) tween=null;
}

function animate(){requestAnimationFrame(animate);if(document.hidden)return;if(!entered){clock.getDelta();return;}const elapsed=clock.getDelta(), dt=Math.min(elapsed,.04);if(entered&&!isModal()){if(tween) advanceCamera(dt,elapsed);else move(dt);if(!guided){let best=-1,dist=4.5;pieces.forEach((p,i)=>{const d=Math.hypot(camera.position.x-p.x,camera.position.z-p.z);if(d<dist){best=i;dist=d;}});if(best!==nearest){nearest=best;hint(best);}}}camera.rotation.set(pitch,yaw,0,'YXZ');renderer.render(scene,camera);if(frames++%2===0){updateMarkers();if(entered)mapDraw();}}
window.addEventListener('resize',()=>{if(!ready)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
try{build();}catch(e){console.error('No se pudo iniciar la sala 3D:',e);$('fallback').hidden=false;$('enter').textContent='Ver la colección';$('enter').disabled=false;$('enter').onclick=()=>showDialog('collection-dialog');$('world').style.background='linear-gradient(#0b2c2566,#0b2c2566),url(assets/portada.jpg) center/cover';}
// Estado observable para las comprobaciones de navegación, colisiones y accesibilidad.
window.madrecita={get state(){return{ready,entered,guided,selected,nearest,position:camera?camera.position.toArray():null,yaw,seen:[...seen],frames,objects:scene?.children.length,obstacles:casona?.obstacles,filmPlaying:!film.paused,filmTime:film.currentTime,bottleCount:casona?.bottleCount};},goTo,reset,openPiece};

// Movimiento de portada voluntario y respetuoso de la preferencia de movimiento reducido.
const hero=$('hero-video');
function updateMotion(){const playing=!hero.paused;$('motion-toggle').textContent=playing?'Pausar animación':'Activar animación';$('motion-toggle').setAttribute('aria-pressed',String(playing));}
function showHero(){$('hero-background').hidden=false;if(!reduced)hero.play().then(updateMotion).catch(updateMotion);else updateMotion();}
$('motion-toggle').onclick=()=>{if(hero.paused)hero.play().then(updateMotion).catch(()=>toast('La imagen sigue disponible. Pulsa para intentar reproducir la animación.'));else{hero.pause();updateMotion();}};
hero.addEventListener('play',updateMotion);hero.addEventListener('pause',updateMotion);hero.addEventListener('error',()=>{$('motion-toggle').hidden=true;});
showHero();

function locateAtlas(r){enter();document.exitPointerLock?.();keys.clear();tween=null;guided=true;selected=nearest=-1;hint(-1);camera.position.set(6.2,2.05,innerWidth/innerHeight<.68?1.43:.72);yaw=0;pitch=Math.atan2(1.83-camera.position.y,camera.position.z+3);$('tour-caption').textContent='Vitrina de consulta · '+r.name;$('tour').textContent='Salir de la visita guiada';}
const query=new URLSearchParams(location.search),station=query.get('estacion'),zones={muros:'walls',barra:'bar',comedor:'dining',lounge:'lounge',pantalla:'screen'};if(query.has('exhibir')){if(ready)enter();import('./visita-atlas.js').then(m=>m.abrirVitrina({THREE,scene,ready,id:query.get('exhibir'),locate:locateAtlas,addObstacle:b=>casona.obstacles.push(b)}));}else if(station!==null&&/^[0-5]$/.test(station)){const index=pieces.findIndex(p=>p.station===Number(station));
if(index<0){if(ready)enter();toast('Esta estación no está disponible.');}else if(ready)goTo(index);else openPiece(index);}else if(ready&&zones[query.get('zona')])visitZone(zones[query.get('zona')]);else if(ready&&query.has('entrar'))enter();

function readDedication() {
  if (!$('dedication-dialog').open) showDialog('dedication-dialog');
}
$('plaque-read').onclick = readDedication;
function enterMuseumFromPlaque() {
  if ($('dedication-dialog').open) $('dedication-dialog').close();
  if (!ready) {
    location.assign('archivo/');
    return;
  }
  enter();
  keys.clear();
  const lounge = new THREE.Vector3(.5, 2.55, 4);
  const shelves = new THREE.Vector3(-9.55, 3.15, -.7);
  if (!routeTo(lounge, shelves, true)) return;
  selected = nearest = -1;
  hint(-1);
  guided = true;
  $('tour-caption').textContent = 'Pasa, te quiero enseñar la colección.';
  $('tour').textContent = 'Salir de la bienvenida';
}
$('plaque-enter').onclick = enterMuseumFromPlaque;
$('letter-enter').onclick = enterMuseumFromPlaque;
const publicPortal = 'https://fernandogarduno-arch.github.io/madrecita-archivo-vivo/';
function sharePortal(dedication) {
  $('share-title').textContent = dedication ? 'Compartir dedicatoria' : 'Compartir portal';
  $('share-url').value = publicPortal + (dedication ? '?entrar=1#dedicatoria' : '');
  $('share-feedback').textContent = '';
  showDialog('share-dialog');
}
$('share-portal').onclick = () => sharePortal(false);
$('share-dedication').onclick = () => sharePortal(true);
$('copy-url').onclick = async () => {
  const field = $('share-url');
  try {
    await navigator.clipboard.writeText(field.value);
    $('share-feedback').textContent = 'Enlace copiado.';
  } catch {
    field.focus(); field.select();
    $('share-feedback').textContent = 'Selecciona Copiar para compartir el enlace.';
  }
};
function visitDedicationLink() {
  if (location.hash !== '#dedicatoria') return;
  if (ready) { enter(); reset(); }
  readDedication();
}
$('dedication-dialog').addEventListener('close', () => {
  if (location.hash === '#dedicatoria') history.replaceState(history.state,'',location.pathname+location.search);
});
addEventListener('hashchange',visitDedicationLink);
visitDedicationLink();
