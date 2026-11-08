// 놀곳 — 내 주변 이벤트 추천 PWA (빌드 없이 GitHub Pages에서 바로 동작)

/* ------------------------------------------------------------------ */
/* 설정값                                                              */
/* ------------------------------------------------------------------ */
const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

// kind는 앞으로 워크샵·가이드투어·오디오가이드 등으로 확장되는 축.
// 데이터에 해당 kind가 0개면 탭에 '준비중'으로 표시된다.
const KINDS = [
  { id: 'all', label: '전체', emoji: '✨' },
  { id: 'festival', label: '축제·행사', emoji: '🎉' },
  { id: 'performance', label: '공연', emoji: '🎭' },
  { id: 'exhibition', label: '전시', emoji: '🖼️' },
  { id: 'workshop', label: '클래스·워크샵', emoji: '🧶' },
  { id: 'tour', label: '가이드투어', emoji: '🚶' },
  { id: 'audioguide', label: '오디오가이드', emoji: '🎧' },
];
const KIND = Object.fromEntries(KINDS.map(k => [k.id, k]));

const FILTERS = [
  { id: 'all', label: '전체 일정' },
  { id: 'weekend', label: '이번 주말' },
  { id: 'week', label: '이번 주' },
  { id: 'month', label: '이번 달' },
  { id: 'free', label: '무료' },
];

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/* ------------------------------------------------------------------ */
/* 유틸                                                                */
/* ------------------------------------------------------------------ */
const $ = (s, el = document) => el.querySelector(s);
const LS = {
  get(k, d) { try { const v = localStorage.getItem('nolgot:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('nolgot:' + k, JSON.stringify(v)); } catch { /* private mode 등 */ } },
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayDate = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const todayStr = () => ymd(todayDate());
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000); // b - a
const fmtDay = s => { const d = parseYmd(s); return `${d.getMonth() + 1}.${d.getDate()}(${DOW[d.getDay()]})`; };
const fmtRange = (a, b) => a === b ? fmtDay(a) : `${fmtDay(a)} – ${fmtDay(b)}`;

function weekendRange() {
  const t = todayDate(); const day = t.getDay();
  if (day === 6) return [ymd(t), ymd(addDays(t, 1))];
  if (day === 0) return [ymd(t), ymd(t)];
  const sat = addDays(t, 6 - day);
  return [ymd(sat), ymd(addDays(sat, 1))];
}
function weekRange() { const t = todayDate(); return [ymd(t), ymd(addDays(t, (7 - t.getDay()) % 7))]; }
function monthRange() { const t = todayDate(); return [ymd(t), ymd(new Date(t.getFullYear(), t.getMonth() + 1, 0))]; }
const overlaps = (e, a, b) => e.startDate <= b && e.endDate >= a;
const activeOn = (e, d) => e.startDate <= d && e.endDate >= d;

function status(e) {
  const t = todayStr();
  if (e.endDate < t) return { text: '종료', cls: '' };
  if (e.startDate > t) { const n = diffDays(t, e.startDate); return { text: n === 1 ? '내일 시작' : `D-${n}`, cls: '' }; }
  const left = diffDays(t, e.endDate);
  if (left === 0) return { text: '오늘 마감', cls: 'hot' };
  if (left <= 3) return { text: `마감 D-${left}`, cls: 'hot' };
  return { text: '진행중', cls: 'live' };
}

function distanceKm(a, b) {
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

/* ------------------------------------------------------------------ */
/* 상태                                                                */
/* ------------------------------------------------------------------ */
const state = {
  events: [],
  meta: {},
  tab: 'browse',
  region: LS.get('region', '서울'),       // 지역명 또는 'near'
  radiusKm: LS.get('radiusKm', 20),
  coords: LS.get('coords', null),
  kind: LS.get('kind', 'all'),
  filter: 'all',
  calMonth: (() => { const t = todayDate(); return new Date(t.getFullYear(), t.getMonth(), 1); })(),
  calSel: todayStr(),
  calSavedOnly: false,
  saved: LS.get('saved', {}),             // id -> 이벤트 스냅샷
  settings: Object.assign({ notify: false, notifyDays: 1, alarm: '-P1D' }, LS.get('settings', {})),
};
const saveSettings = () => LS.set('settings', state.settings);

function inRegion(e) {
  if (state.region === 'near') {
    if (!state.coords || e.lat == null || e.lng == null) return false;
    return distanceKm(state.coords, e) <= state.radiusKm;
  }
  return e.region === state.region;
}
const inKind = e => state.kind === 'all' || e.kind === state.kind;
const isSaved = id => !!state.saved[id];

function sortEvents(list) {
  const t = todayStr();
  return list.sort((a, b) => {
    const as = a.startDate < t ? t : a.startDate, bs = b.startDate < t ? t : b.startDate;
    return as.localeCompare(bs) || a.endDate.localeCompare(b.endDate) || a.title.localeCompare(b.title);
  });
}

function baseList() {
  const t = todayStr();
  return state.events.filter(e => e.endDate >= t && inRegion(e) && inKind(e));
}

/* ------------------------------------------------------------------ */
/* 렌더: 공통 조각                                                      */
/* ------------------------------------------------------------------ */
const GRADS = [['#ff7a59', '#ff3d77'], ['#5b8cff', '#8a5bff'], ['#16b9a0', '#3b82f6'], ['#f59e0b', '#ef4444'],
  ['#10b981', '#84cc16'], ['#a855f7', '#ec4899'], ['#0ea5e9', '#22d3ee'], ['#f43f5e', '#fb923c']];

function posterHTML(e, cls = '') {
  const [c1, c2] = GRADS[hash(e.id) % GRADS.length];
  const ph = `<div class="poster ph ${cls}" style="background:linear-gradient(140deg,${c1},${c2})">${KIND[e.kind]?.emoji || '✨'}<b>${esc(e.title)}</b></div>`;
  if (!e.poster) return ph;
  // 이미지 로드 실패 시 플레이스홀더로 교체
  return `<div class="poster ${cls}"><img src="${esc(e.poster)}" alt="" loading="lazy" decoding="async"
    onerror="this.parentNode.outerHTML=decodeURIComponent('${encodeURIComponent(ph)}')"></div>`;
}

function tagsHTML(e) {
  const k = KIND[e.kind];
  let h = `<span class="tag">${esc(e.genre || k?.label || '')}</span> `;
  if (e.free) h += `<span class="tag free">무료</span>`;
  return h;
}

function cardHTML(e) {
  const st = status(e);
  return `<article class="card" data-open="${esc(e.id)}" tabindex="0">
    ${posterHTML(e)}
    <div>
      ${tagsHTML(e)}
      <h3>${esc(e.title)}</h3>
      <div class="meta">
        <span>${fmtRange(e.startDate, e.endDate)} · ${st.text}</span>
        <span>${esc(e.place || e.address || '')}</span>
        ${e.fee ? `<span>${esc(e.fee)}</span>` : ''}
      </div>
    </div>
    <button class="heart ${isSaved(e.id) ? 'on' : ''}" data-save="${esc(e.id)}" aria-label="관심 저장">${isSaved(e.id) ? '♥' : '♡'}</button>
  </article>`;
}

function bigCardHTML(e) {
  return `<button class="card-big" data-open="${esc(e.id)}">
    ${posterHTML(e)}
    <div class="body">
      ${tagsHTML(e)}
      <h3>${esc(e.title)}</h3>
      <div class="meta"><span>${fmtRange(e.startDate, e.endDate)}</span><span>${esc(e.place || '')}</span></div>
    </div>
  </button>`;
}

function emptyHTML(icon, title, desc) {
  return `<div class="empty"><div class="big">${icon}</div><h3>${title}</h3><p>${desc}</p></div>`;
}

function regionName() {
  return state.region === 'near' ? `내 주변 ${state.radiusKm}km` : state.region;
}

/* ------------------------------------------------------------------ */
/* 렌더: 탭                                                             */
/* ------------------------------------------------------------------ */
function renderKinds() {
  const el = $('#kindTabs');
  el.hidden = !(state.tab === 'browse' || state.tab === 'calendar');
  const counts = {};
  for (const e of state.events) counts[e.kind] = (counts[e.kind] || 0) + 1;
  el.innerHTML = KINDS.map(k => {
    const soon = k.id !== 'all' && !counts[k.id];
    return `<button class="chip ${state.kind === k.id ? 'active' : ''}" data-kind="${k.id}">${k.label}${soon ? '<span class="soon">준비중</span>' : ''}</button>`;
  }).join('');
}

function soonHTML() {
  const k = KIND[state.kind];
  return emptyHTML(k.emoji, `${k.label}은 준비 중이에요`,
    '곧 원데이 클래스, 가이드투어, 오디오가이드 같은 체험도 예약할 수 있게 확장할 예정이에요.');
}

function renderBrowse() {
  const all = baseList();
  const kindHasData = state.kind === 'all' || state.events.some(e => e.kind === state.kind);
  if (!kindHasData) return soonHTML();

  let html = reminderBannerHTML();

  // 이번 주말 추천
  const [ws, we] = weekendRange();
  const weekend = sortEvents(all.filter(e => overlaps(e, ws, we)))
    .sort((a, b) => isSaved(b.id) - isSaved(a.id)) // 저장한 것 먼저, 나머지는 날짜순 유지
    .slice(0, 12);
  if (weekend.length) {
    html += `<div class="section-title">이번 주말 어디 갈까? <small>${fmtRange(ws, we)}</small></div>
      <div class="rail">${weekend.map(bigCardHTML).join('')}</div>`;
  }

  // 필터 + 목록
  let list = all;
  if (state.filter === 'weekend') list = list.filter(e => overlaps(e, ws, we));
  if (state.filter === 'week') { const [a, b] = weekRange(); list = list.filter(e => overlaps(e, a, b)); }
  if (state.filter === 'month') { const [a, b] = monthRange(); list = list.filter(e => overlaps(e, a, b)); }
  if (state.filter === 'free') list = list.filter(e => e.free);
  sortEvents(list);

  html += `<div class="section-title">${esc(regionName())} 이벤트 <small>${list.length}개</small></div>
    <div class="filters">${FILTERS.map(f => `<button class="filter ${state.filter === f.id ? 'active' : ''}" data-filter="${f.id}">${f.label}</button>`).join('')}</div>
    <div style="height:10px"></div>`;

  if (!list.length) {
    html += state.region === 'near' && !state.coords
      ? emptyHTML('📍', '위치 권한이 필요해요', '상단 지역 버튼에서 ‘내 주변’을 다시 선택해 주세요.')
      : emptyHTML('🔍', '조건에 맞는 이벤트가 없어요', '다른 지역이나 기간을 선택해 보세요.');
  } else {
    html += `<div class="list">${list.slice(0, 200).map(cardHTML).join('')}</div>`;
  }
  return html;
}

function reminderBannerHTML() {
  const t = todayStr();
  const soon = Object.values(state.saved)
    .filter(e => e.endDate >= t && diffDays(t, e.startDate) <= 3)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (!soon.length) return '';
  const e = soon[0];
  const st = status(e);
  const more = soon.length > 1 ? ` 외 ${soon.length - 1}개` : '';
  return `<div class="banner" data-open="${esc(e.id)}" role="button" tabindex="0">🔔 <div>관심 이벤트 <b>${esc(e.title)}</b>${more} · ${st.text}</div></div>`;
}

function renderCalendar() {
  const kindHasData = state.kind === 'all' || state.events.some(e => e.kind === state.kind);
  if (!kindHasData) return soonHTML();

  const m = state.calMonth;
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const rangeA = ymd(start), rangeB = ymd(addDays(start, 41));
  const t = todayStr();

  const pool = state.calSavedOnly
    ? Object.values(state.saved).filter(inKind)
    : state.events.filter(e => inRegion(e) && inKind(e) && overlaps(e, rangeA, rangeB));

  let cells = DOW.map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i); const s = ymd(d);
    const act = pool.filter(e => activeOn(e, s));
    const nSaved = act.filter(e => isSaved(e.id)).length;
    const nOther = act.length - nSaved;
    const dots = '<i class="saved"></i>'.repeat(Math.min(nSaved, 2)) + '<i></i>'.repeat(Math.min(nOther, 3 - Math.min(nSaved, 2)));
    const cls = ['day', d.getMonth() !== m.getMonth() && 'out', d.getDay() === 0 && 'sun', d.getDay() === 6 && 'sat',
      s === t && 'today', s === state.calSel && 'sel'].filter(Boolean).join(' ');
    cells += `<button class="${cls}" data-day="${s}" aria-label="${s} 이벤트 ${act.length}개">
      <span class="n">${d.getDate()}</span><span class="dots">${dots}</span>${act.length > 3 ? `<span class="cnt">${act.length}</span>` : ''}</button>`;
  }

  const dayList = sortEvents(pool.filter(e => activeOn(e, state.calSel)));
  return `
    <div class="cal-head">
      <h2>${m.getFullYear()}년 ${m.getMonth() + 1}월</h2>
      <div class="nav">
        <button class="today-btn" data-cal="today">오늘</button>
        <button class="icon-btn" data-cal="prev" aria-label="이전 달">‹</button>
        <button class="icon-btn" data-cal="next" aria-label="다음 달">›</button>
      </div>
    </div>
    <div class="filters" style="margin-bottom:10px">
      <button class="filter ${!state.calSavedOnly ? 'active' : ''}" data-calmode="all">${esc(regionName())} 전체</button>
      <button class="filter ${state.calSavedOnly ? 'active' : ''}" data-calmode="saved">♥ 관심만</button>
    </div>
    <div class="cal">${cells}</div>
    <div class="legend"><span><i></i>이벤트</span><span><i class="saved"></i>관심 저장</span></div>
    <div class="section-title">${fmtDay(state.calSel)} <small>${dayList.length}개</small></div>
    ${dayList.length ? `<div class="list">${dayList.map(cardHTML).join('')}</div>` : emptyHTML('🗓️', '이 날은 일정이 없어요', '다른 날짜를 눌러보세요.')}
  `;
}

function renderSaved() {
  const t = todayStr();
  const all = Object.values(state.saved);
  if (!all.length) return emptyHTML('♡', '관심 이벤트가 없어요', '마음에 드는 이벤트의 ♡를 눌러 저장하면 여기에 모이고, 시작 전에 알려드려요.');
  const upcoming = sortEvents(all.filter(e => e.endDate >= t));
  const past = all.filter(e => e.endDate < t).sort((a, b) => b.endDate.localeCompare(a.endDate));
  let html = `<div class="section-title">다가오는 관심 이벤트 <small>${upcoming.length}개</small></div>`;
  html += upcoming.length ? `<div class="list">${upcoming.map(cardHTML).join('')}</div>` : emptyHTML('🎈', '다가오는 일정이 없어요', '');
  if (upcoming.length) html += `<div style="height:12px"></div><button class="btn wide" style="width:100%" data-action="export-all">📅 관심 이벤트 전체를 캘린더로 내보내기</button>`;
  if (past.length) html += `<div class="section-title">지난 이벤트 <small>${past.length}개</small></div><div class="list" style="opacity:.6">${past.map(cardHTML).join('')}</div>`;
  return html;
}

function renderSettings() {
  const s = state.settings;
  const notifSupported = 'Notification' in window && 'serviceWorker' in navigator;
  const perm = notifSupported ? Notification.permission : 'unsupported';
  let notifNote = '관심 이벤트가 다가오면 앱을 열 때 알림을 보내드려요.';
  if (isIOS && !isStandalone()) notifNote = '아이폰은 Safari에서 ‘홈 화면에 추가’로 설치한 뒤에 알림을 켤 수 있어요 (iOS 16.4 이상).';
  else if (!notifSupported) notifNote = '이 브라우저는 알림을 지원하지 않아요. 캘린더에 추가하면 캘린더 알림을 받을 수 있어요.';
  else if (perm === 'denied') notifNote = '알림 권한이 차단되어 있어요. 기기 설정에서 허용해 주세요.';

  const m = state.meta;
  return `
    <div class="section-title">알림</div>
    <div class="group">
      <label class="row"><div>관심 이벤트 알림<small>${notifNote}</small></div>
        <span class="switch"><input type="checkbox" id="notifyToggle" ${s.notify && perm === 'granted' ? 'checked' : ''}><span></span></span></label>
      <div class="row"><div>언제 알려드릴까요?</div>
        <select id="notifyDays">
          ${[[0, '시작 당일'], [1, '하루 전'], [3, '3일 전'], [7, '일주일 전']].map(([v, l]) => `<option value="${v}" ${s.notifyDays == v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></div>
    </div>
    <p class="note">더 확실한 알림이 필요하면 이벤트를 <b>캘린더에 추가</b>하세요. 아래 시간에 맞춰 폰 캘린더가 알려줍니다.</p>
    <div class="group">
      <div class="row"><div>캘린더 일정 알림</div>
        <select id="alarm">
          ${[['', '없음'], ['-PT1H', '1시간 전'], ['-PT3H', '3시간 전'], ['-P1D', '하루 전'], ['-P2D', '이틀 전']].map(([v, l]) => `<option value="${v}" ${s.alarm === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></div>
    </div>

    <div class="section-title">앱</div>
    <div class="group">
      <div class="row"><div>설치 상태<small>${isStandalone() ? '홈 화면 앱으로 실행 중이에요 ✓' : (isIOS ? 'Safari 공유 버튼 → ‘홈 화면에 추가’로 설치하세요' : '브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’')}</small></div></div>
      <div class="row"><div>데이터<small>${m.source === 'sample' ? '샘플 데이터 (API 키 연결 전)' : esc(m.source || '-')}<br>업데이트: ${m.updatedAt ? new Date(m.updatedAt).toLocaleString('ko-KR') : '-'} · ${state.events.length}개</small></div></div>
      <button class="row" style="width:100%;border:0;background:none;text-align:left" data-action="reset"><div style="color:#e0533d">관심 목록 초기화</div></button>
    </div>
  `;
}

function render() {
  renderKinds();
  const v = $('#view');
  v.innerHTML = ({ browse: renderBrowse, calendar: renderCalendar, saved: renderSaved, settings: renderSettings })[state.tab]();
  $('#regionLabel').textContent = regionName();
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
  const n = Object.values(state.saved).filter(e => e.endDate >= todayStr()).length;
  const badge = $('#savedCount'); badge.hidden = !n; badge.textContent = n;
  $('#sampleBadge').hidden = state.meta.source !== 'sample';
}

/* ------------------------------------------------------------------ */
/* 상세 시트                                                            */
/* ------------------------------------------------------------------ */
function findEvent(id) { return state.events.find(e => e.id === id) || state.saved[id]; }

function openDetail(id, preferDay) {
  const e = findEvent(id); if (!e) return;
  const dlg = $('#detail');
  const st = status(e);
  const place = e.place || e.address || '';
  const mapQ = encodeURIComponent(e.place && e.address ? `${e.address}` : place);
  const multi = e.startDate !== e.endDate;
  const t = todayStr();
  const defDay = preferDay && activeOn(e, preferDay) ? preferDay : (e.startDate < t && e.endDate >= t ? t : e.startDate);

  dlg.innerHTML = `
    <button class="close" data-close aria-label="닫기">✕</button>
    <div class="scroll">
      ${posterHTML(e, 'detail-poster')}
      <div class="detail-body">
        ${tagsHTML(e)}
        <h2>${esc(e.title)}</h2>
        <dl class="info">
          <div><dt>🗓</dt><dd>${fmtRange(e.startDate, e.endDate)}<small>${st.text}${multi ? ` · ${diffDays(e.startDate, e.endDate) + 1}일간` : ''}</small></dd></div>
          ${e.time ? `<div><dt>🕒</dt><dd>${esc(e.time)}</dd></div>` : ''}
          ${place ? `<div><dt>📍</dt><dd>${esc(e.place || '')}${e.address && e.address !== e.place ? `<small>${esc(e.address)}</small>` : ''}
            <small><a href="https://map.naver.com/p/search/${mapQ}" target="_blank" rel="noopener">네이버지도</a> · <a href="https://map.kakao.com/link/search/${mapQ}" target="_blank" rel="noopener">카카오맵</a>${state.coords && e.lat != null ? ` · 여기서 ${distanceKm(state.coords, e).toFixed(1)}km` : ''}</small></dd></div>` : ''}
          <div><dt>💳</dt><dd>${esc(e.fee || (e.free ? '무료' : '정보 없음'))}</dd></div>
          ${e.tel ? `<div><dt>☎︎</dt><dd><a href="tel:${esc(e.tel.replace(/[^0-9+]/g, ''))}">${esc(e.tel)}</a></dd></div>` : ''}
          ${e.homepage ? `<div><dt>🔗</dt><dd><a href="${esc(e.homepage)}" target="_blank" rel="noopener">홈페이지 / 예매</a></dd></div>` : ''}
        </dl>
        ${e.overview ? `<p class="overview">${esc(e.overview)}</p>` : ''}
      </div>
      <div class="actions">
        <button class="btn ${isSaved(e.id) ? 'on' : 'primary'}" data-save="${esc(e.id)}">${isSaved(e.id) ? '♥ 저장됨' : '♡ 관심 저장'}</button>
        <button class="btn" data-action="toggle-cal">📅 캘린더에 추가</button>
        <div class="wide" id="calPanel" hidden>
          <div class="group" style="margin:4px 0 8px">
            ${multi ? `
            <label class="row"><div>방문할 날 하루만</div><input type="radio" name="calScope" value="day" checked></label>
            <div class="row"><div>날짜</div><input type="date" id="calDay" value="${defDay}" min="${e.startDate}" max="${e.endDate}" style="font:inherit;border:1px solid var(--line);border-radius:8px;padding:5px 8px;background:var(--surface-2);color:var(--text)"></div>
            <label class="row"><div>전체 기간 (${diffDays(e.startDate, e.endDate) + 1}일)</div><input type="radio" name="calScope" value="all"></label>` : ''}
          </div>
          <div class="actions" style="padding:0">
            <button class="btn primary" data-action="ics">${isIOS ? ' 아이폰 캘린더' : '기본 캘린더 (.ics)'}</button>
            <button class="btn" data-action="gcal">Google 캘린더</button>
          </div>
        </div>
        <button class="btn" data-action="share">공유하기</button>
        <a class="btn" href="https://map.naver.com/p/search/${mapQ}" target="_blank" rel="noopener">길찾기</a>
      </div>
      ${e.source ? `<div class="source">출처: ${esc(e.source)}${e.sourceUrl ? ` · <a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">원문</a>` : ''}</div>` : ''}
    </div>`;
  dlg.dataset.id = e.id;
  if (!dlg.open) dlg.showModal();
  dlg.querySelector('.scroll').scrollTop = 0;
  history.replaceState(null, '', '#event=' + encodeURIComponent(e.id));
}

function closeDetail() {
  const dlg = $('#detail'); if (dlg.open) dlg.close();
  history.replaceState(null, '', location.pathname + location.search);
}

/* ------------------------------------------------------------------ */
/* 관심 저장                                                            */
/* ------------------------------------------------------------------ */
function toggleSave(id) {
  const e = findEvent(id); if (!e) return;
  if (state.saved[id]) { delete state.saved[id]; toast('관심 이벤트에서 뺐어요'); }
  else {
    state.saved[id] = { ...e, savedAt: Date.now() };
    toast(state.settings.notify ? '저장했어요 · 시작 전에 알려드릴게요' : '저장했어요 · 설정에서 알림을 켤 수 있어요');
  }
  LS.set('saved', state.saved);
  render();
  const dlg = $('#detail'); if (dlg.open && dlg.dataset.id === id) openDetail(id);
}

/* ------------------------------------------------------------------ */
/* 캘린더 내보내기 (.ics / Google)                                       */
/* ------------------------------------------------------------------ */
// "19:30", "10:00~18:00", "오후 7시 30분" 같은 문자열에서 시작/종료 시각 추출
function parseTimes(text) {
  if (!text) return null;
  const found = [];
  const re = /(오전|오후)?\s*(\d{1,2})\s*(?::|시)\s*(\d{2})?\s*분?/g;
  let m;
  while ((m = re.exec(text)) && found.length < 2) {
    let h = +m[2]; const mi = +(m[3] || 0);
    if (m[1] === '오후' && h < 12) h += 12;
    if (m[1] === '오전' && h === 12) h = 0;
    if (h <= 24 && mi < 60) found.push([h, mi]);
  }
  if (!found.length) return null;
  const [sh, sm] = found[0];
  let [eh, em] = found[1] || [Math.min(sh + 2, 23), sm];
  if (eh * 60 + em <= sh * 60 + sm) [eh, em] = [Math.min(sh + 2, 23), sm];
  return { sh, sm, eh, em };
}

// KST(UTC+9, 서머타임 없음) → UTC 문자열
function kstToUtc(dateStr, h, mi) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, h - 9, mi));
  return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
const compact = s => s.replace(/-/g, '');

function calRange(e, scope, day) {
  if (scope === 'day' && day) {
    const tm = parseTimes(e.time);
    if (tm) return { timed: true, start: kstToUtc(day, tm.sh, tm.sm), end: kstToUtc(day, tm.eh, tm.em) };
    return { timed: false, start: compact(day), end: compact(ymd(addDays(parseYmd(day), 1))) };
  }
  if (e.startDate === e.endDate) return calRange(e, 'day', e.startDate);
  return { timed: false, start: compact(e.startDate), end: compact(ymd(addDays(parseYmd(e.endDate), 1))) };
}

function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }

function foldLine(line) { // RFC 5545: 75 octets per line
  const enc = new TextEncoder(); const out = []; let cur = ''; let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

function eventUrl(e) { return `${location.origin}${location.pathname}#event=${encodeURIComponent(e.id)}`; }

function veventLines(e, scope, day) {
  const r = calRange(e, scope, day);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const desc = [e.time && `시간: ${e.time}`, e.fee && `참가비: ${e.fee}`, e.homepage && `홈페이지: ${e.homepage}`, `놀곳에서 보기: ${eventUrl(e)}`].filter(Boolean).join('\n');
  const lines = [
    'BEGIN:VEVENT',
    `UID:${e.id}-${r.start}@nolgot`,
    `DTSTAMP:${stamp}`,
    r.timed ? `DTSTART:${r.start}` : `DTSTART;VALUE=DATE:${r.start}`,
    r.timed ? `DTEND:${r.end}` : `DTEND;VALUE=DATE:${r.end}`,
    `SUMMARY:${icsEscape(e.title)}`,
    `LOCATION:${icsEscape([e.place, e.address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    `URL:${eventUrl(e)}`,
  ];
  if (state.settings.alarm) {
    // 종일 일정의 '하루 전' 알림은 전날 오전 9시가 되도록 보정
    let trig = state.settings.alarm;
    if (!r.timed && trig === '-P1D') trig = '-PT15H';
    if (!r.timed && trig === '-P2D') trig = '-PT39H';
    if (!r.timed && /^-PT\dH$/.test(trig)) trig = '-PT0M'; // 종일 일정에 '1시간 전'은 의미가 없어 당일 0시
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(e.title)}`, `TRIGGER:${trig}`, 'END:VALARM');
  }
  lines.push('END:VEVENT');
  return lines;
}

function buildIcs(items) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//nolgot//events//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const it of items) lines.push(...veventLines(it.e, it.scope, it.day));
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

function deliverIcs(ics, filename) {
  if (isIOS) {
    // iOS Safari는 text/calendar data URL을 열면 '캘린더에 추가' 화면을 띄운다
    location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    return;
  }
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function gcalUrl(e, scope, day) {
  const r = calRange(e, scope, day);
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: e.title, dates: `${r.start}/${r.end}`,
    location: [e.place, e.address].filter(Boolean).join(', '),
    details: [e.time && `시간: ${e.time}`, e.fee && `참가비: ${e.fee}`, eventUrl(e)].filter(Boolean).join('\n'),
  });
  return 'https://calendar.google.com/calendar/render?' + p;
}

function currentCalChoice() {
  const dlg = $('#detail');
  const scope = dlg.querySelector('input[name=calScope]:checked')?.value || 'all';
  const day = dlg.querySelector('#calDay')?.value;
  return { scope, day };
}

/* ------------------------------------------------------------------ */
/* 알림                                                                 */
/* ------------------------------------------------------------------ */
async function enableNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) { toast('이 브라우저는 알림을 지원하지 않아요'); return false; }
  if (isIOS && !isStandalone()) { toast('먼저 홈 화면에 앱을 설치해 주세요'); return false; }
  const p = await Notification.requestPermission();
  if (p !== 'granted') { toast('알림 권한이 허용되지 않았어요'); return false; }
  return true;
}

async function checkReminders() {
  if (!state.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker?.ready.catch(() => null);
  if (!reg) return;
  const t = todayStr();
  const notified = LS.get('notified', {});
  for (const e of Object.values(state.saved)) {
    if (e.endDate < t) continue;
    const toStart = diffDays(t, e.startDate), toEnd = diffDays(t, e.endDate);
    let key, title;
    if (toStart >= 0 && toStart <= state.settings.notifyDays) {
      key = `${e.id}:start:${e.startDate}`;
      title = toStart === 0 ? `오늘 시작 · ${e.title}` : `D-${toStart} · ${e.title}`;
    } else if (toStart < 0 && toEnd <= 1) {
      key = `${e.id}:end:${e.endDate}`;
      title = `${toEnd === 0 ? '오늘' : '내일'} 마감 · ${e.title}`;
    }
    if (!key || notified[key]) continue;
    await reg.showNotification(title, {
      body: [fmtRange(e.startDate, e.endDate), e.place].filter(Boolean).join(' · '),
      icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: key, data: { url: eventUrl(e) },
    });
    notified[key] = Date.now();
  }
  LS.set('notified', notified);
}

/* ------------------------------------------------------------------ */
/* 지역 선택                                                            */
/* ------------------------------------------------------------------ */
function openRegionSheet() {
  const dlg = $('#regionSheet');
  dlg.innerHTML = `
    <div class="grab"></div>
    <div class="sheet-head">어디에서 놀까요?</div>
    <div class="scroll">
      <div class="region-grid">
        <button class="near ${state.region === 'near' ? 'active' : ''}" data-region="near">📍 내 위치 주변</button>
        ${REGIONS.map(r => `<button class="${state.region === r ? 'active' : ''}" data-region="${r}">${r}</button>`).join('')}
      </div>
      <div class="radius-row">반경
        ${[5, 10, 20, 50].map(k => `<button class="filter ${state.radiusKm === k ? 'active' : ''}" data-radius="${k}">${k}km</button>`).join('')}
      </div>
    </div>`;
  if (!dlg.open) dlg.showModal();
}

function locate() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { toast('위치 기능을 쓸 수 없어요'); return resolve(false); }
    toast('현재 위치를 확인하는 중…');
    navigator.geolocation.getCurrentPosition(p => {
      state.coords = { lat: p.coords.latitude, lng: p.coords.longitude };
      LS.set('coords', state.coords); resolve(true);
    }, () => { toast('위치 권한을 허용해 주세요'); resolve(false); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  });
}

/* ------------------------------------------------------------------ */
/* 이벤트 핸들러                                                        */
/* ------------------------------------------------------------------ */
document.addEventListener('click', async ev => {
  const t = ev.target;
  const el = s => t.closest(s);

  if (el('[data-save]')) { ev.stopPropagation(); return toggleSave(el('[data-save]').dataset.save); }
  if (el('[data-close]')) return closeDetail();
  if (el('[data-open]')) return openDetail(el('[data-open]').dataset.open, state.tab === 'calendar' ? state.calSel : null);

  if (el('.tabbar button')) { state.tab = el('.tabbar button').dataset.tab; render(); return scrollTo(0, 0); }
  if (el('[data-kind]')) { state.kind = el('[data-kind]').dataset.kind; LS.set('kind', state.kind); return render(); }
  if (el('[data-filter]')) { state.filter = el('[data-filter]').dataset.filter; return render(); }
  if (el('[data-calmode]')) { state.calSavedOnly = el('[data-calmode]').dataset.calmode === 'saved'; return render(); }
  if (el('[data-day]')) { state.calSel = el('[data-day]').dataset.day; const d = parseYmd(state.calSel);
    if (d.getMonth() !== state.calMonth.getMonth()) state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    return render(); }
  if (el('[data-cal]')) {
    const a = el('[data-cal]').dataset.cal, m = state.calMonth;
    if (a === 'prev') state.calMonth = new Date(m.getFullYear(), m.getMonth() - 1, 1);
    if (a === 'next') state.calMonth = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    if (a === 'today') { const d = todayDate(); state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); state.calSel = ymd(d); }
    return render();
  }

  if (el('#regionBtn')) return openRegionSheet();
  if (el('[data-region]')) {
    const r = el('[data-region]').dataset.region;
    if (r === 'near' && !(await locate())) return;
    state.region = r; LS.set('region', r); $('#regionSheet').close(); render(); return;
  }
  if (el('[data-radius]')) { state.radiusKm = +el('[data-radius]').dataset.radius; LS.set('radiusKm', state.radiusKm); openRegionSheet(); return render(); }

  const action = el('[data-action]')?.dataset.action;
  if (action) {
    const id = $('#detail').dataset.id; const e = id && findEvent(id);
    if (action === 'toggle-cal') { const p = $('#calPanel'); p.hidden = !p.hidden; if (!p.hidden) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    if (action === 'ics' && e) { const c = currentCalChoice(); deliverIcs(buildIcs([{ e, ...c }]), `${e.title}.ics`); }
    if (action === 'gcal' && e) { const c = currentCalChoice(); window.open(gcalUrl(e, c.scope, c.day), '_blank', 'noopener'); }
    if (action === 'share' && e) {
      const data = { title: e.title, text: `${e.title} · ${fmtRange(e.startDate, e.endDate)} · ${e.place || ''}`, url: eventUrl(e) };
      if (navigator.share) navigator.share(data).catch(() => {});
      else { navigator.clipboard?.writeText(data.url); toast('링크를 복사했어요'); }
    }
    if (action === 'export-all') {
      const t2 = todayStr();
      const items = Object.values(state.saved).filter(x => x.endDate >= t2).map(x => ({ e: x, scope: 'all' }));
      if (items.length) deliverIcs(buildIcs(items), '놀곳-관심이벤트.ics');
    }
    if (action === 'reset' && confirm('관심 목록을 모두 지울까요?')) { state.saved = {}; LS.set('saved', {}); render(); }
  }
});

// 시트 바깥(백드롭) 탭하면 닫기
for (const id of ['detail', 'regionSheet']) {
  const d = document.getElementById(id);
  d.addEventListener('click', ev => { if (ev.target === d) id === 'detail' ? closeDetail() : d.close(); });
  d.addEventListener('cancel', ev => { if (id === 'detail') { ev.preventDefault(); closeDetail(); } });
}

document.addEventListener('keydown', ev => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[data-open][tabindex]')) { ev.preventDefault(); ev.target.click(); }
});

document.addEventListener('change', async ev => {
  const t = ev.target;
  if (t.id === 'notifyToggle') {
    if (t.checked) { const ok = await enableNotifications(); state.settings.notify = ok; if (!ok) t.checked = false; else { toast('알림을 켰어요'); checkReminders(); } }
    else state.settings.notify = false;
    saveSettings();
  }
  if (t.id === 'notifyDays') { state.settings.notifyDays = +t.value; saveSettings(); checkReminders(); }
  if (t.id === 'alarm') { state.settings.alarm = t.value; saveSettings(); }
});

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { checkReminders(); render(); } });

/* ------------------------------------------------------------------ */
/* 설치 안내                                                            */
/* ------------------------------------------------------------------ */
function setupInstallHint() {
  if (!isIOS || isStandalone() || LS.get('installDismissed', false)) return;
  const h = $('#installHint'); h.hidden = false;
  $('#installClose').onclick = () => { h.hidden = true; LS.set('installDismissed', true); };
}

/* ------------------------------------------------------------------ */
/* 시작                                                                 */
/* ------------------------------------------------------------------ */
async function loadData() {
  try {
    const res = await fetch('data/events.json', { cache: 'no-cache' });
    const json = await res.json();
    state.events = (json.events || []).filter(e => e.id && e.title && e.startDate && e.endDate);
    state.meta = json.meta || {};
    // 저장된 이벤트 스냅샷을 최신 정보로 갱신
    let changed = false;
    for (const e of state.events) if (state.saved[e.id]) { state.saved[e.id] = { ...e, savedAt: state.saved[e.id].savedAt }; changed = true; }
    if (changed) LS.set('saved', state.saved);
  } catch (err) {
    console.error(err);
    toast('이벤트를 불러오지 못했어요');
  }
}

async function main() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.error);
  render();
  await loadData();
  render();
  setupInstallHint();
  const m = location.hash.match(/^#event=(.+)$/);
  if (m) openDetail(decodeURIComponent(m[1]));
  checkReminders();
}
main();
