// Server-Sent Events — un canal par userId (valet) ou qrId (client)
const clients = new Map(); // clientKey → { res, heartbeat }

export function registerSSE(req, res, key) {
  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch { clearInterval(hb); } }, 25000);

  // Si ce client est déjà connecté, fermer l'ancienne connexion
  if (clients.has(key)) {
    try { clients.get(key).res.end(); } catch {}
    clearInterval(clients.get(key).heartbeat);
  }

  clients.set(key, { res, heartbeat: hb });
  send(key, 'connected', { key });

  req.on('close', () => {
    clearInterval(hb);
    clients.delete(key);
  });
}

export function send(key, event, data) {
  const c = clients.get(key);
  if (!c) return false;
  try {
    c.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch {
    clients.delete(key);
    return false;
  }
}

// Envoie à TOUS les valets connectés
export function broadcast(event, data) {
  let sent = 0;
  for (const [key, c] of clients) {
    // Les clés valets sont des userIds (pas des QR-xxx)
    if (!key.startsWith('QR-')) {
      try { c.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); sent++; } catch {}
    }
  }
  return sent;
}

export function connectedKeys() { return [...clients.keys()]; }
