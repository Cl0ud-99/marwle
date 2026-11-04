import * as THREE from 'three';
import { MAT, TEX } from './materials.js';
import {
  rBox, mesh, plane, cyl, sphere, rng, rand, pick, TAU,
  textTexture, canvasTexture,
  torus
} from './utils.js';

const V = (x,y,z) => new THREE.Vector3(x,y,z);
function add(parent, geo, mat, pos, opts = {}) {
  const m = mesh(geo, mat, { pos, castShadow: opts.cast ?? true, receiveShadow: opts.receive ?? true });
  if (opts.rot) m.rotation.set(...opts.rot);
  if (opts.scale) m.scale.set(...opts.scale);
  if (opts.noMerge) m.userData.noMerge = true;
  parent.add(m); return m;
}

export function contactShadow(w, d, opacity = .4) {
  const tex = contactShadow.tex ?? (contactShadow.tex = canvasTexture(256, 256, (ctx, s) => {
    const g = ctx.createRadialGradient(s/2,s/2,s*.02,s/2,s/2,s*.5);
    g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(.45, 'rgba(0,0,0,.44)'); g.addColorStop(.75, 'rgba(0,0,0,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,s,s);
  }, { clamp: true }));
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: '#0b1418', transparent: true, opacity, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w,d), mat);
  m.rotation.x = -Math.PI/2; m.renderOrder = 2; m.receiveShadow = false;
  m.userData.noMerge = true;
  return m;
}

export function createLamp(seed = 1, height = 7.0) {
  const g = new THREE.Group();
  const r = rng(seed);
  add(g, cyl(.22, .30, .5, 16), MAT.darkMetal, [0,.25,0]);
  add(g, cyl(.09, .13, height, 14), MAT.darkMetal, [0, height*.5+.4, 0]);
  for(let i=0;i<3;i++) add(g, torus(.16+i*.015,.022,6,24), MAT.gold, [0,.65+i*.9,0], {rot:[Math.PI/2,0,0]});
  const armCurve = new THREE.CatmullRomCurve3([
    V(0, height*.9, 0), V(0, height*.98, .7), V(0, height+.15, 1.35), V(0, height+.05, 1.9)
  ]);
  add(g, new THREE.TubeGeometry(armCurve, 20, .055, 8), MAT.darkMetal, [0,0,0]);
  add(g, new THREE.CylinderGeometry(.06, .06, .3, 8), MAT.brass, [0, height+.0, 1.9]);
  add(g, new THREE.ConeGeometry(.35, .22, 16), MAT.gold, [0, height+.05, 1.9]);
  add(g, sphere(.30, 16, 12), MAT.neon('#ffdf9e', 2.3), [0, height-.28, 1.9], {cast:false, receive:false});
  const halo = new THREE.Sprite(MAT.glowSprite('#ffca72', .24)); halo.position.set(0,height-.28,1.9); halo.scale.set(2.2,2.2,1); g.add(halo);
  // hanging flower basket
  const basket = add(g, new THREE.CylinderGeometry(.32,.24,.3,12), MAT.terracotta, [0, height*.78, .72]);
  for (let i=0;i<8;i++){
    const a=i/8*TAU;
    const leaf = add(g, sphere(.18, 8, 6), i%3?MAT.leafMid:MAT.leafDeep, [Math.cos(a)*.28, height*.71 - (i%2)*.16, .72+Math.sin(a)*.28]);
    leaf.scale.set(.9,1.4,.9);
    if(i%2===0){ const fl=add(g, sphere(.06,8,6), i%4?MAT.flowerGold:MAT.flowerPink, [Math.cos(a)*.34, height*.66-(i%2)*.12, .72+Math.sin(a)*.34]); }
  }
  add(g, cyl(.018,.018,.7,6), MAT.brass, [0, height*.82, .72]);
  return g;
}

function limb(a, b, r1, r2, mat) {
  const av = a instanceof THREE.Vector3 ? a : V(...a);
  const bv = b instanceof THREE.Vector3 ? b : V(...b);
  const dir = new THREE.Vector3().subVectors(bv,av);
  const len = dir.length();
  const g = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 10), mat);
  g.position.copy(av).add(bv).multiplyScalar(.5);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
  g.castShadow = true; g.receiveShadow = true;
  return g;
}

let leafCardTex = null;
function leafCardTexture() {
  if (leafCardTex) return leafCardTex;
  leafCardTex = canvasTexture(128, 128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#ffffff';
    const leaf = (x, y, len, ang, w) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.beginPath(); ctx.ellipse(len * .45, 0, len, w, 0, 0, TAU); ctx.fill();
      ctx.restore();
    };
    leaf(56, 64, 30, 0, 9);
    leaf(52, 52, 24, -.7, 7.5);
    leaf(54, 76, 24, .7, 7.5);
    leaf(46, 62, 18, -1.9, 6);
    leaf(58, 42, 16, -2.6, 5.5);
  }, { clamp: true });
  return leafCardTex;
}

const leafCardMats = new Map();
function leafCardMaterial(color) {
  const key = color.getHexString();
  let mat = leafCardMats.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      map: leafCardTexture(), color: color.clone(), alphaTest: .45,
      side: THREE.DoubleSide, roughness: .78, metalness: 0
    });
    mat.name = 'leaf-card';
    leafCardMats.set(key, mat);
  }
  return mat;
}

export function createTree(seed = 1, kind = 'puff', scale = 1) {
  const r = rng(seed);
  const g = new THREE.Group();
  if (kind === 'palm') {
    const h = (6.2 + r()*2.4) * scale;
    const pts = [V(0,0,0), V(.2*scale,h*.25,0), V(.9*scale,h*.58,.15*scale), V(.5*scale,h*.82,0), V(.1*scale,h,0)];
    for (let i=0;i<pts.length-1;i++){
      const a=pts[i], b=pts[i+1];
      g.add(limb(a,b,.22*scale*(1-i*.15),.16*scale*(1-i*.15),MAT.trunk));
    }
    const top = pts[pts.length-1];
    for(let i=0;i<11;i++){
      const a=i/11*TAU + r()*.18;
      const len = (1.9+r()*1.2)*scale;
      const p1 = top.clone().add(V(Math.cos(a)*.15, .08, Math.sin(a)*.15));
      const p2 = top.clone().add(V(Math.cos(a)*len*.55, .28+r()*.25, Math.sin(a)*len*.55));
      const p3 = top.clone().add(V(Math.cos(a)*len, -.55-r()*.6, Math.sin(a)*len));
      const leaf = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p1,p2,p3]), 12, .06*scale, 5, false), i%3?MAT.leafMid:MAT.leafDeep);
      leaf.scale.z = .35; leaf.castShadow=true; g.add(leaf);
      const blade = new THREE.Mesh(new THREE.SphereGeometry(.45*scale, 8, 6), i%2?MAT.leafLight:MAT.leafMid);
      blade.scale.set(1.5,.16,.45); blade.position.copy(p2); blade.lookAt(p3); blade.castShadow=true; g.add(blade);
    }
    return g;
  }
  const h = (2.8 + r()*2.3) * scale;
  const pts = [V(0,0,0), V(.12*scale,h*.3,.05*scale), V(.35*scale,h*.55,.1*scale), V(.18*scale,h*.8,0)];
  for (let i=0;i<pts.length-1;i++) g.add(limb(pts[i],pts[i+1],.20*scale*(1-i*.18),.13*scale*(1-i*.18),MAT.trunk));
  // a few branches
  for(let i=0;i<4;i++){
    const a=r()*TAU;
    const base=V(.18*scale,h*.6,0);
    const end=V(.18*scale+Math.cos(a)*1.0*scale,h*(.75+r()*.2),Math.sin(a)*1.0*scale);
    g.add(limb(base,end,.08*scale,.035*scale,MAT.trunk));
  }
  const palette = kind === 'pink' ? [MAT.leafPink,MAT.leafPink,MAT.leafLight] : [MAT.leafMid,MAT.leafDeep,MAT.leafLight,MAT.leafGold];
  const n = 22 + Math.floor(r()*14);
  for (let i=0;i<n;i++){
    const a=r()*TAU, rad=Math.pow(r(),.65)*(1.45+r()*.8)*scale;
    const yy=h*(.62+r()*.45) + (1-rad*1.2)*.2;
    const s=add(g, sphere((.38+r()*.38)*scale, 8, 6), pick(r,palette), [Math.cos(a)*rad, yy, Math.sin(a)*rad]);
    s.scale.set(1.15,.72+r()*.2,1.15);
    if (r()>.6) {
      const fl = add(g, sphere(.065*scale,6,4), r()>.5?MAT.flowerPink:MAT.flowerGold, [Math.cos(a)*rad*.8, yy+.18, Math.sin(a)*rad*.8], {cast:false});
    }
  }

  // alpha-tested leaf cards break up the spherical silhouette without adding
  // draw calls per tree: all cards for one tree are merged into one mesh.
  const cardPos = [], cardNor = [], cardUv = [], cardIdx = [];
  let cardV = 0;
  const cards = 26;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < cards; i++) {
    const a = r() * TAU;
    const rad = (1.05 + r() * .85) * scale;
    const cy = h * (.62 + r() * .48);
    const cx = Math.cos(a) * rad * .95, cz = Math.sin(a) * rad * .95;
    const n = new THREE.Vector3(Math.cos(a), (r() - .4) * .7, Math.sin(a)).normalize();
    const t = new THREE.Vector3().crossVectors(up, n).normalize();
    const b = new THREE.Vector3().crossVectors(n, t).normalize();
    const w = (.5 + r() * .4) * scale, hh = (.4 + r() * .35) * scale;
    const c = new THREE.Vector3(cx, cy, cz);
    const corners = [
      c.clone().addScaledVector(t, -w/2).addScaledVector(b, -hh/2),
      c.clone().addScaledVector(t,  w/2).addScaledVector(b, -hh/2),
      c.clone().addScaledVector(t,  w/2).addScaledVector(b,  hh/2),
      c.clone().addScaledVector(t, -w/2).addScaledVector(b,  hh/2)
    ];
    for (const p of corners) { cardPos.push(p.x, p.y, p.z); cardNor.push(n.x, n.y, n.z); }
    cardUv.push(0,0, 1,0, 1,1, 0,1);
    cardIdx.push(cardV, cardV+1, cardV+2, cardV, cardV+2, cardV+3);
    cardV += 4;
  }
  const cardGeo = new THREE.BufferGeometry();
  cardGeo.setAttribute('position', new THREE.Float32BufferAttribute(cardPos, 3));
  cardGeo.setAttribute('normal', new THREE.Float32BufferAttribute(cardNor, 3));
  cardGeo.setAttribute('uv', new THREE.Float32BufferAttribute(cardUv, 2));
  cardGeo.setIndex(cardIdx);
  const cardMesh = new THREE.Mesh(cardGeo, leafCardMaterial(palette[0].color));
  cardMesh.castShadow = false;
  cardMesh.receiveShadow = true;
  cardMesh.userData.noMerge = true;
  cardMesh.userData.noShadow = true;
  g.add(cardMesh);
  return g;
}

export function createShrubPlanter(seed = 1, size = 1.0) {
  const g = new THREE.Group();
  const r = rng(seed);
  add(g, new THREE.CylinderGeometry(.7*size,.85*size,.72*size,24), MAT.terracotta, [0,.36*size,0]);
  add(g, torus(.74*size,.055*size,6,32), MAT.creamTrim, [0,.7*size,0], {rot:[Math.PI/2,0,0]});
  add(g, sphere(.72*size,16,12), MAT.soil, [0,.73*size,0]).scale.set(1,.25,1);
  const n=15+Math.floor(r()*10);
  for(let i=0;i<n;i++){
    const a=r()*TAU, rad=r()*.64*size;
    const s=add(g,sphere((.22+r()*.25)*size,8,6),pick(r,[MAT.leafMid,MAT.leafDeep,MAT.leafLight]),[Math.cos(a)*rad,.78*size+r()*.5*size,Math.sin(a)*rad]);
    s.scale.set(1.1,.8,1.1);
    if(r()>.66){add(g,sphere(.055*size,6,4),r()>.5?MAT.flowerPink:MAT.flowerGold,[Math.cos(a)*rad,.9*size+r()*.45*size,Math.sin(a)*rad],{cast:false});}
  }
  return g;
}

export function createBench(seed = 1) {
  const g = new THREE.Group();
  for(let i=0;i<4;i++) add(g, rBox(2.4,.07,.16,.02), MAT.woodLight, [0,.52,.30-i*.19]);
  add(g, rBox(2.4,.11,.64,.04), MAT.wood, [0,.48,0]);
  for(let i=0;i<7;i++) add(g, rBox(.06,.46,.06,.015), MAT.darkMetal, [-1.0+i*.33,.23,0]);
  add(g, rBox(.09,.55,.09,.02), MAT.darkMetal, [-1.0,.30,0]);
  add(g, rBox(.09,.55,.09,.02), MAT.darkMetal, [1.0,.30,0]);
  add(g, rBox(2.35,.08,.08,.02), MAT.darkMetal, [0,.71,-.36]);
  for(let i=0;i<4;i++) add(g, rBox(.06,.45,.06,.015), MAT.darkMetal, [-1.0+i*.66,.91,-.36]);
  return g;
}

export function createCar(color = '#e13a47', seed = 1) {
  const r = rng(seed);
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: .22, metalness: .25, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.8 });
  add(g, rBox(2.0,.62,4.15,.34,5), paint, [0,.62,0]);
  add(g, rBox(1.72,.12,2.3,.12,3), paint, [0,1.0,-.1]);
  add(g, rBox(1.62,.56,1.75,.27,4), MAT.glassDark, [0,1.18,-.12]);
  add(g, rBox(1.66,.08,1.82,.1,2), paint, [0,1.47,-.1]);
  add(g, rBox(1.74,.2,1.9,.14,3), paint, [0,.98,-.02]);
  for(const s of [-1,1]){
    add(g, rBox(.22,.22,.5,.06), MAT.creamTrim, [s*.82,.52,1.63]);
    add(g, sphere(.16,12,8), MAT.neon('#fff1c4',2.6), [s*.63,.63,2.08], {cast:false,receive:false}).userData.noMerge=true;
    add(g, rBox(.32,.2,.2,.04), MAT.paint_glossRed, [s*.58,.43,-2.02]);
  }
  // wheels
  for (const sx of [-1,1]) for (const sz of [-1.35,1.35]) {
    const tire = add(g, new THREE.CylinderGeometry(.43,.43,.26,24), MAT.rubber, [sx*.94,.43,sz], {rot:[0,0,Math.PI/2]});
    const hub = add(g, new THREE.CylinderGeometry(.25,.25,.28,18), MAT.silver, [sx*.94,.43,sz], {rot:[0,0,Math.PI/2]});
    const cap = add(g, new THREE.CylinderGeometry(.11,.11,.3,12), MAT.brass, [sx*.94,.43,sz], {rot:[0,0,Math.PI/2]});
  }
  add(g, rBox(1.5,.05,.12,.01), MAT.creamTrim, [0,.05,0]);
  add(g, rBox(1.8,.09,3.95,.04), MAT.silver, [0,.18,0]);
  const shadow = contactShadow(3.2,5.2,.42); shadow.position.y=.02; g.add(shadow);
  return g;
}

export function createScooter(color = '#28aab3') {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness:.28, metalness:.15, clearcoat:.9, clearcoatRoughness:.1, envMapIntensity:1.6 });
  for(const z of [-.65,.65]) add(g, new THREE.CylinderGeometry(.28,.28,.16,18), MAT.rubber, [0,.3,z], {rot:[0,0,Math.PI/2]});
  add(g, rBox(.45,.35,1.2,.16,3), paint, [0,.55,0]);
  add(g, rBox(.42,.12,.7,.1,3), MAT.charcoal, [0,.76,-.15]);
  add(g, cyl(.045,.045,1.0,8), MAT.silver, [0,.93,.54], {rot:[.22,0,0]});
  add(g, rBox(.58,.05,.05,.02), MAT.silver, [0,1.37,.65]);
  add(g, sphere(.12,12,8), MAT.neon('#ffe8b2',2.1), [0,1.13,.72],{cast:false,receive:false}).userData.noMerge=true;
  add(g, rBox(.4,.34,.4,.08,2), MAT.woodLight, [0,.86,-.55]);
  const sh=contactShadow(1.2,2.0,.35); sh.position.y=.015; g.add(sh);
  return g;
}

export function createPerson(seed = 1, colors = null) {
  const r = rng(seed);
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: pick(r,['#f3c39d','#dca07c','#8f5c44','#ffd4b2']), roughness:.72 });
  const shirt = new THREE.MeshStandardMaterial({ color: colors?.[0] ?? pick(r,['#ff6f76','#43b8bd','#f5c449','#8e8bde','#f78eb2']), roughness:.68 });
  const pants = new THREE.MeshStandardMaterial({ color: colors?.[1] ?? pick(r,['#2d4c67','#e5d6bd','#6e4371','#d76d55']), roughness:.78 });
  const shoes = new THREE.MeshStandardMaterial({ color:'#f5f0df', roughness:.6 });
  const hair = new THREE.MeshStandardMaterial({ color: pick(r,['#3b2821','#6a3c2b','#e5bd76','#1c1d24']), roughness:.8 });
  const hips = new THREE.Group(); hips.position.y=.88; g.add(hips);
  const torso = add(hips, new THREE.CapsuleGeometry(.26,.52,4,10), shirt, [0,.34,0]); torso.scale.set(1,1,.7);
  const head = add(hips, sphere(.22,18,14), skin, [0,.95,0]);
  add(hips, sphere(.23,18,12), hair, [0,1.01,-.02]).scale.set(1.02,.8,1.05);
  // eyes / blush as tiny dots facing +Z
  for(const x of [-.08,.08]) add(hips, sphere(.028,8,6), MAT.charcoal, [x,.97,.205], {cast:false});
  add(hips, sphere(.042,8,6), MAT.flowerPink, [-.14,.91,.195], {cast:false}).scale.set(1,.45,.3);
  add(hips, sphere(.042,8,6), MAT.flowerPink, [.14,.91,.195], {cast:false}).scale.set(1,.45,.3);
  for(const s of [-1,1]){
    const armGroup = new THREE.Group(); armGroup.position.set(s*.31,.58,0); hips.add(armGroup);
    add(armGroup, new THREE.CapsuleGeometry(.075,.48,3,8), skin, [0,-.27,0]).rotation.z = s*.12;
    armGroup.userData.base = 0;
    armGroup.userData.noMerge = true; // animated separately by animatePerson
    g.userData['arm'+s] = armGroup;
  }
  for(const s of [-1,1]){
    const leg = new THREE.Group(); leg.position.set(s*.13,.02,0); hips.add(leg);
    add(leg, new THREE.CapsuleGeometry(.1,.58,3,8), pants, [0,-.34,0]);
    add(leg, rBox(.18,.12,.34,.04), shoes, [0,-.69,.1]);
    leg.userData.noMerge = true; // animated separately by animatePerson
    g.userData['leg'+s] = leg;
  }
  // add accessories
  if (r()>.55) { const hat=add(hips, new THREE.CylinderGeometry(.23,.25,.12,16), MAT.paint_butter, [0,1.17,0]); add(hips, new THREE.CylinderGeometry(.34,.34,.04,16), MAT.paint_butter, [0,1.12,0]); }
  if (r()>.72) { const bag=add(hips, rBox(.3,.35,.13,.04), MAT.wood, [.34,.35,-.12]); bag.rotation.z=.12; }
  if (r()>.78) { for(let i=0;i<5;i++) add(hips, sphere(.06,6,4), MAT.flowerGold, [-.18+i*.09,1.18+Math.sin(i)*.03,.12]); }
  g.scale.setScalar(.98 + r()*.1);
  return g;
}

export function animatePerson(p, t, speed = 1.1, dir = 1) {
  const stride = Math.sin(t * 7 * speed + (p.userData.phase ?? 0)) * .42;
  const l = p.userData['leg-1'], r = p.userData['leg1'];
  if (l) l.rotation.x = stride;
  if (r) r.rotation.x = -stride;
  const al = p.userData['arm-1'], ar = p.userData['arm1'];
  if (al) al.rotation.x = -stride*.7;
  if (ar) ar.rotation.x = stride*.7;
  if (p.userData.torso) p.userData.torso.rotation.z = Math.sin(t*3.4)*.015;
}

export function createCafeSet(seed = 1, colorMat = MAT.awningPink) {
  const g = new THREE.Group();
  const r = rng(seed);
  add(g, cyl(.55,.55,.06,20), MAT.creamTrim, [0,.74,0]);
  add(g, cyl(.05,.07,.72,8), MAT.darkMetal, [0,.38,0]);
  add(g, new THREE.CylinderGeometry(.04,.04,2.7,8), MAT.darkMetal, [0,1.35,0]);
  const canopy = add(g, new THREE.ConeGeometry(2.0,.5,24,1,true), colorMat, [0,2.65,0]);
  canopy.rotation.y = r()*.4;
  add(g, sphere(.06,8,6), MAT.neon('#ffe0a0',2), [0,2.94,0], {cast:false}).userData.noMerge=true;
  for(let i=0;i<3;i++){
    const a=i/3*TAU+0.2;
    const cg=new THREE.Group(); cg.position.set(Math.cos(a)*1.05,0,Math.sin(a)*1.05);
    add(cg, rBox(.42,.05,.42,.025), MAT.woodLight, [0,.46,0]);
    add(cg, rBox(.05,.45,.05,.015), MAT.darkMetal, [-.15,.22,-.15]);
    add(cg, rBox(.05,.45,.05,.015), MAT.darkMetal, [.15,.22,-.15]);
    add(cg, rBox(.05,.45,.05,.015), MAT.darkMetal, [-.15,.22,.15]);
    add(cg, rBox(.05,.45,.05,.015), MAT.darkMetal, [.15,.22,.15]);
    add(cg, rBox(.4,.36,.04,.02), MAT.woodLight, [0,.72,.19]);
    g.add(cg);
  }
  const sh=contactShadow(4.2,4.2,.3); sh.position.y=.01; g.add(sh);
  return g;
}

export function createFountain() {
  const g = new THREE.Group();
  const stone = new THREE.MeshPhysicalMaterial({ color:'#f0d7bd', roughness:.34, clearcoat:.45, clearcoatRoughness:.25, envMapIntensity:1.3 });
  // wide basin and stepped centrepiece
  add(g, cyl(4.6, 4.9, .42, 96), stone, [0,.22,0]);
  add(g, torus(4.65,.16,10,96), MAT.gold, [0,.45,0], {rot:[Math.PI/2,0,0]});
  add(g, cyl(3.8,4.5,1.1,64), stone, [0,.85,0]);
  add(g, cyl(2.0,2.8,.9,48), stone, [0,1.85,0]);
  add(g, torus(3.55,.1,8,64), MAT.gold, [0,1.42,0], {rot:[Math.PI/2,0,0]});
  // central sun sculpture
  add(g, cyl(.55,.9,2.6,20), MAT.gold, [0,3.4,0]);
  const sun = add(g, sphere(1.25, 32, 24), MAT.paint_glossRed, [0,5.15,0]); sun.scale.set(1,.9,.5);
  add(g, torus(1.36,.13,10,48), MAT.gold, [0,5.15,0]);
  for(let i=0;i<12;i++){
    const a=i/12*TAU;
    const ray=add(g, rBox(.14,.75,.12,.03), i%2?MAT.gold:MAT.paint_butter, [Math.cos(a)*1.75,5.15+Math.sin(a)*1.75,.0]);
    ray.rotation.z=a-Math.PI/2;
  }
  add(g, sphere(.2,16,12), MAT.neon('#fff2b4',5), [0,5.15,.65], {cast:false}).userData.noMerge=true;
  // four little side jets
  for(let i=0;i<4;i++){
    const a=i/4*TAU+Math.PI/4;
    add(g, cyl(.28,.4,.6,12), stone, [Math.cos(a)*5.4,.6,Math.sin(a)*5.4]);
    add(g, sphere(.16,12,8), MAT.neon('#b9fff5',3.2), [Math.cos(a)*5.4,.95,Math.sin(a)*5.4],{cast:false}).userData.noMerge=true;
  }
  // particles
  const COUNT=720;
  const pos=new Float32Array(COUNT*3), col=new Float32Array(COUNT*3);
  const particles=[];
  const r=rng(481);
  for(let i=0;i<COUNT;i++){
    const jet=i%5;
    const a= jet===0 ? r()*TAU : (jet-1)/4*TAU+Math.PI/4;
    const spread= jet===0 ? .25 : .08;
    particles.push({
      a, sx: jet===0 ? 0 : Math.cos(a)*5.4, sz: jet===0 ? 0 : Math.sin(a)*5.4,
      sy: jet===0 ? 3.3 : .95,
      vx: jet===0 ? (r()-.5)*1.25 : Math.cos(a)*.7+(r()-.5)*.18,
      vy: jet===0 ? 5.2+r()*2.2 : 4.2+r()*1.6,
      vz: jet===0 ? (r()-.5)*1.25 : Math.sin(a)*.7+(r()-.5)*.18,
      life: .75+r()*.55, phase: r()
    });
    col[i*3]=.75+r()*.25; col[i*3+1]=.94; col[i*3+2]=1;
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geom.setAttribute('color', new THREE.BufferAttribute(col,3));
  const mat=new THREE.PointsMaterial({ map: TEX.glow, size:.19, transparent:true, opacity:.8, vertexColors:true, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false });
  const points=new THREE.Points(geom,mat); points.frustumCulled=false; g.add(points);
  // (the old Sprite mist quads rendered as black translucent sheets around
  // the sculpture; the particle jets already carry the spray)
  const sh=contactShadow(17,17,.22); sh.position.y=.01; g.add(sh);
  function update(t) {
    const arr=geom.attributes.position.array;
    for(let i=0;i<COUNT;i++){
      const p=particles[i];
      const local=(t*.68 + p.phase*p.life*2.0) % p.life;
      const x=p.sx+p.vx*local*1.6; const z=p.sz+p.vz*local*1.6;
      const y=p.sy+p.vy*local - 4.9*local*local;
      arr[i*3]=x; arr[i*3+1]=Math.max(.45,y); arr[i*3+2]=z;
    }
    geom.attributes.position.needsUpdate=true;
  }
  return { group:g, update };
}

export function createPennantLine(a, b, seed=1, count=13, sag=.9) {
  const g=new THREE.Group();
  const av=a instanceof THREE.Vector3?a:V(...a), bv=b instanceof THREE.Vector3?b:V(...b);
  const pts=[];
  for(let i=0;i<=20;i++){
    const t=i/20;
    const p=av.clone().lerp(bv,t); p.y-=Math.sin(t*Math.PI)*sag; pts.push(p);
  }
  const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),32,.018,5,false),MAT.darkMetal); g.add(cable);
  const flags=[];
  const cols=[MAT.paint_rose,MAT.paint_butter,MAT.paint_mint,MAT.paint_lavender,MAT.paint_coral];
  for(let i=0;i<count;i++){
    const t=(i+.5)/count;
    const p=av.clone().lerp(bv,t); p.y-=Math.sin(t*Math.PI)*sag;
    const shape=new THREE.Shape(); shape.moveTo(-.32,0); shape.lineTo(.32,0); shape.lineTo(0,-.75); shape.closePath();
    const geo=new THREE.ShapeGeometry(shape);
    const m=new THREE.Mesh(geo, cols[i%cols.length]); m.position.copy(p); m.userData.noMerge=true; m.castShadow=false;
    m.userData.phase=i*.7; flags.push(m); g.add(m);
  }
  const r=rng(seed);
  g.userData.flags=flags;
  function update(t){ flags.forEach((f,i)=>{f.rotation.y=Math.sin(t*2.1+i*.6)*.35; f.rotation.z=Math.sin(t*1.7+i*.4)*.06;}); }
  return {group:g,update};
}

export function createDrone(seed=1) {
  const g=new THREE.Group();
  add(g, rBox(.7,.26,.9,.18,3), MAT.whiteTrim, [0,0,0]);
  add(g, sphere(.3,16,12), MAT.glassBlue, [0,.12,.1]).scale.set(1,.7,1.3);
  for(const s of [-1,1]) for(const z of [-.42,.42]) {
    add(g, cyl(.035,.035,.32,6), MAT.darkMetal, [s*.44,.05,z]);
    const rotor=add(g, torus(.26,.03,6,20), MAT.darkMetal, [s*.44,.23,z], {rot:[Math.PI/2,0,0]});
  }
  add(g, rBox(.38,.3,.38,.05), MAT.woodLight, [0,-.32,.1]);
  add(g, sphere(.08,8,6), MAT.neon('#58f6ff',2.6), [0,-.1,.5],{cast:false}).userData.noMerge=true;
  const halo=new THREE.Sprite(MAT.glowSprite('#6ef7ff',.28)); halo.scale.set(1.6,1.6,1); g.add(halo);
  return g;
}

export function createPetalField(count=180, extent=[-40,40,-110,25], seed=5) {
  const r=rng(seed);
  const pos=new Float32Array(count*3); const col=new Float32Array(count*3); const phase=new Float32Array(count);
  const pal=[new THREE.Color('#ffd4df'), new THREE.Color('#ffe6ad'), new THREE.Color('#ffffff'), new THREE.Color('#c3f2e9')];
  for(let i=0;i<count;i++){
    pos[i*3]=rand(r,extent[0],extent[1]); pos[i*3+1]=rand(r,1,22); pos[i*3+2]=rand(r,extent[2],extent[3]); phase[i]=r()*100;
    const c=pal[i%pal.length]; col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
  }
  const geom=new THREE.BufferGeometry(); geom.setAttribute('position',new THREE.BufferAttribute(pos,3)); geom.setAttribute('color',new THREE.BufferAttribute(col,3));
  const mat=new THREE.PointsMaterial({map:TEX.glow,size:.16,transparent:true,opacity:.34,vertexColors:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const pts=new THREE.Points(geom,mat); pts.frustumCulled=false;
  const base=pos.slice(); // absolute drift, not per-frame accumulation (stable when frozen)
  function update(t){const a=geom.attributes.position.array; for(let i=0;i<count;i++){a[i*3]=base[i*3]+Math.cos(t*.22+phase[i])*.4; a[i*3+1]=base[i*3+1]+Math.sin(t*.3+phase[i])*.45;} geom.attributes.position.needsUpdate=true;}
  return {points:pts,update};
}


export function createCandyCart() {
  const g = new THREE.Group();
  const pink = new THREE.MeshPhysicalMaterial({ color:'#f26188', roughness:.32, metalness:.08, clearcoat:.8, clearcoatRoughness:.15, envMapIntensity:1.3 });
  const cream = MAT.whiteTrim;
  // cart body, wheels, brass rail
  add(g, rBox(2.8, 1.0, 1.45, .22, 4), pink, [0,1.05,0]);
  add(g, rBox(2.6, .08, 1.3, .03), MAT.woodLight, [0,1.58,0]);
  for(const s of [-1,1]){
    add(g, new THREE.CylinderGeometry(.42,.42,.18,20), MAT.rubber, [s*1.18,.42,.62], {rot:[0,0,Math.PI/2]});
    add(g, new THREE.CylinderGeometry(.24,.24,.2,16), MAT.gold, [s*1.18,.42,.62], {rot:[0,0,Math.PI/2]});
    add(g, new THREE.CylinderGeometry(.42,.42,.18,20), MAT.rubber, [s*1.18,.42,-.62], {rot:[0,0,Math.PI/2]});
  }
  for(const sx of [-1,1]) for(const sz of [-1,1]) {
    add(g, new THREE.CylinderGeometry(.04,.04,2.4,8), MAT.gold, [sx*1.1,2.5,sz*.55]);
  }
  add(g, rBox(3.2,.14,1.9,.06,3), MAT.awningPink, [0,3.35,0], {rot:[-.09,0,0]});
  add(g, rBox(3.25,.12,.12,.04), MAT.creamTrim, [0,3.2,.94]);
  // candy jars
  const candyCols=[MAT.flowerPink,MAT.flowerGold,MAT.leafMint||MAT.paint_mint,MAT.flowerBlue,MAT.paint_coral];
  for(let i=0;i<5;i++){
    const jar=new THREE.Group(); jar.position.set(-1.02+i*.5,1.72,0);
    add(jar, new THREE.CylinderGeometry(.17,.19,.42,16), MAT.glassClear, [0,.23,0]);
    add(jar, new THREE.CylinderGeometry(.13,.15,.28,14), candyCols[i], [0,.19,0]);
    for(let j=0;j<5;j++){const a=j*1.7+i; add(jar,sphere(.045,6,4),j%2?MAT.flowerGold:MAT.flowerPink,[Math.sin(a)*.07,.11+(j%3)*.05,Math.cos(a)*.07],{cast:false});}
    add(jar, new THREE.CylinderGeometry(.19,.19,.05,16), MAT.gold, [0,.45,0]);
    g.add(jar);
  }
  // lollipop stand
  for(let i=0;i<3;i++){
    add(g, new THREE.CylinderGeometry(.025,.025,1.5,6), MAT.whiteTrim, [1.28,2.1+i*.12,-.35+i*.3]);
    const pop=add(g,sphere(.22,12,8), [MAT.paint_rose,MAT.paint_butter,MAT.paint_mint][i], [1.28,2.88+i*.12,-.35+i*.3]);
    for(let k=0;k<2;k++) add(g,torus(.20-k*.06,.02,5,16),MAT.whiteTrim,[1.28,2.88+i*.12,-.35+i*.3],{rot:[0,Math.PI/2,0]});
  }
  // tiny sign
  add(g, rBox(1.55,.62,.08,.06,2), MAT.paint_cream, [0,2.55,.74]);
  add(g, plane(1.35,.48), MAT.sign(textTexture({text:'SWEET',width:512,height:192,font:'900 100px Bungee, Arial Black, sans-serif',color:'#e75d77'}),1.0), [0,2.55,.805], {cast:false,receive:false}).userData.noMerge=true;
  // balloons on ribbons
  const balloons=[];
  const bcols=['#ff99aa','#ffd36c','#8de3ce','#c3b0f0','#ffbf8a'];
  for(let i=0;i<6;i++){
    const bx=-1.3+i*.52, by=4.25+Math.sin(i*1.2)*.45, bz=(i%2?.2:-.2);
    const b=add(g,sphere(.34,16,12), new THREE.MeshPhysicalMaterial({color:bcols[i],roughness:.26,clearcoat:.8,clearcoatRoughness:.18,envMapIntensity:1.5}),[bx,by,bz],{cast:false});
    b.scale.set(1,1.15,1); b.userData.baseY = by; b.userData.noMerge = true; balloons.push(b);
    add(g, new THREE.CylinderGeometry(.006,.006,2.6,4), MAT.whiteTrim, [bx,by-1.5,bz],{cast:false});
  }
  // a shop cat asleep on the warm counter
  const cat = new THREE.Group();
  const catFur = new THREE.MeshStandardMaterial({ color:'#f1b36e', roughness:.85 });
  const catCream = new THREE.MeshStandardMaterial({ color:'#fff0d4', roughness:.82 });
  add(cat, sphere(.34,16,12), catFur, [0,-.12,0]); cat.children[0].scale.set(1.25,.52,.75);
  add(cat, sphere(.21,16,12), catCream, [.18,-.05,.18]);
  for(const s of [-1,1]) { const ear=add(cat,new THREE.ConeGeometry(.08,.18,3),catFur,[.18+s*.11,.13,.18]); ear.rotation.z=s*.22; }
  add(cat, torus(.28,.035,6,20,Math.PI), catFur, [-.32,-.08,0], {rot:[0,Math.PI/2,0]});
  for(const s of [-1,1]) add(cat,sphere(.025,6,4),MAT.charcoal,[.20+s*.06,.02,.33],{cast:false});
  cat.position.set(.95,1.67,.05); cat.rotation.y=-.35; g.add(cat);
  const sh=contactShadow(4.5,3.2,.36); sh.position.y=.02; g.add(sh);
  return {group:g, balloons};
}
