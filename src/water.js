import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

// A single planar mirror drives both the sunlit water rill and the damp sheen
// over the boulevard.  The shader masks it into a narrow canal + circular
// plaza pool, leaving the rest of the paving mostly matte.
const WaterShader = {
  name: 'SugarlineWater',
  uniforms: {
    color: { value: new THREE.Color('#22bcc7') },
    tDiffuse: { value: null },
    textureMatrix: { value: new THREE.Matrix4() },
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(-0.48, 0.72, -0.5).normalize() },
    uWaterLevel: { value: 0.015 }
  },
  vertexShader: `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    varying vec3 vNormalW;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorld = worldPosition.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vUv = textureMatrix * worldPosition;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec3 uSunDir;
    varying vec4 vUv;
    varying vec3 vWorld;
    varying vec3 vNormalW;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise21(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f*f*(3.0-2.0*f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0,0.0));
      float c = hash21(i + vec2(0.0,1.0));
      float d = hash21(i + vec2(1.0,1.0));
      return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = .52;
      mat2 rot = mat2(.8,.6,-.6,.8);
      for (int i=0;i<4;i++) { v += a*noise21(p); p = rot*p*2.03 + 11.7; a *= .48; }
      return v;
    }

    void main() {
      float x = vWorld.x;
      float z = vWorld.z;
      vec2 p = vWorld.xz;

      // long, narrow water channel running under the avenue
      float strip = smoothstep(1.36, 1.18, abs(x));
      strip *= smoothstep(16.0, 10.0, z) * smoothstep(-86.0, -78.0, z);
      // circular pool in the terminating plaza
      float plaza = smoothstep(8.4, 7.85, length(p - vec2(0.0, -72.0)));

      float waterMask = max(strip, plaza);
      float edge = smoothstep(1.28,1.18,abs(x)) - smoothstep(1.18,1.06,abs(x));
      edge *= step(0.0, strip) * smoothstep(14.0, 8.0, z);

      // irregular damp patches on the road
      float wet = fbm(p * .28 + vec2(3.2, 8.1));
      wet = smoothstep(.46, .68, wet) * (1.0 - strip) * (1.0 - plaza);
      float puddle = smoothstep(.66,.82, fbm(p*1.15 + 7.0)) * .18;

      vec2 ripple = vec2(
        noise21(p * 1.55 + vec2(uTime*.06, 0.0)),
        noise21(p * 1.8 - vec2(0.0, uTime*.08))
      ) - .5;
      ripple *= .010 + .012 * plaza;

      vec2 uv = vUv.xy / max(vUv.w, 0.001);
      uv += ripple;

      // cheap soft reflection blur: distant detail diffuses more at glancing angles
      vec3 refl = texture2D(tDiffuse, uv).rgb * .45;
      refl += texture2D(tDiffuse, uv + vec2(.0018,0.0)).rgb * .12;
      refl += texture2D(tDiffuse, uv - vec2(.0018,0.0)).rgb * .12;
      refl += texture2D(tDiffuse, uv + vec2(0.0,.0018)).rgb * .12;
      refl += texture2D(tDiffuse, uv - vec2(0.0,.0018)).rgb * .12;
      refl *= .52;

      vec3 V = normalize(cameraPosition - vWorld);
      float fresnel = pow(1.0 - clamp(dot(V, normalize(vNormalW)), 0.0, 1.0), 3.0);
      float alpha = waterMask * (.76 + .2 * fresnel);
      alpha += wet * (.095 + .22 * fresnel) + puddle * fresnel * .9;
      alpha = clamp(alpha, 0.0, .93);

      // water tint, shallow sandstone bed hint, and a warm sun path
      vec3 deep = mix(color * .30, color * .78, fresnel);
      vec3 col = mix(refl, deep, waterMask * (.58 - fresnel*.16));
      col = mix(col, vec3(.025,.49,.53), plaza * .22);
      col += vec3(.012,.035,.038) * waterMask;

      vec3 H = normalize(uSunDir + V);
      float glint = pow(max(dot(normalize(vNormalW), H), 0.0), 220.0);
      col += vec3(1.0,.86,.56) * glint * (waterMask*.18 + wet*.06);
      float sparkle = pow(max(0.0, noise21(p*42.0 + uTime*.4) - .94), 3.0) * 4.0;
      col += vec3(.9,.98,1.) * sparkle * (waterMask + wet*.3);

      // foam lip on both edges of the rill
      col = mix(col, vec3(.82,.97,.96), edge*.09);

      float dist = length(cameraPosition - vWorld);
      alpha *= smoothstep(155.0, 60.0, dist);
      if (alpha < .012) discard;
      gl_FragColor = vec4(col, alpha);
    }
  `
};

export function createWaterMirror(renderer) {
  const maxTex = Math.min(1024, Math.max(640, Math.floor(window.innerWidth * .62)));
  const geo = new THREE.PlaneGeometry(22, 150, 1, 1);
  const mirror = new Reflector(geo, {
    clipBias: 0.003,
    textureWidth: maxTex,
    textureHeight: Math.floor(maxTex * .56),
    color: 0x86dfe4,
    multisample: 0,
    shader: WaterShader
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(0, 0.062, -34);
  mirror.material.transparent = true;
  mirror.material.depthWrite = false;
  mirror.material.toneMapped = false;
  mirror.renderOrder = 4;
  mirror.userData.noMerge = true;
  mirror.name = 'water-mirror';
  const originalBefore = mirror.onBeforeRender;
  mirror._reflectionFrame = 0;
  mirror._hasReflection = false;
  mirror.onBeforeRender = function (renderer, scene, camera) {
    this._reflectionFrame++;
    if (this._hasReflection && (this._reflectionFrame % 2 !== 0)) return;
    originalBefore.call(this, renderer, scene, camera);
    this._hasReflection = true;
  };

  const baseMat = new THREE.MeshPhysicalMaterial({
    color: '#2f9fa5', roughness: .13, metalness: .05, transparent: true, opacity: .32,
    clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.0, depthWrite: false
  });

  function update(t) {
    mirror.material.uniforms.uTime.value = t;
  }
  function resize() {
    const s = Math.min(1024, Math.max(640, Math.floor(window.innerWidth * .62)));
    mirror.getRenderTarget().setSize(s, Math.floor(s * .56));
  }

  return { mirror, baseMat, update, resize };
}