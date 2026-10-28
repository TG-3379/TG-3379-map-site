// 가짜 예시 데이터입니다. (실제 데이터는 5단계에서 연결합니다)
const SAMPLE = {
  food: [
    { name: '한옥마을 비빔밥집', sub: '도보 6분 · 한식', thumb: 't1' },
    { name: '남부시장 피순대', sub: '도보 15분 · 분식', thumb: 't4' },
  ],
  spot: [
    { name: '경기전', sub: '도보 9분 · 입장료 있음', thumb: 't2' },
    { name: '오목대', sub: '도보 12분 · 무료', thumb: 't3' },
  ],
  festival: [
    { name: '전주 한지 문화축제', sub: '이번 주 · 전주시', thumb: 't3' },
  ],
};

const HOME_SECTIONS = [
  { title: '내 주변 맛집', note: '1km 이내', tag: '맛집', tagClass: 'food', items: SAMPLE.food },
  { title: '내 주변 명소', note: '1km 이내', tag: '관광지', tagClass: '', items: SAMPLE.spot },
  { title: '이번 주 축제', note: '예시', tag: '축제', tagClass: 'food', items: SAMPLE.festival },
];

function placeCard(item, tag, tagClass) {
  return `
    <div class="place" tabindex="0">
      <div class="thumb ${item.thumb}"></div>
      <div class="info">
        <span class="tag ${tagClass}">${tag}</span>
        <b>${item.name}</b>
        <small>${item.sub}</small>
      </div>
    </div>`;
}

function renderHome() {
  document.getElementById('home-cards').innerHTML = HOME_SECTIONS.map(s => `
    <div class="section-head"><h2>${s.title}</h2><span>${s.note}</span></div>
    ${s.items.map(i => placeCard(i, s.tag, s.tagClass)).join('')}
  `).join('');
}

function renderFavorites() {
  const all = [
    ...SAMPLE.food.map(i => placeCard(i, '맛집', 'food')),
    ...SAMPLE.spot.map(i => placeCard(i, '관광지', '')),
  ];
  document.getElementById('favorites-list').innerHTML = all.join('');
}

// 하단 메뉴: 주소 끝의 #home, #map ... 에 맞춰 화면을 바꿉니다.
const PAGES = ['home', 'map', 'favorites', 'me'];

function showPage() {
  const name = location.hash.slice(1);
  const current = PAGES.includes(name) ? name : 'home';
  PAGES.forEach(p => {
    document.getElementById(p).hidden = p !== current;
  });
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('on', t.dataset.page === current);
    if (t.dataset.page === current) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

renderHome();
renderFavorites();
window.addEventListener('hashchange', showPage);
showPage();
