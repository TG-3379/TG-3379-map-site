// ---------- 즐겨찾기: 장소 상세에서 "저장"한 장소 목록 ----------
function renderFavorites() {
  const items = Favorites.list();
  document.getElementById('favorites-list').innerHTML = items.length
    ? items.map(placeCard).join('')
    : statusBox('저장한 장소가 없어요', '장소 상세 화면에서 "저장" 버튼을 누르면 여기에 모여요.');
}

// ---------- 홈: 내 주변 실제 장소 ----------
const HOME_SECTIONS = [
  { type: 'food', title: '내 주변 맛집', note: '2km 이내' },
  { type: 'spot', title: '내 주변 명소', note: '2km 이내' },
  { type: 'festival', title: '이번 주 축제', note: '전국 · 가까운 순' },
];
const HOME_COUNT = 3; // 홈에서는 종류마다 3곳만 보여줍니다.

const $homeCards = document.getElementById('home-cards');
const $homeNotice = document.getElementById('home-notice');

function renderHomeShell() {
  $homeCards.innerHTML = HOME_SECTIONS.map((s) => `
    <div class="section-head">
      <h2>${s.title} <small>${s.note}</small></h2>
      <button class="more" type="button" data-more="${s.type}">지도에서 보기</button>
    </div>
    <div id="home-${s.type}">${loadingHtml()}</div>`).join('');
}

async function loadHomeSection(type) {
  const box = document.getElementById(`home-${type}`);
  box.innerHTML = loadingHtml();
  const pos = await Loc.get();
  const result = await Api.nearby(pos, type);
  if (!result.ok) {
    box.innerHTML = statusBox('불러오지 못했어요', result.message, type);
  } else if (!result.items.length) {
    box.innerHTML = statusBox('가까운 곳에 정보가 없어요', '지도에서 다른 지역을 찾아보세요.');
  } else {
    box.innerHTML = result.items.slice(0, HOME_COUNT).map(placeCard).join('');
  }
}

async function loadHome() {
  renderHomeShell();
  const pos = await Loc.get();
  const text = Loc.notice(pos);
  $homeNotice.textContent = text;
  $homeNotice.hidden = !text;
  HOME_SECTIONS.forEach((s) => loadHomeSection(s.type));
}

$homeCards.addEventListener('click', (e) => {
  const retry = e.target.closest('[data-retry]');
  if (retry) return loadHomeSection(retry.dataset.retry);
  const more = e.target.closest('[data-more]');
  if (more) {
    window.setMapType(more.dataset.more);
    location.hash = '#map';
  }
});

document.getElementById('place-back').addEventListener('click', () => {
  if (history.length > 1) history.back();
  else location.hash = '#home';
});

// ---------- 화면 전환: 주소 끝의 #home, #map, #place/번호 에 맞춰 바꿉니다 ----------
const PAGES = ['home', 'map', 'favorites', 'me', 'place'];

function showPage() {
  const hash = decodeURIComponent(location.hash.slice(1));
  let current = PAGES.includes(hash) ? hash : 'home';

  // #place/번호 : 공유받은 링크로 바로 열어도 서버에서 장소 정보를 불러옵니다.
  if (hash.startsWith('place/')) {
    current = 'place';
    Detail.show(hash.slice(6));
  }

  PAGES.forEach((p) => {
    document.getElementById(p).hidden = p !== current;
  });
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.page === current;
    t.classList.toggle('on', on);
    if (on) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  if (current === 'favorites') renderFavorites();
  if (current === 'map' && window.onMapShown) window.onMapShown();
}

loadHome();
window.addEventListener('hashchange', showPage);
showPage();
