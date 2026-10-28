// 지도 화면: 네이버 지도 표시 + 내 위치
// 위치 정보는 지도 중심을 옮기는 데만 쓰고, 저장하거나 서버로 보내지 않습니다.

const SEOUL_CITY_HALL = { lat: 37.5663, lng: 126.9779 };

let map = null;
let meMarker = null;
let mapStarted = false;

const $canvas = document.getElementById('map-canvas');
const $notice = document.getElementById('map-notice');
const $error = document.getElementById('map-error');
const $errorText = document.getElementById('map-error-text');
const $locateBtn = document.getElementById('locate-btn');
const $retryBtn = document.getElementById('map-retry');

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

function createMap() {
  map = new naver.maps.Map($canvas, {
    center: new naver.maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng),
    zoom: 15,
    zoomControl: false,
    mapDataControl: false,
    scaleControl: false,
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
      icon: {
        content: '<div class="me-dot"></div>',
        anchor: new naver.maps.Point(11, 11),
      },
    });
  } else {
    meMarker.setPosition(pos);
  }
}

// 내 위치 요청. 실패하면 서울 시청 기본 위치 + 안내 문구.
function locate() {
  if (!window.isSecureContext || !navigator.geolocation) {
    moveTo(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng);
    showNotice('이 주소에서는 위치를 쓸 수 없어요(보안 연결 HTTPS 필요). 서울 시청을 보여드려요.');
    return;
  }
  showNotice('내 위치를 찾는 중이에요…');
  navigator.geolocation.getCurrentPosition(
    (p) => {
      moveTo(p.coords.latitude, p.coords.longitude);
      showNotice('');
    },
    (err) => {
      moveTo(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng);
      if (err.code === err.PERMISSION_DENIED) {
        showNotice('위치 권한이 꺼져 있어요. 서울 시청을 보여드려요. 브라우저 설정에서 위치를 허용하면 내 위치를 볼 수 있어요.');
      } else if (err.code === err.TIMEOUT) {
        showNotice('위치를 찾는 데 시간이 너무 오래 걸려요. 서울 시청을 보여드려요. 잠시 뒤 버튼을 다시 눌러 주세요.');
      } else {
        showNotice('지금은 내 위치를 알 수 없어요. 서울 시청을 보여드려요.');
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
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
    if (!map) createMap();
    mapStarted = true;
    // 숨겨져 있다가 나타난 화면은 크기를 한 번 다시 계산해 줍니다.
    requestAnimationFrame(() => naver.maps.Event.trigger(map, 'resize'));
    locate();
  } catch (e) {
    console.error(e);
    showError('지도를 그리는 중 문제가 생겼어요. (' + e.message + ')');
  }
}

// 지도 탭을 열 때 호출됩니다. 숨겨져 있던 지도는 크기를 다시 계산해야 합니다.
window.onMapShown = () => {
  if (!mapStarted) {
    startMap();
  } else if (map) {
    naver.maps.Event.trigger(map, 'resize');
  }
};

$locateBtn.addEventListener('click', () => { if (map) locate(); });
$retryBtn.addEventListener('click', startMap);
