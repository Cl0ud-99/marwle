import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const SunRaysShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSun: { value: new THREE.Vector2(.3,.7) },
    uIntensity: { value: 0 },
    uAspect: { value: 1.0 },
    uTime: { value: 0 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uSun;
    uniform float uIntensity;
    uniform float uAspect;
    uniform float uTime;
    varying vec2 vUv;
    void main(){
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      if (uIntensity < .001) { gl_FragColor = vec4(base, 1.0); return; }
      vec2 delta = (uSun - vUv);
      delta.x *= uAspect;
      float dist = length(delta);
      float fall = smoothstep(.85, .08, dist);
      vec3 rays = vec3(0.0);
      for(int i=0;i<28;i++){
        float f = float(i)/28.0;
        vec2 uv = vUv + delta * f * .55;
        vec3 s = texture2D(tDiffuse, uv).rgb;
        float lum = dot(s, vec3(.299,.587,.114));
        rays += s * smoothstep(1.05, 2.2, lum) * (1.0-f) * (1.0-f);
      }
      rays /= 28.0;
      rays *= vec3(1.0,.79,.48) * uIntensity * fall;
      gl_FragColor = vec4(base + rays, 1.0);
    }
  `
};

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1920,1080) },
    uExposure: { value: .74 },
    uVignette: { value: .30 },
    uGrain: { value: .022 },
    uSaturation: { value: 1.16 },
    uContrast: { value: 1.08 },
    uFade: { value: 1.0 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uExposure;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uFade;
    varying vec2 vUv;

    float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    vec3 aces(vec3 x){
      const float a=2.51,b=.03,c=2.43,d=.59,e=.14;
      return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);
    }
    vec3 srgb(vec3 c){
      return mix(c*12.92, 1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055, step(vec3(.0031308),c));
    }
    void main(){
      vec2 u = vUv;
      vec2 cc = u - .5;
      float r2 = dot(cc,cc);
      vec2 duv = u + cc*r2*.026;
      float ab = .00055 + r2*.0015;
      vec2 dir = normalize(cc + vec2(.00001));
      vec3 col;
      col.r = texture2D(tDiffuse, duv + dir*ab).r;
      col.g = texture2D(tDiffuse, duv).g;
      col.b = texture2D(tDiffuse, duv - dir*ab).b;

      col *= uExposure;
      float luma = dot(col, vec3(.2126,.7152,.0722));
      col += vec3(-.003,.005,.008) * (1.0-smoothstep(0.0,.26,luma));
      col *= mix(vec3(1.0), vec3(1.035,1.01,.965), smoothstep(.4,1.2,luma));
      col = aces(col);
      col = mix(vec3(dot(col,vec3(.2126,.7152,.0722))), col, uSaturation);
      col = clamp((col)*uContrast,0.0,1.0);
      col = srgb(col);
      float g = hash21(gl_FragCoord.xy + uTime*173.17) - .5;
      float g2 = hash21(gl_FragCoord.xy*1.37 + uTime*37.7) - .5;
      col += (g+g2*.5) * uGrain * (1.0-.4*dot(col,vec3(.333)));
      float vig = smoothstep(.82,.18,length(cc*vec2(1.0,.9)));
      col *= mix(1.0-uVignette, 1.0, vig);
      col += vec3(.01,.025,.04) * smoothstep(.3,.75,length(cc)) * .18;
      col *= uFade;
      gl_FragColor = vec4(col,1.0);
    }
  `
};

class RaysPass extends Pass {
  constructor(width,height) {
    super();
    this.material = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(SunRaysShader.uniforms), vertexShader: SunRaysShader.vertexShader, fragmentShader: SunRaysShader.fragmentShader });
    this.fsQuad = new FullScreenQuad(this.material);
    this.uniforms = this.material.uniforms;
  }
  setSize(w,h){ this.uniforms.uAspect.value = w/h; }
  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    if (this.renderToScreen) { renderer.setRenderTarget(null); this.fsQuad.render(renderer); }
    else { renderer.setRenderTarget(writeBuffer); if (this.clear) renderer.clear(); this.fsQuad.render(renderer); }
  }
}

export function createPost(renderer, scene, camera, options = {}) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: options.msaa ?? 2,
    colorSpace: THREE.NoColorSpace
  });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(window.innerWidth, window.innerHeight);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Ambient occlusion is opt-in: it is the cheapest way to make the new
  // window reveals and cornice profiles read as depth rather than decals.
  const gtao = new GTAOPass(scene, camera, Math.floor(size.x * .55), Math.floor(size.y * .55));
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = .5;
  gtao.updateGtaoMaterial({ radius: .75, distanceExponent: 1.2, thickness: .9, scale: 1.0, samples: 16, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  gtao.enabled = false;
  // GTAOPass re-renders the scene with an override material. The planar mirror
  // has an onBeforeRender hook, so leaving it visible would recursively render
  // the reflection inside the AO pass (and blank the frame). Hide it for the pass.
  const mirror = scene.getObjectByName('water-mirror');
  if (mirror) {
    const renderAO = gtao.render.bind(gtao);
    gtao.render = function (renderer, writeBuffer, readBuffer) {
      const visible = mirror.visible;
      mirror.visible = false;
      try { renderAO(renderer, writeBuffer, readBuffer); }
      finally { mirror.visible = visible; }
    };
  }
  composer.addPass(gtao);

  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), options.bloom ?? .22, .45, 1.04);
  composer.addPass(bloom);
  const rays = new RaysPass(window.innerWidth, window.innerHeight);
  composer.addPass(rays);
  // Depth of field is photo-only: it renders a depth prepass, so there is no
  // reason to pay for it while walking.
  const bokeh = new BokehPass(scene, camera, { focus: 18, aperture: .00012, maxblur: .0042 });
  bokeh.enabled = false;
  if (mirror) {
    const renderBokeh = bokeh.render.bind(bokeh);
    bokeh.render = function (renderer, writeBuffer, readBuffer) {
      const visible = mirror.visible;
      mirror.visible = false;
      try { renderBokeh(renderer, writeBuffer, readBuffer); }
      finally { mirror.visible = visible; }
    };
  }
  composer.addPass(bokeh);
  const final = new ShaderPass(new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(FinalShader.uniforms), vertexShader: FinalShader.vertexShader, fragmentShader: FinalShader.fragmentShader }));
  final.renderToScreen = true;
  composer.addPass(final);

  const tmp = new THREE.Vector3();
  function update(t, sunDir) {
    tmp.copy(sunDir).multiplyScalar(700).add(camera.position);
    tmp.project(camera);
    const sx = tmp.x*.5+.5, sy = tmp.y*.5+.5;
    rays.uniforms.uSun.value.set(sx,sy);
    const inFront = tmp.z < 1 && sx > -.2 && sx < 1.2 && sy > -.2 && sy < 1.2;
    rays.uniforms.uIntensity.value = inFront ? .20 : 0;
    rays.uniforms.uTime.value = t;
    final.uniforms.uTime.value = t;
    final.uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
  }
  function resize(w,h) {
    // composer.setSize already forwards effective (pixel-ratio scaled) sizes to every pass
    composer.setSize(w,h);
    rays.setSize(w,h);
    final.uniforms.uResolution.value.set(w*renderer.getPixelRatio(), h*renderer.getPixelRatio());
  }
  function setQuality(q) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(window.innerWidth, window.innerHeight);
    bloom.strength = q.bloom;
    gtao.enabled = !!q.ao;
    if (q.ao) gtao.blendIntensity = q.aoIntensity ?? .5;
    bokeh.enabled = !!q.dof;
  }
  function setFocus(d) {
    bokeh.uniforms.focus.value = d;
  }
  return { composer, bloom, rays, final, renderPass, gtao, bokeh, update, resize, setQuality, setFocus };
}