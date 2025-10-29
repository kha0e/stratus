/*
 * Lightweight HTTP server for the STRATUS demo. This implementation
 * avoids external dependencies such as Express or CORS by using
 * Node's built‑in modules. It exposes API endpoints for scenes,
 * presets and telemetry and serves static files from a `public`
 * directory when present. Cross‑origin requests are allowed via
 * CORS headers.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Hard‑coded scenes with presets. These match the definitions used by
// the client. In a full implementation this data could be stored
// externally and loaded at runtime.
const scenes = [
  {
    id: 'coast',
    name: 'Côte luminescente',
    presets: {
      weather: ['clair', 'couvert', 'orageux'],
      time: ['aube', 'midi', 'golden hour', 'nuit'],
    },
  },
  {
    id: 'alps',
    name: 'Alpes d’ardoise',
    presets: {
      weather: ['clair', 'neige', 'brumeux'],
      time: ['aube', 'midi', 'golden hour', 'nuit'],
    },
  },
  {
    id: 'desert',
    name: 'Désert mirage',
    presets: {
      weather: ['clair', 'chaleur', 'orageux'],
      time: ['aube', 'midi', 'golden hour', 'nuit'],
    },
  },
];

// Directory containing static assets. When using the provided
// Dockerfile the compiled client is copied into `public/`. If the
// directory does not exist, static file serving will simply fall
// through and the API will function as normal.
const publicDir = path.join(__dirname, 'public');

// Helper to send JSON responses
function sendJSON(res, status, data) {
  const json = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(json);
}

// Helper to serve static files. Falls back to index.html if the file
// does not exist and index.html exists. Returns true if handled.
function serveStatic(reqPath, res) {
  // Prevent directory traversal by normalising the path
  const safePath = path.normalize(reqPath).replace(/^\.+/, '');
  const filePath = path.join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    return false;
  }
  let fileToServe = filePath;
  if (fs.existsSync(fileToServe) && fs.statSync(fileToServe).isFile()) {
    const ext = path.extname(fileToServe).toLowerCase();
    const mimeMap = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.mjs': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
    };
    const mime = mimeMap[ext] || 'application/octet-stream';
    try {
      const data = fs.readFileSync(fileToServe);
      res.writeHead(200, {
        'Content-Type': mime,
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
      return true;
    } catch (err) {
      return false;
    }
  }
  // If requested file doesn't exist, fall back to index.html
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    try {
      const data = fs.readFileSync(indexPath);
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
      return true;
    } catch (err) {
      return false;
    }
  }
  return false;
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // API endpoints
  if (method === 'GET' && pathname === '/api/scenes') {
    const list = scenes.map(({ id, name }) => ({ id, name }));
    sendJSON(res, 200, list);
    return;
  }
  if (method === 'GET' && pathname === '/api/presets') {
    const sceneId = parsed.query.scene;
    const scene = scenes.find((s) => s.id === sceneId);
    if (!scene) {
      sendJSON(res, 404, { error: 'Scene not found' });
      return;
    }
    sendJSON(res, 200, scene.presets);
    return;
  }
  if (method === 'POST' && pathname === '/api/telemetry') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('Telemetry event:', data);
        sendJSON(res, 200, { status: 'ok' });
      } catch (err) {
        sendJSON(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }
  // Serve static files for GET requests
  if (method === 'GET') {
    const served = serveStatic(pathname === '/' ? '/index.html' : pathname, res);
    if (!served) {
      sendJSON(res, 404, { error: 'Not found' });
    }
    return;
  }
  // If none matched
  sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`STRATUS API server listening on port ${PORT}`);
});
