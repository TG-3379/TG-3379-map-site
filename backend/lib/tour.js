// 한국관광공사 Tour API (국문 관광정보 서비스) 호출
const { fail } = require('./errors');
const usage = require('./usage');
const { fetchJson } = require('./upstream');

const BASE = 'https://apis.data.go.kr/B551011/KorService2';

// 화면에서 쓰는 종류 이름 <-> 관광공사 콘텐츠 타입 번호
const TYPE_ID = { spot: 12, food: 39, festival: 15 };
const TYPE_NAME = { 12: 'spot', 39: 'food', 15: 'festival' };

async function call(operation, params) {
  const key = process.env.TOUR_API_KEY;
  if (!key) throw fail('NO_KEY', 500);
  usage.use('tour');

  const qs = new URLSearchParams({
    serviceKey: key,
    MobileOS: 'ETC',
    MobileApp: 'map-site',
    _type: 'json',
    ...params,
  });
  const json = await fetchJson(`${BASE}/${operation}?${qs}`);

  const header = json && json.response && json.response.header;
  if (!header || header.resultCode !== '0000') {
    if (header && /LIMIT|EXCEED/i.test(String(header.resultMsg))) throw fail('LIMIT', 429);
    throw fail('UPSTREAM', 502);
  }
  const items = json.response.body.items;
  if (!items || !items.item) return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}

function https(url) {
  return url ? url.replace(/^http:\/\//, 'https://') : null;
}

function normalize(it) {
  return {
    id: String(it.contentid),
    source: 'tour',
    type: TYPE_NAME[it.contenttypeid] || 'spot',
    name: it.title,
    address: [it.addr1, it.addr2].filter(Boolean).join(' '),
    lat: Number(it.mapy) || null,
    lng: Number(it.mapx) || null,
    distance: it.dist ? Math.round(Number(it.dist)) : null,
    image: https(it.firstimage2 || it.firstimage),
    phone: it.tel || null,
    startDate: it.eventstartdate || null,
    endDate: it.eventenddate || null,
  };
}

module.exports = { call, normalize, TYPE_ID };
