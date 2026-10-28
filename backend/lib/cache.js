// 서버 메모리에만 잠깐 기억하는 캐시입니다. 파일로 저장하지 않으며, 서버를 끄면 사라집니다.
function createCache(maxEntries = 500) {
  const store = new Map();
  return {
    get(key) {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (hit.expires < Date.now()) {
        store.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value, ttlMs) {
      if (store.size >= maxEntries) store.delete(store.keys().next().value);
      store.set(key, { value, expires: Date.now() + ttlMs });
    },
  };
}

module.exports = { createCache };
