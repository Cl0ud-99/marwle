import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.jpg':'image/jpeg', '.png':'image/png', '.woff2':'font/woff2' };
createServer(async (req,res)=>{
  try {
    let p = decodeURIComponent((req.url||'/').split('?')[0]);
    if (p === '/' || p === '') p = '/index.html';
    const file = normalize(join(process.cwd(), p));
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache'});
    res.end(data);
  } catch(e) { res.writeHead(404); res.end('not found'); }
}).listen(port, '127.0.0.1', ()=>console.log('http://127.0.0.1:' + port));
