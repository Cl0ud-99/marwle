import * as THREE from 'three';
import { canvasTexture, rng, TAU, lerp } from './utils.js';

// Direction *towards* the sun: high, camera-left, slightly down the avenue.
export const SUN_DIR = new THREE.Vector3(-0.55, 0.34, 0.77).normalize();

function cloudPuff(ctx, x, y, rx, ry, a, shade = false) {
  const R = Math.max(rx, ry);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx / R, ry / R);
  const g = ctx.createRadialGradient(0, -R * .22, R * .02, 0, 0, R);
  if (shade) {
    g.addColorStop(0, 'rgba(120,164,198,' + (a*.82) + ')');
    g.addColorStop(.5, 'rgba(151,190,218,' + (a*.6) + ')');
    g.addColorStop(.82, 'rgba(178,211,232,' + (a*.22) + ')');
    g.addColorStop(1, 'rgba(200,228,244,0)');
  } else {
    g.addColorStop(0, 'rgba(255,255,250,' + Math.min(1,a*1.1) + ')');
    g.addColorStop(.3, 'rgba(255,252,243,' + (a*.97) + ')');
    g.addColorStop(.62, 'rgba(245,250,255,' + (a*.62) + ')');
    g.addColorStop(.88, 'rgba(225,242,253,' + (a*.14) + ')');
    g.addColorStop(1, 'rgba(220,240,255,0)');
  }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.restore();
}

function cloudCluster(ctx, cx, cy, scale, seed, alpha = .95) {
  const r = rng(seed);
  const puffs = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1) - .5) * 2;
    const px = cx + t * scale * 1.05 + (r() - .5) * scale * .14;
    const py = cy - Math.cos(t * Math.PI * .5) * scale * .24 - (r() - .5) * scale * .06;
    const pr = scale * (.13 + (1 - Math.abs(t)) * .13 + r() * .04);
    puffs.push({ px, py, pr, t });
  }
  // structured cumulus: cool underside, dense middle, hot crown
  for (const p of puffs) cloudPuff(ctx, p.px, p.py + p.pr * .46, p.pr * 1.16, p.pr * .68, alpha * .58, true);
  for (const p of puffs) cloudPuff(ctx, p.px, p.py + p.pr * .22, p.pr * 1.04, p.pr * .78, alpha * .78, true);
  for (const p of puffs) cloudPuff(ctx, p.px + (r()-.5)*p.pr*.10, p.py - p.pr * .03, p.pr * .95, p.pr * .82, alpha * .94, false);
  // vertical lobes rising from the core
  for (let i = 0; i < 6; i++) {
    const t = (i / 5 - .5) * 1.2;
    const px = cx + t * scale * .84;
    const pr = scale * (.09 + (1-Math.abs(t)) * .08);
    const py = cy - scale * .34 - r() * scale * .12;
    cloudPuff(ctx, px, py, pr, pr * .9, alpha * .8, false);
    cloudPuff(ctx, px, py + pr * .3, pr * .8, pr * .5, alpha * .45, true);
  }
}

function paintSkyline(ctx, w, h) {
  const layers = [
    { seed: 808, base: .500, color: 'rgba(148,196,219,.58)', minH: 8, maxH: 60, minW: 8, maxW: 26, step: 22 },
    { seed: 901, base: .505, color: 'rgba(94,159,190,.68)', minH: 14, maxH: 92, minW: 7, maxW: 20, step: 17 },
    { seed: 101, base: .512, color: 'rgba(55,122,157,.62)', minH: 8, maxH: 54, minW: 5, maxW: 16, step: 13 }
  ];
  for (const L of layers) {
    const r = rng(L.seed);
    let x = -20;
    while (x < w + 20) {
      const bw = L.minW + r() * (L.maxW - L.minW);
      const bh = L.minH + Math.pow(r(), 1.65) * (L.maxH - L.minH);
      const by = h * L.base;
      ctx.fillStyle = L.color;
      ctx.beginPath();
      if (r() > .78) {
        // slender deco tower
        ctx.moveTo(x, by); ctx.lineTo(x + bw*.32, by); ctx.lineTo(x + bw*.5, by - bh); ctx.lineTo(x + bw*.68, by); ctx.lineTo(x + bw, by); ctx.closePath();
      } else {
        ctx.rect(x, by - bh, bw, bh);
        if (r() > .65) ctx.rect(x + bw*.35, by - bh - bh*.12, bw*.3, bh*.12);
      }
      ctx.fill();
      // tiny window striations make the silhouette feel inhabited
      ctx.globalAlpha = .22; ctx.fillStyle = 'rgba(230,247,255,.85)';
      for (let yy = by - bh + 8; yy < by - 4; yy += 6) {
        ctx.fillRect(x + 2, yy, Math.max(1, bw - 4), .8);
      }
      ctx.globalAlpha = 1;
      x += bw + r() * L.step;
    }
  }
  // soften the skyline base into the horizon haze
  const veil = ctx.createLinearGradient(0, h*.47, 0, h*.53);
  veil.addColorStop(0, 'rgba(231,247,255,0)');
  veil.addColorStop(.62, 'rgba(231,247,255,.22)');
  veil.addColorStop(1, 'rgba(245,239,220,.55)');
  ctx.fillStyle = veil; ctx.fillRect(0, h*.47, w, h*.08);
}
function paintSky() {
  const W = 4096, H = 2048;
  return canvasTexture(W, H, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const sky = ctx.createLinearGradient(0, 0, 0, h * .64);
    sky.addColorStop(0.00, '#0f6cc5');
    sky.addColorStop(0.16, '#1f93e2');
    sky.addColorStop(0.36, '#4cb5ee');
    sky.addColorStop(0.55, '#74cff5');
    sky.addColorStop(0.72, '#a5e2fb');
    sky.addColorStop(0.82, '#d5f3ff');
    sky.addColorStop(1.00, '#f7f1df');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * .82);

    // warm horizon veil
    const horizon = ctx.createLinearGradient(0, h * .57, 0, h * .82);
    horizon.addColorStop(0, 'rgba(255,255,255,0)');
    horizon.addColorStop(.55, 'rgba(255,252,229,.22)');
    horizon.addColorStop(1, 'rgba(255,226,178,.42)');
    ctx.fillStyle = horizon; ctx.fillRect(0, h * .57, w, h * .25);

    // sun: broad atmospheric bloom + hot core
    const u = .205, v = .265;
    const sx = w * u, sy = h * v;
    const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * .23);
    sun.addColorStop(0, 'rgba(255,255,250,1)');
    sun.addColorStop(.035, 'rgba(255,254,235,.98)');
    sun.addColorStop(.09, 'rgba(255,246,193,.55)');
    sun.addColorStop(.24, 'rgba(255,230,170,.19)');
    sun.addColorStop(.6, 'rgba(255,215,160,.06)');
    sun.addColorStop(1, 'rgba(255,210,160,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
    const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, 46);
    core.addColorStop(0, 'rgba(255,255,252,1)');
    core.addColorStop(.55, 'rgba(255,251,226,.98)');
    core.addColorStop(.9, 'rgba(255,236,178,.6)');
    core.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(sx, sy, 46, 0, TAU); ctx.fill();

    // long high cirrus streaks, very soft
    ctx.save();
    const r = rng(412);
    ctx.globalAlpha = .14;
    for (let i = 0; i < 24; i++) {
      const yy = h * (.13 + r() * .31);
      const xx = r() * w;
      const ww = w * (.04 + r() * .11);
      const hh = 2 + r() * 10;
      const g = ctx.createLinearGradient(xx, yy, xx + ww, yy);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(.35, 'rgba(255,255,255,.9)');
      g.addColorStop(.7, 'rgba(255,255,255,.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(xx + ww*.5, yy, ww*.5, hh, (r()-.5)*.12, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // cumulus banks: keep the meeting of street and sky full of shape
    const clusters = [
      [.12, .40, 260, 11, .98], [.34, .37, 220, 22, .95], [.56, .44, 320, 31, 1.0],
      [.78, .35, 250, 42, .96], [.94, .47, 170, 51, .82], [.45, .26, 150, 61, .76],
      [.69, .22, 125, 71, .70], [.18, .21, 110, 81, .64],
      [.22, .28, 220, 91, .84], [.61, .24, 250, 95, .82], [.84, .30, 190, 99, .78],
      [.05, .31, 170, 103, .72], [.48, .15, 160, 111, .62]
    ];
    for (const [x,y,s,seed,a] of clusters) cloudCluster(ctx, w*x, h*y, s, seed, a);
    // little isolated puffs
    cloudCluster(ctx, w*.22, h*.55, 110, 107, .62);
    cloudCluster(ctx, w*.51, h*.58, 85, 113, .5);

    // cloud shadow & blue haze near horizon
    const haze = ctx.createLinearGradient(0, h*.5, 0, h*.78);
    haze.addColorStop(0, 'rgba(180,225,250,0)');
    haze.addColorStop(.6, 'rgba(190,228,246,.20)');
    haze.addColorStop(1, 'rgba(247,236,211,.58)');
    ctx.fillStyle = haze; ctx.fillRect(0, h*.5, w, h*.28);
    paintSkyline(ctx, w, h);

    // under-horizon warm ground tone (almost entirely hidden by geometry)
    const ground = ctx.createLinearGradient(0, h*.8, 0, h);
    ground.addColorStop(0, '#ddd8c8');
    ground.addColorStop(.35, '#c8c9c4');
    ground.addColorStop(1, '#9fa7a9');
    ctx.fillStyle = ground; ctx.fillRect(0, h*.8, w, h*.2);

    // soft large-scale color wash: cool upper right, warm lower left
    const cool = ctx.createRadialGradient(w*.8, h*.2, 0, w*.8, h*.2, w*.55);
    cool.addColorStop(0, 'rgba(107,194,255,.14)');
    cool.addColorStop(1, 'rgba(107,194,255,0)');
    ctx.fillStyle = cool; ctx.fillRect(0,0,w,h);
    const warm = ctx.createRadialGradient(w*.24, h*.57, 0, w*.24, h*.57, w*.45);
    warm.addColorStop(0, 'rgba(255,224,176,.18)');
    warm.addColorStop(1, 'rgba(255,224,176,0)');
    ctx.fillStyle = warm; ctx.fillRect(0,0,w,h);
  }, { clamp: true, anisotropy: 8 });
}

export function buildSky(scene, renderer) {
  const skyTex = paintSky();
  skyTex.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = skyTex;
  scene.backgroundIntensity = 1.0;
  scene.backgroundBlurriness = 0.0;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(skyTex);
  scene.environment = envRT.texture;
  scene.environmentIntensity = .26;
  pmrem.dispose();

  // A real sun sprite for bloom, parallax and a trace of lens character.
  const sunPos = SUN_DIR.clone().multiplyScalar(900);
  const sunGroup = new THREE.Group();
  sunGroup.position.copy(sunPos);
  const glowMat = new THREE.SpriteMaterial({
    map: canvasTexture(256, 256, (ctx, s) => {
      const g = ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
      g.addColorStop(0,'rgba(255,255,252,1)');
      g.addColorStop(.025,'rgba(255,255,242,1)');
      g.addColorStop(.09,'rgba(255,239,186,.85)');
      g.addColorStop(.32,'rgba(255,213,148,.24)');
      g.addColorStop(1,'rgba(255,195,120,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,s,s);
    }, { clamp: true }),
    color: '#fff3cf', transparent: true, opacity: .95,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  });
  const sun = new THREE.Sprite(glowMat);
  sun.scale.set(120,120,1);
  sunGroup.add(sun);
  const coreMat = new THREE.SpriteMaterial({ color: new THREE.Color('#fffdf0').multiplyScalar(7), transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
  const core = new THREE.Sprite(coreMat);
  core.scale.set(12,12,1);
  sunGroup.add(core);
  scene.add(sunGroup);

  // soft three-dimensional clouds floating far over the avenue
  const cloudTexture = canvasTexture(768,512,(ctx,w,h)=>{
    ctx.clearRect(0,0,w,h);
    const blobs=[[.5,.52,.16,.14],[.33,.56,.15,.12],[.67,.56,.16,.12],[.42,.42,.14,.11],[.59,.43,.13,.1],[.5,.34,.11,.09],[.23,.59,.1,.07],[.77,.59,.09,.06]];
    const draw=(x,y,rx,ry,a,col)=>{
      const R=Math.max(rx*w,ry*h);
      ctx.save();ctx.translate(x*w,y*h);ctx.scale((rx*w)/R,(ry*h)/R);
      const g=ctx.createRadialGradient(0,-R*.2,R*.01,0,0,R);
      g.addColorStop(0,'rgba('+col+','+a+')');g.addColorStop(.38,'rgba('+col+','+(a*.72)+')');g.addColorStop(.7,'rgba('+col+','+(a*.22)+')');g.addColorStop(1,'rgba('+col+',0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.fill();ctx.restore();
    };
    for(const p of blobs) draw(p[0],p[1]+.035,p[2]*1.05,p[3]*.9,.5,'142,184,214');
    for(const p of blobs) draw(p[0],p[1],p[2],p[3],.95,'255,252,244');
    for(const p of blobs) draw(p[0]-.012,p[1]-.025,p[2]*.72,p[3]*.64,.6,'255,255,250');
  },{clamp:true});
  const clouds = new THREE.Group();
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTexture, color:'#fffaf0', transparent:true, opacity:.78, depthWrite:false, toneMapped:false });
  const specs = [
    [-130, 72, -220, 110, 30], [50, 85, -260, 140, 36], [-10, 110, -300, 90, 28],
    [130, 58, -170, 100, 26], [-180, 48, -140, 80, 20], [210, 95, -250, 130, 30],
    [20, 50, -150, 55, 15], [-70, 38, -120, 45, 12]
  ];
  specs.forEach(([x,y,z,sx,sy],i)=>{
    const sp=new THREE.Sprite(cloudMat.clone());
    sp.position.set(x,y,z); sp.scale.set(sx,sy,1); sp.material.opacity=.4+ (i%3)*.12;
    clouds.add(sp);
  });
  clouds.renderOrder = -10;
  clouds.visible = false;
  scene.add(clouds);

  // readable cumulus banks in the avenue's open sky
  const puffy = new THREE.Group();
  const clusterSpecs = [
    [-58, 55, -112, 78, 24, .88], [38, 63, -150, 105, 32, .9],
    [5, 78, -210, 145, 44, .8], [96, 44, -118, 62, 20, .72],
    [-108, 38, -92, 58, 17, .62]
  ];
  clusterSpecs.forEach(([cx,cy,cz,sw,sh,op],ci)=>{
    for(let i=0;i<4;i++){
      const sp=new THREE.Sprite(cloudMat.clone());
      const dx=(i-1.5)*sw*.34, dy=(i%2?1:-1)*sh*.12;
      sp.position.set(cx+dx,cy+dy,cz+Math.sin(i*1.8)*6);
      sp.scale.set(sw*(.75+((i*17)%20)/100),sh*(.8+((i*11)%18)/100),1);
      sp.material.opacity=op*(.72+((i*13)%17)/100);
      sp.material.color.set('#fff9ee');
      puffy.add(sp);
    }
  });
  puffy.renderOrder = -9;
  puffy.visible = false;
  scene.add(puffy);

  // high cumulus clustered just above the rooftops
  const highClouds = new THREE.Group();
  const bankSpecs = [
    { x:-22, y:54, z:-88, sx:56, sy:19, n:13, op:.9, seed:5 },
    { x:30, y:68, z:-132, sx:74, sy:24, n:14, op:.92, seed:9 },
    { x:-62, y:76, z:-160, sx:68, sy:22, n:11, op:.8, seed:13 },
    { x:8, y:86, z:-220, sx:100, sy:31, n:13, op:.72, seed:17 }
  ];
  for (const spec of bankSpecs) {
    const rr = rng(spec.seed);
    for (let i=0;i<spec.n;i++) {
      const sp = new THREE.Sprite(cloudMat.clone());
      const a = (i/spec.n)*TAU*1.15 + rr()*.2;
      const rad = (0.15 + rr()*.65) * spec.sx;
      const px = spec.x + Math.cos(a)*rad;
      const py = spec.y + Math.sin(a)*rad*.26 + (rr()-.5)*spec.sy*.5;
      const pz = spec.z + Math.sin(a)*rad*.35 + (rr()-.5)*8;
      sp.position.set(px,py,pz);
      const sz = spec.sx*(.18+rr()*.23);
      sp.scale.set(sz, sz*.48, 1);
      sp.material.opacity = spec.op*(.45+rr()*.5);
      sp.material.color.set(rr()>.45?'#fffdf3':'#dcf1ff');
      sp.material.fog = false;
      highClouds.add(sp);
    }
  }
  highClouds.renderOrder = -9;
  highClouds.visible = false;
  scene.add(highClouds);

  // high bright wisps catch the sun near the top of frame
  for(let i=0;i<5;i++){
    const sp=new THREE.Sprite(cloudMat.clone());
    sp.position.set(-80+i*52, 95+i*4, -210-i*10);
    sp.scale.set(120,22,1); sp.material.opacity=.28; sp.material.color.set('#fffdf4');
    puffy.add(sp);
  }

  // birds, tiny and bright — the scale cue that sells the sky
  const birdTexture = canvasTexture(128,128,(ctx,s)=>{
    ctx.clearRect(0,0,s,s); ctx.strokeStyle='rgba(245,249,246,.95)';ctx.lineWidth=7;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(18,74);ctx.quadraticCurveTo(45,40,64,70);ctx.quadraticCurveTo(82,40,110,74);ctx.stroke();
  },{clamp:true});
  const birds = new THREE.Group();
  const birdMat = new THREE.SpriteMaterial({map:birdTexture,transparent:true,opacity:.9,depthWrite:false,toneMapped:false,color:'#eaf3f1'});
  for(let i=0;i<12;i++){
    const b=new THREE.Sprite(birdMat.clone()); const a=i/12*TAU;
    const rad=80+i*4;
    b.position.set(Math.cos(a)*rad, 38+((i*7)%12), -110-Math.sin(a)*rad*.55);
    b.scale.set(4.2,2.6,1); b.material.opacity=.5+((i*3)%5)*.08;
    birds.add(b);
  }
  scene.add(birds);

  function update(t) {
    clouds.rotation.y = Math.sin(t * .008) * .02;
    birds.position.x = Math.sin(t * .02) * 10;
    birds.position.y = Math.sin(t * .05) * 1.2;
  }
  return { skyTex, envRT, sunGroup, sun, clouds, birds, update };
}
