import {exhibition} from '../archivo/curaduria.js';
const directory=new URL('./modelos/',import.meta.url);
let pending;
export async function modelCatalog() {
  pending ??= fetch(new URL('manifest.json',directory)).then(response=>{
    if (!response.ok) throw Error('Modelos no disponibles');
    return response.json();
  }).catch(error=>{pending=null;throw error;});
  return pending;
}
export function modelFor(record,models) {
  const item=models?.[record.id];
  if (!item || record.photos?.[0]?.adminPhoto || (item.name && item.name!==record.name)) return null;
  return record.photos?.some(p=>p.src===item.photo) ? item : null;
}
export function showroomSelection(records,models,rotation=0) {
  const modeled=records.filter(r=>modelFor(r,models));
  return exhibition(modeled.length?modeled:records,rotation);
}
export function modelImage(path) {return new URL(path,directory).href;}
export function modelCaption(item) {
  return item.backSrc ? 'Modelo interpretativo con fotografías de frente y reverso. Profundidad estimada.'
    : 'Modelo interpretativo a partir de la fotografía frontal. Profundidad y reverso estimados.';
}
