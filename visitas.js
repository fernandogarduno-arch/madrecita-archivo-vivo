import {API_BASE} from './admin/config.js';
// Sólo códigos de secciones y de piezas; nunca URLs, búsquedas ni datos del visitante.
const sections={archivo:'cava',especiales:'gabinete',mesa:'mesa',botella:'reserva','lugar-real':'lugar',tierra:'tierra'};
const here=new URL('.',import.meta.url),pageDir=location.pathname.slice(here.pathname.length).split('/')[0];
const key='madrecita.visita.v1', idle=30*60*1000;
let memory,lastSection='',timer;
const entry=!sections[pageDir] && new URLSearchParams(location.search).get('entrar')==='1'?'placa':'portal';
function session() {
  const now=Date.now();let s=memory;
  try {s=JSON.parse(localStorage.getItem(key))||s;} catch {}
  if(!s?.id || !(now-s.at>=0 && now-s.at<idle)) s={id:crypto.randomUUID(),entry};
  s.at=now;memory=s;
  try{localStorage.setItem(key,JSON.stringify(s))}catch{}
  return s;
}
const disabled=()=>['localhost','127.0.0.1'].includes(location.hostname) || navigator.globalPrivacyControl===true || navigator.doNotTrack==='1' || window.doNotTrack==='1';
export function countUsage(kind,label){
  if(disabled() || document.visibilityState==='prerender') return;
  try {
    const s=session(),body=JSON.stringify({id:crypto.randomUUID(),session:s.id,entry:s.entry,kind,label});
    const send=()=>fetch(API_BASE+'/api/visitas',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',keepalive:true,referrerPolicy:'no-referrer',body});
    send().then(r=>{if(r.status>=500)return send()}).catch(()=>{});
  } catch {} // Medir jamás impide abrir el museo.
}
function page(force=false){
  if(document.visibilityState!=='visible')return;
  let label=sections[pageDir]||'portada';
  if(pageDir==='archivo'){label=({'#mesa':'mesa','#fuentes':'fuentes','#atlas':'zona'})[location.hash]||'cava'}
  if(force || lastSection!==label){lastSection=label; countUsage('page',label);}
}
page();
addEventListener('hashchange',()=>page());
addEventListener('pageshow',e=>{if(e.persisted)page(true)});
document.addEventListener('visibilitychange',()=>{if(!lastSection)page()});
// Mantener viva una sesión durante un recorrido largo con interacción real.
function active(){
 if(!memory||disabled()||timer)return;
 timer=setTimeout(()=>{timer=0},60000);
 if(Date.now()-memory.at>=idle)page(true);else session();
}
for(const event of ['pointerdown','keydown','scroll'])addEventListener(event,active,{passive:true});
