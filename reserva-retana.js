import * as T from './vendor/three.module.js';

// La altura de cada apoyo es la cara superior de la barra o del tablero.
export const reservaViews = {
  bar: {base: [-1.25, 1.65, 14.32], from: [-.5, 2.55, 12.65], text: 'Reserva Retana en la barra · Toca la botella'},
  dining: {base: [3.85, 1.53, 9.82], from: [2.08, 2.55, 12.08], text: 'Reserva Retana en la mesa · Toca la botella'}
};

function roundedSections(rings) {
  const vertices = [], indices = [], sides = 32;
  const rounded = v => Math.sign(v) * Math.abs(v)**.48;
  for (const [y, width, depth] of rings) {
    for (let i=0; i<sides; i++) {
      const angle = 2*Math.PI*i/sides;
      vertices.push(width*rounded(Math.cos(angle)), y, depth*rounded(Math.sin(angle)));
    }
  }
  for (let row=0; row<rings.length-1; row++) {
    for (let i=0; i<sides; i++) {
      const a=row*sides+i, b=row*sides+(i+1)%sides;
      indices.push(a,a+sides,b, b,a+sides,b+sides);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function mountReserva(scene, selectables, wood) {
  const prototype = new T.Group();
  const profile = [[0,.001,.001],[.012,.16,.092],[.04,.19,.115],[.56,.19,.115],
    [.59,.184,.11],[.64,.14,.09],[.69,.065,.059],[.71,.057,.056],
    [.78,.057,.056],[.79,.066,.063],[.82,.066,.063],[.823,.001,.001]];
  const glass = new T.MeshStandardMaterial({color:0xfff2d9, roughness:.1, metalness:.48, transparent:true, opacity:.38, depthWrite:false});
  const body = new T.Mesh(roundedSections(profile),glass);
  body.renderOrder = 2;
  prototype.add(body);
  const liquid = new T.Mesh(roundedSections([[.04,.001,.001],[.05,.16,.09],[.07,.18,.106],
    [.56,.18,.106],[.585,.174,.102],[.586,.001,.001]]),
    new T.MeshStandardMaterial({color:0xe2aa54,roughness:.16,transparent:true,opacity:.78,depthWrite:false}));
  liquid.renderOrder = 1;
  prototype.add(liquid);
  const cap = new T.Mesh(new T.CylinderGeometry(.08,.08,.09,24),wood);
  cap.position.y = .861;
  prototype.add(cap);
  const cork = new T.Mesh(new T.CylinderGeometry(.043,.043,.09,16),new T.MeshStandardMaterial({color:0xc99d68}));
  cork.position.y = .779;
  prototype.add(cork);
  const label = new T.TextureLoader().load('botella/reserva-etiqueta.png');
  label.colorSpace = T.SRGBColorSpace;
  const front = new T.Mesh(new T.PlaneGeometry(.315,.386),new T.MeshBasicMaterial({map:label,toneMapped:false}));
  front.position.set(0,.335,.117);
  prototype.add(front);
  for (const [zone, view] of Object.entries(reservaViews)) {
    const bottle = prototype.clone();
    bottle.name = 'Reserva Retana · ' + zone;
    bottle.position.fromArray(view.base);
    bottle.rotation.y = Math.atan2(view.from[0]-view.base[0],view.from[2]-view.base[2]);
    scene.add(bottle);
    for (const part of bottle.children) {
      part.userData.action = 'reserva';
      selectables.push(part);
    }
    view.to = [view.base[0], view.base[1]+.39, view.base[2]];
  }
}
