// 놀곳 — 내 주변 이벤트 추천 PWA (빌드 없이 GitHub Pages에서 바로 동작)
import { t, getLang, setLang, regionLabel } from './i18n.js';

/* ------------------------------------------------------------------ */
/* 설정값                                                              */
/* ------------------------------------------------------------------ */
// 지역 키는 데이터와 맞추기 위해 한국어 그대로 사용, 표시는 regionLabel()로 번역
const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

// kind는 앞으로 워크샵·가이드투어·오디오가이드 등으로 확장되는 축.
// 데이터에 해당 kind가 0개면 탭에 '준비중'으로 표시된다.
const KINDS = [
  { id: 'all', emoji: '✨' },
  { id: 'festival', emoji: '🎉' },
  { id: 'performance', emoji: '🎭' },
  { id: 'exhibition', emoji: '🖼️' },
  { id: 'workshop', emoji: '🧶' },
  { id: 'tour', emoji: '🚶' },
  { id: 'audioguide', emoji: '🎧' },
];
const KIND = Object.fromEntries(KINDS.map(k => [k.id, k]));
const kindLabel = id => t('kind.' + id);

const FILTERS = ['all', 'weekend', 'week', 'month', 'free'];
const SORTS = ['date', 'closing', 'distance'];

const SHARE_SVG = '<span class="share-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></span>';

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

const EN_DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); // Sat, Nov 14
const EN_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });                  // Nov 14
const fmtDay = s => {
  const d = parseYmd(s);
  return getLang() === 'en' ? EN_DAY.format(d) : `${d.getMonth() + 1}.${d.getDate()}(${t('dow')[d.getDay()]})`;
};
const fmtRange = (a, b) => {
  if (a === b) return fmtDay(a);
  if (getLang() === 'en') return `${EN_SHORT.format(parseYmd(a))} – ${EN_SHORT.format(parseYmd(b))}`;
  return `${fmtDay(a)} – ${fmtDay(b)}`;
};
const locale = () => (getLang() === 'en' ? 'en-US' : 'ko-KR');

function weekendRange() {
  const td = todayDate(); const day = td.getDay();
  if (day === 6) return [ymd(td), ymd(addDays(td, 1))];
  if (day === 0) return [ymd(td), ymd(td)];
  const sat = addDays(td, 6 - day);
  return [ymd(sat), ymd(addDays(sat, 1))];
}
function weekRange() { const td = todayDate(); return [ymd(td), ymd(addDays(td, (7 - td.getDay()) % 7))]; }
function monthRange() { const td = todayDate(); return [ymd(td), ymd(new Date(td.getFullYear(), td.getMonth() + 1, 0))]; }
const overlaps = (e, a, b) => e.startDate <= b && e.endDate >= a;
const activeOn = (e, d) => e.startDate <= d && e.endDate >= d;

// cls: st-live(진행중) / st-soon(곧 시작) / st-urgent(마감 임박) / st-ended(종료)
function status(e) {
  const td = todayStr();
  if (e.endDate < td) return { text: t('st.ended'), cls: 'st-ended' };
  if (e.startDate > td) { const n = diffDays(td, e.startDate); return { text: n === 1 ? t('st.tomorrow') : t('st.dday', { n }), cls: 'st-soon' }; }
  const left = diffDays(td, e.endDate);
  if (left === 0) return { text: t('st.todayEnd'), cls: 'st-urgent' };
  if (e.startDate === td) return { text: t('st.todayStart'), cls: 'st-soon' };
  if (left <= 3) return { text: t('st.closing', { n: left }), cls: 'st-urgent' };
  return { text: t('st.live'), cls: 'st-live' };
}
// 색만으로 상태를 전달하지 않도록 항상 텍스트를 함께 출력
const statusHTML = st => `<span class="st ${st.cls}">${esc(st.text)}</span>`;

function distanceKm(a, b) {
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const hasCoords = e => e.lat != null && e.lng != null && !Number.isNaN(+e.lat) && !Number.isNaN(+e.lng);

function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

// 이벤트 필드 현지화: 영어일 때 titleEn 등이 있으면 사용, 없으면 한국어
const L = (e, f) => (getLang() === 'en' && e[f + 'En'] ? e[f + 'En'] : e[f]) ?? '';

/* ------------------------------------------------------------------ */
/* 상태                                                                */
/* ------------------------------------------------------------------ */
const state = {
  events: [],
  meta: {},
  tab: 'browse',
  region: LS.get('region', '서울'),       // 지역 키 또는 'near'
  radiusKm: LS.get('radiusKm', 20),
  coords: LS.get('coords', null),
  kind: LS.get('kind', 'all'),
  filter: 'all',
  sort: LS.get('sort', 'date'),
  query: '',
  calMonth: (() => { const td = todayDate(); return new Date(td.getFullYear(), td.getMonth(), 1); })(),
  calSel: todayStr(),
  calSavedOnly: false,
  saved: LS.get('saved', {}),             // id -> 이벤트 스냅샷
  settings: Object.assign({ notify: false, notifyDays: 1, alarm: '-P1D' }, LS.get('settings', {})),
};
const saveSettings = () => LS.set('settings', state.settings);
if (!KIND[state.kind]) state.kind = 'all';
if (!SORTS.includes(state.sort)) state.sort = 'date';

setLang(LS.get('lang', (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en'));

function inRegion(e) {
  if (state.region === 'near') {
    if (!state.coords || !hasCoords(e)) return false;
    return distanceKm(state.coords, e) <= state.radiusKm;
  }
  return e.region === state.region;
}
// enOnly: 영어 TourAPI에만 있는 이벤트(한국어 필드도 영어) → 한국어 모드에서는 숨김
const visibleEvents = () => (getLang() === 'en' ? state.events : state.events.filter(e => !e.enOnly));
const inKind = e => state.kind === 'all' || e.kind === state.kind;
const isSaved = id => !!state.saved[id];

function sortByDate(list) {
  const td = todayStr();
  return list.sort((a, b) => {
    const as = a.startDate < td ? td : a.startDate, bs = b.startDate < td ? td : b.startDate;
    return as.localeCompare(bs) || a.endDate.localeCompare(b.endDate) || String(a.title).localeCompare(String(b.title));
  });
}
function sortList(list) {
  sortByDate(list);
  if (state.sort === 'closing') list.sort((a, b) => a.endDate.localeCompare(b.endDate));
  if (state.sort === 'distance' && state.coords) {
    const d = e => (hasCoords(e) ? distanceKm(state.coords, e) : Infinity);
    list.sort((a, b) => d(a) - d(b));
  }
  return list;
}

function baseList() {
  const td = todayStr();
  return visibleEvents().filter(e => e.endDate >= td && inRegion(e) && inKind(e));
}

const norm = s => String(s || '').toLowerCase().normalize('NFC');
function matchesQuery(e, q) {
  if (!q) return true;
  const hay = norm([e.title, e.titleEn, e.place, e.placeEn, e.genre, e.genreEn, e.address, e.addressEn,
    kindLabel(e.kind)].filter(Boolean).join(' '));
  return norm(q).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}

/* ------------------------------------------------------------------ */
/* 렌더: 공통 조각                                                      */
/* ------------------------------------------------------------------ */
// 플레이스홀더 포스터: kind 색에서 파생 (docs/color-system.md). 핑크 없음.
const KIND_GRAD = {
  festival: ['#ffb02e', '#f26a1b'], performance: ['#6366f1', '#3730a3'], exhibition: ['#14b8a6', '#0f766e'],
  workshop: ['#eab308', '#b7791f'], tour: ['#22c55e', '#15803d'], audioguide: ['#3b82f6', '#1d4ed8'],
};

function posterHTML(e, cls = '') {
  const [c1, c2] = KIND_GRAD[e.kind] || KIND_GRAD.festival;
  const angle = 115 + (hash(e.id) % 50); // 이벤트마다 각도만 살짝 다르게
  const ph = `<div class="poster ph k-${esc(e.kind)} ${cls}" style="background:linear-gradient(${angle}deg,${c1},${c2})">${KIND[e.kind]?.emoji || '✨'}<b>${esc(L(e, 'title'))}</b></div>`;
  if (!e.poster) return ph;
  // 이미지 로드 실패 시 플레이스홀더로 교체
  return `<div class="poster ${cls}"><img src="${esc(e.poster)}" alt="" loading="lazy" decoding="async"
    onerror="this.parentNode.outerHTML=decodeURIComponent('${encodeURIComponent(ph)}')"></div>`;
}

function tagsHTML(e) {
  let h = `<span class="tag k-${esc(e.kind)}">${esc(L(e, 'genre') || kindLabel(e.kind))}</span> `;
  if (e.free) h += `<span class="tag free">${t('free')}</span>`;
  return h;
}

function heartHTML(e) {
  const on = isSaved(e.id);
  return `<button class="heart ${on ? 'on' : ''}" data-save="${esc(e.id)}" aria-pressed="${on}" aria-label="${esc(t(on ? 'unsave.aria' : 'save.aria'))}">${on ? '♥' : '♡'}</button>`;
}

function cardHTML(e) {
  const st = status(e);
  const dist = state.coords && hasCoords(e) && (state.region === 'near' || state.sort === 'distance')
    ? ` · ${distanceKm(state.coords, e).toFixed(1)}km` : '';
  return `<article class="card" data-open="${esc(e.id)}" tabindex="0" aria-label="${esc(L(e, 'title'))}">
    ${posterHTML(e)}
    <div>
      ${tagsHTML(e)}
      <h3>${esc(L(e, 'title'))}</h3>
      <div class="meta">
        <span>${fmtRange(e.startDate, e.endDate)} · ${statusHTML(st)}</span>
        <span>${esc(L(e, 'place') || L(e, 'address'))}${dist}</span>
        ${L(e, 'fee') ? `<span>${esc(L(e, 'fee'))}</span>` : ''}
      </div>
    </div>
    ${heartHTML(e)}
  </article>`;
}

function bigCardHTML(e) {
  return `<button class="card-big" data-open="${esc(e.id)}">
    ${posterHTML(e)}
    <div class="body">
      ${tagsHTML(e)}
      <h3>${esc(L(e, 'title'))}</h3>
      <div class="meta"><span>${fmtRange(e.startDate, e.endDate)}</span><span>${esc(L(e, 'place'))}</span></div>
    </div>
  </button>`;
}

function emptyHTML(icon, title, desc) {
  return `<div class="empty"><div class="big">${icon}</div><h3>${esc(title)}</h3>${desc ? `<p>${esc(desc)}</p>` : ''}</div>`;
}

function regionName() {
  return state.region === 'near' ? t('region.near', { km: state.radiusKm }) : regionLabel(state.region);
}

/* ------------------------------------------------------------------ */
/* 렌더: 정적 텍스트(index.html)                                        */
/* ------------------------------------------------------------------ */
function applyStatic() {
  document.documentElement.lang = getLang();
  document.title = t('app.name');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml, { share: SHARE_SVG }); });
}

/* ------------------------------------------------------------------ */
/* 렌더: 탭                                                             */
/* ------------------------------------------------------------------ */
function renderKinds() {
  const el = $('#kindTabs');
  el.hidden = !(state.tab === 'browse' || state.tab === 'calendar');
  const counts = {};
  for (const e of visibleEvents()) counts[e.kind] = (counts[e.kind] || 0) + 1;
  el.innerHTML = KINDS.map(k => {
    const soon = k.id !== 'all' && !counts[k.id];
    const on = state.kind === k.id;
    return `<button class="chip ${k.id !== 'all' ? 'k-' + k.id : ''} ${on ? 'active' : ''}" data-kind="${k.id}" aria-pressed="${on}">${esc(kindLabel(k.id))}${soon ? `<span class="soon">${t('kind.soon')}</span>` : ''}</button>`;
  }).join('');
}

function soonHTML() {
  const k = KIND[state.kind];
  return emptyHTML(k.emoji, t('soon.title', { label: kindLabel(k.id) }), t('soon.desc'));
}

const kindHasData = () => state.kind === 'all' || visibleEvents().some(e => e.kind === state.kind);

function renderBrowse() {
  if (!kindHasData()) return soonHTML();
  return `
    <div class="search">
      <input id="searchInput" class="search-input" type="search" enterkeyhint="search" autocomplete="off"
        value="${esc(state.query)}" placeholder="${esc(t('search.placeholder'))}" aria-label="${esc(t('search.aria'))}">
      <button class="search-clear" data-action="clear-search" aria-label="${esc(t('search.clear'))}" ${state.query ? '' : 'hidden'}>✕</button>
    </div>
    <div id="results">${renderResults()}</div>`;
}

// 검색 입력 시 입력창 포커스를 잃지 않도록 결과 영역만 다시 그린다
function renderResults() {
  const all = baseList();
  const q = state.query.trim();
  let html = '';

  if (!q) {
    html += reminderBannerHTML();
    // 이번 주말 추천
    const [ws, we] = weekendRange();
    const weekend = sortByDate(all.filter(e => overlaps(e, ws, we)))
      .sort((a, b) => isSaved(b.id) - isSaved(a.id)) // 저장한 것 먼저, 나머지는 날짜순 유지
      .slice(0, 12);
    if (weekend.length) {
      html += `<div class="section-title">${t('weekend.title')} <small>${fmtRange(ws, we)}</small></div>
        <div class="rail">${weekend.map(bigCardHTML).join('')}</div>`;
    }
  }

  // 필터 + 목록
  let list = all.filter(e => matchesQuery(e, q));
  const [ws, we] = weekendRange();
  if (state.filter === 'weekend') list = list.filter(e => overlaps(e, ws, we));
  if (state.filter === 'week') { const [a, b] = weekRange(); list = list.filter(e => overlaps(e, a, b)); }
  if (state.filter === 'month') { const [a, b] = monthRange(); list = list.filter(e => overlaps(e, a, b)); }
  if (state.filter === 'free') list = list.filter(e => e.free);
  sortList(list);

  const sorts = SORTS.filter(s => s !== 'distance' || state.coords);
  html += `<div class="section-title">${esc(t('list.title', { region: regionName() }))} <small>${t('count', { n: list.length })}</small></div>
    <div class="list-controls">
      <div class="filters">${FILTERS.map(f => `<button class="filter ${state.filter === f ? 'active' : ''}" data-filter="${f}" aria-pressed="${state.filter === f}">${t('filter.' + f)}</button>`).join('')}</div>
      <select id="sortSelect" class="sort-select" aria-label="${esc(t('sort.aria'))}">
        ${sorts.map(s => `<option value="${s}" ${state.sort === s ? 'selected' : ''}>${t('sort.' + s)}</option>`).join('')}
      </select>
    </div>
    <div style="height:10px"></div>`;

  if (!list.length) {
    if (q) html += emptyHTML('🔍', t('empty.searchTitle', { q }), t('empty.searchDesc'));
    else if (state.region === 'near' && !state.coords) html += emptyHTML('📍', t('empty.locTitle'), t('empty.locDesc'));
    else html += emptyHTML('🔍', t('empty.noneTitle'), t('empty.noneDesc'));
  } else {
    html += `<div class="list">${list.slice(0, 200).map(cardHTML).join('')}</div>`;
  }
  return html;
}

function reminderBannerHTML() {
  const td = todayStr();
  const soon = Object.values(state.saved)
    .filter(e => e.endDate >= td && diffDays(td, e.startDate) <= 3)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (!soon.length) return '';
  const e = soon[0];
  const more = soon.length > 1 ? esc(t('banner.more', { n: soon.length - 1 })) : '';
  return `<div class="banner" data-open="${esc(e.id)}" role="button" tabindex="0">🔔 <div>${esc(t('banner.saved'))} <b>${esc(L(e, 'title'))}</b>${more} · ${statusHTML(status(e))}</div></div>`;
}

function renderCalendar() {
  if (!kindHasData()) return soonHTML();

  const m = state.calMonth;
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const rangeA = ymd(start), rangeB = ymd(addDays(start, 41));
  const td = todayStr();

  const pool = state.calSavedOnly
    ? Object.values(state.saved).filter(inKind)
    : visibleEvents().filter(e => inRegion(e) && inKind(e) && overlaps(e, rangeA, rangeB));

  let cells = t('dow').map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i); const s = ymd(d);
    const act = pool.filter(e => activeOn(e, s));
    const nSaved = act.filter(e => isSaved(e.id)).length;
    const nOther = act.length - nSaved;
    const dots = '<i class="saved"></i>'.repeat(Math.min(nSaved, 2)) + '<i></i>'.repeat(Math.min(nOther, 3 - Math.min(nSaved, 2)));
    const cls = ['day', d.getMonth() !== m.getMonth() && 'out', d.getDay() === 0 && 'sun', d.getDay() === 6 && 'sat',
      s === td && 'today', s === state.calSel && 'sel'].filter(Boolean).join(' ');
    cells += `<button class="${cls}" data-day="${s}" aria-pressed="${s === state.calSel}" aria-label="${esc(t('cal.dayAria', { date: fmtDay(s), n: act.length }))}">
      <span class="n">${d.getDate()}</span><span class="dots">${dots}</span>${act.length > 3 ? `<span class="cnt">${act.length}</span>` : ''}</button>`;
  }

  const dayList = sortByDate(pool.filter(e => activeOn(e, state.calSel)));
  return `
    <div class="cal-head">
      <h2>${t('cal.month', { y: m.getFullYear(), m: m.getMonth() + 1 })}</h2>
      <div class="nav">
        <button class="today-btn" data-cal="today">${t('cal.today')}</button>
        <button class="icon-btn" data-cal="prev" aria-label="${esc(t('cal.prev'))}">‹</button>
        <button class="icon-btn" data-cal="next" aria-label="${esc(t('cal.next'))}">›</button>
      </div>
    </div>
    <div class="filters" style="margin-bottom:10px">
      <button class="filter ${!state.calSavedOnly ? 'active' : ''}" data-calmode="all" aria-pressed="${!state.calSavedOnly}">${esc(t('cal.allIn', { region: regionName() }))}</button>
      <button class="filter ${state.calSavedOnly ? 'active' : ''}" data-calmode="saved" aria-pressed="${state.calSavedOnly}">${t('cal.savedOnly')}</button>
    </div>
    <div class="cal">${cells}</div>
    <div class="legend"><span><i></i>${t('cal.legendEvent')}</span><span><i class="saved"></i>${t('cal.legendSaved')}</span></div>
    <div class="section-title">${fmtDay(state.calSel)} <small>${t('count', { n: dayList.length })}</small></div>
    ${dayList.length ? `<div class="list">${dayList.map(cardHTML).join('')}</div>` : emptyHTML('🗓️', t('cal.emptyTitle'), t('cal.emptyDesc'))}
  `;
}

function renderSaved() {
  const td = todayStr();
  const all = Object.values(state.saved);
  if (!all.length) return emptyHTML('♡', t('saved.emptyTitle'), t('saved.emptyDesc'));
  const upcoming = sortByDate(all.filter(e => e.endDate >= td));
  const past = all.filter(e => e.endDate < td).sort((a, b) => b.endDate.localeCompare(a.endDate));
  let html = `<div class="section-title">${t('saved.upcoming')} <small>${t('count', { n: upcoming.length })}</small></div>`;
  html += upcoming.length ? `<div class="list">${upcoming.map(cardHTML).join('')}</div>` : emptyHTML('🎈', t('saved.noUpcoming'), '');
  if (upcoming.length) html += `<div style="height:12px"></div><button class="btn wide" style="width:100%" data-action="export-all">${t('saved.exportAll')}</button>`;
  if (past.length) html += `<div class="section-title">${t('saved.past')} <small>${t('count', { n: past.length })}</small></div><div class="list past">${past.map(cardHTML).join('')}</div>`;
  return html;
}

function renderSettings() {
  const s = state.settings;
  const notifSupported = 'Notification' in window && 'serviceWorker' in navigator;
  const perm = notifSupported ? Notification.permission : 'unsupported';
  let notifNote = t('set.notifNote');
  if (isIOS && !isStandalone()) notifNote = t('set.notifIos');
  else if (!notifSupported) notifNote = t('set.notifUnsupported');
  else if (perm === 'denied') notifNote = t('set.notifDenied');

  const m = state.meta;
  const lang = getLang();
  const updated = m.updatedAt ? new Date(m.updatedAt).toLocaleString(locale()) : '-';
  return `
    <div class="section-title">${t('set.language')}</div>
    <div class="group">
      <div class="row"><div>${t('set.languageRow')}</div>
        <div class="seg" role="radiogroup" aria-label="${esc(t('set.language'))}">
          <button role="radio" aria-checked="${lang === 'ko'}" class="${lang === 'ko' ? 'active' : ''}" data-lang="ko" lang="ko">한국어</button>
          <button role="radio" aria-checked="${lang === 'en'}" class="${lang === 'en' ? 'active' : ''}" data-lang="en" lang="en">English</button>
        </div></div>
    </div>

    <div class="section-title">${t('set.notif')}</div>
    <div class="group">
      <label class="row"><div>${t('set.notifRow')}<small>${esc(notifNote)}</small></div>
        <span class="switch"><input type="checkbox" id="notifyToggle" ${s.notify && perm === 'granted' ? 'checked' : ''}><span></span></span></label>
      <div class="row"><div>${t('set.when')}</div>
        <select id="notifyDays">
          ${[0, 1, 3, 7].map(v => `<option value="${v}" ${s.notifyDays == v ? 'selected' : ''}>${t('set.d' + v)}</option>`).join('')}
        </select></div>
    </div>
    <p class="note">${t('set.calNote')}</p>
    <div class="group">
      <div class="row"><div>${t('set.alarm')}</div>
        <select id="alarm">
          ${[['', 'aNone'], ['-PT1H', 'a1h'], ['-PT3H', 'a3h'], ['-P1D', 'a1d'], ['-P2D', 'a2d']].map(([v, l]) => `<option value="${v}" ${s.alarm === v ? 'selected' : ''}>${t('set.' + l)}</option>`).join('')}
        </select></div>
    </div>

    <div class="section-title">${t('set.app')}</div>
    <div class="group">
      <div class="row"><div>${t('set.install')}<small>${isStandalone() ? t('set.installed') : (isIOS ? t('set.installIos') : t('set.installOther'))}</small></div></div>
      <div class="row"><div>${t('set.data')}<small>${m.source === 'sample' ? t('set.dataSample') : esc(m.source || '-')}<br>${esc(t('set.updated', { at: updated, n: t('count', { n: visibleEvents().length }) }))}</small></div></div>
      <button class="row danger-row" style="width:100%;border:0;background:none;text-align:left" data-action="reset"><div>${t('set.reset')}</div></button>
    </div>
  `;
}

function render() {
  applyStatic();
  renderKinds();
  const v = $('#view');
  v.innerHTML = ({ browse: renderBrowse, calendar: renderCalendar, saved: renderSaved, settings: renderSettings })[state.tab]();
  $('#regionLabel').textContent = regionName();
  document.querySelectorAll('.tabbar button').forEach(b => {
    const on = b.dataset.tab === state.tab;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  const n = Object.values(state.saved).filter(e => e.endDate >= todayStr()).length;
  const badge = $('#savedCount'); badge.hidden = !n; badge.textContent = n;
  $('#sampleBadge').hidden = state.meta.source !== 'sample';
}

function renderResultsOnly() {
  const r = $('#results');
  if (!r) return render();
  r.innerHTML = renderResults();
  const clear = $('.search-clear'); if (clear) clear.hidden = !state.query;
}

/* ------------------------------------------------------------------ */
/* 시트 + 브라우저 뒤로가기                                              */
/* ------------------------------------------------------------------ */
// 시트를 열 때 history 항목을 추가해, 모바일 뒤로가기(스와이프)로 닫히게 한다.
function openSheet(dlg, hashStr) {
  if (!dlg.open) {
    dlg.showModal();
    history.pushState({ sheet: dlg.id }, '', hashStr || location.href);
  } else if (hashStr) {
    history.replaceState({ sheet: dlg.id }, '', hashStr);
  }
}
function closeSheet(dlg) {
  if (!dlg.open) return;
  if (history.state?.sheet === dlg.id) history.back(); // popstate에서 닫힘
  else { dlg.close(); clearHash(); }
}
function clearHash() {
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
}
window.addEventListener('popstate', () => {
  for (const id of ['detail', 'regionSheet']) { const d = document.getElementById(id); if (d.open) d.close(); }
  const m = location.hash.match(/^#event=(.+)$/);
  if (m && history.state?.sheet === 'detail') openDetail(decodeURIComponent(m[1]), null, { fromHistory: true });
});

/* ------------------------------------------------------------------ */
/* 상세 시트                                                            */
/* ------------------------------------------------------------------ */
function findEvent(id) { return state.events.find(e => e.id === id) || state.saved[id]; }

function openDetail(id, preferDay, { fromHistory = false } = {}) {
  const e = findEvent(id); if (!e) return;
  const dlg = $('#detail');
  const st = status(e);
  const place = L(e, 'place'), address = L(e, 'address');
  const mapQ = encodeURIComponent(e.address || e.place || ''); // 지도 검색은 한국어 주소가 정확
  const multi = e.startDate !== e.endDate;
  const nDays = diffDays(e.startDate, e.endDate) + 1;
  const td = todayStr();
  const defDay = preferDay && activeOn(e, preferDay) ? preferDay : (e.startDate < td && e.endDate >= td ? td : e.startDate);
  const fee = L(e, 'fee') || (e.free ? t('free') : t('detail.feeUnknown'));
  const saved = isSaved(e.id);

  dlg.innerHTML = `
    <button class="close" data-close aria-label="${esc(t('detail.close'))}">✕</button>
    <div class="scroll">
      ${posterHTML(e, 'detail-poster')}
      <div class="detail-body">
        ${tagsHTML(e)}
        <h2 id="detailTitle">${esc(L(e, 'title'))}</h2>
        <dl class="info">
          <div><dt aria-hidden="true">🗓</dt><dd>${fmtRange(e.startDate, e.endDate)}<small>${statusHTML(st)}${multi ? esc(t('detail.days', { n: nDays })) : ''}</small></dd></div>
          ${L(e, 'time') ? `<div><dt aria-hidden="true">🕒</dt><dd>${esc(L(e, 'time'))}</dd></div>` : ''}
          ${place || address ? `<div><dt aria-hidden="true">📍</dt><dd>${esc(place || address)}${address && place && address !== place ? `<small>${esc(address)}</small>` : ''}
            <small><a href="https://map.naver.com/p/search/${mapQ}" target="_blank" rel="noopener">${t('detail.naver')}</a> · <a href="https://map.kakao.com/link/search/${mapQ}" target="_blank" rel="noopener">${t('detail.kakao')}</a>${state.coords && hasCoords(e) ? ` · ${esc(t('detail.away', { km: distanceKm(state.coords, e).toFixed(1) }))}` : ''}</small></dd></div>` : ''}
          <div><dt aria-hidden="true">💳</dt><dd>${esc(fee)}</dd></div>
          ${e.tel ? `<div><dt aria-hidden="true">☎︎</dt><dd><a href="tel:${esc(e.tel.replace(/[^0-9+]/g, ''))}">${esc(e.tel)}</a></dd></div>` : ''}
          ${e.homepage ? `<div><dt aria-hidden="true">🔗</dt><dd><a href="${esc(e.homepage)}" target="_blank" rel="noopener">${t('detail.homepage')}</a></dd></div>` : ''}
        </dl>
        ${L(e, 'overview') ? `<p class="overview">${esc(L(e, 'overview'))}</p>` : ''}
      </div>
      <div class="actions">
        <button class="btn ${saved ? 'on' : 'primary'}" data-save="${esc(e.id)}" aria-pressed="${saved}">${t(saved ? 'detail.saved' : 'detail.save')}</button>
        <button class="btn" data-action="toggle-cal" aria-expanded="false" aria-controls="calPanel">${t('detail.addCal')}</button>
        <div class="wide cal-panel" id="calPanel" hidden>
          ${multi ? `<div class="group" style="margin:4px 0 8px">
            <label class="row"><div>${t('detail.oneDay')}</div><input type="radio" name="calScope" value="day" checked></label>
            <div class="row"><label for="calDay">${t('detail.date')}</label><input type="date" id="calDay" class="date-input" value="${defDay}" min="${e.startDate}" max="${e.endDate}"></div>
            <label class="row"><div>${esc(t('detail.wholePeriod', { n: nDays }))}</div><input type="radio" name="calScope" value="all"></label>
          </div>` : ''}
          <div class="actions" style="padding:0">
            <button class="btn primary" data-action="ics">${t(isIOS ? 'detail.icsIos' : 'detail.icsOther')}</button>
            <button class="btn" data-action="gcal">${t('detail.gcal')}</button>
          </div>
        </div>
        <button class="btn" data-action="share">${t('detail.share')}</button>
        <a class="btn" href="https://map.naver.com/p/search/${mapQ}" target="_blank" rel="noopener">${t('detail.directions')}</a>
      </div>
      ${e.source ? `<div class="source">${t('detail.source')}: ${esc(e.source)}${e.sourceUrl ? ` · <a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">${t('detail.original')}</a>` : ''}</div>` : ''}
    </div>`;
  dlg.setAttribute('aria-labelledby', 'detailTitle');
  const wasOpen = dlg.open;
  dlg.dataset.id = e.id;
  const hashStr = '#event=' + encodeURIComponent(e.id);
  if (fromHistory) { if (!dlg.open) dlg.showModal(); }
  else openSheet(dlg, hashStr);
  if (!wasOpen) dlg.querySelector('.scroll').scrollTop = 0;
}

const closeDetail = () => closeSheet($('#detail'));

/* ------------------------------------------------------------------ */
/* 관심 저장                                                            */
/* ------------------------------------------------------------------ */
function toggleSave(id) {
  const e = findEvent(id); if (!e) return;
  if (state.saved[id]) { delete state.saved[id]; toast(t('toast.unsaved')); }
  else {
    state.saved[id] = { ...e, savedAt: Date.now() };
    toast(state.settings.notify ? t('toast.savedNotify') : t('toast.saved'));
  }
  LS.set('saved', state.saved);
  // 검색 중이면 입력 포커스를 유지하기 위해 결과만 갱신
  if (state.tab === 'browse' && $('#results')) { renderResultsOnly(); renderBadges(); } else render();
  const dlg = $('#detail');
  if (dlg.open && dlg.dataset.id === id) {
    const scroll = dlg.querySelector('.scroll')?.scrollTop || 0;
    openDetail(id, null, { fromHistory: true });
    dlg.querySelector('.scroll').scrollTop = scroll;
  }
}

function renderBadges() {
  const n = Object.values(state.saved).filter(e => e.endDate >= todayStr()).length;
  const badge = $('#savedCount'); badge.hidden = !n; badge.textContent = n;
}

/* ------------------------------------------------------------------ */
/* 캘린더 내보내기 (.ics / Google)                                       */
/* ------------------------------------------------------------------ */
// "19:30", "10:00~18:00", "오후 7시 30분", "7:30 PM" 같은 문자열에서 시작/종료 시각 추출
function parseTimes(text) {
  if (!text) return null;
  const found = [];
  const re = /(오전|오후)?\s*(\d{1,2})\s*(?::|시)\s*(\d{2})?\s*분?\s*(am|pm|AM|PM)?/g;
  let m;
  while ((m = re.exec(text)) && found.length < 2) {
    let h = +m[2]; const mi = +(m[3] || 0);
    const pm = m[1] === '오후' || /pm/i.test(m[4] || ''), am = m[1] === '오전' || /am/i.test(m[4] || '');
    if (pm && h < 12) h += 12;
    if (am && h === 12) h = 0;
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

function eventDetailsText(e) {
  return [L(e, 'time') && `${t('ics.time')}: ${L(e, 'time')}`, L(e, 'fee') && `${t('ics.fee')}: ${L(e, 'fee')}`,
    e.homepage && `${t('ics.homepage')}: ${e.homepage}`, `${t('ics.view')}: ${eventUrl(e)}`].filter(Boolean).join('\n');
}

function veventLines(e, scope, day) {
  const r = calRange(e, scope, day);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VEVENT',
    `UID:${e.id}-${r.start}@nolgot`,
    `DTSTAMP:${stamp}`,
    r.timed ? `DTSTART:${r.start}` : `DTSTART;VALUE=DATE:${r.start}`,
    r.timed ? `DTEND:${r.end}` : `DTEND;VALUE=DATE:${r.end}`,
    `SUMMARY:${icsEscape(L(e, 'title'))}`,
    `LOCATION:${icsEscape([L(e, 'place'), L(e, 'address')].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${icsEscape(eventDetailsText(e))}`,
    `URL:${eventUrl(e)}`,
  ];
  if (state.settings.alarm) {
    // 종일 일정의 '하루 전' 알림은 전날 오전 9시가 되도록 보정
    let trig = state.settings.alarm;
    if (!r.timed && trig === '-P1D') trig = '-PT15H';
    if (!r.timed && trig === '-P2D') trig = '-PT39H';
    if (!r.timed && /^-PT\dH$/.test(trig)) trig = '-PT0M'; // 종일 일정에 '1시간 전'은 의미가 없어 당일 0시
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(L(e, 'title'))}`, `TRIGGER:${trig}`, 'END:VALARM');
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
  a.href = URL.createObjectURL(blob); a.download = filename.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function gcalUrl(e, scope, day) {
  const r = calRange(e, scope, day);
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: L(e, 'title'), dates: `${r.start}/${r.end}`,
    location: [L(e, 'place'), L(e, 'address')].filter(Boolean).join(', '),
    details: eventDetailsText(e),
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
  if (!('Notification' in window) || !('serviceWorker' in navigator)) { toast(t('toast.notifUnsupported')); return false; }
  if (isIOS && !isStandalone()) { toast(t('toast.installFirst')); return false; }
  const p = await Notification.requestPermission();
  if (p !== 'granted') { toast(t('toast.notifDenied')); return false; }
  return true;
}

async function checkReminders() {
  if (!state.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker?.ready.catch(() => null);
  if (!reg) return;
  const td = todayStr();
  const notified = LS.get('notified', {});
  for (const e of Object.values(state.saved)) {
    if (e.endDate < td) continue;
    const toStart = diffDays(td, e.startDate), toEnd = diffDays(td, e.endDate);
    const title = L(e, 'title');
    let key, head;
    if (toStart >= 0 && toStart <= state.settings.notifyDays) {
      key = `${e.id}:start:${e.startDate}`;
      head = toStart === 0 ? t('notif.todayStart', { title }) : t('notif.dday', { n: toStart, title });
    } else if (toStart < 0 && toEnd <= 1) {
      key = `${e.id}:end:${e.endDate}`;
      head = t(toEnd === 0 ? 'notif.todayEnd' : 'notif.tomorrowEnd', { title });
    }
    if (!key || notified[key]) continue;
    try {
      await reg.showNotification(head, {
        body: [fmtRange(e.startDate, e.endDate), L(e, 'place')].filter(Boolean).join(' · '),
        icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: key, data: { url: eventUrl(e) },
      });
      notified[key] = Date.now();
    } catch (err) { console.warn(err); }
  }
  LS.set('notified', notified);
}

/* ------------------------------------------------------------------ */
/* 지역 선택                                                            */
/* ------------------------------------------------------------------ */
function renderRegionSheet() {
  const dlg = $('#regionSheet');
  dlg.setAttribute('aria-labelledby', 'regionSheetTitle');
  dlg.innerHTML = `
    <div class="grab" aria-hidden="true"></div>
    <div class="sheet-head" id="regionSheetTitle">${t('region.sheet')}</div>
    <div class="scroll">
      <div class="region-grid">
        <button class="near ${state.region === 'near' ? 'active' : ''}" data-region="near" aria-pressed="${state.region === 'near'}">${t('region.nearBtn')}</button>
        ${REGIONS.map(r => `<button class="${state.region === r ? 'active' : ''}" data-region="${r}" aria-pressed="${state.region === r}">${esc(regionLabel(r))}</button>`).join('')}
      </div>
      <div class="radius-row">${t('region.radius')}
        ${[5, 10, 20, 50].map(k => `<button class="filter ${state.radiusKm === k ? 'active' : ''}" data-radius="${k}" aria-pressed="${state.radiusKm === k}">${k}km</button>`).join('')}
      </div>
    </div>`;
}
function openRegionSheet() { renderRegionSheet(); openSheet($('#regionSheet')); }

function locate() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { toast(t('toast.noGeo')); return resolve(false); }
    toast(t('toast.locating'));
    navigator.geolocation.getCurrentPosition(p => {
      state.coords = { lat: p.coords.latitude, lng: p.coords.longitude };
      LS.set('coords', state.coords); resolve(true);
    }, () => { toast(t('toast.allowGeo')); resolve(false); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  });
}

function changeLang(l) {
  setLang(l); LS.set('lang', getLang());
  render();
  if ($('#regionSheet').open) renderRegionSheet();
  const dlg = $('#detail'); if (dlg.open && dlg.dataset.id) openDetail(dlg.dataset.id, null, { fromHistory: true });
}

/* ------------------------------------------------------------------ */
/* 이벤트 핸들러                                                        */
/* ------------------------------------------------------------------ */
document.addEventListener('click', async ev => {
  const tg = ev.target;
  const el = s => tg.closest(s);

  if (el('[data-save]')) { ev.stopPropagation(); return toggleSave(el('[data-save]').dataset.save); }
  if (el('[data-close]')) return closeDetail();
  if (el('#langBtn')) return changeLang(getLang() === 'ko' ? 'en' : 'ko');
  if (el('[data-lang]')) return changeLang(el('[data-lang]').dataset.lang);
  if (el('[data-open]')) return openDetail(el('[data-open]').dataset.open, state.tab === 'calendar' ? state.calSel : null);

  if (el('.tabbar button')) { state.tab = el('.tabbar button').dataset.tab; render(); return scrollTo(0, 0); }
  if (el('[data-kind]')) { state.kind = el('[data-kind]').dataset.kind; LS.set('kind', state.kind); return render(); }
  if (el('[data-filter]')) { state.filter = el('[data-filter]').dataset.filter; return state.tab === 'browse' ? renderResultsOnly() : render(); }
  if (el('[data-calmode]')) { state.calSavedOnly = el('[data-calmode]').dataset.calmode === 'saved'; return render(); }
  if (el('[data-day]')) {
    state.calSel = el('[data-day]').dataset.day; const d = parseYmd(state.calSel);
    if (d.getMonth() !== state.calMonth.getMonth()) state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    return render();
  }
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
    state.region = r; LS.set('region', r);
    if (r === 'near' && state.sort === 'date') state.sort = 'distance';
    closeSheet($('#regionSheet')); render(); return;
  }
  if (el('[data-radius]')) { state.radiusKm = +el('[data-radius]').dataset.radius; LS.set('radiusKm', state.radiusKm); renderRegionSheet(); return render(); }

  const action = el('[data-action]')?.dataset.action;
  if (action) {
    const id = $('#detail').dataset.id; const e = id && findEvent(id);
    if (action === 'clear-search') { state.query = ''; const i = $('#searchInput'); if (i) { i.value = ''; i.focus(); } return renderResultsOnly(); }
    if (action === 'toggle-cal') {
      const p = $('#calPanel'); p.hidden = !p.hidden;
      el('[data-action]').setAttribute('aria-expanded', String(!p.hidden));
      if (!p.hidden) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (action === 'ics' && e) { const c = currentCalChoice(); deliverIcs(buildIcs([{ e, ...c }]), `${L(e, 'title')}.ics`); }
    if (action === 'gcal' && e) { const c = currentCalChoice(); window.open(gcalUrl(e, c.scope, c.day), '_blank', 'noopener'); }
    if (action === 'share' && e) {
      const data = { title: L(e, 'title'), text: `${L(e, 'title')} · ${fmtRange(e.startDate, e.endDate)} · ${L(e, 'place')}`, url: eventUrl(e) };
      if (navigator.share) navigator.share(data).catch(() => {});
      else { navigator.clipboard?.writeText(data.url); toast(t('toast.copied')); }
    }
    if (action === 'export-all') {
      const td = todayStr();
      const items = Object.values(state.saved).filter(x => x.endDate >= td).map(x => ({ e: x, scope: 'all' }));
      if (items.length) deliverIcs(buildIcs(items), t('ics.exportName'));
    }
    if (action === 'reset' && confirm(t('set.resetConfirm'))) { state.saved = {}; LS.set('saved', {}); render(); }
  }
});

// 시트 바깥(백드롭) 탭 / Esc 로 닫기
for (const id of ['detail', 'regionSheet']) {
  const d = document.getElementById(id);
  d.addEventListener('click', ev => { if (ev.target === d) closeSheet(d); });
  d.addEventListener('cancel', ev => { ev.preventDefault(); closeSheet(d); });
}

document.addEventListener('keydown', ev => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[data-open][tabindex]')) { ev.preventDefault(); ev.target.click(); }
});

document.addEventListener('input', ev => {
  if (ev.target.id === 'searchInput') {
    state.query = ev.target.value;
    clearTimeout(renderResultsOnly.t);
    renderResultsOnly.t = setTimeout(renderResultsOnly, 120);
  }
});

document.addEventListener('change', async ev => {
  const tg = ev.target;
  if (tg.id === 'sortSelect') { state.sort = tg.value; LS.set('sort', state.sort); return renderResultsOnly(); }
  if (tg.id === 'notifyToggle') {
    if (tg.checked) {
      const ok = await enableNotifications(); state.settings.notify = ok;
      if (!ok) tg.checked = false; else { toast(t('toast.notifOn')); checkReminders(); }
    } else state.settings.notify = false;
    saveSettings();
  }
  if (tg.id === 'notifyDays') { state.settings.notifyDays = +tg.value; saveSettings(); checkReminders(); }
  if (tg.id === 'alarm') { state.settings.alarm = tg.value; saveSettings(); }
});

document.addEventListener('submit', ev => ev.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  checkReminders();
  // 입력 중에는 다시 그리지 않음 (날짜가 바뀌었을 수 있으니 그 외엔 갱신)
  if (document.activeElement?.id !== 'searchInput') render();
});

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
    toast(t('toast.loadFail'));
  }
}

async function main() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.error);
  render();
  await loadData();
  render();
  setupInstallHint();
  // 공유 링크(#event=...)로 들어온 경우: 기본 화면 위에 상세를 열어 뒤로가기로 앱에 남도록
  const m = location.hash.match(/^#event=(.+)$/);
  if (m) {
    history.replaceState(null, '', location.pathname + location.search);
    openDetail(decodeURIComponent(m[1]));
  }
  checkReminders();
}
main();
