import {loadPublicCollection} from '../archivo/coleccion-viva.js';
import {modelCatalog,showroomSelection} from './catalogo-modelos.js';
import {settings} from '../archivo/curaduria.js';
import {exhibirPieza} from '../expositor-atlas.js';

export async function mountCabinet(THREE, scene, casona, targets) {
  const [{catalog},models] = await Promise.all([loadPublicCollection(),modelCatalog().catch(()=>({}))]);
  for (const {key,record} of showroomSelection(catalog.records,models)) {
    const item = await exhibirPieza({THREE,scene,record,montaje:key});
    item.face.userData.action = item.model ? 'modelo' : 'gabinete';
    casona.selectables.push(item.face);
    targets.push(item.face);
    if (key !== 'mesa') {
      const {position:[x,,z],scale:s} = settings[key];
      casona.obstacles.push([x-1.15*s,x+1.15*s,z-.65*s,z+.62*s]);
    }
  }
}
