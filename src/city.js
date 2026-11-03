import * as THREE from 'three';
import { MAT, TEX } from './materials.js';
import {
  rBox, mesh, plane, cyl, sphere, rng, TAU, canvasTexture, textTexture,
  makeInstanced, mergeStatic, setShadows, roundRect, DETAIL, setDetail,
  torus
} from './utils.js';
import {
  createFizzDome, createDreamTower, createMarwleHall, createGenericBuilding,
  createSunPalace, billboard
} from './architecture.js';
import {
  createLamp, createTree, createShrubPlanter, createBench, createCar, createScooter,
  createPerson, animatePerson, createCafeSet, createFountain, createPennantLine,
  createDrone, createPetalField, contactShadow, createCandyCart
} from './props.js';
import { createWaterMirror } from './water.js';

const V = (x,y,z) => new THREE.Vector3(x,y,z);

function clockFaceTexture() {
  return canvasTexture(512, 512, (ctx) => {
    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = '#fff6e0';
    ctx.beginPath(); ctx.arc(256, 256, 238, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c9973f'; ctx.lineWidth = 16; ctx.stroke();
    ctx.strokeStyle = '#2b2233'; ctx.lineWidth = 8;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190);
      ctx.lineTo(256 + Math.cos(a) * 216, 256 + Math.sin(a) * 216);
      ctx.stroke();
    }
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(256, 256); ctx.lineTo(256, 118); ctx.stroke();
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(256, 256); ctx.lineTo(350, 292); ctx.stroke();
    ctx.fillStyle = '#c9973f';
    ctx.beginPath(); ctx.arc(256, 256, 16, 0, TAU); ctx.fill();
  }, { clamp: true });
}

/** Sugar Clock Tower: the second district's vertical landmark. */
function createClockTower() {
  const g = new THREE.Group();
  const face = clockFaceTexture();
  add(g, rBox(12, 7, 12, .8, 4), MAT.paint_cream, [0, 3.5, 0]);
  add(g, rBox(13, .6, 13, .18, 2), MAT.paint_coral, [0, 7.2, 0]);
  // street-facing gatehouse: arched glass door, gold surround, lit side windows
  for (const sz of [-1, 1]) {
    const z = sz * 6.06;
    add(g, plane(4.6, 5.4), MAT.glassDark, [0, 2.8, z], { rot:[0, sz < 0 ? Math.PI : 0, 0], cast:false, receive:false });
    add(g, rBox(5.4, .3, .35, .06, 2), MAT.gold, [0, 5.72, sz * 6.08]);
    add(g, rBox(.3, 5.4, .35, .06, 2), MAT.gold, [-2.6, 2.8, sz * 6.08]);
    add(g, rBox(.3, 5.4, .35, .06, 2), MAT.gold, [2.6, 2.8, sz * 6.08]);
    for (const x of [-4.3, 4.3]) {
      add(g, plane(1.25, 1.7), MAT.glassWarm, [x, 3.5, sz * 6.05], { rot:[0, sz < 0 ? Math.PI : 0, 0], cast:false, receive:false });
      add(g, rBox(1.45, .14, .22, .03, 2), MAT.gold, [x, 4.4, sz * 6.07]);
      add(g, rBox(1.45, .14, .22, .03, 2), MAT.gold, [x, 2.6, sz * 6.07]);
    }
    add(g, rBox(9.0, .18, 1.1, .04, 2), MAT.paint_coral, [0, .25, sz * 6.5]);
  }
  add(g, cyl(4.6, 5.8, 16, 48), MAT.paint_teal, [0, 15.5, 0]);
  for (let i = 0; i < 4; i++) add(g, torus(5.0 + i * .15, .10, 8, 48), MAT.gold, [0, 9 + i * 3.2, 0], { rot:[Math.PI/2, 0, 0] });
  add(g, rBox(9, 7, 9, .6, 3), MAT.paint_cream, [0, 27, 0]);
  add(g, rBox(9.4, .5, 9.4, .14, 2), MAT.gold, [0, 30.6, 0]);
  const sign = MAT.sign(face, 1);
  for (const [x, z, ry] of [[0, 4.52, 0], [0, -4.52, Math.PI], [4.52, 0, Math.PI/2], [-4.52, 0, -Math.PI/2]]) {
    add(g, plane(6.4, 6.4), sign, [x, 27, z], { rot:[0, ry, 0], cast:false, receive:false });
    add(g, torus(3.35, .12, 8, 48), MAT.gold, [x, 27, z], { rot:[0, ry, 0], cast:false });
  }
  add(g, cyl(3.4, 3.9, 5, 32), MAT.glassWarm, [0, 33.5, 0]);
  add(g, new THREE.CylinderGeometry(3.6, 2.6, 5, 32), MAT.paint_coral, [0, 38.5, 0]);
  add(g, cyl(.10, .16, 6, 8), MAT.gold, [0, 43.5, 0]);
  add(g, new THREE.OctahedronGeometry(.55, 0), MAT.neon('#ffe48e', 4), [0, 46.5, 0], { cast:false }).userData.noMerge = true;
  return g;
}

/** Candy wheel: a static ferris-wheel landmark facing the avenue. */
function createCandyWheel() {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(4.2, 4.8, .6, 32), MAT.paint_cream, [0, .3, 0]);
  add(g, torus(4.5, .12, 6, 48), MAT.gold, [0, .6, 0], { rot:[Math.PI/2, 0, 0] });
  const legAngle = Math.atan2(4.6, 12.4);
  for (const sx of [-1, 1]) {
    add(g, rBox(.75, 14.4, .75, .1, 3), MAT.paint_blue, [sx * 2.3, 6.2, 0], { rot:[0, 0, sx * legAngle] });
    add(g, rBox(.5, 13.0, .5, .08, 3), MAT.gold, [sx * 3.35, 5.7, 0], { rot:[0, 0, sx * (legAngle - .1)] });
  }
  add(g, rBox(9.6, .4, .6, .08, 2), MAT.gold, [0, .9, 0]);
  const spin = new THREE.Group(); spin.position.y = 12.6; g.add(spin);
  for (const sz of [-.45, .45]) {
    add(spin, torus(9.4, .22, 8, 96), MAT.paint_glossRed, [0, 0, sz], { rot:[0, 0, 0] });
    add(spin, torus(9.4, .08, 6, 96), MAT.gold, [0, 0, sz], { rot:[0, 0, 0] });
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    add(spin, rBox(.10, 9.4, .10, .02), MAT.gold, [Math.cos(a) * 4.7, Math.sin(a) * 4.7, 0], { rot:[0, 0, a - Math.PI/2] });
    add(spin, sphere(.62, 12, 10), i % 3 ? MAT.paint_coral : MAT.paint_butter, [Math.cos(a) * 9.6, Math.sin(a) * 9.6, 0]);
    add(spin, cyl(.03, .03, .8, 6), MAT.gold, [Math.cos(a) * 9.0, Math.sin(a) * 9.0, 0]);
  }
  add(spin, cyl(.9, .9, 1.8, 20), MAT.gold, [0, 0, 0], { rot:[Math.PI/2, 0, 0] });
  return g;
}

// ── unique shop signage ─────────────────────────────────────
const SHOP_SIGNS = new Map();
function shopSign(name, bg = '#ff6f86', fg = '#fff7e2') {
  const key = name + bg;
  if (!SHOP_SIGNS.has(key)) {
    SHOP_SIGNS.set(key, textTexture({
      text: name, width: 1024, height: 384, bg, color: fg, rounded: true, radius: 36,
      border: '#2a2036', borderWidth: 10, stroke: '#2a2036', strokeWidth: 10,
      font: '900 132px Bungee, "Arial Black", sans-serif', spacing: 3
    }));
  }
  return SHOP_SIGNS.get(key);
}

function markDynamic(obj) {
  // Mark the group itself. mergeStatic() skips the whole subtree for the
  // static city pass, then collapses the group's own internals in local space.
  // Layer 1 = "moving street furniture": the main camera sees it, the planar
  // reflection camera does not, and the baked sun shadow ignores it.
  obj.userData.noMerge = true;
  obj.userData.dynamic = true;
  obj.traverse(o => { o.layers.set(1); });
}

function add(parent, geo, mat, pos, opts = {}) {
  const m = mesh(geo, mat, { pos, castShadow: opts.cast ?? true, receiveShadow: opts.receive ?? true });
  if (opts.rot) m.rotation.set(...opts.rot);
  if (opts.scale) m.scale.set(...opts.scale);
  if (opts.noMerge) m.userData.noMerge = true;
  if (opts.name) m.name = opts.name;
  parent.add(m); return m;
}

let ACTIVE_COLLIDERS = null;
function addBuilding(root, b, x, z, rotY, w = 0, d = 0) {
  b.position.set(x, 0, z);
  b.rotation.y = rotY;
  root.add(b);
  if (ACTIVE_COLLIDERS && w > 0 && d > 0) {
    ACTIVE_COLLIDERS.push({ kind: 'box', x, z, hx: w/2, hz: d/2, rot: rotY });
  }
  return b;
}

/** Point-in-footprint test, used by both the push-out and the support query. */
function colliderContains(c, x, z, radius) {
  if (c.kind === 'circle') {
    const rr = c.r + radius;
    return (x - c.x) ** 2 + (z - c.z) ** 2 < rr * rr;
  }
  const dx = x - c.x, dz = z - c.z, cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  const lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs;
  return Math.abs(lx) < c.hx + radius && Math.abs(lz) < c.hz + radius;
}

/** Highest walkable top under a circle, no higher than maxTop. */
function supportAt(x, z, radius, maxTop, colliders) {
  let h = 0;
  for (const c of colliders) {
    const top = c.top;
    if (!top || top > maxTop + 1e-3 || top <= h) continue;
    if (colliderContains(c, x, z, radius)) h = top;
  }
  return h;
}

/** Push a circle out of every box/circle collider. Two passes handle corners.
 *  Colliders with a top at or below feetY + step are walkable and are skipped,
 *  which is what lets the player hop onto bollards, benches and car roofs. */
function resolveCollisions(pos, radius, colliders, feetY = 0, step = 0) {
  for (let pass = 0; pass < 2; pass++) {
    for (const c of colliders) {
      if (c.top && feetY + step >= c.top - 1e-4) continue;
      if (c.kind === 'circle') {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const rr = c.r + radius, d2 = dx*dx + dz*dz;
        if (d2 < rr*rr) {
          if (d2 < 1e-8) {
            // dead centre: push towards the street instead of dividing by zero
            pos.x = c.x + (c.x >= 0 ? -rr : rr);
          } else {
            const d = Math.sqrt(d2);
            pos.x = c.x + dx/d*rr; pos.z = c.z + dz/d*rr;
          }
        }
      } else {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
        const lx = dx*cs + dz*sn, lz = -dx*sn + dz*cs;
        const hx = c.hx + radius, hz = c.hz + radius;
        if (Math.abs(lx) >= hx || Math.abs(lz) >= hz) continue;
        const ox = hx - Math.abs(lx), oz = hz - Math.abs(lz);
        const nlx = ox < oz ? (lx >= 0 ? hx : -hx) : lx;
        const nlz = ox < oz ? lz : (lz >= 0 ? hz : -hz);
        pos.x = c.x + nlx*cs - nlz*sn;
        pos.z = c.z + nlx*sn + nlz*cs;
      }
    }
  }
  return pos;
}



function makeBalloon() {
  const g = new THREE.Group();
  const balloonMat = new THREE.MeshPhysicalMaterial({ color:'#ff7c8e', roughness:.28, metalness:.05, clearcoat:.8, clearcoatRoughness:.15, envMapIntensity:1.4 });
  const creamMat = MAT.paint_cream;
  const b = add(g, new THREE.SphereGeometry(5.2,48,32), balloonMat, [0,0,0]); b.scale.set(1,1.18,1);
  // panel stripes
  for(let i=0;i<10;i++){
    const a=i/10*TAU;
    const p=add(g, new THREE.SphereGeometry(5.22,12,24, a, TAU/10, 0, Math.PI), i%2?creamMat:balloonMat, [0,0,0]);
    p.material.side=THREE.FrontSide;
  }
  add(g, new THREE.ConeGeometry(1.5,.9,24), MAT.gold, [0,-5.8,0]).rotation.x=Math.PI;
  const basket=add(g, rBox(2.2,1.6,2.0,.25,3), MAT.wood, [0,-8.3,0]);
  for(let i=0;i<8;i++){const a=i/8*TAU;const rope=add(g,cyl(.025,.025,3.3,5),MAT.brass,[Math.cos(a)*1.2,-6.9,Math.sin(a)*1.2]);rope.rotation.z=Math.cos(a)*.14;rope.rotation.x=Math.sin(a)*.14;}
  const banner=add(g, plane(2.8,.7), MAT.sign(textTexture({text:'MARWLE',width:1024,height:256,font:'900 160px Bungee, Arial Black, sans-serif',color:'#ff5068'}),1), [0,-8.0,1.06]);
  banner.userData.noMerge=true;
  return g;
}

export function buildCity(scene, renderer) {
  const root = new THREE.Group();
  root.name='sugarline-district';
  scene.add(root);

  const updaters = [];
  const colliders = [];
  ACTIVE_COLLIDERS = colliders;
  const pedestrians = [];
  const drones = [];
  const flagUpdaters = [];

  // ── the ground plane and its warm stone apron ──────────────
  const apron = add(root, plane(520,520), new THREE.MeshStandardMaterial({ color:'#cfc7b7', roughness:.94 }), [0,-.11,-60], { rot:[-Math.PI/2,0,0], cast:false });
  apron.receiveShadow = true;
  const road = add(root, plane(13.4, 155), MAT.road, [0, .015, -31], { rot:[-Math.PI/2,0,0], cast:false }); road.receiveShadow = true;
  // sidewalk slabs
  for (const side of [-1,1]) {
    add(root, plane(6.4, 155), MAT.sidewalk, [side*10.1, .13, -31], { rot:[-Math.PI/2,0,0], cast:false });
    add(root, rBox(.3,.16,155,.05,2), MAT.curb, [side*6.65,.08,-31], { cast:false });
    // broad coral tile accent strip
    add(root, rBox(.34,.012,150,.008), MAT.paint_coral, [side*7.1,.137,-31], { cast:false });
    add(root, rBox(.18,.012,150,.008), MAT.paint_teal, [side*12.85,.137,-31], { cast:false });
  }
  // curbside painted lane markers
  for (const side of [-1,1]) {
    for (let z=16; z>-88; z-=6.2) {
      add(root, rBox(.10,.014,2.8,.02), MAT.whiteTrim, [side*5.0, .035, z], { cast:false });
    }
  }
  // crosswalk before the plaza
  for (let i=0;i<10;i++) add(root, rBox(1.05,.02,4.2,.02), MAT.whiteTrim, [-5.4+i*1.2,.035,-56], { cast:false });

  // ── south extension: the avenue continues past the arch ────
  const extRoad = add(root, plane(13.4, 155), MAT.road, [0, .015, -186], { rot:[-Math.PI/2,0,0], cast:false }); extRoad.receiveShadow = true;
  for (const side of [-1,1]) {
    add(root, plane(6.4, 155), MAT.sidewalk, [side*10.1, .13, -186], { rot:[-Math.PI/2,0,0], cast:false });
    add(root, rBox(.3,.16,155,.05,2), MAT.curb, [side*6.65,.08,-186], { cast:false });
    add(root, rBox(.34,.012,150,.008), MAT.paint_coral, [side*7.1,.137,-186], { cast:false });
    add(root, rBox(.18,.012,150,.008), MAT.paint_teal, [side*12.85,.137,-186], { cast:false });
    for (let z=-112; z>-202; z-=6.2) add(root, rBox(.10,.014,2.8,.02), MAT.whiteTrim, [side*5.0, .035, z], { cast:false });
  }
  for (let i=0;i<10;i++) add(root, rBox(1.05,.02,4.2,.02), MAT.whiteTrim, [-5.4+i*1.2,.035,-110], { cast:false });
  for (const [mx,mz] of [[3.5,-124],[-4.0,-147],[3.7,-171],[-3.8,-192]]) {
    add(root, new THREE.CylinderGeometry(.55,.55,.035,24), MAT.darkMetal, [mx,.055,mz]);
    for(let i=0;i<5;i++) add(root, rBox(.9,.01,.045,.005), MAT.brass, [mx,.073,mz-.25+i*.12], {cast:false});
  }
  // cast-iron manholes and a little inlaid district mark
  for (const [mx,mz] of [[3.5,7.2],[-4.0,-15.0],[3.7,-37.0]]) {
    add(root, new THREE.CylinderGeometry(.55,.55,.035,24), MAT.darkMetal, [mx,.055,mz]);
    for(let i=0;i<5;i++) add(root, rBox(.9,.01,.045,.005), MAT.brass, [mx,.073,mz-.25+i*.12], {cast:false});
  }
  const roadMark = canvasTexture(512,512,(ctx,w,h)=>{
    ctx.clearRect(0,0,w,h);
    ctx.translate(w/2,h/2);
    ctx.strokeStyle='rgba(255,242,216,.8)';ctx.lineWidth=18;ctx.beginPath();ctx.arc(0,0,185,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(255,242,216,.8)';ctx.font='900 150px Bungee, Arial Black, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('07',0,4);
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2;ctx.save();ctx.rotate(a);ctx.fillRect(0,-235,40,22);ctx.restore();}
  },{clamp:true});
  const roadLogo = new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4), new THREE.MeshBasicMaterial({map:roadMark, transparent:true, opacity:.8, depthWrite:false, toneMapped:false}));
  roadLogo.rotation.x=-Math.PI/2; roadLogo.position.set(-4.4,.075,19.2); roadLogo.renderOrder=5; roadLogo.userData.noMerge=true; root.add(roadLogo);

  // central water rill bed: deep turquoise mosaic, visible through the mirror shader.
  // Seeded so the bed is byte-identical on every reload.
  const rillTex = canvasTexture(512, 2048, (ctx,w,h) => {
    const rr = rng(913);
    const g = ctx.createLinearGradient(0,0,w,0);
    g.addColorStop(0,'#0a4e60'); g.addColorStop(.25,'#137b86'); g.addColorStop(.5,'#2dabb0'); g.addColorStop(.75,'#116f7d'); g.addColorStop(1,'#0a4e60');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    // soft caustic ribbons running down the channel
    for (let i = 0; i < 34; i++) {
      const yy = rr() * h;
      ctx.strokeStyle = 'rgba(185,255,246,' + (.03 + rr()*.08) + ')';
      ctx.lineWidth = 2 + rr()*8; ctx.beginPath();
      ctx.moveTo(0, yy);
      for (let x = 0; x <= w; x += 18) ctx.lineTo(x, yy + Math.sin(x*.018+i)*8 + Math.sin(x*.05+i*2)*3);
      ctx.stroke();
    }
    ctx.globalAlpha = .35;
    for (let i = 0; i < 250; i++) { ctx.fillStyle = i%3 ? '#d8ffff' : '#8ff1e7'; ctx.beginPath(); ctx.arc(rr()*w, rr()*h, 1 + rr()*2.5, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  });
  const bedMat = new THREE.MeshPhysicalMaterial({ map:rillTex, color:'#b7fff7', roughness:.2, metalness:.08, clearcoat:.8, clearcoatRoughness:.12, envMapIntensity:1.2 });
  add(root, plane(2.55, 86), bedMat, [0,.025,-26], { rot:[-Math.PI/2,0,0], cast:false });
  // rill lip and little inlet grates
  for (const side of [-1,1]) {
    add(root, rBox(.16,.07,86,.035), MAT.creamTrim, [side*1.44,.055,-26], { cast:false });
    for (let z=14; z>-66; z-=7.8) add(root, rBox(.48,.018,.9,.01), MAT.darkMetal, [side*1.32,.058,z], { cast:false });
  }
  // stepping slabs across the water: walkable tops plus a blocked rill between
  // them, so the only way across is over a stone
  const stepZ = [10, -5, -22, -39, -52];
  for (const z of stepZ) {
    const s = add(root, rBox(3.25,.10,1.15,.06,2), MAT.marble, [0,.075,z], { cast:false });
    colliders.push({ kind:'box', x:0, z, hx:1.6, hz:.58, rot:0, top:.13 });
  }
  {
    const edges = [17];
    for (const z of stepZ) edges.push(z + .72, z - .72);
    edges.push(-69);
    for (let i = 0; i < edges.length; i += 2) {
      const a = edges[i], b = edges[i+1];
      if (a - b < .4) continue;
      colliders.push({ kind:'box', x:0, z:(a+b)/2, hx:1.32, hz:(a-b)/2, rot:0 });
    }
  }

  // plaza: ring of inlaid paving around the pool
  const plazaMat = new THREE.MeshPhysicalMaterial({ color:'#f2ddc0', roughness:.48, clearcoat:.28, clearcoatRoughness:.36, envMapIntensity:.9 });
  add(root, new THREE.RingGeometry(8.95, 30, 96), plazaMat, [0,.115,-72], { rot:[-Math.PI/2,0,0], cast:false });
  add(root, new THREE.RingGeometry(8.72, 9.20, 96), MAT.gold, [0,.125,-72], { rot:[-Math.PI/2,0,0], cast:false });
  add(root, new THREE.RingGeometry(9.2, 9.55, 96), MAT.paint_teal, [0,.12,-72], { rot:[-Math.PI/2,0,0], cast:false });
  for (let i=0;i<16;i++){
    const a=i/16*TAU;
    const len=20.5;
    const ray=add(root, rBox(.18,.012,len,.02), i%2?MAT.paint_coral:MAT.paint_teal, [Math.cos(a)*19.2,.121,-72+Math.sin(a)*19.2], {rot:[0,-a,0],cast:false});
  }
  // pool bed
  const poolTex = canvasTexture(1024,1024,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.5);
    g.addColorStop(0,'#0c7582');g.addColorStop(.55,'#1699a2');g.addColorStop(.9,'#49c5c2');g.addColorStop(1,'#d7f7ed');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=.22;ctx.strokeStyle='#fff7d8';ctx.lineWidth=10;
    for(let i=0;i<10;i++){ctx.beginPath();ctx.arc(w/2,h/2,60+i*47,0,7);ctx.stroke();}
    for(let i=0;i<8;i++){const a=i/8*TAU;ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(w/2+Math.cos(a)*w*.5,h/2+Math.sin(a)*w*.5);ctx.stroke();}
    ctx.globalAlpha=1;
  },{clamp:true});
  const poolBedMat = new THREE.MeshPhysicalMaterial({ map:poolTex, color:'#c5fff8', roughness:.18, metalness:.12, clearcoat:1, clearcoatRoughness:.1, envMapIntensity:1.4 });
  add(root, new THREE.CircleGeometry(8.8,96), poolBedMat, [0,.045,-72], {rot:[-Math.PI/2,0,0],cast:false});
  add(root, torus(8.85,.24,12,96), MAT.marble, [0,.08,-72], {rot:[Math.PI/2,0,0],cast:false});
  add(root, torus(8.85,.08,8,96), MAT.gold, [0,.17,-72], {rot:[Math.PI/2,0,0],cast:false});

  // mirror surface: water rill + pool + damp paving
  const water = createWaterMirror(renderer);
  root.add(water.mirror);
  // custom base tint just under the mirror (adds depth under the reflection)
  const waterBaseMat = water.baseMat;
  const rillBase = add(root, plane(2.5,86), waterBaseMat, [0,.032,-26], {rot:[-Math.PI/2,0,0],cast:false}); rillBase.renderOrder=3;
  const poolBase = add(root, new THREE.CircleGeometry(8.7,96), waterBaseMat, [0,.043,-72], {rot:[-Math.PI/2,0,0],cast:false}); poolBase.renderOrder=3;
  updaters.push(t => water.update(t));

  // ── building rows ──────────────────────────────────────────
  const leftRot = Math.PI/2 - .10, rightRot = -Math.PI/2 + .10;
  // hero LOD: only the three landmark buildings get the ultra tessellation
  // tier; every other block stays on the cheaper base tier
  const baseDetail = DETAIL.level;
  const heroDetail = baseDetail === 'high' ? 'ultra' : baseDetail;
  setDetail(heroDetail);
  const fizz = addBuilding(root, createFizzDome(), -16.0, 8.4, leftRot-.13, 12, 12);
  const dream = addBuilding(root, createDreamTower(), -17.2, -16.5, leftRot-.04, 10, 10);
  const marwle = addBuilding(root, createMarwleHall(), 16.2, 4.0, rightRot+.18, 12, 10);
  setDetail(baseDetail);
  const l3 = addBuilding(root, createGenericBuilding({ width:16, depth:10, height:18.5, body:MAT.paint_butter, trim:MAT.paint_coral, accent:MAT.paint_teal, rows:4, cols:5, roof:'garden', seed:13, signTex:shopSign('SUGAR & CO', '#ff6f86'), cornerTower:true }), -16.0, -37.5, leftRot, 16, 10);
  const r2 = addBuilding(root, createGenericBuilding({ width:17, depth:11, height:21, body:MAT.paint_coral, trim:MAT.paint_cream, accent:MAT.paint_blue, rows:5, cols:5, roof:'sundae', seed:24, signTex:shopSign('FIZZ LAB', '#38b7c9'), balconyRow:2 }), 16.7, -17.0, rightRot, 17, 11);
  const l4 = addBuilding(root, createGenericBuilding({ width:18, depth:12, height:23, body:MAT.paint_lavender, trim:MAT.paint_butter, accent:MAT.paint_coral, rows:5, cols:5, roof:'donut', seed:35, signTex:shopSign('TAFFY HOUSE', '#c79cff'), cornerTower:true }), 17.0, -39.5, rightRot, 18, 12);
  const l5 = addBuilding(root, createGenericBuilding({ width:18, depth:12, height:25, body:MAT.paint_mint, trim:MAT.paint_coral, accent:MAT.gold, rows:5, cols:5, roof:'ring', seed:46, signTex:shopSign('GUMDROP', '#7fd8b5') }), -17.0, -58.5, leftRot, 18, 12);
  const r4 = addBuilding(root, createGenericBuilding({ width:18, depth:12, height:24, body:MAT.paint_peach, trim:MAT.paint_cream, accent:MAT.paint_magenta, rows:5, cols:5, roof:'rocket', seed:57, signTex:shopSign('CANDY FLOSS', '#ff9db7') }), 17.4, -59.5, rightRot, 18, 12);
  const l6 = addBuilding(root, createGenericBuilding({ width:20, depth:13, height:27, body:MAT.paint_blue, trim:MAT.paint_cream, accent:MAT.paint_butter, rows:6, cols:6, roof:'garden', seed:68, signTex:shopSign('CHOCO BAR', '#c98a5a'), cornerTower:true }), -18.2, -84.0, leftRot, 20, 13);
  const r5 = addBuilding(root, createGenericBuilding({ width:20, depth:13, height:26, body:MAT.paint_rose, trim:MAT.paint_cream, accent:MAT.paint_teal, rows:6, cols:6, roof:'sundae', seed:79, signTex:shopSign('JELLY BEAN', '#ffcf5a') }), 18.0, -84.5, rightRot, 20, 13);
  // near-camera framing blocks: the street should feel embedded in a city, not a diorama
  const fgL = addBuilding(root, createGenericBuilding({ width:12, depth:11, height:12.5, body:MAT.paint_rose, trim:MAT.paint_cream, accent:MAT.paint_butter, rows:2, cols:3, roof:'garden', seed:91, signTex:null }), -15.2, 29.0, leftRot-.08, 12, 11);
  const fgR = addBuilding(root, createGenericBuilding({ width:11, depth:10, height:10.8, body:MAT.paint_teal, trim:MAT.paint_cream, accent:MAT.paint_coral, rows:2, cols:3, roof:'garden', seed:93, signTex:null }), 15.0, 31.0, rightRot+.06, 11, 10);
  // outer city blocks visible beyond the parade facades
  for (let i=0;i<10;i++) {
    const side = i%2 ? 1 : -1;
    const z = 18 - Math.floor(i/2)*22 - (i%2)*7;
    const w = 18 + (i%3)*6;
    const h = 8 + (i%5)*4.5;
    const b = createGenericBuilding({ width:w, depth:14, height:h, body:[MAT.paint_pink,MAT.paint_lavender,MAT.paint_butter,MAT.paint_aqua,MAT.paint_coral][i%5], trim:MAT.paint_cream, accent:MAT.paint_teal, rows:1, cols:4, roof:'garden', seed:120+i, signTex:null });
    addBuilding(root, b, side*(27 + (i%3)*7), z, side<0?leftRot:rightRot, w, 14);
  }

  // ── south extension shops: every name/sign is unique ─────
  const EXT_SHOPS = [
    { x:-16.6, z:-120, w:16, d:10, h:23, body:MAT.paint_violet, trim:MAT.paint_cream, accent:MAT.paint_pink, roof:'ring',   seed:201, rows:5, cols:5, cornerTower:true, name:'LICORICE', bg:'#8b6fd6' },
    { x:-16.8, z:-141, w:18, d:11, h:26, body:MAT.paint_mint,   trim:MAT.paint_rose,  accent:MAT.paint_cream,roof:'sundae', seed:202, rows:5, cols:5, balconyRow:2, name:'PEPPERMINT', bg:'#58c7c2' },
    { x:-17.2, z:-181, w:18, d:12, h:25, body:MAT.paint_peach,  trim:MAT.paint_cream, accent:MAT.paint_teal, roof:'donut',  seed:203, rows:5, cols:5, cornerTower:true, name:'CARAMEL', bg:'#d69a58' },
    { x:-17.0, z:-198, w:16, d:10, h:21, body:MAT.paint_butter, trim:MAT.paint_coral, accent:MAT.paint_blue, roof:'garden', seed:204, rows:4, cols:5, name:'NOUGAT', bg:'#f0c46a' },
    { x: 16.9, z:-118, w:17, d:11, h:24, body:MAT.paint_blue,   trim:MAT.paint_cream, accent:MAT.paint_butter, roof:'garden', seed:211, rows:5, cols:5, cornerTower:true, name:'SHERBET', bg:'#ff9f7a' },
    { x: 16.6, z:-139, w:16, d:10, h:22, body:MAT.paint_rose,   trim:MAT.paint_cream, accent:MAT.paint_teal, roof:'rocket', seed:212, rows:5, cols:5, name:'LOLLIPOP', bg:'#ff7aa2' },
    { x: 17.2, z:-181, w:18, d:12, h:27, body:MAT.paint_lavender,trim:MAT.paint_cream, accent:MAT.paint_coral, roof:'ring',  seed:213, rows:6, cols:5, cornerTower:true, name:'BONBON', bg:'#b48ae8' },
    { x: 16.8, z:-198, w:16, d:10, h:23, body:MAT.paint_aqua,   trim:MAT.paint_cream, accent:MAT.paint_magenta,roof:'sundae',seed:214, rows:5, cols:5, name:'TOFFEE', bg:'#d18a4e' }
  ];
  for (const s of EXT_SHOPS) {
    const b = createGenericBuilding({
      width:s.w, depth:s.d, height:s.h, body:s.body, trim:s.trim, accent:s.accent,
      rows:s.rows, cols:s.cols, roof:s.roof, seed:s.seed, cornerTower:!!s.cornerTower,
      balconyRow:s.balconyRow ?? -1, sideFacade:true, signTex:shopSign(s.name, s.bg)
    });
    addBuilding(root, b, s.x, s.z, s.x < 0 ? leftRot : rightRot, s.w, s.d);
  }

  // ── infill: close the skyline holes between the main blocks ──
  // Each gap gets a different type: narrow alley house, mid terrace,
  // wide corner block, or a low gate wing by the clock tower.
  const INFILL = [
    { side:-1, x:-16.5, z:40.0,  w:8.0,  d:10, h:13, rows:2, cols:2, roof:'garden', body:MAT.paint_rose,     trim:MAT.paint_cream, accent:MAT.paint_teal,    seed:301 },
    { side: 1, x: 16.5, z:40.0,  w:8.0,  d:10, h:13, rows:2, cols:2, roof:'ring',   body:MAT.paint_aqua,     trim:MAT.paint_cream, accent:MAT.paint_magenta, seed:302 },
    { side:-1, x:-16.2, z:18.9,  w:8.4,  d:10, h:16, rows:3, cols:3, roof:'garden', body:MAT.paint_butter,   trim:MAT.paint_coral, accent:MAT.paint_teal,    seed:303 },
    { side:-1, x:-16.6, z:-4.5,  w:6.6,  d:9,  h:12.5, rows:2, cols:2, roof:'ring', body:MAT.paint_lavender, trim:MAT.paint_cream, accent:MAT.paint_pink,    seed:304 },
    { side:-1, x:-16.8, z:-103,  w:12.4, d:11, h:22, rows:4, cols:4, roof:'donut',  body:MAT.paint_mint,     trim:MAT.paint_rose,  accent:MAT.paint_butter,  seed:305, cornerTower:true },
    { side:-1, x:-16.8, z:-152,  w:11.0, d:10, h:19, rows:3, cols:4, roof:'sundae', body:MAT.paint_peach,    trim:MAT.paint_cream, accent:MAT.paint_teal,    seed:306 },
    { side:-1, x:-16.9, z:-166,  w:11.0, d:10, h:23, rows:4, cols:4, roof:'rocket', body:MAT.paint_blue,     trim:MAT.paint_coral, accent:MAT.paint_butter,  seed:307, cornerTower:true },
    { side: 1, x: 16.6, z:13.0,  w:8.0,  d:10, h:15, rows:2, cols:3, roof:'garden', body:MAT.paint_rose,     trim:MAT.paint_cream, accent:MAT.paint_teal,    seed:311 },
    { side: 1, x: 16.7, z:21.5,  w:8.0,  d:10, h:18, rows:3, cols:3, roof:'ring',   body:MAT.paint_aqua,     trim:MAT.paint_cream, accent:MAT.paint_coral,   seed:312 },
    { side: 1, x: 16.6, z:-6.2,  w:9.8,  d:10, h:17, rows:3, cols:3, roof:'sundae', body:MAT.paint_coral,    trim:MAT.paint_cream, accent:MAT.paint_blue,    seed:313 },
    { side: 1, x: 16.9, z:-101,  w:11.0, d:11, h:21, rows:4, cols:4, roof:'garden', body:MAT.paint_violet,   trim:MAT.paint_cream, accent:MAT.paint_butter,  seed:314, cornerTower:true },
    { side: 1, x: 16.7, z:-149,  w:10.0, d:10, h:18, rows:3, cols:4, roof:'donut',  body:MAT.paint_mint,     trim:MAT.paint_cream, accent:MAT.paint_coral,   seed:315 },
    { side: 1, x: 16.8, z:-169.5,w:10.0, d:10, h:22, rows:4, cols:4, roof:'ring',   body:MAT.paint_butter,   trim:MAT.paint_rose,  accent:MAT.paint_teal,    seed:316, cornerTower:true },
    // low annexes tie the clock tower into the gate wings and close the last
    // sliver of horizon beside its base
    { side:-1, x:-8.8,  z:44.0,  w:5.6,  d:5,  h:9,  rows:1, cols:2, roof:'garden', body:MAT.paint_cream,    trim:MAT.paint_coral, accent:MAT.paint_teal,    seed:321 },
    { side: 1, x: 8.8,  z:44.0,  w:5.6,  d:5,  h:9,  rows:1, cols:2, roof:'ring',   body:MAT.paint_peach,    trim:MAT.paint_cream, accent:MAT.paint_magenta, seed:322 },
    // remaining slots: narrow terrace houses / studio blocks, each different
    { side:-1, x:-16.5, z:-27.0, w:10.4, d:10, h:19, rows:3, cols:3, roof:'ring',   body:MAT.paint_peach,    trim:MAT.paint_cream, accent:MAT.paint_teal,    seed:331 },
    { side:-1, x:-16.7, z:-47.5, w:9.4,  d:10, h:15, rows:2, cols:3, roof:'garden', body:MAT.paint_aqua,     trim:MAT.paint_cream, accent:MAT.paint_coral,   seed:332 },
    { side:-1, x:-17.0, z:-71.0, w:12.4, d:11, h:20, rows:4, cols:4, roof:'sundae', body:MAT.paint_coral,    trim:MAT.paint_cream, accent:MAT.paint_blue,    seed:333 },
    { side:-1, x:-16.6, z:-130.0,w:9.8,  d:10, h:17, rows:3, cols:3, roof:'donut',  body:MAT.paint_lavender, trim:MAT.paint_cream, accent:MAT.paint_butter,  seed:334 },
    { side:-1, x:-16.9, z:-190.0,w:5.6,  d:9,  h:13, rows:2, cols:2, roof:'ring',   body:MAT.paint_butter,   trim:MAT.paint_coral, accent:MAT.paint_teal,    seed:335 },
    { side: 1, x: 16.8, z:-28.0, w:10.4, d:10, h:20, rows:3, cols:3, roof:'garden', body:MAT.paint_blue,     trim:MAT.paint_cream, accent:MAT.paint_butter,  seed:336 },
    { side: 1, x: 16.5, z:-49.5, w:7.4,  d:9,  h:16, rows:2, cols:2, roof:'ring',   body:MAT.paint_mint,     trim:MAT.paint_cream, accent:MAT.paint_magenta, seed:337 },
    { side: 1, x: 17.1, z:-71.7, w:11.8, d:11, h:19, rows:3, cols:4, roof:'donut',  body:MAT.paint_rose,     trim:MAT.paint_cream, accent:MAT.paint_teal,    seed:338 },
    { side: 1, x: 16.9, z:-128.7,w:9.8,  d:10, h:18, rows:3, cols:3, roof:'sundae', body:MAT.paint_violet,   trim:MAT.paint_cream, accent:MAT.paint_coral,   seed:339 },
    { side: 1, x: 16.7, z:-190.0,w:5.6,  d:9,  h:13, rows:2, cols:2, roof:'garden', body:MAT.paint_aqua,     trim:MAT.paint_cream, accent:MAT.paint_pink,    seed:340 }
  ];
  for (const s of INFILL) {
    const b = createGenericBuilding({
      width:s.w, depth:s.d, height:s.h, body:s.body, trim:s.trim, accent:s.accent,
      rows:s.rows, cols:s.cols, roof:s.roof, seed:s.seed, cornerTower:!!s.cornerTower
    });
    addBuilding(root, b, s.x, s.z, s.side < 0 ? leftRot : rightRot, s.w, s.d);
  }

  // ── new district landmarks ────────────────────────────────
  const clockTower = createClockTower();
  // the clock tower fills the empty north alley behind the opening spawn
  clockTower.position.set(0, 0, 44); root.add(clockTower);
  colliders.push({ kind:'box', x:0, z:44, hx:6, hz:6, rot:0 });
  const candyWheel = createCandyWheel();
  candyWheel.position.set(27.5, 0, -160); root.add(candyWheel);
  colliders.push({ kind:'circle', x:27.5, z:-160, r:4.6 });

  // vertical blade sign near the left dome, like a beacon for the street
  const blade = new THREE.Group();
  const signFrame = add(blade, rBox(3.0, 8.1, .42, .14, 3), MAT.paint_glossRed, [0,0,0]);
  add(blade, plane(2.62, 7.5), MAT.sign(TEX.fizz, 1.25), [0,0,.235], {cast:false, receive:false});
  add(blade, rBox(3.2,.22,.6,.08), MAT.gold, [0,4.12,.02]);
  add(blade, rBox(3.2,.22,.6,.08), MAT.gold, [0,-4.12,.02]);
  for(let i=0;i<2;i++) add(blade, rBox(1.1,.16,.35,.04), MAT.darkMetal, [0, 3.2-i*6.4, -.4]);
  blade.position.set(-7.1, 10.4, 12.2); blade.rotation.y = -.12; root.add(blade);
  add(root, cyl(.18,.18,7.2,10), MAT.darkMetal, [-8.1,6.3,12.2], {rot:[0,0,0]});
  // halo behind sign
  const halo=new THREE.Sprite(MAT.glowSprite('#ff7aa0',.14)); halo.position.set(-6.9,10.4,12.8); halo.scale.set(8,12,1); root.add(halo);

  // marwle blade roof sign on right
  const roofBlade = new THREE.Group();
  add(roofBlade, rBox(7.3,2.4,.35,.1,3), MAT.paint_glossRed, [0,0,0]);
  add(roofBlade, plane(6.95,1.95), MAT.sign(TEX.marwle,1.6), [0,0,.2], {cast:false,receive:false});
  roofBlade.position.set(10.8, 18.2, 2.0); roofBlade.rotation.y=-.35; root.add(roofBlade);
  const rbHalo=new THREE.Sprite(MAT.glowSprite('#ff6d7d',.18)); rbHalo.position.set(10.6,18.2,2.4); rbHalo.scale.set(10,4,1); root.add(rbHalo);

  // a hand-painted mural on the sunlit flank of the hall
  const mural = billboard(TEX.poster2, 4.1, 4.7, { depth:.2, backingMat: MAT.whiteTrim, border:true, borderMat:MAT.gold, borderWidth:.10, bulbs:false, intensity:1.0 });
  mural.position.set(10.35, 3.35, 10.02); mural.rotation.y = -.60; root.add(mural);
  const muralGlow = new THREE.Sprite(MAT.glowSprite('#ffd38b',.06)); muralGlow.position.set(10.2,3.4,10.4); muralGlow.scale.set(4,5,1); root.add(muralGlow);


  // pennant lines
  const p1=createPennantLine(V(-7.2,8.6,-10),V(7.2,8.2,-10),11,15,.7); root.add(p1.group); flagUpdaters.push(p1.update);
  const p2=createPennantLine(V(-7.2,9.6,-33),V(7.2,9.4,-33),12,15,.8); root.add(p2.group); flagUpdaters.push(p2.update);
  const p3=createPennantLine(V(-7.2,8.5,15),V(7.2,8.9,15),13,13,.55); root.add(p3.group); flagUpdaters.push(p3.update);

  // ── street dressing ────────────────────────────────────────
  // lamp posts
  const lampPositions = [[-5.9,15],[-5.9,-3],[-5.9,-21],[-5.9,-40],[-5.9,-58],[5.9,10],[5.9,-8],[5.9,-26],[5.9,-45],[5.9,-64]];
  lampPositions.forEach(([x,z],i)=>{
    const l=createLamp(100+i, i%3===0?7.8:6.8); l.position.set(x,.13,z); l.rotation.y=x<0?0:Math.PI; root.add(l); colliders.push({kind:'circle',x,z,r:.3});
  });
  // bollards
  const bollards=[];
  for(let z=19;z>-88;z-=2.8){ if(z%8.4<2.8) { bollards.push({x:-6.1,y:.15,z,scale:1}); bollards.push({x:6.1,y:.15,z,scale:1}); colliders.push({kind:'circle',x:-6.1,z,r:.2,top:.78}); colliders.push({kind:'circle',x:6.1,z,r:.2,top:.78}); } }
  const bmat=MAT.darkMetal;
  root.add(makeInstanced(new THREE.CylinderGeometry(.13,.17,.85,12), bmat, bollards, true, true));
  root.add(makeInstanced(torus(.14,.025,5,16), MAT.gold, bollards.map(b=>({x:b.x,y:b.y+.55,z:b.z,rot:[Math.PI/2,0,0]})), false, false));
  // trees and planters
  const treePositions = [[-8.2,3.0,'pink',1.15],[-8.0,-27.5,'palm',1.0],[-8.4,-48.0,'puff',1.1],[8.0,16.0,'palm',.95],[8.2,-3.0,'pink',1.15],[8.0,-34.0,'palm',1.05],[8.2,-54.0,'puff',.95],[-8.0,10.5,'puff',.75]];
  treePositions.forEach(([x,z,kind,s],i)=>{ const t=createTree(300+i,kind,s); t.position.set(x,.12,z); t.rotation.y=(i*.9)%TAU; root.add(t); colliders.push({kind:'circle',x,z,r:.36*s}); const sh=contactShadow(3.2*s,3.2*s,.27); sh.position.set(x,.135,z); root.add(sh); });
  for (const [x,z,s] of [[-5.9,9,1.0],[5.9,0,.85],[-5.9,-33,1.0],[5.9,-55,.9],[-7.6,-68,1.2],[7.6,-68,1.2]]) { const p=createShrubPlanter(x*17+31,s); p.position.set(x,.13,z); root.add(p); colliders.push({kind:'circle',x,z,r:.8*s,top:.72*s}); }
  // benches
  for(const [x,z,a] of [[-8.8,6.8,Math.PI/2],[-8.9,-30,Math.PI/2],[8.8,5.5,-Math.PI/2],[8.9,-30.5,-Math.PI/2]]) { const b=createBench(300+x*3+z); b.position.set(x,.15,z); b.rotation.y=a; root.add(b); colliders.push({kind:'box',x,z,hx:.95,hz:.5,rot:a,top:.55}); }
  // cafe life under the right awning
  const cafe1=createCafeSet(12, MAT.awningBlue); cafe1.position.set(8.6,.14,11.0); root.add(cafe1); colliders.push({kind:'circle',x:8.6,z:11.0,r:1.5});
  const cafe2=createCafeSet(14, MAT.awningMint); cafe2.position.set(8.7,.14,-13.0); root.add(cafe2); colliders.push({kind:'circle',x:8.7,z:-13.0,r:1.5});
  // planters and flower tubs along the promenade
  for (const [px,pz,s] of [[-7.6,11.5,1.0],[7.6,10.0,.85],[-7.7,-18.0,.9],[7.7,-34.0,1.1],[-7.6,-52.0,.9],[7.6,-58.0,.8],[-8.8,-78.0,1.1],[8.8,-82.0,1.0]]) {
    const pl=createShrubPlanter(870+Math.round(px*7+pz),s); pl.position.set(px,.14,pz); root.add(pl); colliders.push({kind:'circle',x:px,z:pz,r:.85*s});
  }
  // cars parked curbside
  const car1=createCar('#e33b4c',1); car1.position.set(-4.1,.02,10.8); car1.rotation.y=Math.PI; root.add(car1); colliders.push({kind:'box',x:-4.1,z:10.8,hx:.95,hz:2.2,rot:Math.PI,top:1.28});
  const car2=createCar('#f0b948',2); car2.position.set(4.0,.02,-35.0); car2.rotation.y=0; root.add(car2); colliders.push({kind:'box',x:4.0,z:-35.0,hx:.95,hz:2.2,rot:0,top:1.28});
  const car3=createCar('#2d94c8',3); car3.position.set(-3.9,.02,-47.0); car3.rotation.y=Math.PI; root.add(car3); colliders.push({kind:'box',x:-3.9,z:-47.0,hx:.95,hz:2.2,rot:Math.PI,top:1.28});
  const car4=createCar('#ef9d3f',4); car4.position.set(-4.5,.02,29.0); car4.rotation.y=Math.PI+.04; root.add(car4); colliders.push({kind:'box',x:-4.5,z:29.0,hx:.95,hz:2.2,rot:Math.PI+.04,top:1.28});
  const sc3=createScooter('#e4b13c'); sc3.position.set(8.9,.13,28.0); sc3.rotation.y=-.1; root.add(sc3); colliders.push({kind:'circle',x:8.9,z:28.0,r:.45,top:.78});
  const cart = createCandyCart();
  cart.group.position.set(-4.25,.03,15.2); cart.group.rotation.y=.10; root.add(cart.group); colliders.push({kind:'box',x:-4.25,z:15.2,hx:1.45,hz:1.1,rot:.10}); markDynamic(cart.group);
  updaters.push(t=>{ cart.balloons.forEach((b,i)=>{
    // absolute offset from the authored height: frame-rate independent and stable under freeze
    b.position.y = b.userData.baseY + Math.sin(t*1.2+i*1.1)*.035;
    b.rotation.z = Math.sin(t*.7+i)*.05;
  }); });
  // scooters
  const sc1=createScooter('#20b4b7'); sc1.position.set(8.9,.13,7.0); sc1.rotation.y=.2; root.add(sc1); colliders.push({kind:'circle',x:8.9,z:7.0,r:.45,top:.78});
  const sc2=createScooter('#e45c70'); sc2.position.set(-8.9,.13,-24.0); sc2.rotation.y=Math.PI-.15; root.add(sc2); colliders.push({kind:'circle',x:-8.9,z:-24.0,r:.45,top:.78});
  // vending machine / newspaper boxes
  for (let i=0;i<2;i++){
    const vg=new THREE.Group(); add(vg,rBox(.9,1.7,.65,.08,3), i?MAT.paint_blue:MAT.paint_coral,[0,.85,0]);
    add(vg,rBox(.7,1.1,.03,.02), MAT.glassWarm,[0,1.02,.34]);
    add(vg,plane(.62,.8), new THREE.MeshBasicMaterial({map:i?TEX.poster2:TEX.poster1, toneMapped:false, color:new THREE.Color().setScalar(.9)}),[0,1.02,.36],{cast:false,receive:false}).userData.noMerge=true;
    vg.position.set(9.6,.14, i? -6.5: 2.0); vg.rotation.y=-.15; root.add(vg); colliders.push({kind:'box',x:9.6,z:i?-6.5:2.0,hx:.5,hz:.4,rot:-.15,top:1.7});
  }

  // ── south district street clutter ─────────────────────────
  const extLampZ = [-116, -134, -152, -170, -188];
  extLampZ.forEach((z, i) => {
    const side = i % 2 ? 1 : -1;
    const l = createLamp(800 + i, i % 3 ? 7.4 : 6.8);
    l.position.set(side * 5.9, .13, z); l.rotation.y = side < 0 ? 0 : Math.PI;
    root.add(l); colliders.push({ kind:'circle', x:side*5.9, z, r:.3 });
  });
  const extTrees = [[-8.1,-118,1.05],[-8.3,-136,1.15],[8.2,-124,1.0],[8.0,-146,1.1],[-8.2,-172,.95],[8.1,-176,1.05],[-8.0,-190,1.0],[8.2,-192,.9]];
  extTrees.forEach(([x,z,s], i) => {
    const t = createTree(820 + i, i % 3 === 1 ? 'pink' : 'puff', s);
    t.position.set(x, .12, z); t.rotation.y = (i * 1.3) % TAU; root.add(t);
    colliders.push({ kind:'circle', x, z, r:.36*s });
  });
  for (const [x,z,s] of [[-7.6,-126,.9],[7.6,-132,.85],[-7.7,-150,1.0],[7.7,-166,.9],[-7.6,-184,.95],[7.6,-188,.85]]) {
    const p = createShrubPlanter(920 + Math.round(x*7 + z), s);
    p.position.set(x, .14, z); root.add(p);
    colliders.push({ kind:'circle', x, z, r:.8*s });
  }
  for (const [x,z,a] of [[-8.8,-122,Math.PI/2],[-8.9,-142,Math.PI/2],[8.8,-128,-Math.PI/2],[8.9,-168,-Math.PI/2],[-8.8,-182,Math.PI/2],[8.9,-190,-Math.PI/2]]) {
    const b = createBench(700 + Math.round(x*3 + z)); b.position.set(x, .15, z); b.rotation.y = a; root.add(b);
    colliders.push({ kind:'box', x, z, hx:.95, hz:.5, rot:a, top:.55 });
  }
  const extCars = [
    ['#e33b4c', -4.1, -115, Math.PI], ['#f0b948', 4.0, -126, 0],
    ['#2d94c8', -3.9, -137, Math.PI], ['#ef9d3f', 4.0, -148, 0],
    ['#7bc96f', -4.2, -158, Math.PI], ['#c77bd8', 4.0, -170, 0],
    ['#ff8c69', -4.0, -179, Math.PI], ['#5aa9e6', 4.1, -191, 0]
  ];
  extCars.forEach(([color, x, z, ry], i) => {
    const c = createCar(color, 10 + i); c.position.set(x, .02, z); c.rotation.y = ry; root.add(c);
    colliders.push({ kind:'box', x, z, hx:.95, hz:2.2, rot:ry, top:1.28 });
  });
  for (const [x,z] of [[8.9,-112],[-8.9,-131],[8.9,-151],[-8.9,-177],[8.9,-196]]) {
    const s = createScooter(x < 0 ? '#20b4b7' : '#e45c70'); s.position.set(x,.13,z); s.rotation.y = x < 0 ? Math.PI-.15 : .2; root.add(s);
    colliders.push({ kind:'circle', x, z, r:.45, top:.78 });
  }
  for (const [x,z,i] of [[8.6,-128,0],[8.7,-168,1]]) {
    const cafe = createCafeSet(30 + i, i ? MAT.awningMint : MAT.awningBlue);
    cafe.position.set(x,.14,z); root.add(cafe);
    colliders.push({ kind:'circle', x, z, r:1.5 });
  }
  for (let i=0;i<2;i++){
    const vg = new THREE.Group();
    add(vg, rBox(.9,1.7,.65,.08,3), i ? MAT.paint_blue : MAT.paint_coral, [0,.85,0]);
    add(vg, rBox(.7,1.1,.03,.02), MAT.glassWarm, [0,1.02,.34]);
    vg.position.set(9.6,.14, i ? -154 : -114); vg.rotation.y = -.15; root.add(vg);
    colliders.push({ kind:'box', x:9.6, z:i?-154:-114, hx:.5, hz:.4, rot:-.15, top:1.7 });
  }
  {
    const extB = [];
    for (let z=-112; z>-198; z-=2.8) { extB.push({x:-6.1,y:.15,z,scale:1}); extB.push({x:6.1,y:.15,z,scale:1}); colliders.push({kind:'circle',x:-6.1,z,r:.2,top:.78}); colliders.push({kind:'circle',x:6.1,z,r:.2,top:.78}); }
    root.add(makeInstanced(new THREE.CylinderGeometry(.13,.17,.85,12), bmat, extB, true, true));
    root.add(makeInstanced(torus(.14,.025,5,16), MAT.gold, extB.map(b => ({x:b.x,y:b.y+.55,z:b.z,rot:[Math.PI/2,0,0]})), false, false));
  }
  for (const [z, seed] of [[-122,31],[-146,32],[-170,33],[-192,34]]) {
    const p = createPennantLine(V(-7.2,8.8,z), V(7.2,8.5,z), seed, 15, .75);
    root.add(p.group); flagUpdaters.push(p.update);
  }
  {
    const cart2 = createCandyCart();
    cart2.group.position.set(4.2,.03,-146); cart2.group.rotation.y = Math.PI - .10; root.add(cart2.group); markDynamic(cart2.group);
    colliders.push({kind:'box',x:4.2,z:-146,hx:1.45,hz:1.1,rot:Math.PI-.10});
    updaters.push(t=>{ cart2.balloons.forEach((b,i)=>{ b.position.y = b.userData.baseY + Math.sin(t*1.2+i*1.1)*.035; b.rotation.z = Math.sin(t*.7+i)*.05; }); });
  }

  // fountain and its court
  const fountain=createFountain(); fountain.group.position.set(0,0,-72); root.add(fountain.group); colliders.push({kind:'circle',x:0,z:-72,r:8.8}); markDynamic(fountain.group); updaters.push(t=>fountain.update(t));
  for(let i=0;i<6;i++){
    const a = Math.PI + i/6*TAU*0.58;
    if (Math.sin(a) > -0.05) continue;
    const pl=new THREE.Group(); add(pl,cyl(.7,.9,.55,20),MAT.terracotta,[0,.28,0]); add(pl,sphere(.9,16,12),i%2?MAT.leafPink:MAT.leafMid,[0,1.0,0]).scale.set(1.2,.7,1.2);
    for(let j=0;j<7;j++){const aa=j/7*TAU; add(pl,sphere(.07,8,6),j%2?MAT.flowerPink:MAT.flowerGold,[Math.cos(aa)*.65,.95+Math.sin(aa)*.4,.65*Math.sin(aa)]);}
    pl.position.set(Math.cos(a)*16.5,.12,-72+Math.sin(a)*16.5); root.add(pl);
    colliders.push({kind:'circle',x:Math.cos(a)*16.5,z:-72+Math.sin(a)*16.5,r:.9,top:.75});
    const b=createBench(500+i); b.position.set(Math.cos(a+.16)*18.5,.13,-72+Math.sin(a+.16)*18.5); b.rotation.y=-a+Math.PI/2; root.add(b);
    colliders.push({kind:'box',x:Math.cos(a+.16)*18.5,z:-72+Math.sin(a+.16)*18.5,hx:.95,hz:.5,rot:-a+Math.PI/2,top:.55});
  }

  // gate bridge and skyline
  // the open avenue deliberately leads all the way to the fountain court
  const palace = createSunPalace(); palace.position.set(0,0,-214); root.add(palace);
  colliders.push({ kind:'box', x:0, z:-214, hx:9, hz:7, rot:0 });
  // grand ending arch
  const arch = new THREE.Group();
  for(const side of [-1,1]){
    add(arch, rBox(4.0,28,4.2,1.2,5), MAT.paint_cream, [side*13.0,14,0]);
    add(arch, rBox(4.3,.8,4.5,.15,2), MAT.paint_coral, [side*13.0,27.2,0]);
    add(arch, rBox(4.3,.7,4.5,.15,2), MAT.paint_teal, [side*13.0,25.5,0]);
    add(arch, rBox(1.2,6,.8,.15,3), MAT.paint_butter, [side*13.0,22.0,2.4]);
  }
  add(arch, torus(13.0,1.1,16,80,Math.PI), MAT.paint_glossRed, [0,28,0]);
  add(arch, torus(13.0,.16,8,80,Math.PI), MAT.gold, [0,28,0]);
  const archSign = billboardArch(TEX.marwle, 12, 2.8); archSign.position.set(0,33,-.1); arch.add(archSign);
  arch.position.set(0,0,-104); root.add(arch);

  // floating balloon
  const balloon = makeBalloon(); balloon.position.set(-33,35,-65); balloon.rotation.z=.08; root.add(balloon); markDynamic(balloon);
  updaters.push(t=>{balloon.position.y=35+Math.sin(t*.15)*1.2; balloon.rotation.y=Math.sin(t*.08)*.08;});

  // boats of light in the pool: floating orbs
  const orbs = new THREE.Group();
  for(let i=0;i<16;i++){
    const a=i/16*TAU, r=.6+i*.47;
    const o=add(orbs, sphere(.09,10,8), i%3?MAT.neon('#bffff4',2.4):MAT.neon('#ffd78a',2.2), [Math.cos(a)*r,.09,-72+Math.sin(a)*r],{cast:false,receive:false});
    o.userData.noMerge=true; o.userData.base=o.position.clone(); o.userData.phase=i*.8;
  }
  root.add(orbs); updaters.push(t=>{orbs.children.forEach(o=>{o.position.y=.09+Math.sin(t*1.2+o.userData.phase)*.035; o.material.opacity=1;});});

  // pedestrians
  const peopleSpecs = [
    [7.2,.14,13.0,-1,'#ff6e76','#294c68',1.15,-55,40],[8.2,.14,7.0,-1,'#f6c948','#8a5b85',.95,-55,40],
    [-7.2,.14,4.0,1,'#5dc6c0','#e2ceb1',1.05,-55,40],[-8.2,.14,-12.0,1,'#b49ae8','#38445d',.9,-55,40],
    [7.6,.14,-20.0,-1,'#ff9db7','#5b3d57',1.1,-55,40],[-7.6,.14,-40.0,-1,'#6faee8','#f1e2c8',1.0,-55,40],
    [8.2,.14,-55.0,1,'#ffb35c','#3c5b64',1.0,-55,40],[-7.2,.14,16.5,-1,'#8fdcad','#8d4f58',.9,-55,40],
    // south district walkers
    [7.4,.14,-116,-1,'#ffd166','#4a3b52',1.05,-200,-110],[8.2,.14,-124,1,'#a0e7e5','#35525c',.95,-200,-110],
    [-7.6,.14,-132,-1,'#f78fb3','#5b3d57',1.1,-200,-110],[-8.2,.14,-140,1,'#c3a6ff','#3a3550',1.0,-200,-110],
    [7.8,.14,-148,-1,'#ffb37a','#4b3a35',.9,-200,-110],[-7.4,.14,-156,1,'#9ef0c0','#3a5148',1.15,-200,-110],
    [8.4,.14,-164,-1,'#7fc8f8','#2f4356',1.0,-200,-110],[-8.0,.14,-172,1,'#ff9db7','#5b3d57',.95,-200,-110],
    [7.4,.14,-180,-1,'#ffe08a','#514730',1.05,-200,-110],[-7.8,.14,-188,1,'#b8b8ff','#3b3b58',.9,-200,-110],
    [8.0,.14,-196,-1,'#8fdcad','#35513f',1.1,-200,-110],[-7.2,.14,-112,1,'#ff8c69','#543229',1.0,-200,-110]
  ];
  peopleSpecs.forEach(([x,y,z,dir,c1,c2,speed,zMin,zMax],i)=>{
    // the model is authored facing +Z, so rotation 0 means "walking towards +Z"
    const p=createPerson(900+i,[c1,c2]); p.position.set(x,y,z); p.rotation.y=dir>0?0:Math.PI; p.userData.phase=i*1.7; p.userData.dir=dir; p.userData.speed=speed; p.userData.startZ=z; p.userData.walkZ=z; p.userData.laneX=x; p.userData.zMin=zMin; p.userData.zMax=zMax;
    // moving props are excluded from the baked shadow map, so each one carries
    // its own soft ground contact patch instead of a frozen long shadow
    const cs=contactShadow(1.7,1.7,.34); cs.position.y=.012; p.add(cs);
    markDynamic(p); root.add(p); pedestrians.push(p);
  });
  updaters.push(t=>{
    // advance along the lane, pull back towards it gently, then push out of
    // buildings, benches, planters and the other walkers
    pedestrians.forEach((p,i)=>{
      const dir=p.userData.dir, speed=p.userData.speed;
      let z=p.userData.startZ + dir*t*speed*1.6;
      const zMin=p.userData.zMin, zMax=p.userData.zMax;
      const span=zMax-zMin;
      z = zMin + (((z-zMin)%span)+span)%span;
      p.position.x += (p.userData.laneX - p.position.x) * .035;
      p.position.z = z;
      resolveCollisions(p.position, .28, colliders);
    });
    for (let i=0;i<pedestrians.length;i++) {
      const a=pedestrians[i];
      for (let j=i+1;j<pedestrians.length;j++) {
        const b=pedestrians[j];
        const dx=b.position.x-a.position.x, dz=b.position.z-a.position.z;
        const rr=.62, d2=dx*dx+dz*dz;
        if (d2 < rr*rr && d2 > 1e-6) {
          const d=Math.sqrt(d2), push=(rr-d)*.5;
          a.position.x -= dx/d*push; a.position.z -= dz/d*push;
          b.position.x += dx/d*push; b.position.z += dz/d*push;
        }
      }
      resolveCollisions(a.position, .28, colliders);
      a.rotation.y = a.userData.dir>0?0:Math.PI;
      animatePerson(a, t, a.userData.speed, a.userData.dir);
    }
  });

  // drones
  for(let i=0;i<3;i++){
    const d=createDrone(120+i); d.scale.setScalar(.9+i*.12); d.position.set(-3+i*3,4.6+i*.7,-20-i*14); markDynamic(d); root.add(d); drones.push(d);
  }
  updaters.push(t=>{drones.forEach((d,i)=>{d.position.x = (i-1)*3 + Math.sin(t*.25+i)*3; d.position.y = 4.4+i*.7+Math.sin(t*.8+i*1.3)*.3; d.rotation.y=Math.sin(t*.2+i)*.4; d.rotation.z=Math.sin(t*.6+i)*.05;});});

  // petals / motes
  const petals=createPetalField(240,[-25,25,-110,25],77); root.add(petals.points); updaters.push(petals.update);

  // volumetric dust: additive motes that catch the low sun. One draw call,
  // layer 1 so they lift the air without being mirrored by the canal.
  const dustCount = 520;
  const dustPos = new Float32Array(dustCount * 3);
  const dustCol = new Float32Array(dustCount * 3);
  const dr = rng(778);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i*3] = (dr() - .5) * 12;
    dustPos[i*3+1] = .5 + dr() * 6.0;
    dustPos[i*3+2] = 24 - dr() * 104;
    const warm = .7 + dr() * .3;
    dustCol[i*3] = warm; dustCol[i*3+1] = warm * .92; dustCol[i*3+2] = warm * .78;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: TEX.glow, size: .12, transparent: true, opacity: .6, vertexColors: true,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false
  }));
  dust.name = 'dust-motes';
  dust.frustumCulled = false; dust.layers.set(1); root.add(dust);
  const dustBase = dustPos.slice();
  updaters.push(t => {
    const a = dustGeo.attributes.position.array;
    for (let i = 0; i < dustCount; i++) {
      const ph = i * .73;
      a[i*3] = dustBase[i*3] + Math.sin(t*.18 + ph) * .5;
      a[i*3+1] = dustBase[i*3+1] + Math.sin(t*.26 + ph*1.7) * .35;
      a[i*3+2] = dustBase[i*3+2] + Math.cos(t*.14 + ph) * .6;
    }
    dustGeo.attributes.position.needsUpdate = true;
  });

  // rooftop & facade point light pools: warm pockets at street level
  // four warm/cool pockets carry the street lighting; the rest of the glow is
  // emissive bulbs and halo sprites, which cost nothing per fragment
  const lightSpecs = [[-8.8,3.5,8,0xffb46d],[8.8,3.2,5,0xffc07b],[-8.8,3.0,-36,0xffd391],[8.8,3.0,-46,0x9ef5e7]];
  for(const [x,y,z,c] of lightSpecs){ const pl=new THREE.PointLight(c, 2.6, 7, 2); pl.position.set(x,y,z); root.add(pl); }

  // background fog / haze plane behind skyline handled by scene fog; add low mist planes
  const mistTex=canvasTexture(512,256,(ctx,w,h)=>{
    const g=ctx.createLinearGradient(0,0,w,0);
    g.addColorStop(0,'rgba(232,248,255,0)');g.addColorStop(.3,'rgba(229,246,255,.24)');g.addColorStop(.7,'rgba(244,243,225,.20)');g.addColorStop(1,'rgba(255,246,226,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  },{clamp:true});
  for(let i=0;i<6;i++){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(90,14), new THREE.MeshBasicMaterial({map:mistTex,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
    m.position.set(0,2+i*1.6,-100-i*10); m.userData.noMerge=true; root.add(m);
  }

  // contact shadow under building bases to seat them in the street
  for(const side of [-1,1]) { const s=contactShadow(5,70,.26); s.position.set(side*7.4,.03,-30); s.rotation.z=Math.PI/2; root.add(s); }

  // sculpted high-altitude cumulus (kept simple, read as volume)
  const cloudMat = new THREE.MeshStandardMaterial({ color:'#fff8ea', roughness:1, metalness:0, emissive:'#fff1cf', emissiveIntensity:.22, fog:true });
  function cloudBank(cx, cy, cz, sx, sy, seed) {
    const cg = new THREE.Group();
    const rr = rng(seed);
    const puffs = 9;
    for (let i=0;i<puffs;i++) {
      const t = (i/(puffs-1)-.5)*2;
      const px = cx + t*sx*.5 + (rr()-.5)*sx*.18;
      const py = cy - Math.cos(t*Math.PI*.5)*sy*.26 + (rr()-.5)*sy*.18;
      const pz = cz + (rr()-.5)*sx*.2;
      const r = sx*(.10 + (1-Math.abs(t))*.12) + rr()*sx*.025;
      const s = add(cg, sphere(r, 12, 8), cloudMat, [px,py,pz], {cast:false, receive:false});
      s.scale.set(1.1,.64,1.0);
    }
    root.add(cg);
  }
  cloudBank(-33, 42, -82, 36, 14, 21);
  cloudBank(25, 50, -118, 46, 17, 23);
  cloudBank(-6, 62, -175, 60, 22, 25);
  cloudBank(58, 39, -75, 28, 10, 27);

  // merge all the static architecture into a small set of draw calls
  const mergeInfo = mergeStatic(root);
  // Moving props cannot join the static city, but their own static internals
  // can be merged in local space (e.g. a pedestrian's body, a cart's bodywork).
  const dynamicInfo = [];
  for (const d of root.children) {
    if (!d.userData.dynamic) continue;
    const info = mergeStatic(d, { local: true });
    dynamicInfo.push({ name: d.name || d.type, count: info.count });
  }
  setShadows(root,true,true);
  // moving props are excluded from the baked shadow map (layer 1); they keep
  // only their soft contact patches, so no shadow is left behind when they walk
  for (const d of root.children) {
    if (!d.userData.dynamic) continue;
    d.traverse(o => { if (o.isMesh) o.castShadow = false; });
  }
  // alpha-tested cards opt out of the baked map (square card shadows otherwise)
  root.traverse(o => { if (o.userData.noShadow) o.castShadow = false; });

  function billboardArch(tex,w,h){
    const g=new THREE.Group();
    add(g,rBox(w+.3,h+.3,.3,.08,2),MAT.gold,[0,0,-.18]);
    add(g,plane(w,h),MAT.sign(tex,1.4),[0,0,.02],{cast:false,receive:false});
    return g;
  }

  function update(t) {
    updaters.forEach(u=>u(t));
    flagUpdaters.forEach(u=>u(t));
    // sky tram handles itself
  }

  ACTIVE_COLLIDERS = null;
  return {
    root, water, fountain, pedestrians, mergeInfo, dynamicInfo, update, colliders,
    resolveCollisions: (pos, radius, feetY, step) => resolveCollisions(pos, radius, colliders, feetY, step),
    supportAt: (x, z, radius, maxTop) => supportAt(x, z, radius, maxTop, colliders)
  };
}