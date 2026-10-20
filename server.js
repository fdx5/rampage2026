// Minimal static file server for hosting (e.g. Render.com Web Service). No dependencies.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8026;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const PRIVATE = new Set(['server.js', 'package.json', 'tools']);

http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, path.normalize(rel));
  const top = path.relative(ROOT, file).split(path.sep)[0];
  if (!file.startsWith(ROOT) || top.startsWith('.') || PRIVATE.has(top)) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html') {
      const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];
      const origin = process.env.PUBLIC_URL || `${proto}://${req.headers.host}`;
      const html = fs.readFileSync(file, 'utf8')
        .replace(/(property="og:(?:url|image)"|name="twitter:image") content="\/([^"]*)"/g, (m, attr, rest) => `${attr} content="${origin}/${rest}"`);
      res.writeHead(200, { 'Content-Type': TYPES[ext], 'Cache-Control': 'no-cache' });
      return res.end(html);
    }
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, () => console.log(`RAMPAGE 2026 on http://localhost:${PORT}`));
