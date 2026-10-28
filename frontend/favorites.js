// 즐겨찾기: 이 폰(브라우저) 안에만 저장합니다. 서버로 보내지 않습니다.
// 브라우저 저장 공간을 못 쓰는 경우(사생활 보호 모드 등)에는 이 화면을 닫을 때까지만 기억합니다.
const Favorites = (() => {
  const KEY = 'mapsite.favorites';
  let fallback = [];

  function read() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return fallback;
    }
  }

  function write(list) {
    fallback = list;
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // 저장 공간을 못 쓰면 메모리에만 둡니다.
    }
  }

  function list() {
    return read();
  }

  function has(id) {
    return read().some((p) => p.id === id);
  }

  // 목록에 꼭 필요한 정보만 저장합니다. (긴 소개글 등은 저장하지 않음)
  function slim(p) {
    return {
      id: p.id, source: p.source, type: p.type, name: p.name, address: p.address,
      lat: p.lat, lng: p.lng, image: p.image, phone: p.phone,
    };
  }

  // 눌렀을 때 저장/해제를 바꾸고, 바뀐 뒤 저장 여부를 돌려줍니다.
  function toggle(p) {
    const items = read();
    const idx = items.findIndex((x) => x.id === p.id);
    if (idx >= 0) items.splice(idx, 1);
    else items.unshift(slim(p));
    write(items);
    return idx < 0;
  }

  return { list, has, toggle };
})();
