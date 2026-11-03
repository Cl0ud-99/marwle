import * as THREE from 'three';
import { MAT, TEX } from './materials.js';
import {
  rBox, mesh, plane, cyl, sphere, rng, pick, TAU, tube, cylinderBetween,
  makeInstanced, textTexture,
  torus
} from './utils.js';

// ─────────────────────────────────────────────────────────────
//  Architecture kit: candy-modernist volumes, readable from every
//  angle, with actual trim, cornices, glazing and roof clutter.
// ─────────────────────────────────────────────────────────────

function add(group, geo, mat, pos, opts = {}) {
  const m = mesh(geo, mat, { pos, castShadow: opts.cast ?? true, receiveShadow: opts.receive ?? true });
  if (opts.rot) m.rotation.set(...opts.rot);
  if (opts.scale) m.scale.set(...opts.scale);
  if (opts.name) m.name = opts.name;
  group.add(m);
  return m;
}

function archShape(w, h) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(-r, h - r);
  s.absarc(0, h - r, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.closePath();
  return s;
}

export function archWindow(w, h, opts = {}) {
  const g = new THREE.Group();
  const frame = opts.frameMat ?? MAT.whiteTrim;
  const glass = opts.glass ?? MAT.glassWarm;
  const z = 0;
  const outer = new THREE.ShapeGeometry(archShape(w + .22, h + .18), 20);
  add(g, outer, frame, [0, 0, z]);
  const inner = new THREE.ShapeGeometry(archShape(w, h), 20);
  const gm = add(g, inner, glass, [0, .05, z + .018]);
  gm.receiveShadow = true;
  const barMat = opts.barMat ?? frame;
  add(g, rBox(.055, h * .82, .035, .012), barMat, [0, h*.46, z+.032]);
  add(g, rBox(w * .88, .05, .035, .012), barMat, [0, h*.48, z+.034]);
  add(g, rBox(w + .32, .10, .18, .025), barMat, [0, .04, z+.05]);
  return g;
}

export function windowUnit(w, h, opts = {}) {
  const g = new THREE.Group();
  const frame = opts.frameMat ?? MAT.whiteTrim;
  const glass = opts.glass ?? MAT.glassDark;
  const mullion = opts.mullion ?? frame;

  if (opts.style !== 'hero') {
    // cheap unit for the background rows: still real geometry, but flat
    add(g, rBox(w + .18, h + .18, .13, .035, 2), frame, [0, 0, 0]);
    add(g, rBox(w, h, .075, .02, 2), glass, [0, 0, .085]);
    add(g, rBox(.045, h * .92, .04, .01), mullion, [0, 0, .14]);
    add(g, rBox(w * .92, .045, .04, .01), mullion, [0, h*.12, .14]);
    add(g, rBox(w + .31, .10, .21, .025), frame, [0, -h*.53, .06]);
    return g;
  }

  // hero unit: a projecting surround with real jambs, so the sun can drop a
  // shadow into the reveal and the glass sits visibly behind the moulding
  const depth = .26;
  const front = depth * .5;
  add(g, rBox(w + .34, h + .38, depth, .05, 3), frame, [0, 0, 0]);
  add(g, rBox(w, h, .06, .02, 2), glass, [0, 0, front - .12]);
  const j = .06;
  add(g, rBox(j, h - .02, .24, .015, 2), frame, [-(w*.5 - j*.5), 0, front - .13]);
  add(g, rBox(j, h - .02, .24, .015, 2), frame, [ (w*.5 - j*.5), 0, front - .13]);
  add(g, rBox(w - .02, j, .24, .015, 2), frame, [0,  (h*.5 - j*.5), front - .13]);
  add(g, rBox(w - .02, j, .24, .015, 2), frame, [0, -(h*.5 - j*.5), front - .13]);
  add(g, rBox(.05, h * .9, .05, .01), mullion, [0, 0, front - .085]);
  add(g, rBox(w * .9, .05, .05, .01), mullion, [0, h*.12, front - .085]);
  // sill + drip course
  add(g, rBox(w + .44, .11, .32, .03, 2), frame, [0, -h*.55, .10]);
  add(g, rBox(w + .52, .055, .38, .02, 2), MAT.creamTrim, [0, -h*.63, .13]);
  return g;
}

function bulbRing(parent, w, h, y, z, count, color = '#ffd56e', radius = .06) {
  const geos = [];
  const transforms = [];
  const n = Math.max(8, count);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = (t - .5) * w;
    transforms.push({ x, y: y + h*.5, z, scale: radius });
    transforms.push({ x, y: y - h*.5, z, scale: radius });
  }
  const left = Math.max(4, Math.round(n * h / w));
  for (let i = 1; i < left; i++) {
    const yy = y - h*.5 + (i/left)*h;
    transforms.push({ x: -w*.5, y: yy, z, scale: radius });
    transforms.push({ x: w*.5, y: yy, z, scale: radius });
  }
  const mat = MAT.neon(color, 3.2);
  const im = makeInstanced(new THREE.SphereGeometry(1, 8, 6), mat, transforms, false, false);
  parent.add(im);
  return im;
}

export function billboard(tex, w, h, opts = {}) {
  const g = new THREE.Group();
  const depth = opts.depth ?? .22;
  if (opts.backing !== false) {
    add(g, rBox(w + .3, h + .3, depth, Math.min(.1, depth*.4)), opts.backingMat ?? MAT.creamTrim, [0, 0, -depth*.5]);
  }
  const planeMesh = add(g, plane(w, h), MAT.sign(tex, opts.intensity ?? 1.2), [0, 0, .005], { cast: false, receive: false });
  planeMesh.userData.noMerge = true;
  if (opts.border) {
    const t = opts.borderWidth ?? .12;
    const bm = opts.borderMat ?? MAT.gold;
    add(g, rBox(w + t*2, t, .2, .025), bm, [0, h*.5+t*.5, .02]);
    add(g, rBox(w + t*2, t, .2, .025), bm, [0, -h*.5-t*.5, .02]);
    add(g, rBox(t, h, .2, .025), bm, [-w*.5-t*.5, 0, .02]);
    add(g, rBox(t, h, .2, .025), bm, [w*.5+t*.5, 0, .02]);
  }
  if (opts.bulbs) bulbRing(g, w + .16, h + .16, 0, .16, Math.round(w*3.2), opts.bulbColor ?? '#ffd56e', .052);
  return g;
}

export function awning(width, depth = 2.4, opts = {}) {
  const g = new THREE.Group();
  const mat = opts.mat ?? MAT.awningPink;
  const canopy = add(g, rBox(width, .18, depth, .09, 2), mat, [0, 0, 0], { rot: [-.13, 0, 0] });
  // scalloped valance as a shallow box with round underside
  const valance = add(g, new THREE.CylinderGeometry(depth*.11, depth*.11, width, 20, 1, false, 0, Math.PI), mat, [0, -.22, depth*.05], { rot: [0, 0, Math.PI/2] });
  valance.scale.set(1, 1, .55);
  const edge = add(g, rBox(width, .07, .07, .02), MAT.creamTrim, [0, -.18, depth*.48], { rot: [-.13, 0, 0] });
  if (opts.stripes !== false) {
    for (let i = -2; i <= 2; i++) {
      add(g, rBox(.035, .11, depth*.98, .015), MAT.creamTrim, [i*width/5, -.065, 0], { rot: [-.13,0,0] });
    }
  }
  if (opts.rods !== false) {
    for (const side of [-1, 1]) {
      const a = new THREE.Vector3(side*width*.42, -.75, -depth*.25);
      const b = new THREE.Vector3(side*width*.46, -.02, depth*.44);
      const rod = cylinderBetween(a, b, .018, MAT.brass, 6);
      g.add(rod);
    }
  }
  return g;
}

function railing(width, depth, height = .48, mat = MAT.whiteTrim) {
  const g = new THREE.Group();
  add(g, rBox(width, .06, .06, .015), mat, [0, height, 0]);
  add(g, rBox(width, .035, .035, .01), mat, [0, height*.48, 0]);
  const n = Math.max(5, Math.round(width / .32));
  for (let i = 0; i < n; i++) {
    add(g, cyl(.018, .018, height, 6), mat, [ -width*.5 + (i/(n-1))*width, height*.5, 0 ]);
  }
  for (const side of [-1,1]) add(g, rBox(.05, height, .05, .012), mat, [side*width*.5, height*.5, 0]);
  return g;
}

function balcony(width, depth = 1.2, opts = {}) {
  const g = new THREE.Group();
  add(g, rBox(width, .16, depth, .06, 2), opts.slabMat ?? MAT.creamTrim, [0, 0, 0]);
  const r = railing(width - .1, depth, .5, opts.railMat ?? MAT.whiteTrim);
  r.position.set(0, .08, depth*.5 - .05);
  g.add(r);
  // side rails
  for (const side of [-1,1]) {
    const sr = railing(depth - .1, depth, .5, opts.railMat ?? MAT.whiteTrim);
    sr.rotation.y = Math.PI/2; sr.position.set(side*(width*.5-.03), .08, 0); g.add(sr);
  }
  if (opts.flowers !== false) {
    for (let i = 0; i < 3; i++) {
      const f = flowerBox(width*.28, .08);
      f.position.set((i-1)*width*.3, .08, depth*.54); g.add(f);
    }
  }
  return g;
}

export function flowerBox(width = 1.4, height = .2) {
  const g = new THREE.Group();
  add(g, rBox(width, .18, .26, .035), MAT.terracotta, [0, 0, 0]);
  add(g, rBox(width-.06, .04, .20, .01), MAT.soil, [0, .1, 0]);
  const r = rng(710 + Math.floor(width*19));
  const n = Math.max(4, Math.round(width*7));
  for (let i=0;i<n;i++){
    const px = (r()-.5)*width*.85;
    const leaf = add(g, sphere(.12, 8, 6), r()>.48?MAT.leafMid:MAT.leafDeep, [px, .14+r()*.08, (r()-.5)*.14]);
    leaf.scale.set(.9,.45,.9);
    if (i%2===0) {
      const col = pick(r,[MAT.flowerPink,MAT.flowerGold,MAT.flowerBlue]);
      const fl = add(g, sphere(.06, 8, 6), col, [px+(r()-.5)*.1,.23+r()*.08,(r()-.5)*.15]);
      fl.scale.set(1,.7,1);
    }
  }
  return g;
}

function roofPlanters(g, width, depth, y, seed) {
  const r = rng(seed);
  for (let i = 0; i < 4; i++) {
    const px = (i-1.5)*width*.2;
    const p = new THREE.Group();
    add(p, rBox(1.2, .6, .9, .08), MAT.creamTrim, [0,.3,0]);
    add(p, rBox(1.05, .08, .75, .02), MAT.soil, [0,.62,0]);
    for(let j=0;j<7;j++){
      const s = add(p, sphere(.28+r()*.15, 8, 6), pick(r,[MAT.leafMid,MAT.leafDeep,MAT.leafLight]), [(r()-.5)*.9, .72+r()*.3, (r()-.5)*.55]);
      s.scale.set(1.2,.7,1.2);
    }
    p.position.set(px, y, depth*.3); g.add(p);
  }
}

function addCornice(g, width, depth, y, mat, thickness=.35, out=.4) {
  // four stepped slabs read as a real moulding profile (bed → fascia → cove → crown)
  const w = width + out, d = depth + out;
  add(g, rBox(w*.985, thickness*.50, d*.985, .03, 2), mat, [0, y - thickness*.28, 0]);
  add(g, rBox(w, thickness, d, .05, 2), mat, [0, y, 0]);
  add(g, rBox(w*.975, thickness*.45, d*.975, .04, 2), mat, [0, y + thickness*.62, 0]);
  add(g, rBox(w*1.012, thickness*.20, d*1.012, .025, 2), mat, [0, y + thickness*.90, 0]);
}

// Roof clutter: nothing adds silhouette detail faster than a few boxes, a
// water tank and an antenna on top of an otherwise plain parapet.
function roofClutter(g, width, depth, y, seed) {
  const r = rng(seed);
  const steel = MAT.darkMetal, silver = MAT.silver, cream = MAT.creamTrim;
  const n = 2 + Math.floor(r() * 2.4);
  for (let i = 0; i < n; i++) {
    const x = (r() - .5) * width * .62, z = (r() - .5) * depth * .55;
    if (r() > .45) {
      const w = 1.0 + r() * .7, h = .5 + r() * .22, d = .8 + r() * .45;
      add(g, rBox(w, h, d, .055, 2), silver, [x, y + h * .5, z]);
      add(g, cyl(.25, .25, .07, 18), steel, [x, y + h + .03, z]);
      add(g, rBox(w * .8, .05, .08, .01), steel, [x, y + h * .45, z + d * .52]);
    } else {
      const h = .5 + r() * .8;
      add(g, cyl(.11, .13, h, 10), steel, [x, y + h * .5, z]);
      add(g, sphere(.15, 10, 8), steel, [x, y + h, z]);
    }
  }
  if (r() > .55) {
    const x = (r() - .5) * width * .4, z = (r() - .5) * depth * .4;
    const rad = .65 + r() * .35, h = 1.3 + r() * .6;
    add(g, cyl(rad, rad, h, 18), cream, [x, y + .55 + h * .5, z]);
    add(g, sphere(rad * .55, 14, 10), cream, [x, y + .55 + h, z]).scale.set(1, .5, 1);
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * TAU;
      add(g, cyl(.05, .05, .9, 6), steel, [x + Math.cos(a) * rad * .72, y + .45, z + Math.sin(a) * rad * .72]);
    }
  }
  if (r() > .35) {
    const x = (r() - .5) * width * .5, z = (r() - .5) * depth * .45, h = 2.1 + r() * 1.8;
    add(g, cyl(.035, .05, h, 6), steel, [x, y + h * .5, z]);
    for (let k = 1; k < 4; k++) add(g, rBox(.72 - k * .13, .03, .03, .005), steel, [x, y + h * (.45 + k * .14), z]);
  }
}

export function facadeWindows(g, opts) {
  const {
    width, height, y0, z, cols, rows, ww = 1.15, wh = 1.8,
    glass = MAT.glassDark, frame = MAT.whiteTrim, flowerRows = [],
    litPattern = null, balconyRows = [], awningRows = []
  } = opts;
  const gapX = (width - cols*ww) / (cols + 1);
  const gapY = (height - rows*wh) / (rows + 1);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = -width/2 + gapX + ww/2 + col*(ww+gapX);
      const y = y0 + gapY + wh/2 + row*(wh+gapY);
      const lit = litPattern ? litPattern(row, col) : ((row*3+col*5)%7===0);
      const glassMat = lit ? (col%2 ? MAT.glassWarm : MAT.shopWindowsCool) : glass;
      const w = windowUnit(ww, wh, { glass: glassMat, frameMat: frame, style: opts.style });
      w.position.set(x, y, z);
      g.add(w);
      if (flowerRows.includes(row)) {
        const fb = flowerBox(ww*.92, .12); fb.position.set(x, y-wh*.58, z+.26); g.add(fb);
      }
      if (opts.awnings !== false && row < 2) {
        const awnMats = [MAT.awningPink, MAT.awningMint, MAT.awningBlue, MAT.awningGold];
        const am = awnMats[(col + row) % 4];
        const canopy = add(g, rBox(ww*1.16, .055, .48, .02), am, [x, y + wh*.54, z + .22]);
        canopy.rotation.x = -.18;
        add(g, rBox(ww*1.16, .10, .055, .02), MAT.creamTrim, [x, y + wh*.47, z + .45]);
      }
    }
  }
  for (const row of balconyRows) {
    const y = y0 + gapY + (row+1)*(wh+gapY) - gapY*.4;
    const b = balcony(width*.94, 1.15, { slabMat: frame, railMat: MAT.whiteTrim });
    b.position.set(0, y, z + .44); g.add(b);
  }
  return { gapX, gapY };
}

function cornerTurret(g, x, z, radius, height, opts = {}) {
  const y0 = opts.y0 ?? 0;
  add(g, cyl(radius, radius*1.03, height, 40), opts.mat ?? MAT.paint_cream, [x, y0+height/2, z]);
  for (let i=0; i<3; i++) {
    add(g, torus(radius*1.02, .055, 8, 48), MAT.gold, [x, y0 + height*(.25+i*.22), z], { rot:[Math.PI/2,0,0] });
  }
  const dome = add(g, new THREE.SphereGeometry(radius*1.12, 40, 24, 0, TAU, 0, Math.PI/2), opts.domeMat ?? MAT.paint_rose, [x, y0+height, z]);
  dome.scale.set(1,.62,1);
  add(g, torus(radius*1.12, .07, 8, 48), MAT.gold, [x, y0+height, z], {rot:[Math.PI/2,0,0]});
  add(g, new THREE.CylinderGeometry(.04,.07,1.8,8), MAT.gold, [x, y0+height+radius*.58, z]);
  add(g, new THREE.SphereGeometry(.18, 12, 8), MAT.neon('#ffe38e', 3), [x, y0+height+radius*.58+1.0, z]).userData.noMerge = true;
  const win = archWindow(radius*1.1, height*.36, { glass: MAT.glassWarm, frameMat: MAT.whiteTrim });
  win.rotation.y = Math.PI/2;
  win.position.set(x+radius*1.02, y0+height*.35, z);
  g.add(win);
}

export function createFizzDome() {
  const g = new THREE.Group();
  g.name = 'fizz-dome';
  const bodyMat = MAT.paint_peach, trim = MAT.paint_cream;
  add(g, rBox(13, 11.5, 11, 2.6, 5), bodyMat, [0, 5.75, 0]);
  add(g, rBox(12.2, 4.2, 10.4, 1.8, 4), trim, [0, 12.0, 0]);
  addCornice(g, 13.2, 11.1, 10.4, MAT.paint_magenta, .38, .5);
  add(g, rBox(13.4, .7, 11.2, .16, 2), MAT.paint_magenta, [0, 10.2, 0]);
  // proud central dome
  const dome = add(g, new THREE.SphereGeometry(6.7, 64, 32, 0, TAU, 0, Math.PI/2), MAT.paint_magenta, [0, 13.9, 0]);
  dome.scale.set(1.18, .78, 1.08);
  for (let i=0;i<4;i++){
    const ry = 14.0 + i*1.0;
    const rr = 6.75 * Math.sqrt(Math.max(0,1 - Math.pow((ry-13.9)/5.1, 2))) * 1.18;
    add(g, torus(rr, .075, 8, 64), MAT.gold, [0, ry, 0], { rot:[Math.PI/2,0,0] });
  }
  add(g, new THREE.CylinderGeometry(.1,.15,3.6,10), MAT.gold, [0, 20.0, 0]);
  add(g, new THREE.SphereGeometry(.34, 16, 12), MAT.neon('#ffe387', 4), [0, 21.9, 0]).userData.noMerge = true;
  // vertical ribbing on dome
  for (let i=0;i<10;i++){
    const a=i/10*TAU;
    const p1 = new THREE.Vector3(Math.cos(a)*6.1, 14.2, Math.sin(a)*6.1);
    const p2 = new THREE.Vector3(Math.cos(a)*3.4, 17.8, Math.sin(a)*3.4);
    const p3 = new THREE.Vector3(Math.cos(a)*.4, 19.5, Math.sin(a)*.4);
    const rib = tube([p1,p2,p3], .035, MAT.gold, 20, 5);
    g.add(rib);
  }
  // big shopfront + glass awning
  add(g, rBox(10.8, 4.0, .16, .04), MAT.glassDark, [0, 2.4, 5.57]);
  add(g, plane(10.2, 3.35), MAT.shopWindows, [0, 2.45, 5.68], {receive:false});
  for (let i=-3;i<=3;i++) add(g, rBox(.10, 3.75, .2, .025), MAT.creamTrim, [i*1.55, 2.45, 5.76]);
  const door = add(g, rBox(1.8, 3.5, .22, .06), MAT.paint_glossTeal, [3.6, 1.95, 5.72]);
  add(g, torus(.46, .035, 8, 20), MAT.gold, [3.6, 2.0, 5.86]);
  const awn = awning(11.5, 3.0, { mat: MAT.awningPink }); awn.position.set(0, 4.8, 6.55); g.add(awn);
  for(let i=-2;i<=2;i++){
    const bulb = add(g, sphere(.065,8,6), MAT.neon('#ffd56e',3.4), [i*2.1, 4.62, 8.02], {cast:false, receive:false});
    bulb.userData.noMerge = true;
  }
  // windows and balconies
  facadeWindows(g, { width: 11.0, height: 4.6, y0: 6.0, z: 5.56, cols: 5, rows: 2, ww: 1.42, wh: 1.75, flowerRows:[1], balconyRows:[1], glass: MAT.glassBlue, style: 'hero' });
  // narrow side windows
  for (const side of [-1,1]) {
    const w = windowUnit(1.3, 1.8, { glass: side<0?MAT.glassWarm:MAT.glassDark, style: 'hero' });
    w.rotation.y = side*Math.PI/2; w.position.set(side*6.55, 8.0, 1.8); g.add(w);
    const w2 = windowUnit(1.3, 1.8, { glass: MAT.glassBlue, style: 'hero' });
    w2.rotation.y = side*Math.PI/2; w2.position.set(side*6.55, 8.0, -1.3); g.add(w2);
  }
  // roof terrace rail and greenery
  const topRail = railing(12.2, 1, .55, MAT.creamTrim); topRail.position.set(0, 14.2, 4.7); g.add(topRail);
  roofPlanters(g, 8, 6, 14.3, 72);
  // drainpipes and bolts
  for (const x of [-5.9, 5.9]) {
    add(g, cyl(.09,.09,10.2,10), MAT.creamTrim, [x, 5.2, 5.48]);
    for(let i=0;i<4;i++) add(g, rBox(.12,.3,.12,.02), MAT.darkTrim, [x, 1.4+i*2.3, 5.52]);
  }
  // wall sconces
  for(const x of [-4.9, 4.9]){
    add(g, rBox(.22,.5,.3,.05), MAT.gold, [x, 5.75, 5.6]);
    const b = add(g, sphere(.16,10,8), MAT.neon('#ffdb99', 2.3), [x,5.82,5.82],{cast:false,receive:false}); b.userData.noMerge=true;
  }
  // ── side elevation facing the approach ──
  for (const sx of [-1,1]) {
    const x = sx * 6.56;
    const ry = sx < 0 ? -Math.PI/2 : Math.PI/2;
    for (let f=0; f<3; f++) {
      for (let c=0; c<3; c++) {
        const w = windowUnit(1.24, 1.5, { glass: (f+c)%2 ? MAT.glassWarm : MAT.glassBlue, frameMat: MAT.creamTrim, style: 'hero' });
        w.rotation.y = ry; w.position.set(x, 6.8+f*1.95, -2.8+c*2.75); g.add(w);
      }
    }
    for (let i=0;i<4;i++) add(g, rBox(.18,.12,10.4,.03), MAT.paint_magenta, [x, 2.6+i*2.1, 0]);
    if (sx < 0) {
      const side = billboard(TEX.fizz, 1.9, 4.4, { depth:.16, backingMat: MAT.paint_glossRed, border:true, borderMat:MAT.gold, borderWidth:.08, bulbs:false, intensity:1.15 });
      side.rotation.y = -Math.PI/2; side.position.set(x-.08, 9.4, -3.2); g.add(side);
      const med = new THREE.Group();
      add(med, new THREE.CircleGeometry(1.45,48), MAT.sign(TEX.screenFace,1), [0,0,.03]);
      add(med, torus(1.52,.1,10,48), MAT.gold, [0,0,0]);
      med.rotation.y = -Math.PI/2; med.position.set(x-.1, 8.2, 2.6); g.add(med);
      const post = billboard(TEX.poster3, 3.2, 4.1, { depth:.18, backingMat: MAT.paint_cream, border:true, borderMat:MAT.paint_coral, borderWidth:.09, bulbs:false, intensity:1.0 });
      post.rotation.y = -Math.PI/2; post.position.set(x-.08, 7.0, -2.0); g.add(post);
    }
  }
  // window awnings and vines soften the flank
  for (let i=0;i<2;i++) { const a=awning(3.1,1.1,{mat:MAT.awningPink}); a.rotation.y=Math.PI/2; a.position.set(-6.7, 5.5, -2.8+i*5.3); g.add(a); }
  return g;
}

export function createDreamTower() {
  const g = new THREE.Group();
  g.name = 'dream-tower';
  // layered base
  add(g, rBox(14, 7.5, 13, 2.2, 5), MAT.paint_cream, [0, 3.75, 0]);
  addCornice(g, 14.2, 13.1, 7.2, MAT.paint_magenta, .4, .55);
  add(g, rBox(12.8, 1.1, 11.8, .2, 2), MAT.paint_teal, [0, 7.0, 0]);
  // middle drum
  add(g, cyl(6.7, 7.2, 8.6, 64), MAT.paint_teal, [0, 11.1, 0]);
  for (let i=0;i<4;i++) add(g, torus(6.9, .09, 8, 64), MAT.gold, [0, 7.7+i*1.9, 0], {rot:[Math.PI/2,0,0]});
  // upper drum
  add(g, cyl(4.8, 5.7, 6.8, 56), MAT.paint_coral, [0, 19.1, 0]);
  for (let i=0;i<3;i++) add(g, torus(5.15, .08, 8, 56), MAT.gold, [0, 16.5+i*1.8, 0], {rot:[Math.PI/2,0,0]});
  // crown dome and spike
  const crown = add(g, new THREE.SphereGeometry(5.1, 56, 28, 0, TAU, 0, Math.PI/2), MAT.paint_butter, [0, 22.4, 0]);
  crown.scale.set(1.08, .65, 1.08);
  add(g, torus(5.15, .1, 8, 56), MAT.gold, [0, 22.5, 0], {rot:[Math.PI/2,0,0]});
  for(let i=0;i<6;i++){
    const a=i/6*TAU;
    add(g, new THREE.CylinderGeometry(.045,.045,1.6,6), MAT.brass, [Math.cos(a)*3.9, 25.0, Math.sin(a)*3.9]);
  }
  add(g, new THREE.CylinderGeometry(.06,.14,7.4,10), MAT.gold, [0, 26.2, 0]);
  const star = add(g, new THREE.OctahedronGeometry(.5,0), MAT.neon('#ffe78b', 4.2), [0, 30.0, 0], {cast:false});
  star.scale.set(.65,1.5,.65); star.userData.noMerge=true;
  // circular feature window on front
  const port = new THREE.Group();
  add(port, torus(3.15, .18, 14, 64), MAT.gold, [0,0,0]);
  add(port, new THREE.CircleGeometry(3.0, 64), MAT.sign(TEX.screenFace, 1.0), [0,0,.03]);
  for(let i=0;i<8;i++){
    const a=i/8*TAU;
    add(port, rBox(.07, 2.8, .07, .01), MAT.gold, [Math.cos(a)*1.55, Math.sin(a)*1.55, .08], {rot:[0,0,a+Math.PI/2]});
  }
  for(let i=0;i<16;i++){
    const a=i/16*TAU;
    const b = add(port, sphere(.09,8,6), MAT.neon('#ffd77b',3), [Math.cos(a)*3.15,Math.sin(a)*3.15,.18],{cast:false,receive:false}); b.userData.noMerge=true;
  }
  port.position.set(0, 11.4, 6.95); g.add(port);
  const glow = new THREE.Sprite(MAT.glowSprite('#ffb15e',.22)); glow.scale.set(8,8,1); glow.position.set(0,11.4,7.4); g.add(glow);
  // base shop
  add(g, plane(11.2, 3.4), MAT.shopWindowsPink, [0, 2.15, 6.56], {receive:false});
  for (let i=-3;i<=3;i++) add(g, rBox(.12, 3.8, .18, .02), MAT.creamTrim, [i*1.8, 2.2, 6.64]);
  const awn = awning(12, 2.7, { mat: MAT.awningMint }); awn.position.set(0, 4.15, 7.3); g.add(awn);
  // wrap-around balcony with dense flowers
  const bal = balcony(12.0, 1.3, { slabMat: MAT.whiteTrim }); bal.position.set(0, 7.55, 6.0); g.add(bal);
  roofPlanters(g, 10, 8, 26.0, 99);
  // side exterior glass elevator
  const elev = new THREE.Group();
  add(elev, cyl(.9,.9,15.5,24,true), MAT.glassClear, [0, 7.75, 0], {cast:false});
  for(let i=0;i<7;i++) add(elev, torus(.93,.035,6,24), MAT.gold, [0, 1.0+i*2.3, 0], {rot:[Math.PI/2,0,0]});
  add(elev, rBox(1.5,.18,.9,.04), MAT.gold, [0, 10.5, 0]);
  elev.position.set(-7.15, 0, 2.0); g.add(elev);
  // cables / flagpole
  add(g, new THREE.CylinderGeometry(.035,.035,6.5,6), MAT.brass, [5.7, 27.0, -2.5]);
  const flag = add(g, plane(2.3, 3.3, 8, 8), MAT.flag, [6.85, 28.4, -2.5], {cast:false});
  flag.userData.noMerge = true;
  return g;
}

export function createMarwleHall() {
  const g = new THREE.Group();
  g.name = 'marwle-hall';
  // broad, softly rounded volume
  add(g, rBox(21, 10.2, 13, 3.0, 6), MAT.paint_glossBlue, [0, 5.1, 0]);
  add(g, rBox(19.6, 5.0, 12.0, 2.4, 4), MAT.paint_glossTeal, [0, 12.6, 0]);
  addCornice(g, 21.2, 13.2, 10.1, MAT.creamTrim, .34, .55);
  addCornice(g, 19.8, 12.2, 15.1, MAT.creamTrim, .32, .55);
  // curved horizontal ribs across the whole facade
  for (let i=0;i<12;i++){
    const y = 1.1 + i*.84;
    const w = 20.4 - Math.abs(i-5.5)*.10;
    add(g, rBox(w, .10, .16, .04), i%3===0?MAT.creamTrim:MAT.paint_aqua, [0, y, 6.57]);
  }
  // glass ground floor
  add(g, plane(19.4, 4.2), MAT.shopWindowsCool, [0, 2.55, 6.68], {receive:false});
  for(let i=-5;i<=5;i++) add(g, rBox(.11, 4.25, .18, .02), MAT.creamTrim, [i*1.73, 2.55, 6.76]);
  add(g, rBox(20.2, .22, .5, .08), MAT.creamTrim, [0, 4.8, 6.65]);
  // huge red MARWLE sign, framed by bulbs and steel
  const sign = billboard(TEX.marwle, 16.0, 3.8, { depth:.4, backingMat: MAT.paint_glossTeal, border: true, borderMat: MAT.redMetal, borderWidth:.18, bulbs:true, intensity:1.45 });
  sign.position.set(0, 9.6, 7.55); sign.rotation.x = -.055; g.add(sign);
  // lower canopy, deep red underside
  const can = new THREE.Group();
  add(can, rBox(20.8, .45, 4.0, .18, 3), MAT.paint_glossBlue, [0, 0, 0]);
  add(can, rBox(20.6, .10, 3.6, .04), MAT.paint_glossRed, [0, -.26, 0]);
  for(let i=-7;i<=7;i++) add(can, rBox(.08, .54, 3.8, .02), MAT.creamTrim, [i*1.42, -.02, 0]);
  can.position.set(0, 6.4, 8.05); g.add(can);
  for(let i=-8;i<=8;i++){
    const b = add(g, sphere(.075,8,6), MAT.neon('#ffe39a',3.2), [i*1.25, 6.1, 10.06],{cast:false,receive:false}); b.userData.noMerge=true;
  }
  // curved blue service tube flowing down the left side
  const pts = [
    new THREE.Vector3(-9.1, 15.0, 6.0), new THREE.Vector3(-10.2, 11.2, 8.4),
    new THREE.Vector3(-9.0, 7.2, 9.7), new THREE.Vector3(-7.6, 4.1, 9.1),
    new THREE.Vector3(-5.9, 2.7, 7.7)
  ];
  const slide = tube(pts, .48, MAT.paint_glossRed, 44, 14); g.add(slide);
  const slideIn = tube(pts.map(p=>p.clone().add(new THREE.Vector3(0,0,.45))), .32, MAT.paint_rose, 44, 12); g.add(slideIn);
  // entrance canopy / doorway
  add(g, rBox(4.5, 4.8, .2, .1), MAT.paint_glossBlue, [5.0, 2.4, 6.82]);
  add(g, rBox(3.8, 4.25, .16, .08), MAT.glassWarm, [5.0, 2.25, 6.94]);
  add(g, torus(1.9,.06,8,40), MAT.gold, [5.0, 2.25, 7.05]);
  // rounded corner tower
  cornerTurret(g, 9.2, 5.2, 2.0, 14.8, { y0: 0, mat: MAT.paint_cream, domeMat: MAT.paint_coral });
  // ── side elevation facing the approach: the camera sees this constantly ──
  for (const sx of [-1, 1]) {
    const x = sx * 10.53;
    const rotY = sx < 0 ? -Math.PI/2 : Math.PI/2;
    // horizontal glazing bands wrap around the volume
    for (let f=0; f<4; f++) {
      for (let c=0; c<5; c++) {
        const wz = -4.6 + c*2.3;
        const wy = 5.6 + f*2.1;
        if (f===0 && c>1) continue;
        const w = windowUnit(1.35, 1.28, { glass: (f+c)%3===0 ? MAT.glassWarm : MAT.glassDark, frameMat: MAT.creamTrim, style: 'hero' });
        w.rotation.y = rotY; w.position.set(x, wy, wz); g.add(w);
      }
    }
    // faceted ribs and a painted stripe
    for (let i=0;i<7;i++) add(g, rBox(.20,.14,13.0,.04), i%2?MAT.creamTrim:MAT.paint_aqua, [x, 2.0+i*1.55, 0]);
    // mural panel on the camera-facing side
    if (sx < 0) {
      const mural = billboard(texMarwleSide(), 6.4, 2.3, { depth:.18, backingMat: MAT.paint_cream, border:true, borderMat:MAT.gold, borderWidth:.10, bulbs:true, intensity:1.1 });
      mural.rotation.y = -Math.PI/2;
      mural.position.set(x-.08, 12.9, 0.2);
      g.add(mural);
      const medallion = new THREE.Group();
      add(medallion, new THREE.CircleGeometry(1.55, 48), MAT.sign(TEX.screenFace, 1.0), [0,0,.03]);
      add(medallion, torus(1.62,.12,10,48), MAT.gold, [0,0,0]);
      medallion.rotation.y = -Math.PI/2;
      medallion.position.set(x-.1, 8.4, 2.0);
      g.add(medallion);
      const poster = billboard(TEX.poster1, 4.2, 5.2, { depth:.2, backingMat: MAT.whiteTrim, border:true, borderMat:MAT.gold, borderWidth:.10, bulbs:false, intensity:1.0 });
      poster.rotation.y = -Math.PI/2; poster.position.set(x-.08, 7.4, -3.8); g.add(poster);
    }
  }
  // pipework and wall-mounted planters on the visible flank
  for (const z of [-5.6, 5.7]) {
    add(g, cyl(.11,.14,12.2,10), MAT.creamTrim, [-10.7, 6.4, z]);
    for (let i=0;i<4;i++) add(g, rBox(.25,.35,.25,.04), MAT.darkMetal, [-10.72, 2.2+i*2.8, z]);
  }
  for (let i=0;i<3;i++) {
    const b = boxBalconyFlowers(3.2);
    b.rotation.y = Math.PI/2;
    b.position.set(-10.7, 8.7+i*2.1, -4.9);
    g.add(b);
  }

  // roof garden
  roofPlanters(g, 14, 9, 15.2, 17);
  const rail = railing(18.2, 1, .6, MAT.creamTrim); rail.position.set(0, 15.35, 5.6); g.add(rail);
  // little roof sign
  const roofSign = billboard(TEX.soda, 5.2, 1.7, { bulbs:false, backingMat: MAT.paint_cream });
  roofSign.position.set(-4.3, 17.2, 2.5); roofSign.rotation.x = -.05; g.add(roofSign);
  for (let i=0;i<3;i++){
    const p = new THREE.Group();
    add(p, rBox(1.1,.45,.75,.08), MAT.terracotta, [0,0,0]);
    add(p, sphere(.42,10,8), MAT.leafPink, [0,.48,0]);
    p.position.set(4.2+i*1.1, 15.5, 1.5); g.add(p);
  }
  return g;
}

export function createGenericBuilding(opts) {
  const {
    width = 12, depth = 10, height = 15, body = MAT.paint_cream, trim = MAT.paint_coral,
    accent = MAT.paint_teal, rows = 3, cols = 4, roof = 'garden', signTex = null, seed = 1,
    cornerTower = false, balconyRow = -1
  } = opts;
  const r = rng(seed);
  const g = new THREE.Group();
  add(g, rBox(width, height, depth, Math.min(1.5, width*.12), 4), body, [0, height/2, 0]);
  add(g, rBox(width*.99, .65, depth*.99, .12, 2), trim, [0, height*.27, 0]);
  addCornice(g, width, depth, height*.55, trim, .3, .46);
  add(g, rBox(width*1.01, .42, depth*1.01, .1, 2), accent, [0, .22, 0]);
  addCornice(g, width*.99, depth*.99, height - .32, trim, .34, .5);
  // ground storefront
  add(g, plane(width*.78, 3.2), r()>.5?MAT.shopWindows:MAT.shopWindowsCool, [0, 2.1, depth*.5+.03], {receive:false});
  const colsGround = Math.max(3, Math.round(width*.55));
  for(let i=0;i<colsGround;i++){
    const x = -width*.39 + (i/(colsGround-1))*width*.78;
    add(g, rBox(.11, 3.45, .2, .02), MAT.creamTrim, [x, 2.15, depth*.5+.11]);
  }
  add(g, rBox(width*.84, .25, .55, .08), MAT.creamTrim, [0, 4.0, depth*.5+.14]);
  if (r()>.3) {
    const a = awning(width*.82, 2.2, { mat: pick(r,[MAT.awningPink,MAT.awningMint,MAT.awningBlue,MAT.awningGold]) });
    a.position.set(0, 4.3, depth*.5 + 1.1); g.add(a);
  }
  // facade windows with planters and occasional balconies
  facadeWindows(g, {
    width: width*.86, height: height - 5.6, y0: 4.8, z: depth*.5+.04,
    cols, rows, ww: Math.min(1.25, width/(cols*2.6)), wh: 1.6,
    glass: r()>.5?MAT.glassBlue:MAT.glassDark,
    flowerRows: rows>2?[1]:[], balconyRows: balconyRow>=0?[balconyRow]:[],
    litPattern: (row,col)=>((row*7+col*3+seed)%9<2)
  });
  // facade rhythm: slim pilasters, floor bands and a central crest
  for (let i=0;i<=cols;i++) {
    const x = -width*.43 + (i/cols)*width*.86;
    add(g, rBox(.10, Math.max(2.4,height-6.0), .20, .02), i%2?trim:accent, [x, (height+4.8)/2, depth*.5+.04]);
  }
  for (let row=1; row<rows; row++) {
    const y = 5.1 + row*(height-5.6)/rows;
    add(g, rBox(width*.9, .075, .20, .015), trim, [0, y, depth*.5+.06]);
  }
  const crest = new THREE.Group();
  add(crest, torus(1.15,.075,8,40), MAT.gold, [0,0,.02]);
  add(crest, new THREE.CircleGeometry(1.08,40), MAT.sign(TEX.screenFace, .65), [0,0,.035]);
  add(crest, new THREE.OctahedronGeometry(.35,0), MAT.gold, [0,0,.06]).rotation.z = Math.PI/4;
  crest.position.set(0, height-1.7, depth*.5+.16); g.add(crest);
  const roofRail = railing(width*.85,.7,.5,trim); roofRail.position.set(0,height+.58,depth*.5-.45); g.add(roofRail);

  // side windows visible at oblique angles
  const sideCols = Math.max(2, Math.round(depth/4));
  for (let side of [-1,1]) {
    for (let i=0;i<sideCols;i++){
      if (r()>.8) continue;
      const w = windowUnit(1.0, 1.5, { glass: r()>.5?MAT.glassWarm:MAT.glassDark });
      w.rotation.y = side*Math.PI/2;
      w.position.set(side*(width*.5+.03), 5.5 + Math.floor(r()*Math.max(1,rows-1))*2.7, -depth*.3 + i*2.2);
      g.add(w);
    }
  }
  if (signTex) {
    const s = billboard(signTex, Math.min(width*.66, 7), Math.min(2.2, width*.2), { bulbs: false, backingMat: trim });
    s.position.set(0, Math.min(height*.62, 8.7), depth*.5+.5); g.add(s);
  }
  // roof silhouette
  add(g, rBox(width*.88, .6, depth*.88, .12, 2), trim, [0, height+.25, 0]);
  roofPlanters(g, width*.82, depth, height+.25, seed+55);
  roofClutter(g, width*.8, depth*.8, height+.58, seed+91);
  if (cornerTower) cornerTurret(g, width*.5-1.0, depth*.42, Math.min(2.4,width*.2), height*.86, { y0: height*.28, mat: accent, domeMat: trim });
  if (roof === 'donut') {
    const donut = add(g, torus(2.0, .78, 18, 48), MAT.paint_rose, [0, height+3.0, 0], { rot:[Math.PI/2,0,0] });
    donut.scale.set(1,.55,1); // stand upright torus
    donut.rotation.set(0,0,0); donut.scale.set(1,1,1);
    for(let i=0;i<8;i++){ const a=i/8*TAU; add(g, sphere(.11,8,6), MAT.neon(['#ffe8a2','#ff8fb4','#92e5e0'][i%3],2.6), [Math.cos(a)*2.2, height+3.0+Math.sin(a)*2.2, .85],{cast:false,receive:false}).userData.noMerge=true; }
  } else if (roof === 'sundae') {
    const cup = add(g, new THREE.CylinderGeometry(1.4, .9, 2.1, 24), MAT.paint_coral, [0, height+1.4, 0]);
    const ice1 = add(g, sphere(1.5, 24, 16), MAT.paint_cream, [0, height+2.85, 0]); ice1.scale.set(1,.7,1);
    const ice2 = add(g, sphere(1.05, 24, 16), MAT.paint_rose, [.35, height+3.55, .1]);
    add(g, new THREE.CylinderGeometry(.04,.04,2.4,6), MAT.gold, [-.2, height+4.8, 0]).rotation.z = .2;
    const cherry = add(g, sphere(.25, 16, 12), MAT.neon('#ff4b65',2), [-.35, height+5.9, 0]); cherry.userData.noMerge=true;
  } else if (roof === 'rocket') {
    const bodyR = add(g, cyl(.65, .9, 4.5, 24), MAT.silver, [0, height+2.6, 0]);
    add(g, new THREE.ConeGeometry(.65, 1.6, 24), MAT.paint_glossRed, [0, height+5.6, 0]);
    add(g, new THREE.ConeGeometry(.9, 1.2, 12, 1, true), MAT.paint_glossRed, [0, height+.55, 0]).rotation.x = Math.PI;
    for(let i=0;i<3;i++){ const a=i/3*TAU; const fin=add(g, rBox(.12,1.2,.8,.03), MAT.paint_glossRed, [Math.cos(a)*.8,height+1.3,Math.sin(a)*.8]); fin.rotation.y=-a; }
  } else if (roof === 'ring') {
    add(g, torus(2.6, .16, 10, 80), MAT.gold, [0, height+2.8, 0], { rot:[Math.PI/2,0,0] });
    add(g, torus(2.1, .12, 10, 80), MAT.paint_aqua, [0, height+2.8, 0], { rot:[Math.PI/2+0.12,0,0] });
  }
  return g;
}



function texMarwleSide() {
  return textTexture({
    text:'SUGAR', width:1536, height:512, font:'900 300px Bungee, Arial Black, sans-serif',
    color:'#fff8e7', bg:'#e6455c', border:'#ffd26e', borderWidth:22, spacing:10
  });
}
function boxBalconyFlowers(w) {
  const b = new THREE.Group();
  add(b, rBox(w,.16,.85,.06,2), MAT.creamTrim, [0,0,0]);
  const f = flowerBox(w*.92,.12); f.position.set(0,.12,.25); b.add(f);
  const r = railing(w-.15,.55,.44,MAT.whiteTrim); r.position.set(0,.1,.38); b.add(r);
  return b;
}

export function createSunPalace() {
  const g = new THREE.Group();
  // a tall confectionary landmark sitting at the end of the avenue
  add(g, rBox(18, 18, 14, 3.4, 5), MAT.paint_cream, [0,9,0]);
  add(g, rBox(17.2, .8, 13.2, .2, 2), MAT.paint_coral, [0,17.8,0]);
  add(g, rBox(15.5, 8.5, 12.0, 3.0, 4), MAT.paint_teal, [0,22.5,0]);
  add(g, rBox(14.4, .6, 11.2, .16, 2), MAT.gold, [0,27.0,0]);
  add(g, cyl(5.2, 6.6, 8.5, 48), MAT.paint_butter, [0,31.2,0]);
  for (let i=0;i<4;i++) add(g, torus(5.3+i*.28, .09, 8, 48), MAT.gold, [0,28.4+i*1.8, 0], {rot:[Math.PI/2,0,0]});
  const dome = add(g, new THREE.SphereGeometry(5.2, 48, 28, 0, TAU, 0, Math.PI/2), MAT.paint_magenta, [0,35.4,0]); dome.scale.set(1,.7,1);
  add(g, torus(5.3,.11,8,48), MAT.gold, [0,35.5,0], {rot:[Math.PI/2,0,0]});
  add(g, new THREE.CylinderGeometry(.12,.22,10,8), MAT.gold, [0,43,0]);
  add(g, new THREE.OctahedronGeometry(.8,0), MAT.neon('#ffe48e',4), [0,48,0], {cast:false}).userData.noMerge=true;
  // giant face / sun window on the front
  const dial = new THREE.Group();
  add(dial, new THREE.CircleGeometry(4.1,64), MAT.sign(TEX.screenFace,1), [0,0,.04]);
  add(dial, torus(4.32,.2,12,64), MAT.gold, [0,0,0]);
  for(let i=0;i<16;i++){const a=i/16*TAU; add(dial, rBox(.17,1.2,.1,.02), MAT.gold, [Math.cos(a)*4.7,Math.sin(a)*4.7,0], {rot:[0,0,a]});}
  dial.position.set(0,22.4,6.2); g.add(dial);
  // stacked windows and balconies
  for (let row=0; row<2; row++) for (let c=0;c<5;c++) {
    const w=windowUnit(1.2,1.4,{glass:row?MAT.glassBlue:MAT.glassWarm,frameMat:MAT.creamTrim,style:'hero'}); w.position.set(-5.2+c*2.6, 20+row*2.0, 6.05); g.add(w);
  }
  const b=balcony(13.5,1.1,{slabMat:MAT.gold, railMat:MAT.whiteTrim}); b.position.set(0,14.8,6.4); g.add(b);
  // side glass elevator and hovering crown rings
  add(g, cyl(.9,.9,20,24,true), MAT.glassClear, [-8.9,14,0], {cast:false});
  for (let i=0;i<7;i++) add(g, torus(.95,.035,6,24), MAT.gold, [-8.9,4+i*3,0], {rot:[Math.PI/2,0,0]});
  for (let i=0;i<3;i++) add(g, torus(8.8+i*1.0,.08,8,64), MAT.gold, [0,40+i*2.0,0], {rot:[Math.PI/2,0,0]});
  return g;
}
