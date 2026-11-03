// Central quality presets. Boot-time values (detail, MSAA) are chosen from the
// preset once; runtime values (DPR, shadow map, reflection, AO, bloom) can be
// switched when the camera mode changes, e.g. entering photo mode.
export const PRESETS = {
  draft: {
    dpr: .85, shadowMap: 1024, msaa: 0,
    reflectionScale: .7, reflectEvery: 4,
    bloom: .18, ao: false, aoIntensity: 0,
  },
  standard: {
    dpr: 1.35, shadowMap: 3072, msaa: 2,
    reflectionScale: 1, reflectEvery: 3,
    bloom: .22, ao: false, aoIntensity: 0,
  },
  cinematic: {
    dpr: 1.5, shadowMap: 4096, msaa: 4,
    reflectionScale: 1.25, reflectEvery: 2,
    bloom: .24, ao: true, aoIntensity: .55,
  },
  photo: {
    dpr: 1.75, shadowMap: 4096, msaa: 4,
    reflectionScale: 1.5, reflectEvery: 1,
    bloom: .24, ao: true, aoIntensity: .7,
  },
};

export const QUALITY = { name: 'standard', ...PRESETS.standard };

export function resolveQuality(params) {
  const q = params.get('quality');
  if (q === 'low') return 'draft';
  if (q === 'cinematic') return 'cinematic';
  if (q === 'photo') return 'photo';
  return 'standard';
}

export function setQuality(name) {
  const preset = PRESETS[name] ? name : 'standard';
  Object.assign(QUALITY, PRESETS[preset], { name: preset });
  return QUALITY;
}
