// 하루 호출 횟수 카운터. 외부 API를 부를 때마다 1씩 올리고, 상한에 닿으면 호출을 막습니다.
// 숫자만 backend/data/usage.json 에 저장합니다. (서버를 껐다 켜도 이어서 셉니다)
const fs = require('node:fs');
const path = require('node:path');
const { fail } = require('./errors');

const FILE = path.join(__dirname, '..', 'data', 'usage.json');

// 상한은 서비스별 하루 한도보다 조금 낮게 잡아 둡니다. (docs/cost-limits.md 참고)
const LIMITS = {
  tour: 900,   // 한국관광공사 개발계정: 하루 1,000건
  naver: 2000, // 네이버 검색: 공식 한도 25,000건이지만 비용 안전을 위해 낮게
};

// 한국 시간 기준 날짜
function today() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function load() {
  try {
    const u = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (u.date === today()) return u;
  } catch {
    // 파일이 없거나 깨졌으면 새로 시작
  }
  return { date: today(), counts: {} };
}

function save(u) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(u));
}

// 외부 API를 부르기 직전에 호출합니다. 상한이면 오류를 던집니다.
function use(name) {
  const u = load();
  if ((u.counts[name] || 0) >= LIMITS[name]) throw fail('LIMIT', 429);
  u.counts[name] = (u.counts[name] || 0) + 1;
  save(u);
}

function snapshot() {
  const u = load();
  return Object.fromEntries(
    Object.keys(LIMITS).map((k) => [k, { used: u.counts[k] || 0, limit: LIMITS[k] }])
  );
}

module.exports = { use, snapshot };
