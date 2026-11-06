import * as THREE from './vendor/three.module.js';

const center = new THREE.Vector3(10.70, 2.75, 13.35);
const start = new THREE.Vector3(5.35, 2.8, 15.6);

export function entranceView(camera) {
  camera.position.copy(start);
  const direction = center.clone().sub(start);
  return [Math.atan2(-direction.x, -direction.z), Math.atan2(direction.y, Math.hypot(direction.x, direction.z))];
}

export function mountPlaque(scene, renderer) {
  const mount = new THREE.Group();
  mount.name = 'Dedicatoria de Jesús a su madre';
  mount.position.copy(center);
  mount.rotation.y = -Math.PI / 2;
  scene.add(mount);
  const width = 2.65, height = 1.68;
  const rim = new THREE.Mesh(new THREE.BoxGeometry(width + .07, height + .07, .10),
    new THREE.MeshStandardMaterial({color:0xbd9254, metalness:.55, roughness:.36}));
  mount.add(rim);
  const canvas = document.createElement('canvas');
  canvas.width = 1400; canvas.height = 888;
  const ctx = canvas.getContext('2d');
  const ground = ctx.createLinearGradient(0, 0, 1400, 888);
  ground.addColorStop(0, '#334b3d'); ground.addColorStop(.58, '#193129'); ground.addColorStop(1, '#10251f');
  ctx.fillStyle = ground; ctx.fillRect(0, 0, 1400, 888);
  ctx.strokeStyle = '#bca371'; ctx.lineWidth = 3; ctx.strokeRect(34, 34, 1332, 820);
  ctx.lineWidth = 1; ctx.strokeRect(44, 44, 1312, 800);
  for (const x of [64, 1336]) for (const y of [64, 824]) {
    ctx.fillStyle = '#bba276'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 2*Math.PI); ctx.fill();
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#f6e7c9';
  ctx.font = '112px Georgia, serif'; ctx.fillText('Retana', 700, 495);
  ctx.font = 'italic 47px Georgia, serif'; ctx.fillText('Para ti, mamá, con todo nuestro amor.', 700, 599);
  ctx.fillStyle = '#d1b786'; ctx.fillRect(640, 660, 120, 2);
  ctx.font = '36px Georgia, serif'; ctx.fillText('Jesús Retana', 700, 740);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const logo = new Image();
  logo.onload = () => { ctx.drawImage(logo, 606, 105, 188, 227); texture.needsUpdate = true; };
  logo.src = new URL('./assets/retana-agave-claro.svg',import.meta.url).href;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width,height),
    new THREE.MeshBasicMaterial({map:texture, toneMapped:false}));
  face.position.z = .055; face.userData.action = 'dedication'; mount.add(face);
  const anchor = mount.localToWorld(new THREE.Vector3(0, -height/2 - .13, .06));
  const projection = new THREE.Vector3();
  const actions = document.getElementById('plaque-actions');
  return { face, update(camera, available) {
    projection.copy(anchor).project(camera);
    const visible = available && camera.position.distanceTo(center) < 8 && Math.abs(projection.x)<.82 &&
      Math.abs(projection.y)<.73 && projection.z>0 && projection.z<1;
    actions.hidden = !visible;
    if (visible) {
      actions.style.left = (projection.x*.5+.5)*100+'%';
      actions.style.top = (.5-projection.y*.5)*100+'%';
    }
  }};
}
