import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleRequest } from './router.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const PORT       = process.env.PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, '../../frontend/dist');

const MIME = {
  '.html':'.html', '.js':'application/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.woff2':'font/woff2',
};

function serveStatic(req, res) {
  let fp = path.join(PUBLIC_DIR, req.url.split('?')[0]);
  if (!path.extname(fp) || !fs.existsSync(fp)) fp = path.join(PUBLIC_DIR, 'index.html');
  try {
    const ext  = path.extname(fp);
    const mime = MIME[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(fs.readFileSync(fp));
  } catch { res.writeHead(404); res.end('Not found'); }
}

const server = http.createServer(async (req, res) => {
// CORS
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url.startsWith('/api/')) {
    try { await handleRequest(req, res); }
    catch (err) {
      console.error('❌ Server error:', err);
      try { res.writeHead(500, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Internal error'})); } catch {}
    }
    return;
  }

  if (fs.existsSync(PUBLIC_DIR)) { serveStatic(req, res); return; }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<html><body style="font-family:sans-serif;padding:2rem">
    <h2>🚗 ValetApp Backend — Port ${PORT}</h2>
    <p>API disponible sur <code>/api/*</code></p>
    <p>Pour le frontend : <code>cd frontend && npm install && npm run dev</code></p>
    <hr>
    <h3>Voituriers de démo</h3>
    <ul><li>+212611223344 (Mohammed Alami)</li><li>+212622334455 (Fatima Zahra)</li><li>+212633445566 (Youssef Bennani)</li></ul>
    <h3>Cartes QR</h3>
    <p>QR-001 à QR-010 — toutes disponibles</p>
  </body></html>`);
});

server.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     🚗  ValetApp Backend  v2.0        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`\n  API  →  http://localhost:${PORT}/api`);
  console.log(`  SSE  →  http://localhost:${PORT}/api/events`);
  console.log('\n  Voituriers :');
  console.log('    Mohammed Alami  → +212611223344');
  console.log('    Fatima Zahra    → +212622334455');
  console.log('    Youssef Bennani → +212633445566');
  console.log('\n  Cartes QR disponibles : QR-001 à QR-010');
  console.log('\n  Ouvrir frontend : cd frontend && npm install && npm run dev\n');
});
