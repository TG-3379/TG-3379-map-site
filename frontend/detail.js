// 장소 상세 화면: 사진, 정보, 전화 / 길찾기 / 공유 / 저장 버튼
const Detail = (() => {
  const $body = document.getElementById('place-body');
  const APP_NAME = 'app.mapsite'; // 네이버 지도 앱에 알려 주는 우리 서비스 이름
  let current = null; // 지금 보고 있는 장소
  let token = 0;      // 늦게 도착한 옛 응답을 버리기 위한 번호

  const ICON = {
    route: '<path d="M3 11l18-8-8 18-2-8z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    share: '<path d="M4 12v7h16v-7M12 3v12M7 8l5-5 5 5"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.7A4.5 4.5 0 0120 9c0 6-8 11-8 11z"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isNumericId = (id) => /^\d+$/.test(id);

  function actionsHtml(p) {
    const digits = p.phone ? p.phone.replace(/[^\d]/g, '') : '';
    const canSave = p.source !== 'naver'; // 네이버 검색 결과는 저장하지 않습니다.
    const saved = Favorites.has(p.id);
    return `
      <div class="actions">
        ${digits
          ? `<a class="act" href="tel:${esc(digits)}">${icon('phone')}전화</a>`
          : `<button class="act" type="button" disabled>${icon('phone')}전화</button>`}
        ${p.lat && p.lng
          ? `<button class="act main" type="button" data-act="route">${icon('route')}길찾기</button>`
          : `<button class="act main" type="button" disabled>${icon('route')}길찾기</button>`}
        <button class="act" type="button" data-act="share">${icon('share')}공유</button>
        <button class="act ${saved ? 'on' : ''}" type="button" data-act="fav" aria-pressed="${saved}" ${canSave ? '' : 'disabled'}>
          ${icon('heart')}<span>${saved ? '저장됨' : '저장'}</span>
        </button>
      </div>
      <div class="route-panel" id="route-panel" hidden>
        <button class="btn" type="button" data-act="naver">네이버 지도로 길찾기</button>
        <button class="btn kakao" type="button" data-act="kakao">카카오맵으로 길찾기</button>
      </div>
      ${digits ? '' : '<p class="hint">이 장소는 전화번호 정보가 없어요.</p>'}`;
  }

  function rowsHtml(p, loading) {
    const rows = [['주소', p.address]];
    if (p.phone) rows.push(['전화', p.phone]);
    (p.info || []).forEach((r) => rows.push([r.label, r.value]));
    if (p.homepage) rows.push(['홈페이지', `<a href="${esc(p.homepage)}" target="_blank" rel="noopener">열기</a>`]);
    const html = rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${k === '홈페이지' ? v : esc(v)}</dd></div>`)
      .join('');
    return `<dl class="rows">${html}</dl>${loading ? loadingHtml('자세한 정보를 불러오는 중이에요…') : ''}`;
  }

  // partial = 목록에서 받은 간단한 정보만 있는 상태 (자세한 정보를 아직 불러오는 중)
  function render(p, partial) {
    current = p;
    const hero = p.image
      ? `<img class="hero-img" src="${esc(p.image)}" alt="${esc(p.name)} 사진">`
      : `<div class="hero-img ph-${esc(p.type)}"></div>`;
    const credit = p.source === 'naver'
      ? '정보 출처: 네이버'
      : `정보·사진 출처: 한국관광공사(TourAPI)${p.photoLicense ? ` · 사진 이용조건: ${esc(p.photoLicense)}` : ''}`;
    $body.innerHTML = `
      ${hero}
      <span class="tag ${p.type === 'spot' ? '' : p.type === 'food' ? 'food' : 'fest'}">${esc(TYPE_LABEL[p.type] || '')}</span>
      <h1 class="greeting">${esc(p.name)}</h1>
      ${actionsHtml(p)}
      ${rowsHtml(p, partial)}
      ${p.overview ? `<h2 class="sub-title">소개</h2><p class="overview">${esc(p.overview)}</p>` : ''}
      <p class="credit">${credit}</p>`;
  }

  async function show(id) {
    const t = ++token;
    const cached = PlaceStore.get(id);
    if (cached) render(cached, isNumericId(id));
    else $body.innerHTML = loadingHtml();

    // 한국관광공사 장소(숫자 번호)만 서버에서 자세한 정보를 가져옵니다.
    if (!isNumericId(id)) {
      if (!cached) $body.innerHTML = statusBox('장소 정보를 찾을 수 없어요', '목록에서 다시 선택해 주세요.');
      return;
    }
    const r = await Api.detail(id);
    if (t !== token) return;
    if (r.ok) {
      PlaceStore.set(id, r.place);
      render(r.place, false);
    } else if (cached) {
      render(cached, false);
      toast(r.message);
    } else {
      $body.innerHTML = statusBox('장소 정보를 불러오지 못했어요', r.message, 'detail');
    }
  }

  // ---------- 버튼 동작 ----------
  function openNaver(p) {
    const web = `https://map.naver.com/p/search/${encodeURIComponent(p.name)}`;
    if (!isMobile()) return window.open(web, '_blank', 'noopener');
    const app = `nmap://route/public?dlat=${p.lat}&dlng=${p.lng}&dname=${encodeURIComponent(p.name)}&appname=${APP_NAME}`;
    // 앱이 열리면 이 화면이 가려집니다. 1.5초 안에 안 가려지면 앱이 없는 것으로 보고 웹 지도로 갑니다.
    let left = false;
    const onHide = () => { if (document.hidden) left = true; };
    document.addEventListener('visibilitychange', onHide);
    location.href = app;
    setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide);
      if (!left && !document.hidden) location.href = web;
    }, 1500);
  }

  function openKakao(p) {
    const name = encodeURIComponent(p.name.replace(/,/g, ' '));
    window.open(`https://map.kakao.com/link/to/${name},${p.lat},${p.lng}`, '_blank', 'noopener');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function share(p) {
    const url = `${location.origin}${location.pathname}#place/${encodeURIComponent(p.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.name, text: `${p.name} · ${p.address}`, url });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // 사용자가 공유 창을 닫음
      }
    }
    toast((await copyText(url)) ? '링크를 복사했어요. 카카오톡에 붙여넣어 보내 보세요.' : '링크를 복사하지 못했어요.');
  }

  function toggleFavorite(p, button) {
    const on = Favorites.toggle(p);
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', String(on));
    button.querySelector('span').textContent = on ? '저장됨' : '저장';
    toast(on ? '즐겨찾기에 저장했어요.' : '즐겨찾기에서 뺐어요.');
  }

  $body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn || !current) return;
    switch (btn.dataset.act) {
      case 'route': document.getElementById('route-panel').hidden = !document.getElementById('route-panel').hidden; break;
      case 'naver': openNaver(current); break;
      case 'kakao': openKakao(current); break;
      case 'share': share(current); break;
      case 'fav': toggleFavorite(current, btn); break;
    }
  });

  // "다시 시도"는 지금 주소(#place/번호)의 장소를 다시 불러옵니다.
  $body.addEventListener('click', (e) => {
    if (!e.target.closest('[data-retry="detail"]')) return;
    show(decodeURIComponent(location.hash.slice(1)).replace(/^place\//, ''));
  });

  return { show };
})();
