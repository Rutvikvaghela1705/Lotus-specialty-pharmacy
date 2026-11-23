const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

function serveFileWithRange(req, res, filePath, contentType) {
  const stat = fs.statSync(filePath);
  const totalSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (start >= totalSize || end >= totalSize) {
      res.writeHead(416, {
        'Content-Range': `bytes */${totalSize}`,
        'Access-Control-Allow-Origin': '*'
      });
      return res.end();
    }

    const chunkSize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': totalSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*'
    });

    fs.createReadStream(filePath).pipe(res);
  }
}

function resolveFilePath(reqPath) {
  const ext = path.extname(reqPath).toLowerCase();
  // Only serve static asset files if they have a non-html file extension
  if (ext && ext !== '.html') {
    const candidates = [
      path.join(ROOT_DIR, reqPath),
      path.join(PUBLIC_DIR, reqPath)
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return c;
      }
    }
  }

  // All page routes and html requests ALWAYS serve the single Home page index.html
  return path.join(ROOT_DIR, 'index.html');
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Set default CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Handle analytics mock
  if (pathname.includes('/script') && pathname.includes('events.framer.com')) {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    return res.end('// framer events mock');
  }

  // Find local file or fallback to Home page index.html
  const localFile = resolveFilePath(pathname);

  if (localFile && fs.existsSync(localFile)) {
    const ext = path.extname(localFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'text/html; charset=utf-8';

    if (ext === '.mp4' || ext === '.webm' || ext === '.mp3') {
      return serveFileWithRange(req, res, localFile, contentType);
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*'
    });
    return fs.createReadStream(localFile).pipe(res);
  }

  // Fallback to Home page index.html
  const defaultIndex = path.join(ROOT_DIR, 'index.html');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  fs.createReadStream(defaultIndex).pipe(res);
});

server.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🚀 Lotus Pharmacy Live on http://localhost:${PORT}/`);
  console.log(`📁 Single-page Home App serving from: ${ROOT_DIR}`);
  console.log('==================================================');
});
