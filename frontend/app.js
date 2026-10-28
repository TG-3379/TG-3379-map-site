// ---------- 즐겨찾기 (8단계 전까지는 가짜 예시) ----------
const SAMPLE_FAVORITES = [
  { name: '한옥마을 비빔밥집', sub: '전주 · 예시', thumb: 't1', tag: '맛집', tagClass: 'food' },
  { name: '남부시장 피순대', sub: '전주 · 예시', thumb: 't4', tag: '맛집', tagClass: 'food' },
  { name: '경기전', sub: '전주 · 예시', thumb: 't2', tag: '관광지', tagClass: '' },
];

function renderFavorites() {
  document.getElementById('favorites-list').innerHTML = SAMPLE_FAVORITES.map((i) => `
    <div class="place">
      <div class="thumb ${i.thumb}"></div>
      <div class="info">
        <span class="tag ${i.tagClass}">${i.tag}</span>
        <b>${i.name}</b>
        <small>${i.sub}</small>
      </div>
    </div>`).join('');
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

// ---------- 장소 상세 (임시: 6단계에서 완성) ----------
function renderPlaceStub(p) {
  document.getElementById('place-body').innerHTML = `
    <span class="tag ${p.type === 'spot' ? '' : p.type === 'food' ? 'food' : 'fest'}">${TYPE_LABEL[p.type] || ''}</span>
    <h1 class="greeting">${esc(p.name)}</h1>
    <p>${esc(p.address)}</p>
    <p class="hint">${fmtDistance(p.distance) ? `기준 위치에서 ${fmtDistance(p.distance)}` : ''}</p>
    <div class="notice-line">자세한 정보(사진, 전화, 길찾기)는 6단계에서 이 화면에 들어옵니다.</div>`;
}

document.getElementById('place-back').addEventListener('click', () => {
  if (history.length > 1) history.back();
  else location.hash = '#home';
});

// ---------- 화면 전환: 주소 끝의 #home, #map, #place/번호 에 맞춰 바꿉니다 ----------
const PAGES = ['home', 'map', 'favorites', 'me', 'place'];

function showPage() {
  const hash = decodeURIComponent(location.hash.slice(1));
  let current = PAGES.includes(hash) ? hash : 'home';

  if (hash.startsWith('place/')) {
    const place = PlaceStore.get(hash.slice(6));
    if (place) {
      current = 'place';
      renderPlaceStub(place);
    } else {
      // 새로고침 등으로 장소 정보가 사라졌으면 홈으로 돌아갑니다.
      location.replace('#home');
      return;
    }
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
  if (current === 'map' && window.onMapShown) window.onMapShown();
}

renderFavorites();
loadHome();
window.addEventListener('hashchange', showPage);
showPage();
