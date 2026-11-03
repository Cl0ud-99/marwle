import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const port = Number(process.env.PORT || 4173);
const root = resolve(process.cwd());
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2' };
createServer(async (req,res)=>{
  try {
    let p = decodeURIComponent((req.url||'/').split('?')[0]);
    if (p === '/' || p === '') p = '/index.html';
    const file = resolve(root, '.' + p);
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end('forbidden'); return; }
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache'});
    res.end(data);
  } catch(e) { res.writeHead(404); res.end('not found'); }
}).listen(port, '127.0.0.1', ()=>console.log('http://127.0.0.1:' + port));
