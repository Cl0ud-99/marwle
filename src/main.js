import * as THREE from 'three';
import { buildMaterials, MAT } from './materials.js';
import { setDetail } from './utils.js';
import { QUALITY, resolveQuality, setQuality } from './quality.js';
import { buildSky, SUN_DIR } from './sky.js';
import { buildCity } from './city.js';
import { createPost } from './post.js';
import { createAudio } from './audio.js';
import bungeeUrl from '../assets/Bungee.woff2';
import outfitUrl from '../assets/Outfit.woff2';

// ─────────────────────────────────────────────────────────────
//  MARWLE · SUGARLINE DISTRICT
//  A playable, one-take cinematic slice of a candy-coloured city.
// ─────────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
const qualityName = resolveQuality(params);
setQuality(qualityName);
// geometry tessellation: ?detail=low|high|ultra, otherwise derived from quality
const detailParam = params.get('detail');
function resolveDetail(v) {
  if (v === 'ultra' || v === 'low' || v === 'high') return v;
  if (qualityName === 'draft') return 'low';
  if (qualityName === 'photo') return 'ultra';
  return 'high';
}
setDetail(resolveDetail(detailParam));
const canvas = document.getElementById('stage');
const loader = document.getElementById('loader');
const loaderStatus = document.getElementById('loader-status');
const loaderBar = document.getElementById('loader-bar');
const app = document.getElementById('app');
const debug = params.get('debug') === '1';
const fixedTimeParam = params.has('t') ? parseFloat(params.get('t')) : null;
let fixedTime = Number.isFinite(fixedTimeParam) ? fixedTimeParam : null;
const freeze = params.get('freeze') === '1';
const shotParam = params.get('shot');
const noUi = params.get('ui') === '0';

function setLoad(pct, text) {
  if (loaderBar) loaderBar.style.transform = 'scaleX(' + Math.min(1,Math.max(.02,pct)) + ')';
  if (loaderStatus) loaderStatus.textContent = text;
}
function wait(ms) { return new Promise(r=>setTimeout(r,ms)); }

async function boot() {
  setLoad(.06, 'WAKING THE SUN');
  await wait(60);

  const fontStyle = document.createElement('style');
  fontStyle.textContent = '@font-face{font-family:Bungee;src:url(' + bungeeUrl + ') format("woff2");font-weight:400;font-display:block}@font-face{font-family:Outfit;src:url(' + outfitUrl + ') format("woff2");font-weight:100 900;font-display:block}';
  document.head.appendChild(fontStyle);
  await Promise.all([document.fonts.load('16px Bungee'), document.fonts.load('400 16px Outfit'), document.fonts.load('700 16px Outfit')]);
  await document.fonts.ready;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
    stencil: false, preserveDrawingBuffer: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY.dpr));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xbde1ef, .0030);

  const camera = new THREE.PerspectiveCamera(51, window.innerWidth/window.innerHeight, .08, 2200);
  camera.position.set(3.2, 2.45, 24);
  camera.layers.enable(1); // layer 1 = moving street props, hidden from the mirror
  scene.add(camera);

  setLoad(.18, 'MIXING CANDY PIGMENTS');
  const { TEX } = await buildMaterials(renderer);
  setLoad(.38, 'PAINTING THE SKY');
  const sky = buildSky(scene, renderer);
  setLoad(.55, 'RAISING THE BOULEVARD');
  const city = buildCity(scene, renderer);
  setLoad(.75, 'POLISHING THE REFLECTIONS');

  // ── lighting: a generous summer sun and cool sky bounce ─────
  const hemi = new THREE.HemisphereLight('#d7f1ff', '#ffd0a1', .07);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffdfb0', 4.0);
  const sunTarget = new THREE.Vector3(0, 4, -30);
  sun.position.set(-100, 65, 110);
  sun.target.position.copy(sunTarget);
  sun.castShadow = true;
  sun.shadow.mapSize.set(QUALITY.shadowMap, QUALITY.shadowMap);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 78;
  sun.shadow.camera.bottom = -78;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 300;
  sun.shadow.bias = -.00018;
  sun.shadow.normalBias = .032;
  sun.shadow.radius = 3.0;
  scene.add(sun, sun.target);
  const skyFill = new THREE.DirectionalLight('#a9dcff', .10);
  skyFill.position.set(65, 38, 35);
  scene.add(skyFill);
  const bounced = new THREE.DirectionalLight('#ffc793', .06);
  bounced.position.set(-10, 10, -80);
  scene.add(bounced);
  const softAmb = new THREE.AmbientLight('#cfe8ef', .012);
  scene.add(softAmb);
  // warm second bounce from the sunlit paving, lifting undersides and awnings
  const bounce = new THREE.DirectionalLight('#ffcf9f', .16);
  bounce.position.set(12, -18, -6);
  scene.add(bounce);

  // subtle long shadows are helped by a very low warm fill
  const low = new THREE.PointLight('#ffb967', 6, 28, 2);
  low.position.set(-8, 3, -11);
  scene.add(low);

  setLoad(.88, 'SETTING THE CAMERA');
  const post = createPost(renderer, scene, camera, { msaa: QUALITY.msaa, bloom: QUALITY.bloom });
  const audio = createAudio();

  // ── runtime quality switch (walk ↔ cinematic ↔ photo) ──────
  function applyQuality(name) {
    const q = setQuality(name);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.setQuality(q);
    city.water.setQuality(q);
    if (sun.shadow.mapSize.x !== q.shadowMap) {
      sun.shadow.mapSize.set(q.shadowMap, q.shadowMap);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      if (sun.shadow.mapPass) { sun.shadow.mapPass.dispose(); sun.shadow.mapPass = null; }
      renderer.shadowMap.needsUpdate = true;
    }
    document.body.dataset.quality = q.name;
  }

  // ── presentation camera moves ──────────────────────────────
  const SHOTS = {
    hero:   { pos:[1.2, 2.4, 27.5], target:[0.0, 8.2, -38.0], fov:62, focus:18 },
    street: { pos:[1.2, 2.0, 19.0], target:[0.2, 4.8, -36.0], fov:62, focus:12 },
    sign:   { pos:[3.2, 4.3, 19.0], target:[11.5, 9.2, 4.0],  fov:52, focus:17 },
    water:  { pos:[0.5, .74, 1.5],   target:[-.3, 3.1, -43.0], fov:48, focus:9 },
    fountain:{pos:[0.0, 2.9, -52.0], target:[0, 4.8, -72.0],   fov:52, focus:18 },
    skyline:{ pos:[0.0, 18.0, 18.0], target:[0.0, 14.0, -120.0], fov:55, focus:70 }
  };
  let mode = 'intro';
  let cinemaStart = 0;
  const clock = new THREE.Clock();
  let elapsed = 0;

  const lookTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  function applyShot(name) {
    const s = SHOTS[name] || SHOTS.hero;
    camera.position.set(...s.pos);
    camera.fov = s.fov; camera.updateProjectionMatrix();
    camera.lookAt(new THREE.Vector3(...s.target));
    if (post.setFocus) post.setFocus(s.focus ?? 18);
  }

  function cinematicAt(t) {
    // one continuous glide: avenue → the water line → the plaza fountain
    const keys = [
      { t:0,  p:[1.2,2.4,27.5],  q:[0.0,8.2,-38] },
      { t:10, p:[1.4,2.35,20.0],  q:[-1.6,6.4,-40] },
      { t:20, p:[-0.6,2.15,11.0],  q:[5.2,6.4,-18] },
      { t:30, p:[0.9,1.62,-5.5],   q:[-2.4,4.0,-42] },
      { t:42, p:[-4.6,2.05,-35.0], q:[2.2,4.4,-66] },
      { t:54, p:[4.8,2.55,-52.5],  q:[0.0,4.5,-72] },
      { t:64, p:[1.2,5.8,-58.0],   q:[0.0,5.3,-86] },
      { t:72, p:[1.2,6.1,-58.0],   q:[0.0,5.1,-86] }
    ];
    const tt = ((t % 78) + 78) % 78;
    let a=keys[0], b=keys[keys.length-1];
    for (let i=0;i<keys.length-1;i++) { if (tt>=keys[i].t && tt<=keys[i+1].t) { a=keys[i]; b=keys[i+1]; break; } }
    const span = Math.max(.001,b.t-a.t);
    let u = (tt-a.t)/span; u = u*u*(3-2*u);
    camPos.set(a.p[0]+(b.p[0]-a.p[0])*u, a.p[1]+(b.p[1]-a.p[1])*u, a.p[2]+(b.p[2]-a.p[2])*u);
    lookTarget.set(a.q[0]+(b.q[0]-a.q[0])*u, a.q[1]+(b.q[1]-a.q[1])*u, a.q[2]+(b.q[2]-a.q[2])*u);
    // breathing and a trace of handheld drift
    const breath = Math.sin(tt*.52)*.012 + Math.sin(tt*1.37)*.006;
    camPos.x += Math.sin(tt*.41)*.035;
    camPos.y += Math.sin(tt*.63)*.022 + breath;
    camera.position.copy(camPos);
    camera.lookAt(lookTarget);
    camera.rotation.z += Math.sin(tt*.23)*.0025;
    if (camera.fov !== 60) { camera.fov = 60; camera.updateProjectionMatrix(); }
  }

  // ── free walk ──────────────────────────────────────────────
  const player = {
    pos:new THREE.Vector3(2.4,1.72,20.5), yaw:-.02, pitch:.01,
    vel:new THREE.Vector3(), bob:0, moving:false,
    // vertical state: y = height above the pavement, vy = vertical velocity
    y:0, vy:0, grounded:true, land:0
  };
  const GRAVITY = 19.0;
  const JUMP_SPEED = 5.6;
  function jump() {
    if (mode !== 'explore' || !player.grounded) return;
    player.vy = JUMP_SPEED;
    player.grounded = false;
  }
  function ensureAudio() {
    audio.start();
    const b=document.getElementById('sound-btn');
    b?.classList.remove('muted'); b?.setAttribute('aria-label','Mute sound');
  }
  const keysDown = new Set();
  let drag = null;
  const hintEl = document.getElementById('walk-hint');

  function enterExplore() {
    mode = 'explore';
    applyQuality(qualityName);
    document.body.classList.remove('intro','cinema','photo');
    document.body.classList.add('explore');
    document.getElementById('intro')?.classList.add('gone');
    player.pos.set(2.0, 1.72, 26.4);
    player.yaw = -.01; player.pitch = .015; player.vel.set(0,0,0);
    player.y = 0; player.vy = 0; player.grounded = true; player.land = 0;
    if (post.setFocus) post.setFocus(12);
    camera.position.copy(player.pos);
    camera.fov = 60; camera.updateProjectionMatrix();
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
    setTimeout(()=>hintEl?.classList.add('fade'), 5600);
    ensureAudio();
  }
  function startCinema() {
    mode = 'cinematic';
    cinemaStart = elapsed;
    applyQuality(qualityName);
    document.body.classList.remove('intro','explore','photo');
    document.body.classList.add('cinema');
    document.getElementById('intro')?.classList.add('gone');
    camera.fov = 60; camera.updateProjectionMatrix();
    ensureAudio();
  }
  function enterPhoto() {
    mode = 'photo';
    applyQuality('photo');
    document.body.classList.remove('intro','cinema','explore');
    document.body.classList.add('photo');
    document.getElementById('intro')?.classList.add('gone');
    camera.fov = 60; camera.updateProjectionMatrix();
  }

  function updateExplore(dt) {
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const wish = new THREE.Vector3();
    if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) wish.add(forward);
    if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) wish.sub(forward);
    if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) wish.add(right);
    if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) wish.sub(right);
    const moving = wish.lengthSq() > 0;
    player.moving = moving;
    if (moving) wish.normalize().multiplyScalar(keysDown.has('ShiftLeft')||keysDown.has('ShiftRight')?7.2:3.5);
    const damp = 1 - Math.exp(-dt*8.5);
    player.vel.lerp(wish, damp);
    player.pos.addScaledVector(player.vel, dt);
    // soft street walls; the plaza opens up past the crosswalk
    if (player.pos.z > -57) {
      player.pos.x = THREE.MathUtils.clamp(player.pos.x, -5.8, 5.8);
    } else if (player.pos.z < -58) {
      player.pos.x = THREE.MathUtils.clamp(player.pos.x, -18.5, 18.5);
      const dx=player.pos.x, dz=player.pos.z+72;
      const d=Math.hypot(dx,dz);
      if (d < 9.5 && d > .01) { player.pos.x = dx/d*9.5; player.pos.z = -72 + dz/d*9.5; }
    }
    player.pos.z = THREE.MathUtils.clamp(player.pos.z, -95, 20.5);

    // ── jump / gravity ────────────────────────────────────────
    if (!player.grounded) {
      player.vy -= GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y <= 0) {
        player.y = 0;
        player.grounded = true;
        player.land = 1; // short landing dip, decays below
      }
    }
    player.land = Math.max(0, player.land - dt * 4.2);
    const landDip = Math.sin(player.land * Math.PI) * .085;

    const speed = player.vel.length();
    player.bob += dt * (2.4 + speed*.85);
    const air = player.grounded ? 1 : .25;
    const bobY = (Math.sin(player.bob*2.1) * Math.min(.035, speed*.012) + Math.sin(player.bob)*.006) * air;
    camera.position.set(player.pos.x, 1.72 + player.y + bobY - landDip, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
    camera.position.x += Math.sin(player.bob*.5)*.008 * air;
  }

  // ── events ─────────────────────────────────────────────────
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.target.closest('.ui-card')) return;
    if (mode === 'explore') {
      drag = { x:e.clientX, y:e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
      canvas.classList.add('dragging');
    }
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || mode !== 'explore') return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    player.yaw -= dx * .0027;
    player.pitch -= dy * .0022;
    player.pitch = THREE.MathUtils.clamp(player.pitch, -1.18, 1.18);
  });
  document.addEventListener('pointerup', () => { drag=null; canvas.classList.remove('dragging'); });
  document.addEventListener('pointercancel', () => { drag=null; canvas.classList.remove('dragging'); });
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)) keysDown.add(e.code);
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) jump(); }
    if (e.code === 'KeyC') { startCinema(); }
    if (e.code === 'KeyP') { if (mode==='photo') enterExplore(); else enterPhoto(); }
    if (e.code === 'KeyH') { document.body.classList.toggle('hide-ui'); }
    if (e.code === 'Digit1') { enterPhoto(); applyShot('hero'); }
    if (e.code === 'Digit2') { enterPhoto(); applyShot('sign'); }
    if (e.code === 'Digit3') { enterPhoto(); applyShot('water'); }
    if (e.code === 'Digit4') { enterPhoto(); applyShot('fountain'); }
    if (e.code === 'Digit5') { enterPhoto(); applyShot('skyline'); }
    if (e.code === 'Escape' && mode === 'photo') enterExplore();
  });
  window.addEventListener('keyup', (e) => keysDown.delete(e.code));
  window.addEventListener('blur', () => keysDown.clear());

  function bindUI() {
    document.getElementById('enter-btn')?.addEventListener('click', enterExplore);
    document.getElementById('cinema-btn')?.addEventListener('click', startCinema);
    document.getElementById('explore-btn')?.addEventListener('click', enterExplore);
    document.getElementById('cine-btn')?.addEventListener('click', startCinema);
    document.getElementById('photo-btn')?.addEventListener('click', enterPhoto);
    document.getElementById('sound-btn')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (btn.classList.contains('muted')) {
        btn.classList.remove('muted');
        btn.setAttribute('aria-label', 'Mute sound');
        audio.start();
      } else {
        btn.classList.add('muted');
        btn.setAttribute('aria-label', 'Enable sound');
        audio.start();
        audio.toggle();
      }
    });
    document.querySelectorAll('[data-shot]').forEach(el => el.addEventListener('click', ()=> {
      enterPhoto(); applyShot(el.dataset.shot);
      document.querySelectorAll('[data-shot]').forEach(x=>x.classList.remove('active'));
      el.classList.add('active');
    }));
    document.getElementById('start-screen')?.addEventListener('click', (e) => {
      if (e.target.id === 'start-screen') enterExplore();
    });
  }

  function setModeForParams() {
    if (shotParam && SHOTS[shotParam]) {
      enterPhoto(); applyShot(shotParam);
      document.body.classList.add('ready');
      document.getElementById('intro')?.classList.add('gone');
      document.body.classList.add('hide-ui');
    } else if (params.get('cinema') === '1') {
      startCinema();
      document.body.classList.add('ready');
      document.getElementById('intro')?.classList.add('gone');
    } else {
      document.body.classList.add('ready','intro');
      applyShot('hero');
    }
    if (noUi) document.body.classList.add('hide-ui');
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w/h; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY.dpr));
    renderer.setSize(w,h);
    post.composer.setPixelRatio(renderer.getPixelRatio());
    post.resize(w,h);
    city.water.resize();
  }
  window.addEventListener('resize', resize);

  bindUI();
  applyQuality(qualityName);
  setModeForParams();

  // initial data for debugging and external capture tools
  window.__MARWLE = {
    THREE, scene, camera, renderer, composer: post.composer, post, sky, city, audio, SHOTS,
    setShot:(name)=>{ enterPhoto(); applyShot(name); },
    setMode:(m)=>{ if(m==='explore')enterExplore(); else if(m==='cinema')startCinema(); else if(m==='photo')enterPhoto(); },
    get mode(){return mode;},
    get quality(){ return QUALITY.name; },
    setQuality:(n)=>{ applyQuality(n); },
    setTime:(v)=>{ const n = Number(v); if (Number.isFinite(n)) fixedTime = n; }
  };

  // compile and warm up (also pre-renders the mirror before the first unveiled frame)
  camera.updateMatrixWorld();
  setLoad(.95, 'FINAL LIGHT');
  await renderer.compileAsync(scene, camera).catch(()=>{});
  renderer.compile(scene, camera);
  post.composer.render();
  renderer.shadowMap.autoUpdate = false;
  await new Promise(r=>requestAnimationFrame(r));
  setLoad(1, 'WELCOME TO SUGARLINE');
  await wait(250);
  loader.classList.add('done');
  setTimeout(()=>loader.remove(), 900);

  if (debug) renderer.info.autoReset = false;
  function frame() {
    requestAnimationFrame(frame);
    if (debug) renderer.info.reset();
    const dt = Math.min(.05, clock.getDelta());
    elapsed += dt;
    const t = freeze ? (fixedTime ?? 9.0) : elapsed;
    if (mode === 'intro') cinematicAt(elapsed);
    else if (mode === 'cinematic') cinematicAt(elapsed - cinemaStart);
    else if (mode === 'explore') updateExplore(dt);
    sky.update(t);
    city.update(t);
    post.update(t, SUN_DIR);
    post.composer.render();
    if (debug) {
      const info = renderer.info.render;
      document.getElementById('debug-stats').textContent = info.calls + ' calls · ' + (info.triangles/1000).toFixed(0) + 'k tris · ' + renderer.getPixelRatio().toFixed(2) + 'x';
    }
  }
  frame();
}

boot().catch((err) => {
  console.error(err);
  if (loaderStatus) loaderStatus.textContent = 'A CLOUD GOT STUCK — ' + (err?.message || err);
  loader?.classList.add('failed');
});