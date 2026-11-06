// Una fotografía o una cédula documental en un atril tridimensional.
// baseURL apunta al directorio que contiene las rutas `photos[].src` del catálogo.
function wrapText(context, value, width) {
  const words = String(value || '').trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (line && context.measureText(candidate).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function makePanel(THREE, width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({map: texture, toneMapped: false});
}

async function documentaryPhoto(record, baseURL) {
  const directory = new URL(baseURL, document.baseURI);
  if (!directory.pathname.endsWith('/')) directory.pathname += '/';
  const references = Array.isArray(record.photos) ? record.photos : [];
  for (const reference of references) {
    if (typeof reference.src !== 'string' || !reference.src) continue;
    const url = new URL(reference.src, directory);
    if (url.origin !== directory.origin || !url.pathname.startsWith(directory.pathname)) continue;
    try {
      const image = new Image();
      image.decoding = 'async';
      image.src = url.href;
      await image.decode();
      return {image, reference, status: 'available'};
    } catch {
      // El archivo puede ofrecer una segunda vista aunque la primera no esté disponible.
    }
  }
  return {image: null, reference: null, status: references.length ? 'error' : 'missing'};
}

export async function exhibirPieza({THREE, scene, record, baseURL}) {
  const photo = await documentaryPhoto(record, baseURL);
  const group = new THREE.Group();
  group.position.set(6.2, 0, -3);
  group.name = 'Vitrina del atlas · ' + record.id;
  group.userData.recordId = record.id;
  group.userData.photoStatus = photo.status;

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  const materials = new Set();
  function attach(geometry, material, size, position) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.receiveShadow = geometry === boxGeometry;
    group.add(mesh);
    materials.add(material);
    return mesh;
  }
  function box(material, width, height, depth, x, y, z) {
    return attach(boxGeometry, material, [width, height, depth], [x, y, z]);
  }

  const basalt = new THREE.MeshStandardMaterial({color: '#2c3530', roughness: .56});
  const lacquer = new THREE.MeshStandardMaterial({color: '#1c352e', roughness: .35});
  const brass = new THREE.MeshStandardMaterial({color: '#bf975c', metalness: .66, roughness: .35});
  const light = new THREE.MeshBasicMaterial({color: '#eed9ac', toneMapped: false});

  // Peana biselada por escalones de piedra, pedestal verde y pasamanos de latón.
  box(basalt, 2.18, .14, 1.10, 0, .07, 0);
  box(brass, 1.98, .028, 1.00, 0, .154, 0);
  box(lacquer, 1.74, .85, .84, 0, .59, 0);
  box(basalt, 2.09, .115, 1.01, 0, 1.075, 0);
  box(light, 1.92, .013, .018, 0, 1.025, .482);
  for (const x of [-.79, .79]) {
    box(brass, .057, 2.26, .057, x, 2.24, -.10);
  }
  box(lacquer, 1.75, 2.20, .13, 0, 2.25, -.105);
  for (const x of [-.859, .859]) box(brass, .025, 2.22, .052, x, 2.25, -.015);
  for (const y of [1.15, 3.35]) box(brass, 1.74, .024, .052, 0, y, -.015);
  box(light, 1.59, .015, .015, 0, 3.313, .008);

  const panel = makePanel(THREE, 768, 1008, c => {
    c.fillStyle = '#f5f1e7';
    c.fillRect(0, 0, 768, 1008);
    c.fillStyle = '#5d6252';
    c.font = '23px monospace';
    c.fillText('COLECCIÓN RETANA', 38, 52);
    c.fillStyle = '#ad9970';
    c.fillRect(38, 72, 692, 2);
    if (photo.image) {
      const paper = {x: 36, y: 98, width: 696, height: 792};
      const scale = Math.min(paper.width / photo.image.width, paper.height / photo.image.height);
      const w = scale * photo.image.width;
      const h = scale * photo.image.height;
      c.drawImage(photo.image, paper.x + (paper.width - w) / 2, paper.y + (paper.height - h) / 2, w, h);
      c.fillStyle = '#535747';
      c.font = '23px monospace';
      c.fillText(photo.reference.folio ? 'FOTOGRAFÍA · ' + photo.reference.folio : 'FOTOGRAFÍA DEL ARCHIVO', 38, 945, 692);
    } else {
      c.fillStyle = '#19382d';
      c.font = '55px Georgia, serif';
      c.fillText('Ficha documental', 38, 278, 692);
      c.font = '34px Georgia, serif';
      const details = [record.category, record.producer, record.volume].filter(Boolean).join(' · ');
      const lines = wrapText(c, details, 678);
      lines.slice(0, 8).forEach((line, i) => c.fillText(line, 40, 365 + i * 45, 678));
      c.font = '24px sans-serif';
      c.fillText(photo.status === 'missing' ? 'Fotografía pendiente de vincular' : 'Fotografía no disponible', 38, 930, 692);
    }
  });
  const face = attach(planeGeometry, panel, [1.64, 2.15, 1], [0, 2.25, .008]);
  face.userData.recordId = record.id;

  // La placa permanece legible con el alumbrado nocturno de la casona.
  const plaque = makePanel(THREE, 1024, 280, c => {
    c.fillStyle = '#19382e';
    c.fillRect(0, 0, 1024, 280);
    c.fillStyle = '#ead19a';
    c.font = '28px monospace';
    c.fillText(String(record.id), 30, 52);
    c.fillStyle = '#fff7e7';
    let size = 69;
    let lines;
    do {
      c.font = size + 'px Georgia, serif';
      lines = wrapText(c, record.name || 'Pieza sin nombre consignado', 962);
      if (lines.length <= 2 || size <= 38) break;
      size -= 5;
    } while (true);
    const leading = size * 1.1;
    const baseline = lines.length === 1 ? 184 : 143;
    lines.slice(0, 3).forEach((line, i) => c.fillText(line, 30, baseline + i * leading, 962));
  });
  box(brass, 1.80, .515, .045, 0, .725, .44);
  attach(planeGeometry, plaque, [1.76, .483, 1], [0, .725, .466]);
  scene.add(group);
  return {
    group,
    face,
    photoStatus: photo.status,
    dispose() {
      group.removeFromParent();
      boxGeometry.dispose();
      planeGeometry.dispose();
      for (const material of materials) {
        material.map?.dispose();
        material.dispose();
      }
    }
  };
}
