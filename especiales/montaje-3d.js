import {loadPublicCollection} from '../archivo/coleccion-viva.js';
import {exhibition, settings} from '../archivo/curaduria.js';
import {exhibirPieza} from '../expositor-atlas.js';

export async function mountCabinet(THREE, scene, casona, targets) {
  const {catalog} = await loadPublicCollection();
  for (const {key,record} of exhibition(catalog.records)) {
    const item = await exhibirPieza({THREE,scene,record,montaje:key});
    item.face.userData.action = 'gabinete';
    casona.selectables.push(item.face);
    targets.push(item.face);
    if (key !== 'mesa') {
      const {position:[x,,z],scale:s} = settings[key];
      casona.obstacles.push([x-1.15*s,x+1.15*s,z-.65*s,z+.62*s]);
    }
  }
}
