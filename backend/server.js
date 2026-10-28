// 서버 시작: node backend/server.js
// - /api/... 요청은 외부 API(관광공사, 네이버)를 대신 호출해서 결과만 돌려줍니다.
// - 그 밖의 주소는 frontend 폴더의 화면 파일을 보내 줍니다.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  console.warn('.env 파일을 찾지 못했어요. 키가 필요한 기능은 동작하지 않습니다.');
}

const { AppError } = require('./lib/errors');
const usage = require('./lib/usage');
const places = require('./lib/places');

const PORT = Number(process.env.PORT) || 3000;
const FRONTEND = path.join(ROOT, 'frontend');

const ROUTES = {
  '/api/places/nearby': places.nearby,
  '/api/places/search': places.search,
  '/api/places/detail': places.detail,
  '/api/usage': async () => usage.snapshot(),
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function handleApi(url, res) {
  const handler = ROUTES[url.pathname];
  if (!handler) return sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: '없는 주소예요.' });
  try {
    const data = await handler(Object.fromEntries(url.searchParams));
    sendJson(res, 200, { ok: true, data });
  } catch (e) {
    if (e instanceof AppError) {
      return sendJson(res, e.status, { ok: false, code: e.code, message: e.message });
    }
    // 예상 못 한 오류: 자세한 내용은 서버 화면에만 남기고, 사용자에게는 쉬운 말만 보냅니다.
    console.error('서버 오류:', e.message);
    sendJson(res, 500, { ok: false, code: 'UPSTREAM', message: '문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.' });
  }
}

function serveFile(url, res) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(FRONTEND, rel);
  // 화면 폴더 밖의 파일은 보내지 않습니다.
  if (!file.startsWith(FRONTEND + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('페이지를 찾을 수 없어요.');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405);
    return res.end();
  }
  const url = new URL(req.url, 'http://localhost');
  // 로그에는 주소(경로)만 남기고, 위치가 들어 있는 검색 조건은 남기지 않습니다.
  res.on('finish', () => console.log(res.statusCode, url.pathname));
  if (url.pathname.startsWith('/api/')) return handleApi(url, res);
  serveFile(url, res);
});

server.listen(PORT, () => console.log(`서버가 켜졌어요: http://localhost:${PORT}`));
