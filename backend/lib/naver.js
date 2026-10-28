// 네이버 검색(지역) - NAVER API HUB 방식. 한 번에 최대 5개까지만 가져올 수 있습니다.
// 결과는 장기 저장하지 않고, 서버 메모리 캐시(짧게)로만 둡니다.
const { fail } = require('./errors');
const usage = require('./usage');
const { fetchJson } = require('./upstream');

const URL_LOCAL = 'https://naverapihub.apigw.ntruss.com/search/v1/local';

function clean(text) {
  return String(text || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');
}

// 네이버 좌표는 (경도·위도 x 10,000,000) 정수 문자열로 오는 경우가 있어 보정합니다.
function coord(v) {
  const n = Number(v);
  if (!n) return null;
  return Math.abs(n) > 1000 ? n / 1e7 : n;
}

async function searchLocal(query) {
  const id = process.env.NAVER_SEARCH_CLIENT_ID;
  const secret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!id || !secret) throw fail('NO_KEY', 500);
  usage.use('naver');

  const qs = new URLSearchParams({ query, display: '5' });
  const json = await fetchJson(`${URL_LOCAL}?${qs}`, {
    'X-NCP-APIGW-API-KEY-ID': id,
    'X-NCP-APIGW-API-KEY': secret,
  });
  return (json.items || []).map((it, i) => ({
    id: `naver-${i}-${clean(it.title)}`,
    source: 'naver',
    type: /음식|식당|카페|한식|양식|일식|중식|분식|주점|고기|국밥|비빔밥|치킨|베이커리|디저트/.test(it.category || '')
      ? 'food'
      : 'spot',
    name: clean(it.title),
    address: it.roadAddress || it.address || '',
    lat: coord(it.mapy),
    lng: coord(it.mapx),
    distance: null,
    image: null,
    phone: it.telephone || null,
    category: it.category || '',
  }));
}

module.exports = { searchLocal };
