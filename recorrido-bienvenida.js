import * as THREE from './vendor/three.module.js';

// Follow the walkable route, rounding each turn only within the free aisle.
export function welcomePath(points, allowed) {
  const curve = new THREE.CurvePath();
  let previous = points[0];
  function lineTo(point) {
    if (previous.distanceToSquared(point) > 1e-10) curve.add(new THREE.LineCurve3(previous, point));
    previous = point;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const corner = points[i];
    const incoming = points[i-1].clone().sub(corner);
    const outgoing = points[i+1].clone().sub(corner);
    let radius = Math.min(1.45, incoming.length()*.42, outgoing.length()*.42);
    incoming.normalize();
    outgoing.normalize();
    let rounded = false;
    while (radius > .04) {
      const start = corner.clone().addScaledVector(incoming, radius);
      const end = corner.clone().addScaledVector(outgoing, radius);
      const turn = new THREE.QuadraticBezierCurve3(start, corner, end);
      if (turn.getPoints(32).every(p => allowed(p.x,p.z))) {
        lineTo(start);
        curve.add(turn);
        previous = end;
        rounded = true;
        break;
      }
      radius *= .5;
    }
    if (!rounded) lineTo(corner);
  }
  lineTo(points[points.length-1]);
  return curve;
}

export function easeBetween(time, start, end) {
  const t = THREE.MathUtils.clamp((time-start)/(end-start), 0, 1);
  return t*t*t*(t*(t*6-15)+10);
}
