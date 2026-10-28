// 외부 API 호출 공통 함수: 시간 제한, 오류를 쉬운 안내 오류로 바꾸기
const { fail } = require('./errors');

async function fetchJson(url, headers = {}) {
  let res;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  } catch {
    throw fail('UPSTREAM', 502);
  }
  if (res.status === 429) throw fail('LIMIT', 429);
  if (!res.ok) throw fail('UPSTREAM', 502);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // 키 오류 등은 JSON이 아닌 글로 돌아오는 경우가 있습니다.
    throw fail('UPSTREAM', 502);
  }
}

module.exports = { fetchJson };
