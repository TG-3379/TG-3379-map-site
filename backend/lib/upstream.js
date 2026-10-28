// 외부 API 호출 공통 함수: 시간 제한, 오류를 쉬운 안내 오류로 바꾸기
const { fail } = require('./errors');

async function fetchJson(url, headers = {}) {
  let res;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  } catch (e) {
    console.error('외부 API 연결 실패:', e.name);
    throw fail('UPSTREAM', 502);
  }
  if (res.status === 429) throw fail('LIMIT', 429);
  if (!res.ok) {
    console.error('외부 API 상태 이상:', res.status);
    throw fail('UPSTREAM', 502);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // 키 오류 등은 JSON이 아닌 글로 돌아오는 경우가 있습니다. (앞부분만 기록, 주소는 남기지 않음)
    console.error('외부 API가 JSON이 아닌 응답을 줬어요:', text.slice(0, 120).replace(/\s+/g, ' '));
    throw fail('UPSTREAM', 502);
  }
}

module.exports = { fetchJson };
