# MARWLE

**by DeepSeek-V4.1-flash 🐳**

**1 scene · 100% procedural**

[**Live preview**](https://cl0ud-99.github.io/marwle/) — runs in the browser, nothing to install.

A playable candy-city street: one long boulevard, a mirrored water lane, a fountain court and a painted sunset. Built in Three.js, but every building, sign, cloud, prop and sound in the scene is generated from code at load time. No model files, no imported HDRIs, no external audio.

![hero](docs/shots/hero.jpg)

## Views

| | |
|---|---|
| ![title](docs/shots/title.jpg) | ![explore](docs/shots/explore.jpg) |
| ![fountain](docs/shots/fountain.jpg) | ![water](docs/shots/water.jpg) |

## What it is

A one-scene interactive world preview with a small cinematic shell around it. Walk the avenue, switch to the auto camera, or jump between five composed shots.

| Path | Role |
| --- | --- |
| `src/main.js` | renderer, camera modes, input, UI wiring, post |
| `src/city.js` | boulevard assembly, ground, water lane, props, animation |
| `src/architecture.js` | Fizz Dome, Dream Tower, Marwle Hall, Sun Palace, generic buildings |
| `src/props.js` | lamps, trees, cars, pedestrians, fountain, candy cart, clouds |
| `src/water.js` | planar reflection + wet-pavement shader |
| `src/materials.js` | PBR materials, procedural facade patterns, sign canvases |
| `src/sky.js` | 4096×2048 equirect sky, cumulus, PMREM environment |
| `src/post.js` | HDR composer, bloom, sun scattering, ACES grade |
| `src/audio.js` | procedural Web Audio ambience |
| `site/` | built static site deployed to GitHub Pages |

## Render pipeline

A conventional forward renderer, but tuned around three things: reflections, baked shadows and a soft print-like finish.

```
4096 × 2048 procedural sky ──> PMREM environment ──> PBR specular / IBL
             │
             └──> scene background

static city (≈2.5M tris)
   ├──> 4096² sun shadow map, baked once
   ├──> planar reflection RT (every other frame, 1024×573)
   └──> HDR scene RT (2× MSAA)

HDR scene
   ├──> bloom
   ├──> radial sun rays
   └──> composite: lens distortion, chromatic fringe,
        ACES, split-tone grade, vignette, film grain, sRGB
```

Details worth reading:

- **The shadow map is baked once.** The architecture is static, so the 4096² shadow map is rendered during the first frame and then frozen. Walk, fly or cut camera — the sun does not move.
- **Planar reflections are throttled.** The mirror camera renders the full boulevard only every second frame at 1024×573. At walking pace the half-frame lag is invisible; it buys back a large slice of frame time.
- **Reflection is masked, not global.** One mirror RT drives both the water lane and the plaza pool, plus the damp road sheen. The shader masks by world position so asphalt stays matte and the canal reads as wet.
- **The whole static city is merged by material.** Hundreds of authored meshes collapse into roughly fifty draw calls; the remaining draw calls are moving characters, sprites, signs and transparent glass.
- **Windows are the primary texture.** Most facade rhythm comes from real inset frames, sills, flower boxes, awnings, cornices and gold trim rather than baked normal maps. This keeps silhouettes readable from every angle at street level.

## Audio

Synthesised in the browser — no samples:

- a slow, filtered major-seventh pad;
- brown-noise air and water layers with independent LFOs;
- randomly panned pentatonic glass chimes with synthesized delay;
- triggered only after the first click, as browsers require.

## Running it

```bash
npm install
node build.mjs --site
node serve.mjs
# open http://127.0.0.1:4173/
```

For a single offline file:

```bash
node build.mjs --single
# dist/MARWLE-Sugarline-District.html
```

No server is needed for the single file; every image, font and audio graph is embedded or synthesised.

## Controls

| Input | Action |
| --- | --- |
| Enter / click button | Start first-person walk |
| Mouse drag | Look around |
| W A S D / arrows | Walk |
| Shift | Run |
| C | Cinematic camera |
| P | Photo mode (hide HUD; press again to return) |
| 1 – 5 | Composed camera presets |
| H | Hide interface |
| Sound button | Toggle procedural ambience |

## URL parameters

| Parameter | Effect |
| --- | --- |
| `?ui=0` | Hide all overlays for clean captures |
| `?shot=hero` | Start on a fixed composed camera |
| `shot=fountain,water,sign,street,skyline` | Other composed cameras |
| `freeze=1&t=10` | Freeze the world clock at a chosen time |
| `?quality=low` | Lower device pixel ratio |
| `?cinema=1` | Start straight into the cinematic camera |

Screenshots shown here were captured with `?shot=…&ui=0&freeze=1&t=10`.

## Deployment

The **Deploy to GitHub Pages** workflow runs on every push to `main`, uploads `site/` and publishes it via GitHub Pages. There is no build step on the runner; the committed `site/` is the exact playable artifact, so a page that cannot load is caught before pushing.

The app uses relative paths and works both at a domain root and under the `/marwle/` sub-path used by Pages.

## Notes on the look

The scene is deliberately mid-century picture-book rather than photoreal: chunky rounded volumes, saturated sugar colours and cream trim, with one long golden-hour shadow giving weight. The palette keeps coral, teal, butter yellow and cobalt in a narrow family so the street can be busy without becoming noise.

Water is pushed toward turquoise and sky-reflective, while the asphalt stays a chalky warm grey. The strongest light is behind the viewer, so facades facing the street stay luminous and the cast shadows fall toward the fountain.

All building layouts and prop placement use seeded randomness, so the street looks organic but reloads identically every time.

## Screenshots

The full 1920×1080 captures are in `docs/shots/`. The uncompressed UI screenshots and offline build live under `shots/` and `dist/` in the working tree.

## Credits

- Three.js — MIT.
- esbuild — MIT.
- Poly Haven textures — CC0: `asphalt_02`, `concrete_pavers_03`, `painted_plaster_wall`, `marble_tiles`.
- Bungee and Outfit — SIL OFL.
- Everything else — original procedural scene, shaders, geometry, UI and audio.

MARWLE is a fictional brand.  
Made as a real-time playable world preview.
