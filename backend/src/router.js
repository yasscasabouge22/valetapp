import { URL } from 'url';
import { authRoutes }    from './routes/auth.js';
import { missionRoutes } from './routes/missions.js';
import { eventRoutes }   from './routes/events.js';

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

export async function handleRequest(req, res) {
  const url   = new URL(req.url, 'http://localhost');
  const path  = url.pathname;
  const method = req.method;
  const query = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });

  let body = {};
  if (!['GET','HEAD','OPTIONS'].includes(method)) body = await parseBody(req);

  res.json = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const ctx = { req, res, path, method, query, body, url };

  for (const handler of [authRoutes, missionRoutes, eventRoutes]) {
    if (await handler(ctx)) return;
  }

  res.json({ error: 'Not found', path }, 404);
}
