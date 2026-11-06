// Materiales sintéticos para la propuesta nocturna. El color, el relieve y la
// rugosidad comparten las mismas coordenadas. No requieren shaders propios.
function createStoneMaterial(T, renderer, stone, compact) {
  const material = new T.MeshStandardMaterial({
    color: stone.fallback,
    roughness: stone.roughness,
    metalness: 0,
    bumpScale: stone.bumpScale
  });
  material.name = stone.name;
  const loader = new T.TextureLoader();
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const maps = [
    ['map', 'color'],
    ['roughnessMap', 'rugosidad'],
    ['bumpMap', 'relieve']
  ];
  material.userData.ready = Promise.all((compact ? maps.slice(0,1) : maps).map(async ([property, suffix]) => {
    const url = new URL('./assets/piedra/' + stone.slug + '-' + suffix + '.webp', import.meta.url).href;
    try {
      const texture = await loader.loadAsync(url);
      texture.colorSpace = property === 'map' ? T.SRGBColorSpace : T.NoColorSpace;
      texture.anisotropy = maxAnisotropy;
      if (stone.repeat) {
        texture.wrapS = texture.wrapT = T.RepeatWrapping;
        texture.repeat.set(...stone.repeat);
      }
      material[property] = texture;
      if (property === 'map') material.color.set(0xffffff);
      if (property === 'roughnessMap') material.roughness = 1;
      material.needsUpdate = true;
      return {property, loaded: true};
    } catch (error) {
      return {property, loaded: false, error: String(error)};
    }
  }));
  return material;
}

export function createStoneFloor(T, renderer, compact) {
  return createStoneMaterial(T, renderer, {
    name: 'Caliza cálida · losas de acabado apomazado',
    slug: 'losa', fallback: '#aa9c81', roughness: .68, bumpScale: .011,
    repeat: [22 / 6, 36 / 6]
  }, compact);
}

export function createBarStone(T, renderer, compact) {
  return createStoneMaterial(T, renderer, {
    name: 'Piedra verde veteada · cubierta satinada',
    slug: 'barra', fallback: '#465045', roughness: .48, bumpScale: .003
  }, compact);
}

