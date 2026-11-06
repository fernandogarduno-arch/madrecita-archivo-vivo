import {photoDirectory} from './medios.js';
// Las imágenes editoriales sólo acompañan a estas fichas; nunca cuentan como fotos de la pieza.
const companions = {
  'RET-0661':'RET-0061', 'RET-1546':'RET-0022', 'RET-1455':'RET-1456',
  'RET-1568':'RET-1266', 'RET-1057':'RET-0306', 'RET-1553':'RET-0306',
  'RET-1570':'RET-0084', 'RET-1541':'RET-1108', 'RET-1567':'RET-0942'
};

export function linkComparisons(records) {
  const active = new Map(records.map(r => [r.id,r]));
  for (const [target, source] of Object.entries(companions)) {
    const row = active.get(target), related = active.get(source);
    if (!row || !related || row.photos.length || related.adminEdition || row.adminEdition) continue;
    if (['name','nom','category'].some(field => fold(row[field]) !== fold(related[field]))) continue;
    const photo = related.photos.find(p => /^fotos\/[\w.-]+\.webp$/.test(p.src));
    if (!photo) continue;
    row.comparison = {editorial:true, kind:'comparison', view:'Otra presentación',
      url:new URL(photo.src,photoDirectory).href,
      caption:'Se muestra '+related.id+' · '+related.name+' ('+[related.category,related.volume,related.detail].filter(Boolean).join(', ')+'). Esta fotografía pertenece a ese otro ejemplar.',
      link:new URL('../archivo/?pieza='+source,import.meta.url).href};
  }
}
const studies = {
  'RET-1505': ['La Cofradia', 'Reposado', 'La presentación Cactus del productor ilustra la cerámica verde. El archivo consigna 400 ml y la referencia visual es de 750 ml.', 'https://tequilacofradia.com/nuestras-marcas/'],
  'RET-1507': ['Don Julio Real', 'Añejo', 'Estudio del decantador de 750 ml con pencas plateadas. El año y los detalles del ejemplar familiar están pendientes de cotejo.', 'https://canawineco.com/products/don-julio-real-tequila'],
  'RET-1523': ['Herencia de Plata', 'Blanco', 'Estudio de la presentación comercial de 750 ml con rotulación azul. La etiqueta de la pieza familiar está pendiente de cotejo.', 'https://www.vides.mx/products/tequilas-del-senor-herencia-de-plata-blanco-100-agave'],
  'RET-1524': ['Herencia de Plata', 'Añejo', 'Estudio de la presentación comercial de 750 ml con rotulación roja. La etiqueta de la pieza familiar está pendiente de cotejo.', 'https://www.vides.mx/products/herencia-de-plata-anejo'],
  'RET-1529': ['Tres Quatro Cinco', 'Añejo', 'El archivo consigna 700 ml, añejo. El distribuidor documenta un decantador de 750 ml, extra añejo, del mismo productor. La lámina compara la familia de envases.', 'https://www.skurnik.com/sku/tequila-extra-anejo-tres-cuatro-y-cinco/'],
  'RET-1528': ['Jose Cuervo Tradicional 209', 'Reposado', 'Fotografía del archivo, folio 1309. Se lee Tradicional 209, reposado. La capacidad de la botella fotografiada difiere de los 500 ml de esta ficha.', '']
};
const fold = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function studyFor(record) {
  if (record.comparison && !record.photos?.length) return record.comparison;
  const entry = studies[record.id];
  if (!entry || record.photos?.length || fold(record.name) !== fold(entry[0]) || fold(record.category) !== fold(entry[1])) return null;
  const archive = record.id === 'RET-1528';
  return { editorial: true, kind: archive ? 'comparison' : 'ai', view: archive ? 'Otra presentación' : 'Recreación IA',
    caption: entry[2], link: entry[3], url: new URL('./laminas/'+record.id+'.webp', import.meta.url).href };
}

export function distinction(record) {
  const words = fold([record.name, record.detail].join(' '));
  if (/botella unica|ejemplar unico/.test(words)) return 'Única según el archivo';
  if (/\blimitad[oa]\b|\bnumerad[oa]\b/.test(words)) return 'Limitada según el archivo';
  if (/coleccion/.test(words) && (/etiqueta|cuervo 1800|diablo/.test(words))) return 'Serie de autor';
  if (/aniversario|edicion|milenio|millen[n]?ium|mill?en[n]?iu?m|1873-/.test(words)) return 'Edición especial';
  if (record.id === 'RET-0276' && words.includes('conmemorativo')) return 'Edición especial';
  return null;
}
export function distinctionNote(record) {
  const evidence = [record.name, record.detail].filter(Boolean).join(' · ');
  if (distinction(record) === 'Única según el archivo') return 'La ficha dice «Botella Unica». El alcance de esa mención y el tiraje siguen por confirmar.';
  if (record.id === 'RET-1401' && record.name === 'Chinaco 30 Aniversario') return 'El estuche pintado, la botella y el tapón suelto aparecen juntos en la foto familiar. El archivo identifica esta presentación como el trigésimo aniversario de Chinaco.';
  if (record.id === 'RET-1505' && fold(record.detail).includes('cactus')) return 'El envase de cerámica toma la forma de un cactus. El pasaporte distingue el formato de la colección y el que sirvió de referencia para la acuarela.';
  if (distinction(record) === 'Serie de autor' && /^Diablo$/i.test(record.name)) return 'En esta serie, el artista cambia de una etiqueta a otra. La ficha de esta botella especifica '+record.detail.replace(/[()]/g,'')+'.';
  return 'Inscripción del catálogo familiar: '+evidence+'.';
}
export const settings = {
  nicho: { label:'El nicho', position:[-7.65,0,-6.6], scale:.83 },
  vitrina: { label:'La vitrina', position:[6.2,0,-3], scale:1 },
  mesa: { label:'La mesa', position:[4.65,1.53,9], scale:.30 }
};
export function settingFor(value) {
  return Object.hasOwn(settings,value) ? settings[value] : settings.vitrina;
}

export function exhibition(records, rotation = 0) {
  const pool = records.filter(r => distinction(r) && (r.photos.length || studyFor(r)));
  const date = new Date().toLocaleDateString('sv-SE',{timeZone:'America/Merida'});
  const day = Math.floor(Date.parse(date+'T00:00:00Z')/86400000);
  return Object.keys(settings).slice(0,pool.length).map((key,i) => ({
    key, record:pool[(day+rotation+i)%pool.length]
  }));
}
