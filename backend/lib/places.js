// 장소 기능: 내 주변 / 검색 / 상세. 같은 요청은 캐시에서 바로 돌려줍니다.
const { fail } = require('./errors');
const { createCache } = require('./cache');
const tour = require('./tour');
const naver = require('./naver');

const cache = createCache();
const MIN = 60 * 1000;

function num(v, name, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw fail('BAD_REQUEST', 400);
  return n;
}

// 두 지점 사이 거리(미터)
function distanceM(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(a)));
}

function ymd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// 내 주변: type = food(맛집) | spot(관광지) | festival(이번 주 축제)
async function nearby(q) {
  const lat = num(q.lat, 'lat', 33, 39);
  const lng = num(q.lng, 'lng', 124, 132);
  const type = q.type || 'spot';
  if (!tour.TYPE_ID[type]) throw fail('BAD_REQUEST', 400);
  const radius = Math.round(num(q.radius || 2000, 'radius', 100, 20000));

  // 위치는 소수점 3자리(약 100m)로 뭉쳐서 캐시 키로 씁니다. 같은 동네는 같은 결과를 재사용합니다.
  const key = `n:${lat.toFixed(3)}:${lng.toFixed(3)}:${type}:${radius}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let list;
  if (type === 'festival') {
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
    const weekEnd = ymd(new Date(now.getTime() + 7 * 24 * 3600 * 1000));
    const rows = await tour.call('searchFestival2', {
      eventStartDate: ymd(start),
      numOfRows: '100',
      pageNo: '1',
    });
    const today = ymd(now);
    list = rows
      .map(tour.normalize)
      .filter((p) => p.endDate >= today && p.startDate <= weekEnd)
      .map((p) => ({ ...p, distance: p.lat ? distanceM(lat, lng, p.lat, p.lng) : null }))
      .sort((a, b) => (a.distance ?? 1e12) - (b.distance ?? 1e12))
      .slice(0, 20);
  } else {
    const rows = await tour.call('locationBasedList2', {
      mapX: String(lng),
      mapY: String(lat),
      radius: String(radius),
      contentTypeId: String(tour.TYPE_ID[type]),
      arrange: 'E', // 가까운 순
      numOfRows: '20',
      pageNo: '1',
    });
    list = rows.map(tour.normalize);
  }

  cache.set(key, list, 30 * MIN);
  return list;
}

// 검색: 관광공사 결과(뼈대) + 네이버 지역 검색 결과(최대 5개)
async function search(q) {
  const query = String(q.q || '').trim();
  if (query.length < 1 || query.length > 40) throw fail('BAD_REQUEST', 400);

  const key = `s:${query.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const [tourRes, naverRes] = await Promise.allSettled([
    tour.call('searchKeyword2', { keyword: query, numOfRows: '20', pageNo: '1', arrange: 'A' }),
    naver.searchLocal(query),
  ]);
  if (tourRes.status === 'rejected' && naverRes.status === 'rejected') throw tourRes.reason;

  const out = {
    items: [
      ...(tourRes.status === 'fulfilled' ? tourRes.value.map(tour.normalize) : []),
      ...(naverRes.status === 'fulfilled' ? naverRes.value : []),
    ],
    // 한쪽만 실패했을 때 화면에 보여줄 안내
    notice:
      tourRes.status === 'rejected' || naverRes.status === 'rejected'
        ? '일부 정보만 보여드려요. 잠시 뒤 다시 시도하면 더 많은 결과가 나올 수 있어요.'
        : null,
  };
  if (!out.notice) cache.set(key, out, 10 * MIN);
  return out;
}

// 상세: 관광공사 장소 번호(id)로 조회
async function detail(q) {
  const id = String(q.id || '');
  if (!/^\d{1,12}$/.test(id)) throw fail('BAD_REQUEST', 400);

  const key = `d:${id}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rows = await tour.call('detailCommon2', { contentId: id });
  if (!rows.length) throw fail('NOT_FOUND', 404);
  const it = rows[0];
  const out = {
    ...tour.normalize(it),
    homepage: it.homepage || null,
    overview: it.overview || null,
  };
  cache.set(key, out, 6 * 60 * MIN);
  return out;
}

module.exports = { nearby, search, detail };
