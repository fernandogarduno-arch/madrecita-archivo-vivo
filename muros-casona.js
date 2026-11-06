import * as THREE from './vendor/three.module.js';

// Coordenadas de las caras interiores. La UV horizontal recorre la esquina
// desde el muro de la televisión hacia el del cuadro, en unidades de la sala.
const halfWidth = 10.85;
const halfDepth = 17.85;
const height = 7.3;
const tileSize = 4;

function wallPanel(width, startDistance, material,compact) {
  const geometry = new THREE.PlaneGeometry(
    width, height, compact ? 1 : Math.ceil(width / 0.15), compact ? 1 : Math.ceil(height / 0.15)
  );
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;

  for (let i = 0; i < positions.count; i++) {
    const distance = startDistance + positions.getX(i) + width / 2;
    uvs.setXY(i, distance / tileSize, (positions.getY(i) + height / 2) / tileSize);
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

export function createStoneWalls(scene, renderer, compact) {
  const material = new THREE.MeshStandardMaterial({
    name: 'Piedra careada de la colección',
    color: '#9e8e77',
    roughness: 0.95,
    metalness: 0,
    normalScale: new THREE.Vector2(0.88, 0.88),
    displacementScale: 0.048
  });

  const tvWall = wallPanel(halfWidth * 2, 0, material,compact);
  tvWall.name = 'Piedra · muro de la televisión';
  tvWall.position.set(0, height / 2, -halfDepth);

  const artWall = wallPanel(halfDepth * 2, halfWidth * 2, material,compact);
  artWall.name = 'Piedra · muro del cuadro';
  artWall.rotation.y = -Math.PI / 2;
  artWall.position.set(halfWidth, height / 2, 0);
  scene.add(tvWall, artWall);

  // Una luz desde el riel existente revela el relieve del paño del fondo.
  const wallWash = new THREE.SpotLight('#ffe6c3', 78, 15, 0.92, 0.9, 2);
  wallWash.position.set(5.8, 6.70, -14.2);
  wallWash.target.position.set(2.0, 2.90, -halfDepth);
  scene.add(wallWash, wallWash.target);

  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const maps = [
    ['map', 'color'],
    ['normalMap', 'normal'],
    ['roughnessMap', 'rugosidad'],
    ['displacementMap', 'altura']
  ];
  const layers = compact ? maps.filter(([slot]) => slot === 'map' || slot === 'normalMap') : maps;
  return Promise.all(layers.map(async ([slot, suffix]) => {
    const url = new URL('./assets/mamposteria/muro-' + suffix + '.webp', import.meta.url);
    try {
      const texture = await loader.loadAsync(url.href);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = anisotropy;
      texture.colorSpace = slot === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      material[slot] = texture;
      if (slot === 'map') material.color.set(0xffffff);
      material.needsUpdate = true;
      return { property: slot, loaded: true };
    } catch (error) {
      return { property: slot, loaded: false, error: String(error) };
    }
  }));
}

