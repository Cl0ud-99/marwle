import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;

export function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = (r, a, b) => a + (b - a) * r();
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  t.anisotropy = opts.anisotropy ?? 8;
  t.needsUpdate = true;
  return t;
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawSpacedText(ctx, text, cx, y, spacing = 0) {
  const widths = [...text].map(ch => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let x = cx - total / 2;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x + widths[i] / 2, y);
    x += widths[i];
  }
}

export function textTexture(opts) {
  const W = opts.width ?? 1024;
  const H = opts.height ?? 512;
  return canvasTexture(W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H);
    if (opts.bg) {
      ctx.fillStyle = opts.bg;
      if (opts.rounded) { roundRect(ctx, 4, 4, W - 8, H - 8, opts.radius ?? 40); ctx.fill(); }
      else ctx.fillRect(0, 0, W, H);
    }
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = opts.borderWidth ?? 8;
      roundRect(ctx, 14, 14, W - 28, H - 28, opts.radius ?? 40);
      ctx.stroke();
    }
    const fs = opts.fontSize ?? Math.round(H * .55);
    ctx.font = opts.font ?? ('900 ' + fs + 'px "Arial Black", "Arial", sans-serif');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (opts.shadow) {
      ctx.shadowColor = opts.shadow;
      ctx.shadowBlur = opts.shadowBlur ?? fs * .12;
      ctx.shadowOffsetY = opts.shadowOffsetY ?? fs * .05;
    }
    if (opts.stroke) {
      ctx.lineWidth = opts.strokeWidth ?? Math.max(3, fs * .06);
      ctx.strokeStyle = opts.stroke;
      ctx.strokeText(opts.text, W / 2, H / 2 + (opts.yOffset ?? 0));
    }
    if (opts.gradient) {
      const g = ctx.createLinearGradient(0, H * .15, 0, H * .9);
      for (const [p, c] of opts.gradient) g.addColorStop(p, c);
      ctx.fillStyle = g;
    } else ctx.fillStyle = opts.color ?? '#fff';
    drawSpacedText(ctx, opts.text, W / 2, H / 2 + (opts.yOffset ?? 0), opts.spacing ?? 0);
    ctx.shadowColor = 'transparent';
    if (opts.sub) {
      ctx.font = opts.subFont ?? ('600 ' + Math.round(fs * .22) + 'px "Outfit", sans-serif');
      ctx.fillStyle = opts.subColor ?? 'rgba(255,255,255,.8)';
      ctx.fillText(opts.sub, W / 2, H * .79);
    }
  }, { clamp: true, anisotropy: 8 });
}

export function glowTexture(size = 128, stops = null) {
  return canvasTexture(size, size, (ctx) => {
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    const s = stops ?? [[0, 'rgba(255,255,255,1)'], [.18, 'rgba(255,250,235,.85)'], [.45, 'rgba(255,226,190,.32)'], [1, 'rgba(255,200,150,0)']];
    for (const [p, c] of s) g.addColorStop(p, c);
    ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
  }, { clamp: true });
}

export function softCloudTexture(size = 256) {
  const puffs = [
    [.50,.56,.18,.14],[.34,.59,.16,.12],[.66,.59,.17,.12],
    [.42,.45,.15,.12],[.58,.46,.14,.11],[.50,.38,.12,.10],
    [.24,.63,.11,.08],[.76,.63,.10,.07]
  ];
  return canvasTexture(size, size, (ctx) => {
    ctx.clearRect(0, 0, size, size);
    const blob = (fx, fy, frx, fry, a, col) => {
      const rx = frx*size, ry = fry*size, R = Math.max(rx,ry);
      ctx.save(); ctx.translate(fx*size, fy*size); ctx.scale(rx/R, ry/R);
      const g = ctx.createRadialGradient(0, -R*.2, R*.015, 0, 0, R);
      g.addColorStop(0, 'rgba(' + col + ',' + a + ')');
      g.addColorStop(.32, 'rgba(' + col + ',' + (a*.83) + ')');
      g.addColorStop(.64, 'rgba(' + col + ',' + (a*.35) + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ctx.fill(); ctx.restore();
    };
    for (const p of puffs) blob(p[0], p[1]+.035, p[2]*1.04, p[3]*.88, .42, '154,194,222');
    for (const p of puffs) blob(p[0], p[1], p[2], p[3], .9, '255,252,245');
    for (const p of puffs) blob(p[0]-.015, p[1]-.03, p[2]*.7, p[3]*.62, .55, '255,255,250');
  }, { clamp: true });
}

export function rBox(w, h, d, r = .06, seg = 3) {
  seg = Math.min(seg, 2);
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w * .45, h * .45, d * .45));
}
export function cyl(rt, rb, h, seg = 32, open = false) { return new THREE.CylinderGeometry(rt, rb, h, Math.min(seg, 40), 1, open); }
export function sphere(r = 1, w = 32, h = 24) { return new THREE.SphereGeometry(r, Math.min(w, 24), Math.min(h, 16)); }
export function plane(w, h, ws = 1, hs = 1) { return new THREE.PlaneGeometry(w, h, ws, hs); }

export function mesh(geo, mat, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (opts.pos) m.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
  if (opts.rot) m.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
  if (opts.scale) m.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
  m.castShadow = opts.castShadow ?? true;
  m.receiveShadow = opts.receiveShadow ?? true;
  if (opts.name) m.name = opts.name;
  if (opts.renderOrder !== undefined) m.renderOrder = opts.renderOrder;
  return m;
}

export function tube(points, radius, mat, tubular = 48, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => p instanceof THREE.Vector3 ? p : new THREE.Vector3(...p)), closed, 'catmullrom', .1);
  const g = new THREE.TubeGeometry(curve, tubular, radius, radial, closed);
  return new THREE.Mesh(g, mat);
}

export function cylinderBetween(a, b, r, mat, seg = 12) {
  const av = a instanceof THREE.Vector3 ? a : new THREE.Vector3(...a);
  const bv = b instanceof THREE.Vector3 ? b : new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(bv, av);
  const len = dir.length();
  const m = new THREE.Mesh(cyl(r, r, len, seg), mat);
  m.position.copy(av).add(bv).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function starShape(radius = .2, inner = .46, spikes = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < spikes * 2; i++) {
    const a = i * Math.PI / spikes - Math.PI / 2;
    const r = i % 2 ? radius * inner : radius;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath(); return s;
}

export function starGeo(radius = .2, depth = .05) {
  return new THREE.ExtrudeGeometry(starShape(radius), { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: radius*.06, bevelThickness: depth*.3, curveSegments: 3 });
}

export function makeInstanced(geo, mat, transforms, cast = true, receive = true) {
  const im = new THREE.InstancedMesh(geo, mat, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((t, i) => {
    dummy.position.set(t.x ?? 0, t.y ?? 0, t.z ?? 0);
    if (t.rot) dummy.rotation.set(t.rot[0] ?? 0, t.rot[1] ?? 0, t.rot[2] ?? 0);
    else dummy.rotation.set(0,0,0);
    const s = t.scale ?? 1;
    if (Array.isArray(s)) dummy.scale.set(...s); else dummy.scale.setScalar(s);
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
  });
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = cast; im.receiveShadow = receive;
  return im;
}

/** Merge ordinary opaque meshes sharing a material into a few draw calls. */
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    if (!o.visible || o.userData.noMerge) return;
    const mat = o.material;
    if (Array.isArray(mat) || !mat || mat.transparent || mat.isShaderMaterial || mat.depthWrite === false) return;
    if (!o.geometry || !o.geometry.attributes.position) return;
    const key = mat.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat, geos: [], meshes: [] });
    const b = buckets.get(key);
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const name of Object.keys(g.attributes)) {
      if (!['position','normal','uv'].includes(name)) g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const n = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    g.morphAttributes = {};
    b.geos.push(g); b.meshes.push(o);
  });
  const merged = [];
  const container = new THREE.Group();
  container.name = 'merged-static';
  for (const { mat, geos, meshes } of buckets.values()) {
    if (geos.length < 2) continue;
    const g = mergeGeometries(geos, false);
    if (!g) continue;
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    container.add(m);
    merged.push(m);
    for (const old of meshes) old.parent?.remove(old);
  }
  root.add(container);
  return { merged, count: merged.length };
}

export function setShadows(root, cast = true, receive = true) {
  root.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
}

export function makeFlagTexture(colorA = '#ff5d7e', colorB = '#ffe27a') {
  return canvasTexture(512, 768, (ctx, w, h) => {
    ctx.fillStyle = colorA; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = colorB;
    ctx.beginPath(); ctx.moveTo(0, h*.52); ctx.quadraticCurveTo(w*.5, h*.38, w, h*.58); ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = '900 190px Bungee, Arial Black, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('M', w*.5, h*.28);
    ctx.beginPath(); ctx.arc(w*.5, h*.75, w*.13, 0, TAU); ctx.fill();
    ctx.fillStyle = colorA; ctx.beginPath(); ctx.arc(w*.5, h*.75, w*.075, 0, TAU); ctx.fill();
  }, { clamp: true });
}