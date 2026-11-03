import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile, rm, readdir } from 'node:fs/promises';

const single = process.argv.includes('--single');
const makeSite = process.argv.includes('--site');

const shared = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  sourcemap: false,
  target: ['chrome100', 'safari15.4', 'firefox100'],
  legalComments: 'none',
  logLevel: 'info'
};

// The dev / offline bundle: every texture, font and image is inlined as a data URL.
await build({
  ...shared,
  outfile: 'app.js',
  loader: { '.jpg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl', '.woff2': 'dataurl' }
});
console.log('app.js built (inlined assets)');

if (makeSite) {
  // GitHub Pages bundle: assets stay as separate, cacheable files, so the
  // initial script drops from ~5 MB to a few hundred KB and images download
  // in parallel. Relative URLs keep it working under a /marwle/ sub-path.
  await rm('site/assets', { recursive: true, force: true });
  await build({
    ...shared,
    outfile: 'site/app.js',
    publicPath: './',
    assetNames: 'assets/[name]-[hash]',
    loader: { '.jpg': 'file', '.png': 'file', '.webp': 'file', '.woff2': 'file' }
  });
  await mkdir('site', { recursive: true });
  for (const f of ['index.html', 'style.css']) await copyFile(f, 'site/' + f);
  const assets = await readdir('site/assets').catch(() => []);
  console.log('site/ ready for GitHub Pages (' + assets.length + ' external assets)');
}

if (single) {
  const js = await readFile('app.js', 'utf8');
  const css = await readFile('style.css', 'utf8');
  let html = await readFile('index.html', 'utf8');
  html = html.replace('<link rel="stylesheet" href="./style.css" />', () => '<style>\n' + css + '\n</style>');
  html = html.replace('<script src="./app.js"></script>', () => '<script>\n' + js + '\n</script>');
  await mkdir('dist', { recursive: true });
  await writeFile('dist/MARWLE-Sugarline-District.html', html);
  console.log('single-file demo written to dist/MARWLE-Sugarline-District.html');
}
