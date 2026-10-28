// 내 위치 (홈과 지도가 함께 씁니다)
// 위치는 메모리에만 두고 저장하지 않습니다. 서버에는 주변 장소를 찾을 때 좌표만 보냅니다.
const Loc = (() => {
  const SEOUL = { lat: 37.5663, lng: 126.9779 }; // 서울 시청
  let current = null;
  let pending = null;

  const NOTICES = {
    denied: '위치 권한이 꺼져 있어요. 서울 시청 주변을 보여드려요. 브라우저 설정에서 위치를 허용하면 내 주변을 볼 수 있어요.',
    timeout: '위치를 찾는 데 시간이 너무 오래 걸려요. 서울 시청 주변을 보여드려요. 잠시 뒤 다시 눌러 주세요.',
    unavailable: '지금은 내 위치를 알 수 없어요. 서울 시청 주변을 보여드려요.',
    insecure: '이 주소에서는 위치를 쓸 수 없어요(보안 연결 HTTPS 필요). 서울 시청 주변을 보여드려요.',
  };

  function ask() {
    return new Promise((resolve) => {
      const fallback = (reason) => resolve({ ...SEOUL, fallback: true, reason });
      if (!window.isSecureContext || !navigator.geolocation) return fallback('insecure');
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, fallback: false, reason: null }),
        (err) => fallback(
          err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable'
        ),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  // 위치를 새로 물어봅니다. 이미 묻는 중이면 그 결과를 같이 기다립니다.
  function refresh() {
    if (!pending) {
      pending = ask().then((r) => {
        current = r;
        pending = null;
        return r;
      });
    }
    return pending;
  }

  function get() {
    return current ? Promise.resolve(current) : refresh();
  }

  function notice(r) {
    return r && r.fallback ? NOTICES[r.reason] : '';
  }

  return { get, refresh, notice, SEOUL };
})();
