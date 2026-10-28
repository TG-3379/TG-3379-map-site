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

// 관광공사 글에 섞여 있는 HTML(<br> 등)을 보통 글자로 바꿉니다.
function plain(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 홈페이지 칸에는 <a href="..."> 형태로 들어 있어서 주소만 꺼냅니다. http(s)만 허용합니다.
function homepageUrl(html) {
  const m = /href=["']([^"']+)["']/i.exec(String(html || ''));
  return m && /^https?:\/\//i.test(m[1]) ? m[1] : null;
}

// 02-123-4567, 031-123-4567, 1588-1234 모양의 전화번호 중 첫 번째
function firstPhone(text) {
  const m = /0\d{1,2}-\d{3,4}-\d{4}|1\d{3}-\d{4}/.exec(String(text || ''));
  return m ? m[0] : null;
}

function fmtDate(d) {
  return d ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}` : '';
}

// 종류별로 상세 화면에 보여줄 줄(이름: 내용)을 만듭니다. 비어 있는 줄은 뺍니다.
function infoRows(type, i) {
  let rows;
  if (type === 'food') {
    rows = [['영업시간', i.opentimefood], ['쉬는 날', i.restdatefood], ['대표 메뉴', i.firstmenu],
      ['주차', i.parkingfood], ['문의', i.infocenterfood]];
  } else if (type === 'festival') {
    const period = i.eventstartdate ? `${fmtDate(i.eventstartdate)} ~ ${fmtDate(i.eventenddate)}` : '';
    rows = [['기간', period], ['시간', i.playtime], ['장소', i.eventplace],
      ['요금', i.usetimefestival], ['문의', i.sponsor1tel]];
  } else {
    rows = [['이용시간', i.usetime], ['쉬는 날', i.restdate], ['주차', i.parking], ['문의', i.infocenter]];
  }
  return rows.map(([label, v]) => ({ label, value: plain(v) })).filter((r) => r.value);
}

const PHOTO_LICENSE = { Type1: '공공누리 제1유형', Type3: '공공누리 제3유형' };

// 상세: 관광공사 장소 번호(id)로 조회 (기본 정보 + 영업시간 등 소개 정보)
async function detail(q) {
  const id = String(q.id || '');
  if (!/^\d{1,12}$/.test(id)) throw fail('BAD_REQUEST', 400);

  const key = `d:${id}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rows = await tour.call('detailCommon2', { contentId: id });
  if (!rows.length) throw fail('NOT_FOUND', 404);
  const it = rows[0];
  const base = tour.normalize(it);

  // 소개 정보(영업시간 등)가 실패해도 기본 정보는 보여줍니다. 단, 호출 한도 오류는 그대로 알립니다.
  let intro = {};
  let introOk = true;
  try {
    const r = await tour.call('detailIntro2', { contentId: id, contentTypeId: String(it.contenttypeid) });
    intro = r[0] || {};
  } catch (e) {
    if (e.code === 'LIMIT') throw e;
    introOk = false;
  }

  const info = infoRows(base.type, intro);
  // 전화 칸에 글자가 섞여 있어도 첫 번째 전화번호만 꺼냅니다. 비어 있으면 "문의" 줄에서 찾아봅니다.
  const contact = (info.find((r) => r.label === '문의') || {}).value || '';
  const phone = firstPhone(base.phone) || firstPhone(contact);

  const out = {
    ...base,
    phone,
    homepage: homepageUrl(it.homepage),
    overview: plain(it.overview) || null,
    info,
    photoLicense: PHOTO_LICENSE[it.cpyrhtDivCd] || null,
  };
  cache.set(key, out, (introOk ? 6 * 60 : 10) * MIN);
  return out;
}

module.exports = { nearby, search, detail };
