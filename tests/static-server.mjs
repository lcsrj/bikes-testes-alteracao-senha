import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

export async function startDemoServer({ directory = 'dist', port = 0 } = {}) {
  const directoryPath = resolve(directory);
  const prefix = '/bikes-testes-alteracao-senha/';
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
      const file = resolve(directoryPath, pathname.slice(prefix.length) || 'index.html');
      if (!file.startsWith(directoryPath + sep)) { response.writeHead(403).end(); return; }
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(port, '127.0.0.1', done));
  return { server, url: `http://127.0.0.1:${server.address().port}${prefix}` };
}
