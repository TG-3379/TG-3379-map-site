// 우리 서버(/api/...)에 장소 정보를 물어보는 함수. 비밀 키는 서버만 알고 있습니다.
// 같은 곳·같은 종류는 10분 동안 이 화면 안에서 다시 쓰고, 서버를 또 부르지 않습니다.
const Api = (() => {
  const memo = new Map();
  const TTL = 10 * 60 * 1000;

  const fail = (code, message) => ({ ok: false, code, message });

  // 서버에 물어보고 { ok, data } 또는 { ok:false, message } 로 돌려줍니다. 같은 요청은 기억해 둡니다.
  async function ask(path, params, memoKey) {
    const hit = memo.get(memoKey);
    if (hit && hit.exp > Date.now()) return hit.value;

    if (!navigator.onLine) {
      return fail('OFFLINE', '인터넷 연결이 끊겼어요. 연결을 확인한 뒤 다시 시도해 주세요.');
    }

    let body;
    try {
      const res = await fetch(`${path}?${new URLSearchParams(params)}`);
      body = await res.json();
    } catch {
      return fail('NETWORK', '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    }
    if (!body.ok) return fail(body.code, body.message);

    const value = { ok: true, data: body.data };
    memo.set(memoKey, { value, exp: Date.now() + TTL });
    return value;
  }

  async function nearby(pos, type, radius = 2000) {
    // 위치는 소수점 3자리(약 100m)로 뭉쳐서 같은 동네는 같은 결과로 봅니다.
    const key = `n:${pos.lat.toFixed(3)}:${pos.lng.toFixed(3)}:${type}:${radius}`;
    const r = await ask('/api/places/nearby', { lat: pos.lat, lng: pos.lng, type, radius }, key);
    return r.ok ? { ok: true, items: r.data } : r;
  }

  async function detail(id) {
    const r = await ask('/api/places/detail', { id }, `d:${id}`);
    return r.ok ? { ok: true, place: r.data } : r;
  }

  return { nearby, detail };
})();
