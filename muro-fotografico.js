// Recorrido de referencia. Las regiones de fotografía mantienen sus píxeles originales.
// Cada región se proyecta con una homografía sobre una superficie de profundidad relativa.
// El orden de las regiones y las dimensiones del muro son una composición interpretativa.

const PHOTO_SIZE = { width: 960, height: 1280 };
const BAY_COUNT = 10;
const WALL_LENGTH = 34;
const BAY_WIDTH = WALL_LENGTH / BAY_COUNT;
const LEVELS = [.08, .62, 1.34, 2.24, 3.21, 4.24, 5.31, 6.46];

// Coordenadas en píxeles: superior izquierda, superior derecha, inferior derecha, inferior izquierda.
// Cada cuadrilátero excluye la mayor parte del propio tablón, que se modela por separado.
const REGIONS = {
  '1a': [1, [8,103], [567,231], [567,361], [8,270]],
  '1b': [1, [8,348], [567,426], [567,563], [8,553]],
  '1c': [1, [8,594], [567,609], [567,772], [8,823]],
  '1d': [1, [8,874], [567,817], [567,1000], [8,1138]],
  '1e': [1, [366,1111], [915,979], [915,1072], [366,1234]],
  '1g': [1, [541,1206], [812,1115], [812,1173], [541,1275]],
  '2a': [2, [10,40], [618,259], [618,353], [10,215]],
  '2b': [2, [10,289], [618,410], [618,529], [10,551]],
  '2c': [2, [10,607], [618,566], [618,653], [10,823]],
  '2d': [2, [22,902], [620,709], [620,796], [22,1138]],
  '3a': [3, [564,89], [800,189], [800,295], [564,217]],
  '3b': [3, [564,305], [800,380], [800,455], [564,415]],
  '3c': [3, [569,467], [862,508], [862,606], [569,606]],
  '3d': [3, [571,628], [859,632], [859,752], [571,788]],
  '4a': [4, [506,413], [768,303], [768,429], [506,504]],
  '4b': [4, [504,540], [759,483], [759,635], [504,638]],
  '4c': [4, [503,662], [759,657], [759,820], [503,777]],
  '5a': [5, [323,115], [738,1], [738,92], [323,247]],
  '5b': [5, [344,333], [907,222], [907,526], [344,542]],
  '5c': [5, [245,583], [913,581], [913,990], [245,816]],
  '5d': [5, [246,881], [891,1045], [891,1253], [246,1119]],
  '6a': [6, [147,50], [365,249], [365,319], [147,198]],
  '6b': [6, [142,247], [364,366], [364,476], [142,407]],
  '6c': [6, [137,451], [364,520], [364,661], [137,665]],
  '6d': [6, [139,702], [359,687], [359,828], [139,867]],
  '6e': [6, [136,911], [357,853], [357,953], [136,1066]],
  '6f': [6, [145,1098], [358,983], [358,1047], [145,1186]],
  '6g': [6, [174,1215], [487,1041], [487,1091], [174,1271]],
};

// El primer renglón es el zócalo iluminado; las seis fotos guían la secuencia y el ritmo.
const BAYS = [
  ['6f','1e','6e','1c','1b','2b','1a'],
  ['1e','6f','1d','2c','2b','2a','3a'],
  ['6f','6e','5d','5c','5b','5a','3b'],
  ['1e','6f','2d','3d','3c','3b','3a'],
  ['6f','1e','6e','4c','4b','4a','2a'],
  ['1e','6f','1d','1c','1b','1a','6a'],
  ['6f','1e','2d','2c','3c','6b','2a'],
  ['1e','6f','5d','5c','5b','5a','1a'],
  ['6f','1e','1d','4c','4b','4a','3b'],
  ['1e','6f','6e','6d','6c','6b','6a'],
];

function homography(corners) {
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] = corners;
  const ax = x1-x2, bx = x3-x2, cx = x0-x1+x2-x3;
  const ay = y1-y2, by = y3-y2, cy = y0-y1+y2-y3;
  const determinant = ax*by-bx*ay;
  const g = (cx*by-bx*cy)/determinant;
  const h = (ax*cy-cx*ay)/determinant;
  return (u,v) => {
    const w = 1+g*u+h*v;
    return [
      (x0+(x1-x0+g*x1)*u+(x3-x0+h*x3)*v)/w/PHOTO_SIZE.width,
      1-(y0+(y1-y0+g*y1)*u+(y3-y0+h*y3)*v)/w/PHOTO_SIZE.height,
    ];
  };
}

function estimatedAspect(corners) {
  // El rectángulo de la foto está en perspectiva. Recuperamos la relación aproximada de sus
  // ejes con una focal de trabajo en píxeles, suficiente para preservar la esbeltez de los envases.
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] = corners;
  const ax=x1-x2,bx=x3-x2,cx=x0-x1+x2-x3,ay=y1-y2,by=y3-y2,cy=y0-y1+y2-y3;
  const det=ax*by-bx*ay,g=(cx*by-bx*cy)/det,h=(ax*cy-cx*ay)/det;
  const norm=(a,b,k)=>Math.hypot(a-480*k,b-640*k,930*k);
  return norm(x1-x0+g*x1,y1-y0+g*y1,g) / norm(x3-x0+h*x3,y3-y0+h*y3,h);
}

function addPhotoRegion(batch, key, row, leftZ, width, uSpan) {
  const columns = 16, subdivisions = 8;
  const uvAt = homography(REGIONS[key].slice(1));
  const start = batch.positions.length/3;
  const bottom = LEVELS[row]+.045, top = LEVELS[row+1]-.045;
  for (let j=0;j<=subdivisions;j++) {
    const v = j/subdivisions;
    // Una capa por hueco conserva rectos los recipientes al verlos de lado.
    // Los cantos, ménsulas, vitrinas y largueros avanzan físicamente delante de esa capa.
    const x = -10.17;
    for (let i=0;i<=columns;i++) {
      const u = i/columns;
      batch.positions.push(x, top-(top-bottom)*v, leftZ-width*u);
      batch.uvs.push(...uvAt((1-uSpan)*.5+u*uSpan,v));
      if (i<columns && j<subdivisions) {
        const a = start+j*(columns+1)+i, c = a+columns+1;
        batch.indices.push(a,c,a+1,a+1,c,c+1);
      }
    }
  }
}

function addPhotographicInterior(T, group, renderer) {
  const batches = new Map();
  const complements=['6g','1e','1d','1c','1b','4b','1a'];
  BAYS.forEach((regions,bay) => regions.forEach((originalKey,row) => {
    const height=LEVELS[row+1]-LEVELS[row]-.09;
    const primary = row===0 ? (bay%2 ? '1g' : '6g') : originalKey;
    const widthOf=key=>estimatedAspect(REGIONS[key].slice(1))*height;
    const nativeWidth=widthOf(primary);
    const pairs=nativeWidth<BAY_WIDTH*.77 ? [[primary,nativeWidth],[complements[row],BAY_WIDTH-nativeWidth]] : [[primary,BAY_WIDTH]];
    let leftZ=WALL_LENGTH/2-bay*BAY_WIDTH;
    for(const [key,width] of pairs){
      const source=REGIONS[key][0];
      if(!batches.has(source))batches.set(source,{positions:[],uvs:[],indices:[]});
      addPhotoRegion(batches.get(source),key,row,leftZ,width,Math.min(1,width/widthOf(key)));
      leftZ-=width;
    }
  }));
  const loader = new T.TextureLoader();
  const ready = [];
  for (const [source,batch] of batches) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(batch.positions,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(batch.uvs,2));
    geometry.setIndex(batch.indices);
    const material = new T.MeshBasicMaterial({color:0x70543a,toneMapped:false});
    const mesh = new T.Mesh(geometry,material);
    mesh.name = `Celdas fotográficas · ${source}.jpeg`;
    group.add(mesh);
    const url = new URL(`./assets/muro/foto-${source}.jpeg`,import.meta.url).href;
    ready.push(loader.loadAsync(url).then(texture => {
      texture.colorSpace = T.SRGBColorSpace;
      texture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
      material.map = texture;
      material.color.set('#cfb998');
      material.needsUpdate = true;
      return {source,loaded:true};
    }).catch(error => ({source,loaded:false,error:String(error)})));
  }
  return Promise.all(ready);
}

function makeTimber(T) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = '#69412b';
  c.fillRect(0,0,512,128);
  for (let line=0;line<95;line++) {
    const y = (line*19.37)%128;
    c.beginPath();
    c.moveTo(0,y);
    c.bezierCurveTo(110,y+Math.sin(line)*3,340,y-Math.cos(line)*2,512,y);
    c.strokeStyle = line%3 ? 'rgba(60,31,16,.15)' : 'rgba(219,172,111,.15)';
    c.lineWidth = .45+(line%5)*.18;
    c.stroke();
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  return new T.MeshStandardMaterial({map,color:'#b1a092',roughness:.54,metalness:.02});
}

function buildFurniture(T, group, obstacles) {
  const walnut = makeTimber(T);
  const black = new T.MeshStandardMaterial({color:'#222320',roughness:.44,metalness:.34});
  const iron = new T.MeshStandardMaterial({color:'#454741',roughness:.37,metalness:.64});
  const bronze = new T.MeshStandardMaterial({color:'#a79672',roughness:.35,metalness:.7});
  const diffuser = new T.MeshBasicMaterial({color:'#ffedc6',toneMapped:false});
  const starts = new Map();
  const transform = new T.Object3D();
  function cuboid(material,size,center,rotationZ=0) {
    if (!starts.has(material)) starts.set(material,[]);
    transform.position.set(...center);
    transform.rotation.set(0,0,rotationZ);
    transform.scale.set(...size);
    transform.updateMatrix();
    starts.get(material).push(transform.matrix.clone());
  }
  for (let row=1;row<LEVELS.length;row++) {
    const m = row<=2 ? black : walnut;
    cuboid(m,[1.09,.09,WALL_LENGTH],[-10.18,LEVELS[row],0]);
    cuboid(row<=2 ? black : walnut,[.06,.12,WALL_LENGTH],[-9.66,LEVELS[row]-.007,0]);
  }
  for (let bay=0;bay<=BAY_COUNT;bay++) {
    const z = WALL_LENGTH/2-bay*BAY_WIDTH;
    cuboid(black,[.12,6.44,.115],[-9.67,3.25,z]);
    for (const y of LEVELS.slice(2,-1)) cuboid(black,[.75,.085,.11],[-10.04,y-.065,z]);
  }
  cuboid(black,[1.12,.29,WALL_LENGTH+.14],[-10.15,6.6,0]);
  cuboid(diffuser,[1.03,.065,WALL_LENGTH],[-10.18,.055,0]);
  cuboid(diffuser,[.04,.04,WALL_LENGTH],[-9.65,.12,0]);
  // Tres cubiertas transparentes como las visibles en 2.jpeg.
  const glass = new T.MeshPhysicalMaterial({color:'#f4eece',transparent:true,opacity:.085,
    roughness:.18,metalness:0,depthWrite:false});
  for (let bay=0;bay<BAY_COUNT;bay++) {
    const row = BAYS[bay].indexOf('2c');
    if (row<0) continue;
    const left = WALL_LENGTH/2-bay*BAY_WIDTH;
    for (let k=0;k<3;k++) {
      const z = left-.7-k*.99;
      const y = LEVELS[row]+.42;
      cuboid(glass,[.04,.78,.86],[-9.86,y,z]);
      cuboid(glass,[.52,.025,.86],[-10.12,y+.39,z]);
      cuboid(black,[.55,.035,.9],[-10.12,LEVELS[row]+.065,z]);
    }
  }
  // Vista 3 confirma madera en largueros y peldaños; placas oscuras en las caras exteriores.
  const ladderZ = -7.6, ladderBase = -9.08, tilt = .075;
  const ladderX = y => ladderBase-y*Math.tan(tilt);
  for (const side of [-.44,.44]) {
    cuboid(walnut,[.14,6.5,.13],[ladderX(3.25),3.25,ladderZ+side],tilt);
    for (const y of [1.2,3.4,5.8]) {
      cuboid(iron,[.025,.34,.132],[ladderX(y)+.08,y,ladderZ+side],tilt);
      cuboid(bronze,[.028,.035,.035],[ladderX(y)+.105,y+.10,ladderZ+side]);
      cuboid(bronze,[.028,.035,.035],[ladderX(y)+.105,y-.10,ladderZ+side]);
    }
  }
  for (let y=.32;y<6.45;y+=.44) cuboid(walnut,[.18,.095,.89],[ladderX(y),y,ladderZ],tilt);
  obstacles.push([-9.72,-8.96,ladderZ-.54,ladderZ+.54]);
  const cube = new T.BoxGeometry(1,1,1);
  for (const [material,matrices] of starts) {
    const instanced = new T.InstancedMesh(cube,material,matrices.length);
    matrices.forEach((matrix,index) => instanced.setMatrixAt(index,matrix));
    instanced.castShadow = !material.transparent && material !== diffuser;
    instanced.receiveShadow = !material.transparent;
    group.add(instanced);
  }
}

function addStationPlates(T, group, pieces, selectables, markerPoints) {
  const bronze = new T.MeshStandardMaterial({color:'#ae8d52',roughness:.35,metalness:.68});
  const rimGeometry = new T.CylinderGeometry(.19,.19,.04,28);
  pieces.forEach((piece,index) => {
    const anchor = new T.Group();
    anchor.name = `Estación editorial ${index+1}`;
    anchor.position.set(-9.53,2.24,piece.z);
    group.add(anchor);
    const rim = new T.Mesh(rimGeometry,bronze);
    rim.rotation.z = -Math.PI/2;
    rim.userData.piece = index;
    anchor.add(rim);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const c = canvas.getContext('2d');
    c.fillStyle = '#203b31';
    c.fillRect(0,0,128,128);
    c.strokeStyle = '#c8ad72';
    c.lineWidth = 2;
    c.beginPath();c.arc(64,64,58,0,Math.PI*2);c.stroke();
    c.fillStyle = '#f7ebcf';
    c.font = '56px Georgia,serif';c.textAlign='center';c.textBaseline='middle';
    c.fillText(String(index+1).padStart(2,'0'),64,65);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    const plate = new T.Mesh(new T.CircleGeometry(.175,28),
      new T.MeshBasicMaterial({map:texture,toneMapped:false}));
    plate.position.x = .023;
    plate.rotation.y = Math.PI/2;
    plate.userData.piece = index;
    anchor.add(plate);
    selectables.push(rim,plate);
    markerPoints.push(new T.Vector3(-9.53,2.66,piece.z));
  });
}

export function createPhotoWall({ THREE:T, scene, renderer, selectables, markerPoints, obstacles }) {
  const group = new T.Group();
  group.name = 'Muro de la colección · interpretación fotográfica';
  scene.add(group);
  const ready = addPhotographicInterior(T,group,renderer);
  buildFurniture(T,group,obstacles);
  return {group,ready,addStations(pieces){addStationPlates(T,group,pieces,selectables,markerPoints);}};
}
