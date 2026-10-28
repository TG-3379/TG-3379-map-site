// 여러 화면이 함께 쓰는 작은 도구들: 장소 카드, 거리 표시, 안내 상자

const TYPE_LABEL = { food: '맛집', spot: '관광지', festival: '축제' };

// 서버에서 받은 글자를 화면에 넣기 전에 안전하게 바꿉니다.
function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fmtDistance(m) {
  if (m == null) return '';
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

// 두 지점 사이 거리(미터)
function distanceM(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

// 상세 화면에서 id 로 장소를 다시 찾기 위한 메모 (이 화면 안에서만, 저장하지 않음)
const PlaceStore = new Map();

// 사진이 없는 곳은 종류별 색 상자를 보여줍니다.
function thumbHtml(p) {
  return p.image
    ? `<img class="thumb" src="${esc(p.image)}" alt="" loading="lazy">`
    : `<div class="thumb ph-${esc(p.type)}"></div>`;
}

function placeCard(p) {
  PlaceStore.set(p.id, p);
  const sub = [fmtDistance(p.distance), p.type === 'festival' && p.startDate ? `${p.startDate.slice(4, 6)}.${p.startDate.slice(6)} 시작` : '', p.address]
    .filter(Boolean)
    .join(' · ');
  return `
    <a class="place" href="#place/${encodeURIComponent(p.id)}">
      ${thumbHtml(p)}
      <div class="info">
        <span class="tag ${p.type === 'spot' ? '' : p.type === 'food' ? 'food' : 'fest'}">${TYPE_LABEL[p.type] || ''}</span>
        <b>${esc(p.name)}</b>
        <small>${esc(sub)}</small>
      </div>
    </a>`;
}

function loadingHtml(text = '불러오는 중이에요…') {
  return `<div class="status-box loading" role="status">${esc(text)}</div>`;
}

// retryKey 가 있으면 "다시 시도" 버튼을 붙입니다. (data-retry 값으로 어느 영역인지 구분)
function statusBox(title, message, retryKey) {
  return `
    <div class="status-box" role="alert">
      <b>${esc(title)}</b>
      <p>${esc(message)}</p>
      ${retryKey ? `<button class="btn" type="button" data-retry="${esc(retryKey)}">다시 시도</button>` : ''}
    </div>`;
}

// 사진 주소가 깨졌을 때도 빈 칸이 아니라 색 상자가 보이게 합니다.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img && img.tagName === 'IMG' && img.classList.contains('thumb')) {
    const box = document.createElement('div');
    box.className = 'thumb ph-spot';
    img.replaceWith(box);
  }
}, true);
