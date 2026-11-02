import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

const single = process.argv.includes('--single');
const makeSite = process.argv.includes('--site');

await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  outfile: 'app.js',
  minify: true,
  sourcemap: false,
  target: ['chrome100', 'safari15.4', 'firefox100'],
  legalComments: 'none',
  loader: { '.jpg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl', '.woff2': 'dataurl' },
  logLevel: 'info'
});
console.log('app.js built');

if (makeSite) {
  await mkdir('site', { recursive: true });
  for (const f of ['index.html','style.css','app.js']) await copyFile(f, 'site/' + f);
  console.log('site/ ready for GitHub Pages');
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
