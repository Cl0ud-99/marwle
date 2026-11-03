import * as THREE from 'three';
import {
  canvasTexture, glowTexture, textTexture, makeFlagTexture, rng
} from './utils.js';

import asphaltDiff from '../assets/asphalt_diff.jpg';
import asphaltNorm from '../assets/asphalt_norm.jpg';
import asphaltRough from '../assets/asphalt_rough.jpg';
import asphaltAO from '../assets/asphalt_ao.jpg';
import paversDiff from '../assets/pavers_diff.jpg';
import paversNorm from '../assets/pavers_norm.jpg';
import paversRough from '../assets/pavers_rough.jpg';
import paversAO from '../assets/pavers_ao.jpg';
import plasterDiff from '../assets/plaster_diff.jpg';
import plasterNorm from '../assets/plaster_norm.jpg';
import plasterRough from '../assets/plaster_rough.jpg';
import marbleDiff from '../assets/marble_diff.jpg';
import marbleNorm from '../assets/marble_norm.jpg';
import marbleRough from '../assets/marble_rough.jpg';

export const TEX = {};
export const MAT = {};
export const FONT = { display: 'Bungee, "Arial Black", sans-serif', body: 'Outfit, "Segoe UI", sans-serif' };

const loader = new THREE.TextureLoader();

function configure(tex, { srgb = false, repeat = [1,1], aniso = 8 } = {}) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}


async function loadImage(url) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  return img;
}

/** Colour maps are gently desaturated so the painted palette stays saturated even up close. */
function desaturatedTexture(img, amount = .7, maxSize = 1024) {
  const W = Math.min(maxSize, img.width);
  const H = Math.min(maxSize, img.height);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, W, H);
  const data = x.getImageData(0, 0, W, H);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i]*.299 + d[i+1]*.587 + d[i+2]*.114) / 255;
    const v = Math.min(1, Math.max(.28, .66 + (l - .66) * .55));
    const R = 255*v, G = 255*v, B = 255*v;
    d[i] = d[i]*(1-amount) + R*amount;
    d[i+1] = d[i+1]*(1-amount) + G*amount;
    d[i+2] = d[i+2]*(1-amount) + B*amount;
  }
  x.putImageData(data, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Soft grime/AO sheet for walls: large blotches plus vertical run-off streaks. */
function wallAOTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const r = rng(7331);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 36; i++) {
      const x = r() * w, y = r() * h, rad = 30 + r() * 110;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(0,0,0,' + (.05 + r() * .07) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 20; i++) {
      const x = r() * w, y0 = r() * h, len = h * (.2 + r() * .5);
      const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
      g.addColorStop(0, 'rgba(0,0,0,.09)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y0, 2 + r() * 5, len);
    }
  }, { linear: true, repeat: [2.2, 2.2] });
}

/** Height/bump sheet derived from a colour map: dark grout and pores sink,
 *  bright stone rises. Cheap stand-in for a dedicated height texture. */
function heightTexture(img, maxSize = 512) {
  const W = Math.min(maxSize, img.width), H = Math.min(maxSize, img.height);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, W, H);
  const data = x.getImageData(0, 0, W, H);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * .299 + d[i+1] * .587 + d[i+2] * .114) / 255;
    const h = Math.max(0, Math.min(1, .5 + (l - .5) * 1.45));
    d[i] = d[i+1] = d[i+2] = h * 255;
    d[i+3] = 255;
  }
  x.putImageData(data, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  return t;
}

/** Bake a height-gradient into an existing tangent-space normal map. Three
 *  ignores bumpMap when normalMap is present, so the relief has to live in the
 *  normal map itself. Seeded, deterministic, done once at load. */
function relievedNormal(normalTex, heightTex, strength = .5, size = 512) {
  const nc = document.createElement('canvas'); nc.width = nc.height = size;
  const nx = nc.getContext('2d');
  nx.drawImage(normalTex.image, 0, 0, size, size);
  const hc = document.createElement('canvas'); hc.width = hc.height = size;
  const hx = hc.getContext('2d');
  hx.drawImage(heightTex.image, 0, 0, size, size);
  const hd = hx.getImageData(0, 0, size, size).data;
  const nd = nx.getImageData(0, 0, size, size);
  const d = nd.data;
  const at = (x, y) => hd[((y + size) % size * size + (x + size) % size) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let vx = d[i] / 127.5 - 1 - dx;
      let vy = d[i + 1] / 127.5 - 1 - dy;
      let vz = d[i + 2] / 127.5 - 1;
      const len = Math.hypot(vx, vy, vz) || 1;
      d[i] = (vx / len * .5 + .5) * 255;
      d[i + 1] = (vy / len * .5 + .5) * 255;
      d[i + 2] = (vz / len * .5 + .5) * 255;
    }
  }
  nx.putImageData(nd, 0, 0);
  const t = new THREE.CanvasTexture(nc);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  return t;
}

/** Parallax-occlusion mapping for horizontal ground materials. The mirror
 *  height sheet is ray-marched in UV space; colour/roughness/AO follow the
 *  displaced UV, which is what sells the paving depth. */
function applyPOM(mat, heightTex, scale = .035, steps = 6) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPomHeight = { value: heightTex };
    shader.uniforms.uPomScale = { value: scale };
    mat.userData.shader = shader;
    shader.vertexShader = 'varying vec3 vPomWorld;\n' + shader.vertexShader
      .replace('void main() {', 'void main() {\n\tvPomWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = 'varying vec3 vPomWorld;\nuniform sampler2D uPomHeight;\nuniform float uPomScale;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'void main() {\n'
      + 'vec3 pomV = normalize(cameraPosition - vPomWorld);\n'
      + 'float pomNdV = max(dot(pomV, vec3(0.0, 1.0, 0.0)), 0.25);\n'
      + 'vec2 pomDir = (pomV.xz / pomNdV) * uPomScale;\n'
      + 'vec2 pomUv = vMapUv;\n'
      + 'float pomLayer = 1.0;\n'
      + 'for (int pomI = 0; pomI < ' + steps + '; pomI++) {\n'
      + '  float pomH = texture2D(uPomHeight, pomUv).r;\n'
      + '  if (pomH >= pomLayer) break;\n'
      + '  pomUv -= pomDir / float(' + steps + ');\n'
      + '  pomLayer -= 1.0 / float(' + steps + ');\n'
      + '}\n');
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
      'vec4 pomSampled = texture2D(map, pomUv);\n  diffuseColor *= pomSampled;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      'float roughnessFactor = roughness;\n'
      + '#ifdef USE_ROUGHNESSMAP\n'
      + '  vec4 texelRoughness = texture2D(roughnessMap, pomUv);\n'
      + '  roughnessFactor *= texelRoughness.g;\n'
      + '#endif');
    shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>',
      '#ifdef USE_AOMAP\n'
      + '  float ambientOcclusion = (texture2D(aoMap, pomUv).r - 1.0) * aoMapIntensity + 1.0;\n'
      + '  reflectedLight.indirectDiffuse *= ambientOcclusion;\n'
      + '  #if defined(USE_ENVMAP) && defined(STANDARD)\n'
      + '    reflectedLight.indirectSpecular *= ambientOcclusion;\n'
      + '  #endif\n'
      + '#endif');
  };
  mat.customProgramCacheKey = () => 'pom' + steps;
}

export function stripeTexture(a = '#ff6d75', b = '#fff2d6', count = 12, vertical = true) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = b; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = a;
    const step = (vertical ? w : h) / count;
    for (let i = 0; i < count; i += 2) {
      if (vertical) ctx.fillRect(i*step, 0, step, h);
      else ctx.fillRect(0, i*step, w, step);
    }
    // fabric grain (seeded so reloads stay pixel-identical)
    const gr = rng(9001);
    ctx.globalAlpha = .06; ctx.fillStyle = '#000';
    for (let i = 0; i < 1200; i++) ctx.fillRect(gr()*w, gr()*h, 1, 2);
    ctx.globalAlpha = 1;
  }, { repeat: [1,1] });
}

const shopWindowCache = new Map();
function shopWindowTexture(seed = 3, hue = '#ffbf6e') {
  const key = seed + '|' + hue;
  const cached = shopWindowCache.get(key);
  if (cached) return cached;
  const tex = canvasTexture(768, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0, '#182a3b'); g.addColorStop(.15, '#295e66'); g.addColorStop(.4, hue); g.addColorStop(1, '#ffdcae');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha = .22; ctx.fillStyle = '#07131c';
    for (let i=0;i<9;i++) ctx.fillRect(40+i*82, 110, 18, 310);
    ctx.globalAlpha = 1;
    for (let s=0;s<3;s++){
      ctx.fillStyle = ['#ff8f6b','#7be0d3','#f9e281'][s];
      ctx.fillRect(58, 210 + s*78, w-116, 10);
      for(let i=0;i<7;i++){
        ctx.globalAlpha=.8;
        ctx.beginPath(); ctx.arc(95+i*92, 190+s*78, 19+((i*13+seed)%8), 0, Math.PI*2);
        ctx.fillStyle = ['#fff2df','#ffc1bf','#baf4e6'][(i+s)%3]; ctx.fill();
      }
      ctx.globalAlpha=1;
    }
    // warm hanging lamps
    for (let i=0;i<5;i++){
      const x = 95 + i*145;
      ctx.strokeStyle = 'rgba(255,240,200,.6)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,70); ctx.stroke();
      const lg = ctx.createRadialGradient(x,88,0,x,88,60);
      lg.addColorStop(0,'rgba(255,252,220,1)'); lg.addColorStop(.18,'rgba(255,220,140,.95)'); lg.addColorStop(1,'rgba(255,180,80,0)');
      ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(x,88,60,0,Math.PI*2); ctx.fill();
    }
    // reflections in glass
    const sheen = ctx.createLinearGradient(0,0,w,h);
    sheen.addColorStop(0,'rgba(195,245,255,.28)'); sheen.addColorStop(.35,'rgba(255,255,255,0)'); sheen.addColorStop(.7,'rgba(255,255,255,.08)'); sheen.addColorStop(1,'rgba(145,220,255,.14)');
    ctx.fillStyle=sheen; ctx.fillRect(0,0,w,h);
  }, { clamp: true });
  shopWindowCache.set(key, tex);
  return tex;
}

function posterTexture(title, sub, palette) {
  return canvasTexture(768, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,palette[0]); g.addColorStop(.55,palette[1]); g.addColorStop(1,palette[2]);
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=.35;
    for(let i=0;i<12;i++){
      ctx.fillStyle=i%2?'rgba(255,255,255,.35)':'rgba(20,40,70,.20)';
      ctx.beginPath(); ctx.arc(w*(i*.09-.03), h*(.18+ .05*(i%5)), 70+30*(i%4), 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.fillStyle='rgba(255,248,228,.94)';
    ctx.beginPath(); ctx.arc(w*.74, h*.32, 116, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=palette[3]||'#e43a4d'; ctx.beginPath(); ctx.arc(w*.74, h*.32, 82, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='900 46px Bungee, Arial Black, sans-serif'; ctx.textAlign='center'; ctx.fillText('M', w*.74, h*.345);
    ctx.textAlign='left';
    ctx.fillStyle='#17384d'; ctx.font='900 82px Bungee, Arial Black, sans-serif';
    ctx.fillText(title, 52, h*.63);
    ctx.fillStyle='rgba(23,56,77,.72)'; ctx.font='600 30px Outfit, sans-serif';
    ctx.fillText(sub, 56, h*.70);
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='600 23px Outfit, sans-serif';
    ctx.fillText('MARWLE  /  SUGARLINE DISTRICT', 56, h*.93);
  }, { clamp: true });
}

export async function buildMaterials(renderer) {
  const aniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const [aImg, pImg, mImg, plImg] = await Promise.all([
    loadImage(asphaltDiff), loadImage(paversDiff), loadImage(marbleDiff), loadImage(plasterDiff)
  ]);
  TEX.asphalt = configure(desaturatedTexture(aImg, .85, 1024), { srgb: true, repeat: [7,70], aniso });
  TEX.pavers = configure(desaturatedTexture(pImg, .8, 1024), { srgb: true, repeat: [4,60], aniso });
  TEX.marble = configure(desaturatedTexture(mImg, .78, 1024), { srgb: true, repeat: [4,4], aniso });
  TEX.plaster = configure(desaturatedTexture(plImg, .8, 1024), { srgb: true, repeat: [3,3], aniso });
  TEX.asphaltH = configure(heightTexture(aImg, 512), { repeat: [7,70], aniso });
  TEX.paversH = configure(heightTexture(pImg, 512), { repeat: [4,60], aniso });
  TEX.plasterH = configure(heightTexture(plImg, 512), { repeat: [3,3], aniso });
  TEX.marbleH = configure(heightTexture(mImg, 512), { repeat: [4,4], aniso });
  TEX.asphaltN = configure(await loader.loadAsync(asphaltNorm), { repeat: [7,70], aniso });
  TEX.asphaltR = configure(await loader.loadAsync(asphaltRough), { repeat: [7,70], aniso });
  TEX.asphaltAO = configure(await loader.loadAsync(asphaltAO), { repeat: [7,70], aniso });
  TEX.paversN = configure(await loader.loadAsync(paversNorm), { repeat: [4,60], aniso });
  TEX.paversR = configure(await loader.loadAsync(paversRough), { repeat: [4,60], aniso });
  TEX.paversAO = configure(await loader.loadAsync(paversAO), { repeat: [4,60], aniso });
  TEX.plasterN = configure(await loader.loadAsync(plasterNorm), { repeat: [3,3], aniso });
  TEX.plasterR = configure(await loader.loadAsync(plasterRough), { repeat: [3,3], aniso });
  TEX.marbleN = configure(await loader.loadAsync(marbleNorm), { repeat: [4,4], aniso });
  TEX.marbleR = configure(await loader.loadAsync(marbleRough), { repeat: [4,4], aniso });
  TEX.asphaltAO.channel = 0; TEX.paversAO.channel = 0;
  // bake the height gradient into the normal maps (bumpMap is ignored when a
  // normalMap is present), giving the paving and walls real micro-relief
  TEX.asphaltNR = configure(relievedNormal(TEX.asphaltN, TEX.asphaltH, .55), { repeat: [7,70], aniso });
  TEX.paversNR = configure(relievedNormal(TEX.paversN, TEX.paversH, .7), { repeat: [4,60], aniso });
  TEX.plasterNR = configure(relievedNormal(TEX.plasterN, TEX.plasterH, .35), { repeat: [3,3], aniso });
  TEX.marbleNR = configure(relievedNormal(TEX.marbleN, TEX.marbleH, .35), { repeat: [4,4], aniso });

  TEX.glow = glowTexture(256);
  TEX.flag = makeFlagTexture('#ff5579', '#ffe489');
  TEX.awningPink = stripeTexture('#ff6e7d', '#fff0d0', 10, true);
  TEX.awningMint = stripeTexture('#23b7b1', '#fff4dd', 10, true);
  TEX.awningBlue = stripeTexture('#295fbb', '#f9f1df', 9, true);
  TEX.awningGold = stripeTexture('#ffc53c', '#fff4da', 9, true);
  TEX.awningPink.repeat.set(2,1);
  TEX.awningMint.repeat.set(2,1);
  TEX.awningBlue.repeat.set(2,1);
  TEX.awningGold.repeat.set(2,1);

  // ── subtle facade patterns keep big surfaces from reading as plastic ──
  function wallPattern(kind = 'scallop') {
    return canvasTexture(1024, 1024, (ctx, w, h) => {
      ctx.fillStyle = '#cfc5b6'; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle = 'rgba(255,248,231,.60)';
      ctx.fillStyle = 'rgba(255,248,231,.42)';
      ctx.lineWidth = 3.5;
      if (kind === 'scallop') {
        const r = 48;
        for (let row=0;row<6;row++) for(let col=0;col<6;col++){
          const x=col*96+(row%2?48:0), y=row*88;
          ctx.beginPath(); ctx.arc(x,y+54,r,Math.PI,0); ctx.stroke();
          ctx.beginPath(); ctx.arc(x,y+74,r*.44,Math.PI,0); ctx.stroke();
        }
      } else if (kind === 'stripe') {
        for (let x=0;x<w;x+=54) {
          ctx.fillRect(x,0,14,h);
          ctx.fillStyle='rgba(255,248,231,.18)'; ctx.fillRect(x+22,0,3,h); ctx.fillStyle='rgba(255,248,231,.42)';
        }
      } else if (kind === 'dot') {
        for(let y=24;y<h;y+=64) for(let x=24;x<w;x+=64){
          ctx.beginPath(); ctx.arc(x+(Math.floor(y/64)%2)*28,y,9,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(x+(Math.floor(y/64)%2)*28,y,17,0,Math.PI*2); ctx.stroke();
        }
      } else if (kind === 'arch') {
        for(let x=0;x<w;x+=96){
          ctx.beginPath(); ctx.arc(x+48,180,39,Math.PI,0); ctx.stroke();
          ctx.beginPath(); ctx.arc(x+48,180,27,Math.PI,0); ctx.stroke();
          ctx.strokeRect(x+8,180,80,150);
        }
      } else if (kind === 'check') {
        for(let y=0;y<h;y+=52) for(let x=0;x<w;x+=52){
          if((x/52+y/52)%2===0) ctx.fillRect(x,y,26,26);
        }
      }
      // micro grain + lower wall weathering
      ctx.globalAlpha=.08;
      const wg = rng(1337);
      for(let i=0;i<7200;i++){ctx.fillStyle=wg()>.5?'#fff':'#5d4b3e';ctx.fillRect(wg()*w,wg()*h,1.5,2);}
      ctx.globalAlpha=1;
      const grime=ctx.createLinearGradient(0,h*.55,0,h);
      grime.addColorStop(0,'rgba(84,55,45,0)');grime.addColorStop(1,'rgba(84,55,45,.17)');
      ctx.fillStyle=grime;ctx.fillRect(0,h*.55,w,h*.45);
    }, { repeat: [2.2,2.2] });
  }
  TEX.wallAO = wallAOTexture();
  TEX.patternScallop = wallPattern('scallop');
  TEX.patternStripe = wallPattern('stripe');
  TEX.patternDot = wallPattern('dot');
  TEX.patternArch = wallPattern('arch');
  TEX.patternCheck = wallPattern('check');

  // ── paint and trim ──────────────────────────────────────────
  const paints = {
    cream: '#f6dfbe', butter: '#ffd16f', coral: '#f7746d', rose: '#f79bb1',
    magenta: '#df4f8c', peach: '#ffad84', mint: '#82dfc6', teal: '#149eac',
    aqua: '#4dd3d0', blue: '#2c7bc9', cobalt: '#164e9e', lavender: '#b7a2e3',
    violet: '#7456bc', red: '#e63946', lime: '#d1e77e', white: '#fff8ec',
    navy: '#183c5b', chocolate: '#71483c', cream2: '#f3cb9e', pink: '#ffb9ca'
  };
  const patternFor = {
    coral: TEX.patternScallop, rose: TEX.patternScallop, magenta: TEX.patternScallop,
    teal: TEX.patternStripe, aqua: TEX.patternStripe, blue: TEX.patternStripe, cobalt: TEX.patternStripe,
    butter: TEX.patternDot, lime: TEX.patternDot, peach: TEX.patternDot,
    lavender: TEX.patternCheck, violet: TEX.patternCheck,
    cream2: TEX.patternArch, pink: TEX.patternArch
  };
  for (const [name, color] of Object.entries(paints)) {
    MAT['paint_' + name] = new THREE.MeshPhysicalMaterial({
      color, map: patternFor[name] ?? TEX.plaster, roughness: .47, metalness: .03,
      clearcoat: .55, clearcoatRoughness: .26,
      normalMap: TEX.plasterNR, normalScale: new THREE.Vector2(.55,.55),
      roughnessMap: TEX.plasterR, aoMap: TEX.wallAO, aoMapIntensity: .32, envMapIntensity: 1.28
    });
  }
  MAT.paint_glossRed = new THREE.MeshPhysicalMaterial({
    color: '#e12531', roughness: .3, metalness: .05, clearcoat: .85, clearcoatRoughness: .18, envMapIntensity: 1.35
  });
  MAT.paint_glossBlue = new THREE.MeshPhysicalMaterial({
    color: '#145bb5', roughness: .26, metalness: .08, clearcoat: .9, clearcoatRoughness: .15, envMapIntensity: 1.45
  });
  MAT.paint_glossTeal = new THREE.MeshPhysicalMaterial({
    color: '#0f9ca9', roughness: .28, metalness: .05, clearcoat: .85, clearcoatRoughness: .16, envMapIntensity: 1.35
  });

  // ── surfaces ────────────────────────────────────────────────
  MAT.road = new THREE.MeshPhysicalMaterial({
    color: '#d5d4cb', map: TEX.asphalt, normalMap: TEX.asphaltNR, normalScale: new THREE.Vector2(.85,.85),
    roughnessMap: TEX.asphaltR, aoMap: TEX.asphaltAO, aoMapIntensity: .9,
    roughness: .58, metalness: .03, clearcoat: .55, clearcoatRoughness: .22, envMapIntensity: 1.0
  });
  MAT.sidewalk = new THREE.MeshPhysicalMaterial({
    color: '#f4ddbe', map: TEX.pavers, normalMap: TEX.paversNR, normalScale: new THREE.Vector2(1.0,1.0),
    roughnessMap: TEX.paversR, aoMap: TEX.paversAO, aoMapIntensity: 1.0,
    roughness: .62, clearcoat: .24, clearcoatRoughness: .4, envMapIntensity: .8
  });
  applyPOM(MAT.road, TEX.asphaltH, .045, 6);
  applyPOM(MAT.sidewalk, TEX.paversH, .055, 6);
  MAT.marble = new THREE.MeshPhysicalMaterial({
    color: '#f8e6dc', map: TEX.marble, normalMap: TEX.marbleNR, normalScale: new THREE.Vector2(.7,.7),
    roughnessMap: TEX.marbleR, roughness: .35, clearcoat: .65, clearcoatRoughness: .2, envMapIntensity: 1.2
  });
  MAT.curb = new THREE.MeshPhysicalMaterial({ color: '#f1dcc0', roughness: .55, clearcoat: .2, envMapIntensity: .8 });
  MAT.whiteTrim = new THREE.MeshPhysicalMaterial({ color: '#fff7e8', roughness: .35, clearcoat: .55, clearcoatRoughness: .25, envMapIntensity: 1.15 });
  MAT.creamTrim = new THREE.MeshPhysicalMaterial({ color: '#f1d3a7', roughness: .45, clearcoat: .3, envMapIntensity: 1 });
  MAT.darkTrim = new THREE.MeshStandardMaterial({ color: '#223b4a', roughness: .34, metalness: .55, envMapIntensity: 1.1 });

  // ── metals & glass ─────────────────────────────────────────
  MAT.gold = new THREE.MeshStandardMaterial({ color: '#ffc34f', roughness: .2, metalness: .88, envMapIntensity: 1.7 });
  MAT.brass = new THREE.MeshStandardMaterial({ color: '#c18d39', roughness: .28, metalness: .82, envMapIntensity: 1.45 });
  MAT.silver = new THREE.MeshStandardMaterial({ color: '#dbe8ee', roughness: .18, metalness: .95, envMapIntensity: 1.7 });
  MAT.darkMetal = new THREE.MeshStandardMaterial({ color: '#1b2933', roughness: .3, metalness: .75, envMapIntensity: 1.2 });
  MAT.redMetal = new THREE.MeshStandardMaterial({ color: '#c92e3b', roughness: .2, metalness: .6, envMapIntensity: 1.6 });
  MAT.glassDark = new THREE.MeshPhysicalMaterial({
    color: '#123746', roughness: .045, metalness: .55, clearcoat: 1, clearcoatRoughness: .025,
    envMapIntensity: 2.7, iridescence: .32, iridescenceIOR: 1.45
  });
  MAT.glassBlue = new THREE.MeshPhysicalMaterial({
    color: '#1d6586', roughness: .05, metalness: .45, clearcoat: 1, clearcoatRoughness: .03,
    envMapIntensity: 2.5, iridescence: .16, iridescenceIOR: 1.35
  });
  MAT.glassWarm = new THREE.MeshPhysicalMaterial({
    color: '#ffd192', roughness: .07, metalness: .15, clearcoat: 1, clearcoatRoughness: .03,
    envMapIntensity: 2.5, emissive: '#ff9d45', emissiveIntensity: .28
  });
  MAT.glassClear = new THREE.MeshPhysicalMaterial({
    color: '#cdeff4', roughness: .03, metalness: .08, transparent: true, opacity: .26,
    clearcoat: 1, clearcoatRoughness: .015, envMapIntensity: 2.6, depthWrite: false, side: THREE.DoubleSide
  });
  MAT.shopWindows = new THREE.MeshPhysicalMaterial({
    map: shopWindowTexture(3, '#ffbd68'), emissiveMap: shopWindowTexture(3, '#ffbd68'),
    emissive: '#ffd9a2', emissiveIntensity: .56, roughness: .15, metalness: .2,
    clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.9
  });
  MAT.shopWindowsCool = new THREE.MeshPhysicalMaterial({
    map: shopWindowTexture(9, '#7cdbd3'), emissiveMap: shopWindowTexture(9, '#7cdbd3'),
    emissive: '#9df6e9', emissiveIntensity: .48, roughness: .16, metalness: .2,
    clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.9
  });

  // ── awnings, fabric ────────────────────────────────────────
  const fabric = (map) => new THREE.MeshStandardMaterial({ map, color: '#ffffff', roughness: .72, side: THREE.DoubleSide, envMapIntensity: .55 });
  MAT.awningPink = fabric(TEX.awningPink);
  MAT.awningMint = fabric(TEX.awningMint);
  MAT.awningBlue = fabric(TEX.awningBlue);
  MAT.awningGold = fabric(TEX.awningGold);
  MAT.flag = new THREE.MeshStandardMaterial({ map: TEX.flag, roughness: .7, side: THREE.DoubleSide, envMapIntensity: .5 });

  // ── organic ────────────────────────────────────────────────
  MAT.leafDeep = new THREE.MeshStandardMaterial({ color: '#387a5f', roughness: .72, envMapIntensity: .65 });
  MAT.leafMid = new THREE.MeshStandardMaterial({ color: '#62ad7b', roughness: .7, envMapIntensity: .65 });
  MAT.leafLight = new THREE.MeshStandardMaterial({ color: '#9ed68e', roughness: .68, envMapIntensity: .65 });
  MAT.leafPink = new THREE.MeshStandardMaterial({ color: '#f3a5b8', roughness: .7, envMapIntensity: .6 });
  MAT.leafGold = new THREE.MeshStandardMaterial({ color: '#e7c35f', roughness: .68, envMapIntensity: .6 });
  MAT.trunk = new THREE.MeshStandardMaterial({ color: '#6a4537', roughness: .82 });
  MAT.pot = new THREE.MeshStandardMaterial({ color: '#c86a58', roughness: .65 });
  MAT.soil = new THREE.MeshStandardMaterial({ color: '#4f3c31', roughness: .95 });
  MAT.flowerPink = new THREE.MeshStandardMaterial({ color: '#ff9bb8', roughness: .62 });
  MAT.flowerGold = new THREE.MeshStandardMaterial({ color: '#ffd568', roughness: .6 });
  MAT.flowerBlue = new THREE.MeshStandardMaterial({ color: '#8eb8ff', roughness: .6 });
  MAT.fabricRed = new THREE.MeshStandardMaterial({ color: '#a92f43', roughness: .85 });

  // ── miscellaneous ──────────────────────────────────────────
  MAT.rubber = new THREE.MeshStandardMaterial({ color: '#1b1e22', roughness: .8 });
  MAT.wood = new THREE.MeshStandardMaterial({ color: '#9a6449', roughness: .6 });
  MAT.woodLight = new THREE.MeshStandardMaterial({ color: '#d49b70', roughness: .6 });
  MAT.terracotta = new THREE.MeshStandardMaterial({ color: '#cf765e', roughness: .74 });
  MAT.concrete = new THREE.MeshStandardMaterial({ color: '#d9cfbf', roughness: .85 });
  MAT.charcoal = new THREE.MeshStandardMaterial({ color: '#333b40', roughness: .8 });

  // ── luminous paints ───────────────────────────────────────
  MAT.neon = (hex, intensity = 2.4) => {
    const key = 'neon_' + hex + '_' + intensity;
    if (!MAT[key]) {
      const c = new THREE.Color(hex).multiplyScalar(intensity);
      MAT[key] = new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    }
    return MAT[key];
  };
  const signCache = new Map();
  MAT.sign = (tex, intensity = 1.15) => {
    const key = tex.uuid + '|' + intensity;
    let mat = signCache.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: tex, toneMapped: false,
        color: new THREE.Color().setScalar(intensity)
      });
      signCache.set(key, mat);
    }
    return mat;
  };
  MAT.glowSprite = (color = '#ffd9a0', opacity = .5) => new THREE.SpriteMaterial({
    map: TEX.glow, color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false
  });

  // reusable special canvases
  TEX.screenFace = canvasTexture(1024, 1024, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w*.5,h*.45,0,w*.5,h*.45,w*.55);
    g.addColorStop(0,'#fff6c7'); g.addColorStop(.3,'#ffb95a'); g.addColorStop(.62,'#ef5c86'); g.addColorStop(1,'#522da0');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=.15; ctx.strokeStyle='#fff'; ctx.lineWidth=8;
    for(let i=0;i<16;i++){ctx.beginPath();ctx.arc(w/2,h/2,45+i*42,0,Math.PI*2);ctx.stroke();}
    ctx.globalAlpha=.9; ctx.fillStyle='#fff7df'; ctx.font='900 176px Bungee, Arial Black, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('JOY',w/2,h/2);
  }, { clamp: true });
  TEX.marwle = textTexture({
    text:'MARWLE', width:2048, height:512, font:'900 340px Bungee, Arial Black, sans-serif',
    gradient:[[0,'#ff5964'],[.45,'#ff304e'],[1,'#cf1736']], stroke:'#fff0d2', strokeWidth:22,
    shadow:'#671020', shadowBlur:34, shadowOffsetY:18, spacing:8
  });
  TEX.fizz = textTexture({
    text:'FIZZ', width:512, height:1536, font:'900 250px Bungee, Arial Black, sans-serif',
    color:'#fff1c8', bg:'#eb437f', rounded:false, border:'#ffd26a', borderWidth:28,
    sub:'SODA · SWEETS', subColor:'#ffe9ae', subFont:'700 54px Outfit, sans-serif'
  });
  TEX.soda = textTexture({
    text:'SODA', width:1536, height:512, font:'900 300px Bungee, Arial Black, sans-serif',
    color:'#fff8e7', bg:'#1a9fb1', border:'#ffde9b', borderWidth:22, spacing:16
  });
  TEX.dream = textTexture({
    text:'DREAM', width:1536, height:512, font:'900 280px Bungee, Arial Black, sans-serif',
    color:'#203c70', bg:'#ffe27d', border:'#fff4d8', borderWidth:20, spacing:12
  });
  TEX.candy = textTexture({
    text:'CANDY', width:1536, height:512, font:'900 300px Bungee, Arial Black, sans-serif',
    color:'#fff6e5', bg:'#e75992', border:'#ffe796', borderWidth:22, spacing:12
  });
  TEX.poster1 = posterTexture('SWEET', 'THE FUTURE IS DELICIOUS', ['#ffcf6d','#f57689','#6b3aa8','#d82f4a']);
  TEX.poster2 = posterTexture('BRIGHT', 'A BETTER KIND OF DAY', ['#83e2d6','#2a88c8','#2f3a91','#ffb446']);
  TEX.poster3 = posterTexture('PLAY', 'SUGARLINE / DISTRICT 07', ['#f8b2d0','#ef6a8a','#9f6acb','#3b4ba4']);
  TEX.shop = {
    warm: shopWindowTexture(3, '#ffbd68'),
    cool: shopWindowTexture(9, '#7cdbd3'),
    pink: shopWindowTexture(15, '#ff9fb2')
  };
  MAT.shopWindowsPink = new THREE.MeshPhysicalMaterial({
    map: TEX.shop.pink, emissiveMap: TEX.shop.pink, emissive: '#ffc0d0', emissiveIntensity: .5,
    roughness: .16, metalness: .2, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.9
  });
  MAT.shopWindowsCool = new THREE.MeshPhysicalMaterial({
    map: TEX.shop.cool, emissiveMap: TEX.shop.cool, emissive: '#a2fff2', emissiveIntensity: .44,
    roughness: .16, metalness: .2, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.9
  });

  return { TEX, MAT };
}