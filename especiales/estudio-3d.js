import * as T from '../vendor/three.module.js';
import {resolvePublicPhoto} from '../archivo/foto-publica.js';
import {makeBottle} from './botella-3d.js';
import {modelImage,modelCaption} from './catalogo-modelos.js';

const $=id=>document.getElementById(id);
const dialog=$('estudio');
let unload=null,revision=0;
const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function localUrl(id) {
  const url=new URL(location.href);
  if(id)url.searchParams.set('modelo',id);else url.searchParams.delete('modelo');
  history.replaceState(null,'',url);
}
dialog.addEventListener('close',()=>{revision++;unload?.();unload=null;localUrl(null);});
$('estudio-cerrar').onclick=()=>dialog.close();
export async function openStudio(record,item) {
  const token=++revision;
  unload?.();unload=null;localUrl(record.id);
  const host=$('estudio-escena'),status=$('estudio-estado'),tools=$('estudio-controles');
  $('estudio-nombre').textContent=record.name;$('estudio-folio').textContent=[record.id,record.category,record.volume].filter(Boolean).join(' · ');
  $('estudio-origen').textContent=modelCaption(item);
  $('estudio-pasaporte').href='../archivo/?pieza='+encodeURIComponent(record.id);
  $('estudio-foto').href=resolvePublicPhoto(record.photos.find(p=>p.src===item.photo))||modelImage(item.src);
  const reverse=$('estudio-reverso');
  reverse.hidden=!item.backSrc;
  if(item.backSrc)reverse.href=resolvePublicPhoto(record.photos.find(p=>p.src===item.backPhoto))||modelImage(item.backSrc);
  else reverse.removeAttribute('href');
  status.textContent='Preparando la botella…';tools.hidden=true;host.replaceChildren();
  if(!dialog.open)dialog.showModal();
  let renderer,model;
  try {
    renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    model=await makeBottle(item,{studio:true});
  } catch {
    renderer?.dispose();renderer?.forceContextLoss();model?.dispose();
    if(token!==revision)return;
    const img=new Image();img.src=modelImage(item.src);img.alt=record.name;host.replaceChildren(img);
    status.textContent='Vista fotográfica. Este dispositivo no pudo dibujar el modelo.';return;
  }
  function release(){model.dispose();renderer.dispose();renderer.forceContextLoss();}
  if(token!==revision){release();return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;
  const canvas=renderer.domElement;
  canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Modelo de '+record.name+'. Arrastra o usa las flechas para girar.');
  host.replaceChildren(canvas);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(29,1,.02,15);
  const backdrop=document.createElement('canvas');backdrop.width=backdrop.height=256;
  const paper=backdrop.getContext('2d'),gradient=paper.createRadialGradient(124,157,0,124,157,185);
  gradient.addColorStop(0,'#546157');gradient.addColorStop(.55,'#303d35');gradient.addColorStop(1,'#141d18');
  paper.fillStyle=gradient;paper.fillRect(0,0,256,256);
  scene.background=new T.CanvasTexture(backdrop);scene.background.colorSpace=T.SRGBColorSpace;
  scene.add(model.mesh,new T.HemisphereLight(0xfff8e9,0xb7c0b9,1.15));
  const key=new T.DirectionalLight(0xffedd1,2.0);key.position.set(-2.4,3.4,4.5);scene.add(key);
  const rim=new T.DirectionalLight(0xd4e6f9,1.6);rim.position.set(2.5,2,-2);scene.add(rim);
  const plinth=new T.Mesh(new T.CylinderGeometry(.52,.54,.042,96),new T.MeshStandardMaterial({color:0x303732,roughness:.42,metalness:.25}));
  plinth.position.y=-.023;scene.add(plinth);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const c=shadowCanvas.getContext('2d'),shade=c.createRadialGradient(64,64,2,64,64,63);shade.addColorStop(0,'rgba(0,0,0,.77)');shade.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=shade;c.fillRect(0,0,128,128);
  const shadow=new T.Mesh(new T.PlaneGeometry(.85,.51),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.0006;scene.add(shadow);
  let yaw=0,elevation=.08,zoom=1,spinning=false,frame=0,lastTime=0,drag=null;
  function draw(){
    const dist=Math.max(2.55,1.52/camera.aspect)/zoom;
    camera.position.set(0,.50+Math.sin(elevation)*dist,Math.cos(elevation)*dist);
    camera.lookAt(0,.49,0);model.mesh.rotation.y=yaw;shadow.rotation.z=-yaw;
    renderer.render(scene,camera);
    $('estudio-acercar').disabled=zoom>=1.6;$('estudio-alejar').disabled=zoom<=.8;
  }
  function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  function tick(time){if(!spinning)return;if(!document.hidden)yaw+=Math.min(.05,(time-(lastTime||time))/1000)*.48;lastTime=time;draw();frame=requestAnimationFrame(tick);}
  function spin(on){spinning=on;cancelAnimationFrame(frame);lastTime=0;$('estudio-girar').setAttribute('aria-pressed',String(on));$('estudio-girar').textContent=on?'Pausar giro':'Giro automático';if(on)frame=requestAnimationFrame(tick);}
  function turn(amount){spin(false);yaw+=amount;draw();}
  function scale(delta){zoom=Math.min(1.6,Math.max(.8,zoom+delta));draw();}
  $('estudio-girar').onclick=()=>spin(!spinning);
  $('estudio-izquierda').onclick=()=>turn(-Math.PI/6);$('estudio-derecha').onclick=()=>turn(Math.PI/6);
  $('estudio-frente').onclick=()=>{spin(false);yaw=0;elevation=.08;zoom=1;draw();};
  $('estudio-acercar').onclick=()=>scale(.2);$('estudio-alejar').onclick=()=>scale(-.2);
  canvas.onkeydown=e=>{const action={ArrowLeft:()=>turn(-Math.PI/12),ArrowRight:()=>turn(Math.PI/12),'+':()=>scale(.2),'-':()=>scale(-.2)}[e.key];if(action){e.preventDefault();action();}};
  canvas.onpointerdown=e=>{spin(false);drag=[e.pointerId,e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(drag?.[0]!==e.pointerId)return;yaw+=(e.clientX-drag[1])*.011;elevation=Math.max(-.06,Math.min(.5,elevation+(e.clientY-drag[2])*.005));drag=[e.pointerId,e.clientX,e.clientY];draw();};
  canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
  canvas.onwheel=e=>{e.preventDefault();scale(e.deltaY>0?-.08:.08);};
  canvas.addEventListener('webglcontextlost',()=>{
    if(token!==revision)return;
    ++revision;unload?.();unload=null;
    const img=new Image();img.src=modelImage(item.src);img.alt=record.name;host.replaceChildren(img);
    tools.hidden=true;status.textContent='Vista fotográfica. Se interrumpió el dibujo en 3D.';
  });
  unload=()=>{spin(false);observer.disconnect();for(const button of tools.querySelectorAll('button'))button.onclick=null;scene.background.dispose();plinth.geometry.dispose();plinth.material.dispose();shadow.geometry.dispose();shadow.material.map.dispose();shadow.material.dispose();release();host.replaceChildren();};
  tools.hidden=false;status.textContent='';resize();
  if(!reduce()) {yaw=-.13;draw();}spin(false);
}
