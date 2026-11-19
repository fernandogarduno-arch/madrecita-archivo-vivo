import {showRecordImage} from './foto-publica.js';

export function fieldsFor(r) {
  return [['Marca',r.brand||r.name],['Presentación',r.brand && r.model!==r.brand?r.model:''],['Productor',r.producer],
    ['NOM consignado',r.nomSource||r.nom],['Región',r.regionName],['Localidad',r.place],['Origen',r.origin],['Referencia geográfica',r.geoSource],
    ['Clase',r.category],['Agave',r.agave],['Volumen',r.volume],['Comentarios',r.comments],['Descripción',r.detail],
    ['Porcentaje consignado (TIPO)',r.typePercent],['Alcohol consignado',r.abv],
    ['Fuente',r.row?'Archivo familiar · Sheet3 · fila '+r.row:'Registro de La Cava']].filter(([,v])=>v!=null && v!=='');
}
export function distilleryPeers(row,records) {
  const nom=String(row.nom||'').trim();
  if (!/^\d{4}$/.test(nom)) {
    if (nom || !row.producer || !row.place) return [];
    return records.filter(r=>r.producer===row.producer && r.place===row.place);
  }
  return records.filter(r=>String(r.nom||'').trim()===nom);
}
export async function printCatalog(records) {
  if (!records.length) return;
  const win=window.open('','_blank');
  if (!win) {window.alert('Permite la ventana de impresión para abrir la ficha o el libro.');return;}
  win.opener=null;
  const doc=win.document;
  const make=(tag,value)=>{const e=doc.createElement(tag);if(value!=null)e.textContent=value;return e;};
  doc.documentElement.lang='es-MX';doc.title=records.length===1?'Pasaporte · '+records[0].name:'Libro de La Cava';
  const css=make('link');css.rel='stylesheet';css.href=new URL('impresion.css',import.meta.url).href;
  const styled=new Promise(resolve=>{css.onload=css.onerror=resolve;});doc.head.append(css);
  const head=make('header'),button=make('button','Preparando fotografías…');button.disabled=true;
  button.onclick=()=>win.print();head.append(make('p','MADRECITA · ARCHIVO VIVO'),make('h1',doc.title),make('p',records.length.toLocaleString('es-MX')+' '+(records.length===1?'botella':'botellas')),button);doc.body.append(head);
  const book=make('main');doc.body.append(book);await styled;
  for(let i=0;i<records.length&&!win.closed;i+=12) {
    await Promise.all(records.slice(i,i+12).map(r=>{
      const page=make('article'),figure=make('figure'),img=make('img'),caption=make('figcaption'),dl=make('dl');
      figure.append(img,caption);page.append(make('small',r.id),make('h2',r.brand||r.name),make('p',r.category),figure,dl);
      for(const [k,v] of fieldsFor(r))dl.append(make('dt',k),make('dd',v));
      book.append(page);
      const ready=new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',()=>{if(!img.onerror)resolve();});});
      showRecordImage(img,r,p=>{caption.textContent=p?.view||p?.caption||(p?'Fotografía de la colección':'Imagen de referencia · Reserva Retana');});
      return ready;
    }));
    button.textContent='Preparando '+Math.min(i+12,records.length)+' de '+records.length+'…';
  }
  if (!win.closed) {button.disabled=false;button.textContent='Imprimir o guardar PDF';win.focus();win.print();}
}
