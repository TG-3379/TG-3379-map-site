// 지도 화면: 네이버 지도 + 내 위치 + 주변 장소 마커와 목록
// 지도를 움직일 때마다 서버를 부르지 않습니다. "이 지역에서 다시 찾기"를 눌렀을 때만 한 번 찾습니다.

let map = null;
let meMarker = null;
let mapStarted = false;

let activeType = 'food';   // 지금 고른 종류
let loadedType = null;     // 마지막으로 불러온 종류
let searchCenter = null;   // 마지막으로 찾은 중심
let placeMarkers = [];
let requestId = 0;         // 늦게 도착한 옛 응답을 버리기 위한 번호

const $canvas = document.getElementById('map-canvas');
const $notice = document.getElementById('map-notice');
const $error = document.getElementById('map-error');
const $errorText = document.getElementById('map-error-text');
const $locateBtn = document.getElementById('locate-btn');
const $searchHere = document.getElementById('search-here');
const $retryBtn = document.getElementById('map-retry');
const $chips = document.querySelectorAll('.map-chips .chip');
const $sheetCount = document.getElementById('sheet-count');
const $sheetBody = document.getElementById('sheet-body');

function showNotice(text) {
  $notice.textContent = text;
  $notice.hidden = !text;
}

function showError(text) {
  $errorText.textContent = text;
  $error.hidden = false;
  $locateBtn.hidden = true;
}

// 네이버 지도 스크립트를 한 번만 불러옵니다.
function loadNaverScript() {
  return new Promise((resolve, reject) => {
    if (window.naver && window.naver.maps) return resolve();
    const s = document.createElement('script');
    s.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=' +
      encodeURIComponent(window.APP_CONFIG.naverMapClientId);
    s.onload = resolve;
    s.onerror = () => { s.remove(); reject(new Error('script')); };
    document.head.appendChild(s);
  });
}

// 등록하지 않은 주소에서 열었을 때 네이버가 이 함수를 불러 줍니다.
window.navermap_authFailure = () => {
  showError('이 주소는 네이버 지도에 등록되어 있지 않아 지도를 표시할 수 없어요. 등록 후 다시 시도해 주세요.');
};

function createMap(center) {
  map = new naver.maps.Map($canvas, {
    center: new naver.maps.LatLng(center.lat, center.lng),
    zoom: 15,
    zoomControl: false,
    mapDataControl: false,
    scaleControl: false,
  });
  // 지도를 옮기면 버튼만 보여주고, 서버는 부르지 않습니다.
  naver.maps.Event.addListener(map, 'idle', () => {
    if (!searchCenter) return;
    const c = map.getCenter();
    $searchHere.hidden = distanceM(searchCenter, { lat: c.lat(), lng: c.lng() }) < 500;
  });
}

function moveTo(lat, lng) {
  const pos = new naver.maps.LatLng(lat, lng);
  map.setCenter(pos);
  if (!meMarker) {
    meMarker = new naver.maps.Marker({
      position: pos,
      map,
      title: '내 위치',
      zIndex: 1,
      icon: { content: '<div class="me-dot"></div>', anchor: new naver.maps.Point(11, 11) },
    });
  } else {
    meMarker.setPosition(pos);
  }
}

function mapCenter() {
  const c = map.getCenter();
  return { lat: c.lat(), lng: c.lng() };
}

function clearMarkers() {
  placeMarkers.forEach((m) => m.setMap(null));
  placeMarkers = [];
}

function addMarker(p) {
  const marker = new naver.maps.Marker({
    position: new naver.maps.LatLng(p.lat, p.lng),
    map,
    title: p.name,
    zIndex: 2,
    icon: { content: `<div class="pin pin-${p.type}"></div>`, anchor: new naver.maps.Point(14, 34) },
  });
  naver.maps.Event.addListener(marker, 'click', () => {
    location.hash = '#place/' + encodeURIComponent(p.id);
  });
  placeMarkers.push(marker);
}

function updateChips() {
  $chips.forEach((c) => c.classList.toggle('on', c.dataset.type === activeType));
}

// 이 중심 주변의 장소를 찾아 마커와 목록으로 보여줍니다.
async function loadPlaces(center) {
  const id = ++requestId;
  searchCenter = center;
  loadedType = activeType;
  $searchHere.hidden = true;
  $sheetCount.textContent = '';
  $sheetBody.innerHTML = loadingHtml('주변 장소를 찾는 중이에요…');
  clearMarkers();

  const result = await Api.nearby(center, activeType);
  if (id !== requestId) return; // 그 사이 다른 요청이 시작됐으면 이 결과는 버립니다.

  if (!result.ok) {
    $sheetBody.innerHTML = statusBox('장소를 불러오지 못했어요', result.message, 'map');
    return;
  }
  if (!result.items.length) {
    $sheetBody.innerHTML = statusBox(
      `주변에 ${TYPE_LABEL[activeType]} 정보가 없어요`,
      '지도를 다른 곳으로 옮겨서 "이 지역에서 다시 찾기"를 눌러 보세요.'
    );
    return;
  }
  $sheetCount.textContent = `${TYPE_LABEL[activeType]} ${result.items.length}곳 · 가까운 순`;
  $sheetBody.innerHTML = result.items.map(placeCard).join('');
  result.items.filter((p) => p.lat && p.lng).forEach(addMarker);
}

// 내 위치를 찾아 지도를 옮기고 주변 장소를 불러옵니다.
async function goToMe(refresh) {
  showNotice('내 위치를 찾는 중이에요…');
  const pos = await (refresh ? Loc.refresh() : Loc.get());
  moveTo(pos.lat, pos.lng);
  showNotice(Loc.notice(pos));
  loadPlaces({ lat: pos.lat, lng: pos.lng });
}

async function startMap() {
  $error.hidden = true;
  $locateBtn.hidden = false;
  try {
    await loadNaverScript();
  } catch (e) {
    showError('지도를 불러오지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    return;
  }
  try {
    createMap(Loc.SEOUL); // 위치를 찾는 동안 잠깐 보여줄 시작 위치
    mapStarted = true;
    // 숨겨져 있다가 나타난 화면은 크기를 한 번 다시 계산해 줍니다.
    requestAnimationFrame(() => naver.maps.Event.trigger(map, 'resize'));
    goToMe(false);
  } catch (e) {
    console.error(e);
    showError('지도를 그리는 중 문제가 생겼어요. (' + e.message + ')');
  }
}

// 지도 탭을 열 때 호출됩니다.
window.onMapShown = () => {
  if (!mapStarted) {
    startMap();
    return;
  }
  if (!map) return;
  naver.maps.Event.trigger(map, 'resize');
  // 홈에서 "지도에서 보기"로 종류가 바뀐 경우에만 다시 찾습니다.
  if (activeType !== loadedType) loadPlaces(mapCenter());
};

// 홈 화면에서 종류를 정해서 지도를 열 때 씁니다.
window.setMapType = (type) => {
  activeType = type;
  updateChips();
};

$chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    if (chip.dataset.type === activeType) return;
    activeType = chip.dataset.type;
    updateChips();
    if (map) loadPlaces(mapCenter());
  });
});

$searchHere.addEventListener('click', () => loadPlaces(mapCenter()));
$locateBtn.addEventListener('click', () => { if (map) goToMe(true); });
$retryBtn.addEventListener('click', startMap);
$sheetBody.addEventListener('click', (e) => {
  if (e.target.closest('[data-retry]') && map) loadPlaces(searchCenter || mapCenter());
});
