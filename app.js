// 놀곳 — 전 세계 도시의 이벤트·체험·오디오투어 PWA (빌드 없이 GitHub Pages에서 동작)
// 데이터 형식: docs/data-contract.md
import { t, getLang, setLang, REGION_EN } from './i18n.js';
import { guidesFor } from './guides.js';

/* ------------------------------------------------------------------ */
/* 설정값                                                              */
/* ------------------------------------------------------------------ */
const KINDS = ['all', 'festival', 'performance', 'exhibition', 'workshop', 'tour', 'audioguide'];
const EXP_KINDS = new Set(['workshop', 'tour', 'audioguide']);  // 상시 예약/이용 가능한 체험류
const BOOKABLE = new Set(['workshop', 'tour']);
const kindLabel = id => t('kind.' + id);

const FILTERS = ['all', 'weekend', 'week', 'month', 'free'];
const SORTS = ['date', 'closing', 'distance'];
const NEAREST_MAX_KM = 150;

// 예전(v1) 지역 키 → v2 도시 id
const LEGACY_REGION = {
  서울: 'seoul', 경기: 'gyeonggi', 인천: 'incheon', 부산: 'busan', 대구: 'daegu', 광주: 'gwangju', 대전: 'daejeon',
  울산: 'ulsan', 세종: 'sejong', 강원: 'gangwon', 충북: 'chungbuk', 충남: 'chungnam', 전북: 'jeonbuk', 전남: 'jeonnam',
  경북: 'gyeongbuk', 경남: 'gyeongnam', 제주: 'jeju',
};

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
const safeUrl = u => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addDaysStr = (s, n) => ymd(addDays(parseYmd(s), n));
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000); // b - a
const locale = () => (getLang() === 'en' ? 'en-US' : 'ko-KR');

/* ---------- 타임존 ---------- */
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const tzCache = new Map();
function validTz(tz) {
  if (!tz) return LOCAL_TZ;
  if (tzCache.has(tz)) return tzCache.get(tz) ? tz : LOCAL_TZ;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); tzCache.set(tz, true); return tz; }
  catch { tzCache.set(tz, false); return LOCAL_TZ; }
}
const dayFmtCache = new Map();
// 해당 타임존의 '오늘' (YYYY-MM-DD)
function todayIn(tz) {
  tz = validTz(tz);
  if (!dayFmtCache.has(tz)) dayFmtCache.set(tz, new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }));
  return dayFmtCache.get(tz).format(new Date());
}
function tzOffsetMs(tz, utcMs) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - utcMs;
}
// 현지 날짜·시각(tz) → UTC ms (서머타임 경계 보정 2회)
function localToUtcMs(dateStr, h, mi, tz) {
  tz = validTz(tz);
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let ms = guess - tzOffsetMs(tz, guess);
  ms = guess - tzOffsetMs(tz, ms);
  return ms;
}
const utcStamp = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/* ---------- 날짜 표시 ---------- */
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

function weekendRange(base) {
  const d = parseYmd(base); const day = d.getDay();
  if (day === 6) return [base, addDaysStr(base, 1)];
  if (day === 0) return [base, base];
  const sat = addDaysStr(base, 6 - day);
  return [sat, addDaysStr(sat, 1)];
}
const weekRange = base => [base, addDaysStr(base, (7 - parseYmd(base).getDay()) % 7)];
function monthRange(base) { const d = parseYmd(base); return [base, ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0))]; }
const overlaps = (e, a, b) => e.startDate <= b && e.endDate >= a;
const activeOn = (e, d) => e.startDate <= d && e.endDate >= d;

function distanceKm(a, b) {
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const hasCoords = e => e && e.lat != null && e.lng != null && !Number.isNaN(+e.lat) && !Number.isNaN(+e.lng);
const fmtKm = km => (km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString(locale()));

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600);
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

// 필드 현지화 (docs/data-contract.md): e[field + 'Ko'|'En'] → 없으면 e[field]
// 한국어 모드에서 원문이 아랍·태국·에티오피아·키릴·데바나가리·히브리 문자면 영어 이름을 먼저 쓴다
const HARD_SCRIPT = /[Ѐ-ӿ֐-ۿݐ-ࣿऀ-ॿ฀-๿ሀ-፿]/;
const L = (o, f) => {
  if (!o) return '';
  if (getLang() === 'en') return o[f + 'En'] || o[f] || '';
  return o[f + 'Ko'] || (HARD_SCRIPT.test(o[f] || '') && o[f + 'En']) || o[f] || '';
};
const L_title = o => L(o, 'title'); // Leaflet 전역 L과 이름이 겹치는 지도 코드에서 사용

/* ------------------------------------------------------------------ */
/* 상태                                                                */
/* ------------------------------------------------------------------ */
const state = {
  cities: [],
  cityData: new Map(),      // cityId -> { meta, events }
  cityId: LS.get('city', null),
  near: LS.get('near', false),
  radiusKm: LS.get('radiusKm', 20),
  coords: LS.get('coords', null),
  events: [],
  meta: {},
  loading: true,
  tab: 'browse',
  kind: LS.get('kind', 'all'),
  filter: 'all',
  sort: LS.get('sort', 'date'),
  query: '',
  calMonth: null,
  calSel: null,
  calSavedOnly: false,
  saved: LS.get('saved', {}),             // id -> 이벤트 스냅샷
  settings: Object.assign({ notify: false, notifyDays: 1, alarm: '-P1D' }, LS.get('settings', {})),
  regionQuery: '',
  geoResults: null,                       // null: 검색 전, []: 결과 없음
  geoError: false,
  geoMiss: null,                          // 지원 도시가 없는 장소를 고른 경우 { name }
};
const saveSettings = () => LS.set('settings', state.settings);
if (!KINDS.includes(state.kind)) state.kind = 'all';
if (!SORTS.includes(state.sort)) state.sort = 'date';

// v1 → v2 마이그레이션: '서울' 같은 지역 키 / 'near'
(() => {
  const old = LS.get('region', null);
  if (old && !state.cityId) {
    if (old === 'near') state.near = true;
    else state.cityId = LEGACY_REGION[old] || null;
    LS.set('city', state.cityId); LS.set('near', state.near);
  }
})();

setLang(LS.get('lang', (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en'));

const cityById = id => state.cities.find(c => c.id === id);
const curCity = () => cityById(state.cityId);
const cityName = c => (c ? (c.name?.[getLang()] || c.name?.en || c.name?.ko || c.id) : '');
const displayNames = {};
function countryName(c) {
  const l = getLang();
  if (c.countryName?.[l]) return c.countryName[l];
  try { displayNames[l] ||= new Intl.DisplayNames([l], { type: 'region' }); return displayNames[l].of(c.country); } catch { return c.country || ''; }
}
const eventTz = e => e.tz || cityById(e.cityId)?.tz || curCity()?.tz || LOCAL_TZ;
const cityToday = () => todayIn(curCity()?.tz);
const isKR = e => (cityById(e.cityId)?.country || (eventTz(e) === 'Asia/Seoul' ? 'KR' : '')) === 'KR';

function nearestCity(p) {
  let best = null;
  for (const c of state.cities) {
    if (!hasCoords(c)) continue;
    const d = distanceKm(p, c);
    if (!best || d < best.d) best = { city: c, d };
  }
  return best;
}

// 상태(진행중/D-n/마감임박) — 이벤트 현지 날짜 기준. 색만으로 전달하지 않도록 텍스트 동반.
function status(e) {
  const td = todayIn(eventTz(e));
  if (e.endDate < td) return { text: t('st.ended'), cls: 'st-ended' };
  if (e.permanent) return { text: t('st.always'), cls: 'st-live' };
  if (EXP_KINDS.has(e.kind) && diffDays(e.startDate, e.endDate) > 60) return { text: t('st.anytime'), cls: 'st-live' };
  if (e.startDate > td) { const n = diffDays(td, e.startDate); return { text: n === 1 ? t('st.tomorrow') : t('st.dday', { n }), cls: 'st-soon' }; }
  const left = diffDays(td, e.endDate);
  if (left === 0) return { text: t('st.todayEnd'), cls: 'st-urgent' };
  if (e.startDate === td) return { text: t('st.todayStart'), cls: 'st-soon' };
  if (left <= 3) return { text: t('st.closing', { n: left }), cls: 'st-urgent' };
  return { text: t('st.live'), cls: 'st-live' };
}
const statusHTML = st => `<span class="st ${st.cls}">${esc(st.text)}</span>`;
// 상시 체험(오늘~+365일 같은 긴 기간)은 날짜 대신 체험 정보로 보여준다
// permanent: 늘 열려 있는 명소·상설 전시 (날짜 있는 행사가 아님)
const isEvergreen = e => !!e.permanent || (EXP_KINDS.has(e.kind) && diffDays(e.startDate, e.endDate) > 60);

function inArea(e) {
  if (state.near) {
    if (!state.coords || !hasCoords(e)) return false;
    return distanceKm(state.coords, e) <= state.radiusKm;
  }
  return true; // 도시별 파일이라 이미 해당 도시 데이터
}
// enOnly: 영어 소스에만 있는 이벤트 → 한국어 모드에서는 숨김
const visibleEvents = () => (getLang() === 'en' ? state.events : state.events.filter(e => !e.enOnly));
const inKind = e => state.kind === 'all' || e.kind === state.kind;
const isSaved = id => !!state.saved[id];

function sortByDate(list, base) {
  return list.sort((a, b) => {
    const as = a.startDate < base ? base : a.startDate, bs = b.startDate < base ? base : b.startDate;
    return as.localeCompare(bs) || a.endDate.localeCompare(b.endDate) || String(a.title).localeCompare(String(b.title));
  });
}
const expScore = e => (e.rating || 0) * Math.log10(10 + (e.reviewCount || 0));
function sortList(list, base) {
  sortByDate(list, base);
  if (state.sort === 'closing') list.sort((a, b) => a.endDate.localeCompare(b.endDate));
  if (state.sort === 'distance' && state.coords) {
    const d = e => (hasCoords(e) ? distanceKm(state.coords, e) : Infinity);
    list.sort((a, b) => d(a) - d(b));
  } else if (BOOKABLE.has(state.kind) && state.sort === 'date') {
    list.sort((a, b) => expScore(b) - expScore(a)); // 체험은 평점·리뷰 많은 순이 '기본'
  }
  return list;
}

function baseList() {
  return visibleEvents().filter(e => e.endDate >= todayIn(eventTz(e)) && inArea(e) && inKind(e));
}

const norm = s => String(s || '').toLowerCase().normalize('NFC');
const SEARCH_FIELDS = ['title', 'place', 'genre', 'address', 'provider'];
function matchesQuery(e, q) {
  if (!q) return true;
  const parts = [kindLabel(e.kind)];
  for (const f of SEARCH_FIELDS) parts.push(e[f], e[f + 'Ko'], e[f + 'En']);
  const hay = norm(parts.filter(Boolean).join(' '));
  return norm(q).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}

/* ------------------------------------------------------------------ */
/* 포맷                                                                 */
/* ------------------------------------------------------------------ */
function fmtPrice(p) {
  if (!p || p.amount == null || !p.currency) return '';
  try {
    const zero = ['KRW', 'JPY', 'TWD', 'VND', 'IDR', 'HUF', 'CLP'].includes(p.currency);
    return new Intl.NumberFormat(locale(), { style: 'currency', currency: p.currency, maximumFractionDigits: zero ? 0 : 2, minimumFractionDigits: 0 }).format(p.amount);
  } catch { return `${p.amount} ${p.currency}`; }
}
function fmtDuration(min) {
  if (!min) return '';
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? (m ? t('dur.hm', { h, m }) : t('dur.h', { h })) : t('dur.m', { m });
}
const fmtRating = e => (e.rating ? `★ ${(+e.rating).toFixed(1)}${e.reviewCount ? ` (${(+e.reviewCount).toLocaleString(locale())})` : ''}` : '');
const feeText = e => L(e, 'fee') || (e.price ? (e.kind === 'workshop' || e.kind === 'tour' ? t('price.from', { p: fmtPrice(e.price) }) : fmtPrice(e.price)) : '') || (e.free ? t('free') : '');

/* ------------------------------------------------------------------ */
/* 렌더: 공통 조각                                                      */
/* ------------------------------------------------------------------ */
// 실제 이미지가 없을 때: 그라데이션/이모지 없이 단색 타이포 카드
function noImgHTML(e, cls = '') {
  return `<div class="poster noimg k-${esc(e.kind)} ${cls}"><span class="noimg-kind">${esc(kindLabel(e.kind))}</span><b class="noimg-title">${esc(L(e, 'title'))}</b></div>`;
}
function posterHTML(e, cls = '') {
  const src = safeUrl(e.poster);
  if (!src) return noImgHTML(e, cls);
  // area = 행사장이 아니라 근처 명소·동네 사진 → '주변 사진' 표시
  const near = e.posterKind === 'area' ? `<span class="poster-kind">${esc(t('photo.area'))}</span>` : '';
  return `<div class="poster ${cls}" data-noimg="${esc(noImgHTML(e, cls))}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">${near}</div>`;
}
// 이미지 로드 실패 → 텍스트 카드로 교체 (캡처 단계에서 img error를 잡는다)
document.addEventListener('error', ev => {
  const img = ev.target;
  if (img?.tagName !== 'IMG') return;
  const box = img.closest('.poster[data-noimg]');
  if (box) { box.outerHTML = box.dataset.noimg; return; }
  const stopImg = img.closest('.stop-img');
  if (stopImg) stopImg.remove();
}, true);

function tagsHTML(e) {
  let h = `<span class="tag k-${esc(e.kind)}">${esc(L(e, 'genre') || kindLabel(e.kind))}</span> `;
  if (e.free) h += `<span class="tag free">${t('free')}</span>`;
  return h;
}

function heartHTML(e) {
  const on = isSaved(e.id);
  return `<button class="heart ${on ? 'on' : ''}" data-save="${esc(e.id)}" aria-pressed="${on}" aria-label="${esc(t(on ? 'unsave.aria' : 'save.aria'))}">${on ? '♥' : '♡'}</button>`;
}

function expMetaHTML(e) {
  const bits = [];
  const price = e.price ? fmtPrice(e.price) : L(e, 'fee');
  if (price) bits.push(`<span class="price">${esc(e.price && BOOKABLE.has(e.kind) ? t('price.from', { p: price }) : price)}</span>`);
  if (e.rating) bits.push(`<span class="rating" aria-label="${esc(t('rating.aria', { r: (+e.rating).toFixed(1), n: e.reviewCount || 0 }))}">${esc(fmtRating(e))}</span>`);
  const dur = fmtDuration(e.durationMin || (e.stops ? e.stops.reduce((s, x) => s + (x.minutes || 0), 0) : 0));
  if (dur) bits.push(`<span class="duration">${esc(dur)}</span>`);
  if (e.provider) bits.push(`<span class="provider">${esc(e.provider)}</span>`);
  if (e.stops?.length) bits.push(`<span class="duration">${esc(t('audio.stops', { n: e.stops.length }))}</span>`);
  return bits.length ? `<span class="exp-meta">${bits.join('')}</span>` : '';
}

function distSuffix(e) {
  return state.coords && hasCoords(e) && (state.near || state.sort === 'distance') ? ` · ${fmtKm(distanceKm(state.coords, e))}km` : '';
}

function cardHTML(e) {
  const ever = isEvergreen(e);
  const fee = feeText(e);
  return `<article class="card k-${esc(e.kind)}" data-open="${esc(e.id)}" tabindex="0" aria-label="${esc(L(e, 'title'))}">
    ${posterHTML(e)}
    <div>
      ${tagsHTML(e)}
      <h3>${esc(L(e, 'title'))}</h3>
      <div class="meta">
        ${ever ? expMetaHTML(e) : `<span>${fmtRange(e.startDate, e.endDate)} · ${statusHTML(status(e))}</span>`}
        <span>${esc(L(e, 'place') || L(e, 'address'))}${distSuffix(e)}</span>
        ${!ever && fee ? `<span>${esc(fee)}</span>` : ''}
      </div>
    </div>
    ${heartHTML(e)}
  </article>`;
}

function bigCardHTML(e) {
  const ever = isEvergreen(e);
  return `<button class="card-big k-${esc(e.kind)}" data-open="${esc(e.id)}">
    ${posterHTML(e)}
    <div class="body">
      ${tagsHTML(e)}
      <h3>${esc(L(e, 'title'))}</h3>
      <div class="meta">${ever ? expMetaHTML(e) : `<span>${fmtRange(e.startDate, e.endDate)}</span>`}<span>${esc(L(e, 'place'))}</span></div>
    </div>
  </button>`;
}

function emptyHTML(icon, title, desc) {
  return `<div class="empty">${icon ? `<div class="big" aria-hidden="true">${icon}</div>` : ''}<h3>${esc(title)}</h3>${desc ? `<p>${esc(desc)}</p>` : ''}</div>`;
}

// 외부 체험 사이트 검색 딥링크 (스크래핑 없이 각 사이트 검색 결과로 이동)
function deeplinksHTML(place, kind) {
  const q = encodeURIComponent(place || '');
  if (!q) return '';
  const slug = encodeURIComponent(String(place).replace(/\s+/g, '-'));
  const links = [
    ['Airbnb', `https://www.airbnb.com/s/${slug}/experiences`],
    ['GetYourGuide', `https://www.getyourguide.com/s/?q=${q}`],
    ['Viator', `https://www.viator.com/searchResults/all?text=${q}`],
    ['Klook', `https://www.klook.com/search/result/?query=${q}`],
  ];
  return `<div class="deeplinks">
    <p class="deeplinks-label">${esc(t(kind === 'tour' ? 'deeplinks.tour' : kind === 'workshop' ? 'deeplinks.workshop' : 'deeplinks.any', { place }))}</p>
    <div class="deeplinks-row">${links.map(([n, u]) => `<a class="deeplink" href="${u}" target="_blank" rel="noopener">${esc(n)} <span aria-hidden="true">↗</span><span class="sr-only">${esc(t('deeplinks.external'))}</span></a>`).join('')}</div>
  </div>`;
}

// 현지 이벤트 사이트 카드 — 놀곳에 없는 행사는 공식 캘린더·잡지·예매처에서 보고, 찾은 걸 직접 담을 수 있게 한다
function guidesHTML(kind, thin) {
  const city = curCity() || (state.near ? nearestCity(state.coords || {})?.city : null);
  const list = guidesFor(city, kind);
  if (!list.length) return '';
  const en = getLang() === 'en';
  return `<section class="guides ${thin ? 'thin' : ''}" aria-labelledby="guidesTitle">
    <div class="section-title" id="guidesTitle">${esc(t('guides.title', { city: cityName(city) }))}</div>
    <p class="guides-sub">${esc(t(thin ? 'guides.subThin' : 'guides.sub'))}</p>
    <div class="guides-grid">${list.map(g => `<a class="guide-card" href="${esc(g.url)}" target="_blank" rel="noopener">
      <b>${esc(g.name)}</b><span>${esc(en ? g.en : g.ko)}</span><span class="sr-only">${esc(t('deeplinks.external'))}</span></a>`).join('')}</div>
    <button class="btn wide block" data-action="add-own">＋ ${esc(t('guides.add'))}</button>
  </section>`;
}

// 다른 사이트에서 찾은 행사를 직접 입력해 관심·캘린더·알림에 담기
function openAddForm() {
  const dlg = $('#detail');
  audio.stop();
  dlg.dataset.id = '';
  const city = curCity();
  const td = todayIn(city?.tz || LOCAL_TZ);
  const kinds = KINDS.filter(k => k !== 'all' && k !== 'audioguide');
  const k0 = kinds.includes(state.kind) ? state.kind : 'festival';
  dlg.setAttribute('aria-labelledby', 'addTitle');
  dlg.innerHTML = `
    <button class="close" data-close aria-label="${esc(t('detail.close'))}">✕</button>
    <div class="scroll">
      <form class="add-form" id="addForm">
        <h2 id="addTitle">${esc(t('add.title'))}</h2>
        <p class="note">${esc(t('add.desc'))}</p>
        <label>${esc(t('add.name'))}<input name="title" required maxlength="140" autocomplete="off"></label>
        <label>${esc(t('add.kind'))}<select name="kind">${kinds.map(k => `<option value="${k}" ${k === k0 ? 'selected' : ''}>${esc(kindLabel(k))}</option>`).join('')}</select></label>
        <div class="add-row">
          <label>${esc(t('add.start'))}<input type="date" name="startDate" required value="${td}"></label>
          <label>${esc(t('add.end'))}<input type="date" name="endDate"></label>
        </div>
        <label>${esc(t('add.time'))}<input type="time" name="startTime"></label>
        <label>${esc(t('add.place'))}<input name="place" maxlength="140" autocomplete="off"></label>
        <label>${esc(t('add.link'))}<input type="url" name="homepage" inputmode="url" placeholder="https://" autocomplete="off"></label>
        <button class="btn primary wide block" type="submit">${esc(t('add.save'))}</button>
      </form>
    </div>`;
  openSheet(dlg, '#add');
}

function saveOwnEvent(form) {
  const f = Object.fromEntries(new FormData(form));
  const title = String(f.title || '').trim();
  if (!title || !f.startDate) return;
  const city = curCity();
  const end = f.endDate && f.endDate >= f.startDate ? f.endDate : f.startDate;
  const id = `my-${Date.now().toString(36)}`;
  const kind = f.kind || 'festival';
  state.saved[id] = {
    id, kind, title, genre: kindLabel(kind), place: String(f.place || '').trim(), address: '',
    startDate: f.startDate, endDate: end, startTime: f.startTime || undefined, time: f.startTime || '',
    homepage: safeUrl(String(f.homepage || '').trim()) || undefined, cityId: city?.id || state.cityId,
    tz: city?.tz || LOCAL_TZ, source: t('add.source'), own: true, lat: null, lng: null, savedAt: Date.now(),
  };
  LS.set('saved', state.saved);
  toast(t('add.saved'));
  render();
  openDetail(id);
}

function regionName() {
  if (state.near) return t('region.near', { km: state.radiusKm });
  return cityName(curCity()) || t('region.pick');
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
  el.hidden = !(state.tab === 'browse' || state.tab === 'calendar' || (state.tab === 'map' && mapUI.mode === 'events'));
  el.innerHTML = KINDS.map(k => {
    const on = state.kind === k;
    return `<button class="chip ${k !== 'all' ? 'k-' + k : ''} ${on ? 'active' : ''}" data-kind="${k}" aria-pressed="${on}">${esc(kindLabel(k))}</button>`;
  }).join('');
}

function renderBrowse() {
  return `
    <div class="search">
      <input id="searchInput" class="search-input" type="search" enterkeyhint="search" autocomplete="off"
        value="${esc(state.query)}" placeholder="${esc(t('search.placeholder'))}" aria-label="${esc(t('search.aria'))}">
      <button class="search-clear" data-action="clear-search" aria-label="${esc(t('search.clear'))}" ${state.query ? '' : 'hidden'}>✕</button>
    </div>
    <div id="results">${renderResults()}</div>`;
}

function railHTML(title, sub, items) {
  if (!items.length) return '';
  return `<div class="section-title">${esc(title)} ${sub ? `<small>${sub}</small>` : ''}</div>
    <div class="rail">${items.map(bigCardHTML).join('')}</div>`;
}

// 검색 입력 시 입력창 포커스를 잃지 않도록 결과 영역만 다시 그린다
function renderResults() {
  if (state.loading) return `<div class="empty loading" role="status"><h3>${esc(t('loading'))}</h3></div>`;
  if (!curCity() && !state.near) return emptyHTML('', t('region.pickTitle'), t('region.pickDesc'));

  const base = cityToday();
  const all = baseList();
  const q = state.query.trim();
  const place = state.near ? '' : (curCity()?.name?.en || cityName(curCity()));
  let html = '';

  if (BOOKABLE.has(state.kind)) html += deeplinksHTML(place || cityName(nearestCity(state.coords || {})?.city), state.kind);

  if (!q && state.kind === 'all') {
    html += reminderBannerHTML();
    const [ws, we] = weekendRange(base);
    const weekend = sortByDate(all.filter(e => !isEvergreen(e) && overlaps(e, ws, we)), base)
      .sort((a, b) => isSaved(b.id) - isSaved(a.id) || !!b.poster - !!a.poster) // 저장한 것 → 포스터 있는 것 먼저, 나머지는 날짜순 유지
      .slice(0, 12);
    html += railHTML(t('weekend.title'), fmtRange(ws, we), weekend);
    const exps = all.filter(e => BOOKABLE.has(e.kind)).sort((a, b) => expScore(b) - expScore(a)).slice(0, 10);
    html += railHTML(t('rail.experiences'), '', exps);
    const places = all.filter(e => e.permanent).slice(0, 15);
    html += railHTML(t('rail.places'), '', places);
    const audio = all.filter(e => e.kind === 'audioguide').slice(0, 10);
    html += railHTML(t('rail.audio'), '', audio);
  }

  // 목록: '전체'에서는 날짜 있는 이벤트만 (체험·오디오는 위 레일과 각 탭에서)
  const list = applyFilter(all.filter(e => matchesQuery(e, q) && (state.kind !== 'all' || q || !isEvergreen(e))), base);
  sortList(list, base);

  // 결과가 적으면 현지 사이트 안내를 목록 위에, 넉넉하면 맨 아래에
  const thin = list.length < 30;
  if (thin) html += guidesHTML(state.kind, true);

  const sorts = SORTS.filter(s => s !== 'distance' || state.coords);
  const titleKey = state.kind === 'all' ? 'list.title' : 'list.titleKind';
  html += `<div class="section-title">${esc(t(titleKey, { region: regionName(), kind: kindLabel(state.kind) }))} <small>${t('count', { n: list.length })}</small></div>
    <div class="list-controls">
      ${EXP_KINDS.has(state.kind) ? '' : `<div class="filters">${FILTERS.map(f => `<button class="filter ${state.filter === f ? 'active' : ''}" data-filter="${f}" aria-pressed="${state.filter === f}">${t('filter.' + f)}</button>`).join('')}</div>`}
      <select id="sortSelect" class="sort-select" aria-label="${esc(t('sort.aria'))}">
        ${sorts.map(s => `<option value="${s}" ${state.sort === s ? 'selected' : ''}>${t((BOOKABLE.has(state.kind) && s === 'date') ? 'sort.popular' : 'sort.' + s)}</option>`).join('')}
      </select>
    </div>
    <div class="list-gap"></div>`;

  if (!list.length) {
    if (q) html += emptyHTML('', t('empty.searchTitle', { q }), t('empty.searchDesc'));
    else if (state.near && !state.coords) html += emptyHTML('', t('empty.locTitle'), t('empty.locDesc'));
    else if (BOOKABLE.has(state.kind)) html += emptyHTML('', t('empty.expTitle', { kind: kindLabel(state.kind) }), t('empty.expDesc'));
    else if (state.kind === 'audioguide') html += emptyHTML('', t('empty.audioTitle'), t('empty.audioDesc'));
    else html += emptyHTML('', t('empty.noneTitle'), t('empty.noneDesc'));
  } else {
    html += `<div class="list">${list.slice(0, 200).map(cardHTML).join('')}</div>`;
    if (list.length > 200) html += `<p class="note">${esc(t('list.more', { n: list.length - 200 }))}</p>`;
  }
  if (!thin) html += guidesHTML(state.kind, false);
  return html;
}

function applyFilter(list, base) {
  const [ws, we] = weekendRange(base);
  if (state.filter === 'weekend') return list.filter(e => overlaps(e, ws, we));
  if (state.filter === 'week') { const [a, b] = weekRange(base); return list.filter(e => overlaps(e, a, b)); }
  if (state.filter === 'month') { const [a, b] = monthRange(base); return list.filter(e => overlaps(e, a, b)); }
  if (state.filter === 'free') return list.filter(e => e.free);
  return list;
}

function reminderBannerHTML() {
  const soon = Object.values(state.saved)
    .filter(e => !isEvergreen(e)).map(e => ({ e, td: todayIn(eventTz(e)) }))
    .filter(({ e, td }) => e.endDate >= td && diffDays(td, e.startDate) <= 3)
    .sort((a, b) => a.e.startDate.localeCompare(b.e.startDate));
  if (!soon.length) return '';
  const e = soon[0].e;
  const more = soon.length > 1 ? esc(t('banner.more', { n: soon.length - 1 })) : '';
  return `<div class="banner" data-open="${esc(e.id)}" role="button" tabindex="0"><span aria-hidden="true">🔔</span> <div>${esc(t('banner.saved'))} <b>${esc(L(e, 'title'))}</b>${more} · ${statusHTML(status(e))}</div></div>`;
}

function renderCalendar() {
  if (state.loading) return `<div class="empty loading" role="status"><h3>${esc(t('loading'))}</h3></div>`;
  const td = cityToday();
  if (!state.calSel) state.calSel = td;
  if (!state.calMonth) { const d = parseYmd(td); state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); }
  const m = state.calMonth;
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const rangeA = ymd(start), rangeB = ymd(addDays(start, 41));

  // 상시 체험은 매일 점이 찍혀 의미가 없으므로 '전체'에서는 제외
  const pool = (state.calSavedOnly
    ? Object.values(state.saved).filter(inKind)
    : visibleEvents().filter(e => inArea(e) && inKind(e) && overlaps(e, rangeA, rangeB)))
    .filter(e => state.kind !== 'all' || !isEvergreen(e));

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

  const dayList = sortByDate(pool.filter(e => activeOn(e, state.calSel)), td);
  return `
    <div class="cal-head">
      <h2>${t('cal.month', { y: m.getFullYear(), m: m.getMonth() + 1 })}</h2>
      <div class="nav">
        <button class="today-btn" data-cal="today">${t('cal.today')}</button>
        <button class="icon-btn" data-cal="prev" aria-label="${esc(t('cal.prev'))}">‹</button>
        <button class="icon-btn" data-cal="next" aria-label="${esc(t('cal.next'))}">›</button>
      </div>
    </div>
    <div class="filters cal-modes">
      <button class="filter ${!state.calSavedOnly ? 'active' : ''}" data-calmode="all" aria-pressed="${!state.calSavedOnly}">${esc(t('cal.allIn', { region: regionName() }))}</button>
      <button class="filter ${state.calSavedOnly ? 'active' : ''}" data-calmode="saved" aria-pressed="${state.calSavedOnly}">${t('cal.savedOnly')}</button>
    </div>
    <div class="cal">${cells}</div>
    <div class="legend"><span><i></i>${t('cal.legendEvent')}</span><span><i class="saved"></i>${t('cal.legendSaved')}</span></div>
    <div class="section-title">${fmtDay(state.calSel)} <small>${t('count', { n: dayList.length })}</small></div>
    ${dayList.length ? `<div class="list">${dayList.map(cardHTML).join('')}</div>` : emptyHTML('', t('cal.emptyTitle'), t('cal.emptyDesc'))}
  `;
}

function renderSaved() {
  const all = Object.values(state.saved);
  if (!all.length) return emptyHTML('♡', t('saved.emptyTitle'), t('saved.emptyDesc'));
  const isUp = e => e.endDate >= todayIn(eventTz(e));
  const upcoming = sortByDate(all.filter(isUp), todayIn(LOCAL_TZ));
  const past = all.filter(e => !isUp(e)).sort((a, b) => b.endDate.localeCompare(a.endDate));
  let html = `<div class="section-title">${t('saved.upcoming')} <small>${t('count', { n: upcoming.length })}</small></div>`;
  html += upcoming.length ? `<div class="list">${upcoming.map(cardHTML).join('')}</div>` : emptyHTML('', t('saved.noUpcoming'), '');
  if (upcoming.some(e => !isEvergreen(e))) html += `<div class="list-gap"></div><button class="btn wide block" data-action="export-all">${t('saved.exportAll')}</button>`;
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

  const m = state.meta || {};
  const lang = getLang();
  const updated = m.updatedAt ? new Date(m.updatedAt).toLocaleString(locale()) : '-';
  const src = Array.isArray(m.sources) ? m.sources.join(' · ') : (m.source || '-');
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
      <div class="row"><div>${t('set.data')}<small>${esc(regionName())} · ${m.source === 'sample' ? t('set.dataSample') : esc(src)}<br>${esc(t('set.updated', { at: updated, n: t('count', { n: visibleEvents().length }) }))}<br>${esc(t('set.cities', { n: state.cities.length }))}</small></div></div>
      <button class="row danger-row" data-action="reset"><div>${t('set.reset')}</div></button>
    </div>
  `;
}

function render() {
  applyStatic();
  renderKinds();
  const v = $('#view');
  destroyMap();
  v.innerHTML = ({ browse: renderBrowse, calendar: renderCalendar, map: renderMapTab, saved: renderSaved, settings: renderSettings })[state.tab]();
  document.body.classList.toggle('on-map', state.tab === 'map');
  if (state.tab === 'map') mountMap();
  $('#regionLabel').textContent = regionName();
  document.querySelectorAll('.tabbar button').forEach(b => {
    const on = b.dataset.tab === state.tab;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  renderBadges();
  $('#sampleBadge').hidden = state.meta?.source !== 'sample';
}

function renderResultsOnly() {
  if (state.tab === 'map') { $('.search-clear') && ($('.search-clear').hidden = !state.query); return drawMarkers(); }
  const r = $('#results');
  if (!r) return render();
  r.innerHTML = renderResults();
  const clear = $('.search-clear'); if (clear) clear.hidden = !state.query;
}

function renderBadges() {
  const n = Object.values(state.saved).filter(e => e.endDate >= todayIn(eventTz(e))).length;
  const badge = $('#savedCount'); badge.hidden = !n; badge.textContent = n;
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
  if (dlg.id === 'detail') audio.stop();
  if (history.state?.sheet === dlg.id) history.back(); // popstate에서 닫힘
  else { dlg.close(); clearHash(); }
}
function clearHash() {
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
}
window.addEventListener('popstate', () => {
  audio.stop();
  for (const id of ['detail', 'regionSheet']) { const d = document.getElementById(id); if (d.open) d.close(); }
  const m = location.hash.match(/^#event=(.+)$/);
  if (m && history.state?.sheet === 'detail') openDetail(decodeURIComponent(m[1]), null, { fromHistory: true });
});

/* ------------------------------------------------------------------ */
/* 상세 시트                                                            */
/* ------------------------------------------------------------------ */
function findEvent(id) {
  const inCur = state.events.find(e => e.id === id);
  if (inCur) return inCur;
  for (const d of state.cityData.values()) { const e = d.events.find(x => x.id === id); if (e) return e; }
  return state.saved[id];
}

function mapLinks(e) {
  const q = hasCoords(e) ? `${e.lat},${e.lng}` : (e.address || e.place || '');
  const gq = encodeURIComponent(q);
  const google = `https://www.google.com/maps/search/?api=1&query=${gq}`;
  if (isKR(e)) {
    const kq = encodeURIComponent(e.address || e.place || q); // 국내 지도는 한국어 주소 검색이 정확
    return {
      links: [[t('detail.naver'), `https://map.naver.com/p/search/${kq}`], [t('detail.kakao'), `https://map.kakao.com/link/search/${kq}`], [t('detail.google'), google]],
      directions: `https://map.naver.com/p/search/${kq}`,
    };
  }
  return {
    links: [[t('detail.google'), google]],
    directions: `https://www.google.com/maps/dir/?api=1&destination=${gq}`,
  };
}

function openDetail(id, preferDay, { fromHistory = false } = {}) {
  const e = findEvent(id); if (!e) return;
  const dlg = $('#detail');
  if (dlg.dataset.id !== e.id) audio.stop();
  const st = status(e);
  const place = L(e, 'place'), address = L(e, 'address');
  const ever = isEvergreen(e);
  const multi = e.startDate !== e.endDate && !ever;
  const nDays = diffDays(e.startDate, e.endDate) + 1;
  const td = todayIn(eventTz(e));
  const defDay = preferDay && activeOn(e, preferDay) ? preferDay : (e.startDate < td && e.endDate >= td ? td : e.startDate);
  const fee = feeText(e) || t('detail.feeUnknown');
  const saved = isSaved(e.id);
  const maps = mapLinks(e);
  const booking = safeUrl(e.bookingUrl);
  const homepage = safeUrl(e.homepage);
  const isAudio = e.kind === 'audioguide' && Array.isArray(e.stops) && e.stops.length;
  const dur = fmtDuration(e.durationMin);

  dlg.innerHTML = `
    <button class="close" data-close aria-label="${esc(t('detail.close'))}">✕</button>
    <div class="scroll">
      ${posterHTML(e, 'detail-poster')}
      ${e.poster && e.posterCredit ? `<div class="poster-credit">${esc(t(e.posterKind === 'area' ? 'detail.photoArea' : e.posterKind === 'venue' ? 'detail.photoVenue' : 'detail.photo'))}: ${esc(e.posterCredit)}</div>` : ''}
      <div class="detail-body">
        ${tagsHTML(e)}
        <h2 id="detailTitle">${esc(L(e, 'title'))}</h2>
        ${ever ? expMetaHTML(e) : ''}
        <dl class="info">
          ${ever ? '' : `<div><dt aria-hidden="true">🗓</dt><dd>${fmtRange(e.startDate, e.endDate)}<small>${statusHTML(st)}${multi ? esc(t('detail.days', { n: nDays })) : ''}${eventTz(e) !== LOCAL_TZ ? esc(t('detail.localTime', { tz: eventTz(e) })) : ''}</small></dd></div>`}
          ${L(e, 'time') || e.startTime ? `<div><dt aria-hidden="true">🕒</dt><dd>${esc(L(e, 'time') || e.startTime)}</dd></div>` : ''}
          ${dur && !ever ? `<div><dt aria-hidden="true">⏱</dt><dd>${esc(dur)}</dd></div>` : ''}
          ${place || address ? `<div><dt aria-hidden="true">📍</dt><dd>${esc(place || address)}${address && place && address !== place ? `<small>${esc(address)}</small>` : ''}
            <small>${maps.links.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join(' · ')}${state.coords && hasCoords(e) ? ` · ${esc(t('detail.away', { km: fmtKm(distanceKm(state.coords, e)) }))}` : ''}</small></dd></div>` : ''}
          ${isAudio || (ever && (e.price || L(e, 'fee'))) ? '' : `<div><dt aria-hidden="true">💳</dt><dd>${esc(fee)}</dd></div>`}
          ${e.tel ? `<div><dt aria-hidden="true">☎︎</dt><dd><a href="tel:${esc(String(e.tel).replace(/[^0-9+]/g, ''))}">${esc(e.tel)}</a></dd></div>` : ''}
          ${homepage && homepage !== booking ? `<div><dt aria-hidden="true">🔗</dt><dd><a href="${esc(homepage)}" target="_blank" rel="noopener">${t('detail.homepage')}</a></dd></div>` : ''}
        </dl>
        ${L(e, 'overview') ? `<p class="overview">${esc(L(e, 'overview'))}</p>` : ''}
        ${isAudio ? playerHTML(e) : ''}
      </div>
      <div class="actions">
        ${booking ? `<a class="btn primary wide" href="${esc(booking)}" target="_blank" rel="noopener sponsored">${esc(t('detail.book', { provider: e.provider || '' }).trim())}</a>` : ''}
        <button class="btn ${saved ? 'on' : (booking ? '' : 'primary')}" data-save="${esc(e.id)}" aria-pressed="${saved}">${t(saved ? 'detail.saved' : 'detail.save')}</button>
        <button class="btn" data-action="toggle-cal" aria-expanded="false" aria-controls="calPanel">${t('detail.addCal')}</button>
        <div class="wide cal-panel" id="calPanel" hidden>
          ${multi || ever ? `<div class="group">
            ${ever ? `<input type="hidden" name="calScope" value="day">` : `<label class="row"><div>${t('detail.oneDay')}</div><input type="radio" name="calScope" value="day" checked></label>`}
            <div class="row"><label for="calDay">${t(ever ? 'detail.visitDate' : 'detail.date')}</label><input type="date" id="calDay" class="date-input" value="${defDay}" min="${e.startDate < td ? td : e.startDate}" max="${e.endDate}"></div>
            ${ever ? '' : `<label class="row"><div>${esc(t('detail.wholePeriod', { n: nDays }))}</div><input type="radio" name="calScope" value="all"></label>`}
          </div>` : ''}
          <div class="actions inner">
            <button class="btn primary" data-action="ics">${t(isIOS ? 'detail.icsIos' : 'detail.icsOther')}</button>
            <button class="btn" data-action="gcal">${t('detail.gcal')}</button>
          </div>
        </div>
        <button class="btn" data-action="share">${t('detail.share')}</button>
        <a class="btn" href="${esc(maps.directions)}" target="_blank" rel="noopener">${t('detail.directions')}</a>
      </div>
      ${e.source ? `<div class="source">${t('detail.source')}: ${esc(e.source)}${safeUrl(e.sourceUrl) ? ` · <a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">${t('detail.original')}</a>` : ''}</div>` : ''}
    </div>`;
  dlg.setAttribute('aria-labelledby', 'detailTitle');
  const wasOpen = dlg.open;
  dlg.dataset.id = e.id;
  const hashStr = '#event=' + encodeURIComponent(e.id);
  if (fromHistory) { if (!dlg.open) dlg.showModal(); }
  else openSheet(dlg, hashStr);
  if (!wasOpen) dlg.querySelector('.scroll').scrollTop = 0;
  if (isAudio) audio.attach(e);
}

const closeDetail = () => closeSheet($('#detail'));

/* ------------------------------------------------------------------ */
/* 오디오 투어 플레이어 (Web Speech API)                                */
/* ------------------------------------------------------------------ */
const totalMinutes = e => e.stops.reduce((s, x) => s + (x.minutes || 0), 0) || e.durationMin || 0;
const mapsPoint = s => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.lat},${s.lng}`)}`;
function routeUrl(stops) {
  const pts = stops.filter(hasCoords).map(s => `${s.lat},${s.lng}`);
  if (pts.length < 2) return pts.length ? mapsPoint(stops.find(hasCoords)) : '';
  const mid = pts.slice(1, -1).slice(0, 9); // Google Maps URL은 경유지 최대 9개
  return `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${encodeURIComponent(pts[0])}&destination=${encodeURIComponent(pts[pts.length - 1])}${mid.length ? `&waypoints=${encodeURIComponent(mid.join('|'))}` : ''}`;
}

function playerHTML(e) {
  const resume = LS.get('audio:' + e.id, null);
  const mins = totalMinutes(e);
  const route = routeUrl(e.stops);
  const wiki = e.stops.some(s => /wikipedia\.org/.test(s.sourceUrl || '')) || /wikipedia/i.test(e.source || '');
  const speechOk = 'speechSynthesis' in window;
  return `
    <section class="player" id="player" aria-label="${esc(t('audio.player'))}">
      <div class="player-head">
        <b>${esc(t('audio.title'))}</b>
        <small>${esc(t('audio.summary', { n: e.stops.length, min: mins || '–' }))}</small>
      </div>
      <div class="player-now" id="playerNow" aria-live="polite">${esc(resume != null && resume > 0 ? t('audio.resumeAt', { n: resume + 1, title: L(e.stops[resume], 'title') }) : t('audio.ready'))}</div>
      <div class="player-controls">
        <button class="btn" data-audio="prev" aria-label="${esc(t('audio.prev'))}">⏮</button>
        <button class="btn primary" data-audio="toggle" id="playBtn" ${speechOk ? '' : 'disabled'}>${esc(t(resume ? 'audio.resume' : 'audio.play'))}</button>
        <button class="btn" data-audio="next" aria-label="${esc(t('audio.next'))}">⏭</button>
      </div>
      ${speechOk ? '' : `<p class="note">${esc(t('audio.noSpeech'))}</p>`}
      ${route ? `<a class="btn wide block" href="${esc(route)}" target="_blank" rel="noopener">${esc(t('audio.route'))}</a>` : ''}
    </section>
    <ol class="stops">
      ${e.stops.map((s, i) => `
        <li class="stop ${resume === i ? 'current' : ''}" data-stop="${i}">
          ${safeUrl(s.image) ? `<figure class="stop-img"><img src="${esc(s.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">${s.imageCredit ? `<figcaption>${esc(s.imageCredit)}</figcaption>` : ''}</figure>` : ''}
          <div class="stop-body">
            <button class="stop-play" data-audio-stop="${i}"><span class="stop-num">${i + 1}</span> <b>${esc(L(s, 'title'))}</b>${s.minutes ? ` <small>${esc(t('dur.m', { m: s.minutes }))}</small>` : ''}</button>
            <p>${esc(L(s, 'text'))}</p>
            <small>${hasCoords(s) ? `<a href="${esc(mapsPoint(s))}" target="_blank" rel="noopener">${esc(t('audio.openMap'))}</a>` : ''}${safeUrl(s.sourceUrl) ? ` · <a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener">${esc(t('audio.source'))}</a>` : ''}</small>
          </div>
        </li>`).join('')}
    </ol>
    ${wiki ? `<p class="attribution">${t('audio.attribution')}</p>` : ''}`;
}

// 긴 문장을 끊어 읽기 (Chrome은 15초 넘는 발화를 중간에 끊는 버그가 있음)
function chunkText(text, max = 180) {
  const sentences = String(text || '').replace(/\s+/g, ' ').match(/[^.!?。！？]+[.!?。！？]?/g) || [];
  const out = []; let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) { out.push(cur.trim()); cur = ''; }
    if (s.length > max) { for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max).trim()); continue; }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const audio = {
  e: null, idx: 0, chunk: 0, chunks: [], playing: false, token: 0,
  attach(e) {
    if (this.e?.id !== e.id) { this.e = e; this.idx = LS.get('audio:' + e.id, 0) || 0; this.playing = false; this.chunk = 0; }
    this.paint();
  },
  voice() {
    const want = getLang() === 'en' ? 'en' : 'ko';
    const vs = speechSynthesis.getVoices();
    return vs.find(v => v.lang?.toLowerCase().startsWith(want) && /premium|enhanced|natural|google/i.test(v.name))
      || vs.find(v => v.lang?.toLowerCase().startsWith(want)) || null;
  },
  speakCurrent() {
    if (!this.e || !('speechSynthesis' in window)) return;
    const s = this.e.stops[this.idx];
    if (!this.chunks.length || this.chunk === 0) this.chunks = chunkText(`${this.idx + 1}. ${L(s, 'title')}. ${L(s, 'text')}`);
    const my = ++this.token;
    speechSynthesis.cancel();
    const speakChunk = () => {
      if (my !== this.token || !this.playing) return;
      if (this.chunk >= this.chunks.length) return this.onStopEnd(my);
      const u = new SpeechSynthesisUtterance(this.chunks[this.chunk]);
      u.lang = getLang() === 'en' ? 'en-US' : 'ko-KR';
      const v = this.voice(); if (v) u.voice = v;
      u.rate = 1;
      u.onend = () => { if (my !== this.token) return; this.chunk++; speakChunk(); };
      u.onerror = ev => { if (my !== this.token) return; if (ev.error !== 'interrupted' && ev.error !== 'canceled') { this.playing = false; this.paint(); } };
      speechSynthesis.speak(u);
    };
    speakChunk();
  },
  onStopEnd(my) {
    if (my !== this.token) return;
    if (this.idx < this.e.stops.length - 1) {
      this.idx++; this.chunk = 0; this.chunks = []; this.save(); this.paint();
      setTimeout(() => { if (my === this.token && this.playing) this.speakCurrent(); }, 900);
    } else { this.playing = false; this.idx = 0; this.chunk = 0; this.chunks = []; this.save(); this.paint(true); }
  },
  toggle() {
    if (this.playing) { this.playing = false; this.token++; speechSynthesis.cancel(); this.paint(); return; }
    this.playing = true; this.paint(); this.speakCurrent(); // iOS: 사용자 탭 안에서 바로 speak 호출
  },
  go(i) {
    if (!this.e) return;
    this.idx = Math.max(0, Math.min(this.e.stops.length - 1, i)); this.chunk = 0; this.chunks = []; this.save();
    this.playing = true; this.paint(); this.speakCurrent();
  },
  stop() {
    if (!this.e) return;
    this.token++; this.playing = false;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.save(); this.e = null;
  },
  save() { if (this.e) LS.set('audio:' + this.e.id, this.idx); },
  paint(done = false) {
    const p = $('#player'); if (!p || !this.e) return;
    const s = this.e.stops[this.idx];
    $('#playBtn').textContent = t(this.playing ? 'audio.pause' : (this.idx || this.chunk ? 'audio.resume' : 'audio.play'));
    $('#playerNow').textContent = done ? t('audio.done') : t(this.playing ? 'audio.nowPlaying' : 'audio.paused', { n: this.idx + 1, title: L(s, 'title') });
    document.querySelectorAll('#detail .stop').forEach(li => {
      const cur = +li.dataset.stop === this.idx;
      li.classList.toggle('current', cur);
      if (cur) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (this.playing) document.querySelector('#detail .stop.current')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
};
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};

/* ------------------------------------------------------------------ */
/* 관심 저장                                                            */
/* ------------------------------------------------------------------ */
function toggleSave(id) {
  const e = findEvent(id); if (!e) return;
  if (state.saved[id]) {
    const own = state.saved[id].own;
    delete state.saved[id]; toast(t(own ? 'add.removed' : 'toast.unsaved'));
    if (own) { LS.set('saved', state.saved); closeDetail(); return render(); } // 직접 담은 행사는 지우면 끝
  }
  else {
    const { stops, ...rest } = e; // 오디오 스톱 전문은 저장 용량이 커서 제외 (다시 열 때 도시 데이터에서 찾음)
    state.saved[id] = { ...rest, stopsCount: stops?.length, cityId: e.cityId || state.cityId, tz: eventTz(e), savedAt: Date.now() };
    toast(state.settings.notify ? t('toast.savedNotify') : t('toast.saved'));
  }
  LS.set('saved', state.saved);
  // 검색 중이면 입력 포커스를 유지하기 위해 결과만 갱신
  if (state.tab === 'browse' && $('#results')) { renderResultsOnly(); renderBadges(); } else render();
  const dlg = $('#detail');
  if (dlg.open && dlg.dataset.id === id) {
    const btn = dlg.querySelector(`.actions [data-save]`);
    if (btn) {
      const on = isSaved(id);
      btn.className = `btn ${on ? 'on' : (e.bookingUrl ? '' : 'primary')}`;
      btn.setAttribute('aria-pressed', on); btn.textContent = t(on ? 'detail.saved' : 'detail.save');
    }
  }
}

/* ------------------------------------------------------------------ */
/* 캘린더 내보내기 (.ics / Google) — 이벤트 현지 타임존 기준               */
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
function eventTimes(e) {
  const m = /^(\d{1,2}):(\d{2})/.exec(e.startTime || '');
  if (m) {
    const sh = +m[1], sm = +m[2];
    const dur = e.durationMin || 120;
    const endMin = Math.min(sh * 60 + sm + dur, 23 * 60 + 59);
    return { sh, sm, eh: Math.floor(endMin / 60), em: endMin % 60 };
  }
  return parseTimes(e.time) || parseTimes(e.timeEn);
}

const compact = s => s.replace(/-/g, '');

function calRange(e, scope, day) {
  const tz = eventTz(e);
  if (scope === 'day' && day) {
    const tm = eventTimes(e);
    if (tm) return { timed: true, tz, start: utcStamp(localToUtcMs(day, tm.sh, tm.sm, tz)), end: utcStamp(localToUtcMs(day, tm.eh, tm.em, tz)) };
    return { timed: false, tz, start: compact(day), end: compact(addDaysStr(day, 1)) };
  }
  if (e.startDate === e.endDate) return calRange(e, 'day', e.startDate);
  return { timed: false, tz, start: compact(e.startDate), end: compact(addDaysStr(e.endDate, 1)) };
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
  return [L(e, 'time') && `${t('ics.time')}: ${L(e, 'time')}`, feeText(e) && `${t('ics.fee')}: ${feeText(e)}`,
    safeUrl(e.bookingUrl) && `${t('ics.booking')}: ${e.bookingUrl}`,
    safeUrl(e.homepage) && `${t('ics.homepage')}: ${e.homepage}`, `${t('ics.view')}: ${eventUrl(e)}`].filter(Boolean).join('\n');
}

function veventLines(e, scope, day) {
  const r = calRange(e, scope, day);
  const stamp = utcStamp(Date.now());
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
  if (hasCoords(e)) lines.push(`GEO:${(+e.lat).toFixed(6)};${(+e.lng).toFixed(6)}`);
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
    action: 'TEMPLATE', text: L(e, 'title'), dates: `${r.start}/${r.end}`, ctz: r.tz,
    location: [L(e, 'place'), L(e, 'address')].filter(Boolean).join(', '),
    details: eventDetailsText(e),
  });
  return 'https://calendar.google.com/calendar/render?' + p;
}

function currentCalChoice() {
  const dlg = $('#detail');
  const scope = dlg.querySelector('input[name=calScope]:checked')?.value || dlg.querySelector('input[name=calScope]')?.value || 'all';
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
  const notified = LS.get('notified', {});
  for (const e of Object.values(state.saved)) {
    if (isEvergreen(e)) continue;
    const td = todayIn(eventTz(e));
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
/* 지도 탭 (Leaflet 1.9.4 — 지도 탭을 열 때만 지연 로드, OSM 타일)          */
/* ------------------------------------------------------------------ */
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const CLUSTER_OVER = 150;   // 마커가 이보다 많으면 격자 묶음
const CLUSTER_PX = 56;
let leafletP = null;
function loadLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  return (leafletP ||= new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET_CSS; css.crossOrigin = '';
      document.head.appendChild(css);
    }
    const s = document.createElement('script'); s.src = LEAFLET_JS; s.async = true; s.crossOrigin = '';
    s.onload = () => (window.L?.map ? resolve(window.L) : reject(new Error('leaflet missing')));
    s.onerror = () => { leafletP = null; s.remove(); reject(new Error('leaflet load failed')); };
    document.head.appendChild(s);
  }));
}

const mapUI = {
  map: null, layer: null, routeLayer: null, userLayer: null,
  mode: 'events',          // 'events' | 'cities'(지도에서 도시 고르기)
  country: null,           // cities 모드에서 보고 있는 나라
  view: null, viewKey: '', // 탭을 다시 그려도 위치 유지
  bounds: null,            // '이 지역 검색'으로 고정한 범위
  selected: null,
};
const mapViewKey = () => `${state.cityId}|${state.near}|${mapUI.mode}|${mapUI.country}`;

function renderMapTab() {
  if (state.loading) return `<div class="empty loading" role="status"><h3>${esc(t('loading'))}</h3></div>`;
  const cities = mapUI.mode === 'cities';
  const countries = [...new Set(state.cities.map(c => c.country))].sort((a, b) => countryRank(a) - countryRank(b));
  return `<div class="map-view">
    <div class="map-toolbar">
      ${cities
        ? `<div class="map-title">${esc(t('map.pickTitle'))}</div>
           <div class="filters">${countries.map(cc => {
             const c0 = state.cities.find(c => c.country === cc);
             return `<button class="filter ${mapUI.country === cc ? 'active' : ''}" data-map-country="${esc(cc)}" aria-pressed="${mapUI.country === cc}">${esc(countryName(c0))}</button>`;
           }).join('')}
           <button class="filter" data-action="map-exit-cities">${esc(t('map.backToEvents'))}</button></div>`
        : `<div class="search">
             <input id="searchInput" class="search-input" type="search" enterkeyhint="search" autocomplete="off"
               value="${esc(state.query)}" placeholder="${esc(t('search.placeholder'))}" aria-label="${esc(t('search.aria'))}">
             <button class="search-clear" data-action="clear-search" aria-label="${esc(t('search.clear'))}" ${state.query ? '' : 'hidden'}>✕</button>
           </div>
           <div class="filters">${FILTERS.map(f => `<button class="filter ${state.filter === f ? 'active' : ''}" data-filter="${f}" aria-pressed="${state.filter === f}">${t('filter.' + f)}</button>`).join('')}</div>`}
    </div>
    <div class="map-stage">
      <div id="map" class="map-canvas" role="region" aria-label="${esc(t('map.aria'))}"></div>
      <button class="map-search-area" id="mapSearchArea" data-action="map-search-area" hidden>${esc(t('map.searchArea'))}</button>
      <button class="map-locate" data-action="map-locate" aria-label="${esc(t('map.locate'))}" title="${esc(t('map.locate'))}">◎</button>
      <div class="map-switch-wrap" id="mapSwitch"></div>
      <p class="map-status" id="mapStatus" role="status" aria-live="polite"></p>
      <div class="map-card" id="mapCard" hidden></div>
    </div>
  </div>`;
}

function destroyMap() {
  if (!mapUI.map) return;
  // 위치는 moveend 때 이미 저장됨. 여기서 다시 저장하면 모드가 바뀐 뒤의 키로 덮어써서 안 됨.
  mapUI.map.remove();
  mapUI.map = mapUI.layer = mapUI.routeLayer = mapUI.userLayer = null;
}
function saveMapView() {
  if (!mapUI.map) return;
  const c = mapUI.map.getCenter();
  mapUI.view = { center: [c.lat, c.lng], zoom: mapUI.map.getZoom() };
  mapUI.viewKey = mapViewKey();
}

async function mountMap() {
  const el = $('#map'); if (!el) return;
  let L;
  try { L = await loadLeaflet(); }
  catch (err) { console.warn(err); const s = $('#mapStatus'); if (s) s.textContent = t('map.loadFail'); return; }
  if (state.tab !== 'map' || !document.body.contains(el) || mapUI.map) return;
  const map = L.map(el, { zoomControl: true, attributionControl: true, worldCopyJump: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  }).addTo(map);
  mapUI.map = map;
  mapUI.layer = L.layerGroup().addTo(map);
  mapUI.routeLayer = L.layerGroup().addTo(map);
  mapUI.userLayer = L.layerGroup().addTo(map);

  if (mapUI.view && mapUI.viewKey === mapViewKey()) map.setView(mapUI.view.center, mapUI.view.zoom);
  else fitMapInitial();

  map.on('zoomend', drawMarkers);
  map.on('moveend', saveMapView);
  map.on('dragend', () => { if (mapUI.mode === 'events') { const b = $('#mapSearchArea'); if (b) b.hidden = false; } });
  map.on('click', hideMapCard);
  drawMarkers();
  drawUser();
  if (mapUI.selected) { const e = findEvent(mapUI.selected); if (e) showMapCard(e, { pan: false }); }
}

function citiesOf(cc) { return state.cities.filter(c => c.country === cc && hasCoords(c)); }

function fitMapInitial() {
  const { map } = mapUI; const L = window.L;
  if (mapUI.mode === 'cities') {
    const pts = citiesOf(mapUI.country).map(c => [c.lat, c.lng]);
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 8 });
    else map.setView([40, 60], 3);
    return;
  }
  if (state.near && state.coords) { map.setView([state.coords.lat, state.coords.lng], state.radiusKm <= 5 ? 14 : state.radiusKm <= 10 ? 13 : state.radiusKm <= 20 ? 12 : 10); return; }
  const c = curCity();
  if (hasCoords(c)) { map.setView([c.lat, c.lng], (c.radiusKm || 30) > 60 ? 9 : (c.radiusKm || 30) > 30 ? 10 : 11); return; }
  const pts = mapEvents().map(e => [e.lat, e.lng]);
  if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 14 });
  else map.setView([40, 60], 3);
}

function mapEvents() {
  const q = state.query.trim();
  let list = applyFilter(baseList().filter(e => hasCoords(e) && matchesQuery(e, q)), cityToday());
  if (mapUI.bounds) list = list.filter(e => mapUI.bounds.contains([+e.lat, +e.lng]));
  return list;
}

const pinIcon = (html, size = 24) => window.L.divIcon({ className: 'map-pin-wrap', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

function drawMarkers() {
  const { map, layer } = mapUI; const L = window.L;
  if (!map || !layer) return;
  layer.clearLayers();
  const status = $('#mapStatus');

  if (mapUI.mode === 'cities') {
    const cs = citiesOf(mapUI.country);
    for (const c of cs) {
      const m = L.marker([c.lat, c.lng], {
        icon: L.divIcon({ className: 'map-pin-wrap', html: `<span class="map-city ${state.cityId === c.id ? 'active' : ''}"><b>${esc(cityName(c))}</b>${c.count ? `<small>${esc(t('count', { n: c.count }))}</small>` : ''}</span>`, iconSize: null, iconAnchor: [0, 0] }),
        title: cityName(c), keyboard: true, riseOnHover: true,
      });
      m.on('click', () => chooseCityFromMap(c.id));
      m.addTo(layer);
    }
    if (status) status.textContent = t('map.pickHint');
    return;
  }

  const list = mapEvents();
  if (status) {
    status.innerHTML = list.length
      ? `${esc(t(mapUI.bounds ? 'map.countArea' : 'map.count', { n: list.length }))}${mapUI.bounds ? ` · <button class="link-btn" data-action="map-clear-area">${esc(t('map.showAll'))}</button>` : ''}`
      : esc(t(mapUI.bounds ? 'map.noneArea' : 'map.none'));
  }
  const z = map.getZoom();
  const addPin = e => {
    const m = L.marker([+e.lat, +e.lng], {
      icon: pinIcon(`<span class="map-pin k-${esc(e.kind)} ${isSaved(e.id) ? 'saved' : ''} ${mapUI.selected === e.id ? 'selected' : ''}"></span>`, 26),
      title: L_title(e), keyboard: true, riseOnHover: true,
    });
    m.on('click', ev => { L.DomEvent.stopPropagation(ev); showMapCard(e); });
    m.addTo(layer);
  };
  if (list.length <= CLUSTER_OVER || z >= 15) { list.forEach(addPin); return; }
  // 간단한 격자 묶음: 같은 화면 격자 칸에 있는 마커를 하나로
  const buckets = new Map();
  for (const e of list) {
    const p = map.project([+e.lat, +e.lng], z);
    const k = `${Math.floor(p.x / CLUSTER_PX)}:${Math.floor(p.y / CLUSTER_PX)}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(e);
  }
  for (const items of buckets.values()) {
    if (items.length === 1) { addPin(items[0]); continue; }
    const lat = items.reduce((s, e) => s + +e.lat, 0) / items.length, lng = items.reduce((s, e) => s + +e.lng, 0) / items.length;
    const size = items.length >= 100 ? 46 : items.length >= 20 ? 40 : 34;
    const m = L.marker([lat, lng], { icon: pinIcon(`<span class="map-pin cluster">${items.length}</span>`, size), title: t('map.cluster', { n: items.length }), keyboard: true });
    m.on('click', ev => {
      L.DomEvent.stopPropagation(ev);
      const b = L.latLngBounds(items.map(e => [+e.lat, +e.lng]));
      if (b.getNorthEast().equals(b.getSouthWest())) map.setView(b.getCenter(), Math.min(z + 3, 19));
      else map.fitBounds(b, { padding: [50, 50], maxZoom: Math.min(z + 4, 18) });
    });
    m.addTo(layer);
  }
}

function showMapCard(e, { pan = true } = {}) {
  mapUI.selected = e.id;
  const card = $('#mapCard'); if (!card) return;
  const ever = isEvergreen(e);
  card.innerHTML = `
    <article class="map-card-body card k-${esc(e.kind)}" data-open="${esc(e.id)}" tabindex="0" aria-label="${esc(L(e, 'title'))}">
      ${posterHTML(e, 'thumb')}
      <div>
        ${tagsHTML(e)}
        <h3>${esc(L(e, 'title'))}</h3>
        <div class="meta">
          ${ever ? expMetaHTML(e) : `<span>${fmtRange(e.startDate, e.endDate)} · ${statusHTML(status(e))}</span>`}
          <span>${esc(L(e, 'place') || L(e, 'address'))}${distSuffix(e)}</span>
        </div>
      </div>
    </article>
    <button class="map-card-close" data-action="map-card-close" aria-label="${esc(t('detail.close'))}">✕</button>`;
  card.hidden = false;
  drawRoute(e.kind === 'audioguide' && Array.isArray(e.stops) ? e.stops : null);
  drawMarkers();
  if (pan && mapUI.map && !(e.kind === 'audioguide' && e.stops?.length > 1)) mapUI.map.panTo([+e.lat, +e.lng]);
}
function hideMapCard() {
  const card = $('#mapCard'); if (card) { card.hidden = true; card.innerHTML = ''; }
  if (mapUI.selected) { mapUI.selected = null; drawRoute(null); drawMarkers(); }
}

// 오디오투어: 스톱을 번호 마커 + 단색 경로선으로
function drawRoute(stops) {
  const { map, routeLayer } = mapUI; const L = window.L;
  if (!map || !routeLayer) return;
  routeLayer.clearLayers();
  const pts = (stops || []).filter(hasCoords).map(s => [+s.lat, +s.lng]);
  if (!pts.length) return;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f26a1b';
  if (pts.length > 1) L.polyline(pts, { color: accent, weight: 4, opacity: 0.9, lineJoin: 'round', interactive: false }).addTo(routeLayer);
  stops.filter(hasCoords).forEach((s, i) => {
    L.marker([+s.lat, +s.lng], { icon: pinIcon(`<span class="map-pin stop-num">${i + 1}</span>`, 26), title: `${i + 1}. ${L_title(s)}`, keyboard: false, interactive: false }).addTo(routeLayer);
  });
  if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 17 });
}

function drawUser() {
  const { userLayer } = mapUI; const L = window.L;
  if (!userLayer || !state.coords) return;
  userLayer.clearLayers();
  L.marker([state.coords.lat, state.coords.lng], { icon: pinIcon('<span class="map-pin me"></span>', 20), title: t('map.you'), keyboard: false, interactive: false }).addTo(userLayer);
}

function offerCitySwitch(p) {
  const wrap = $('#mapSwitch'); if (!wrap) return;
  const n = nearestCity(p);
  if (n && n.city.id !== state.cityId && n.d <= NEAREST_MAX_KM) {
    wrap.innerHTML = `<button class="btn map-switch" data-city="${esc(n.city.id)}">${esc(t('map.switchCity', { city: cityName(n.city) }))}</button>`;
  } else wrap.innerHTML = '';
}

function chooseCityFromMap(id) {
  mapUI.mode = 'events'; mapUI.bounds = null; mapUI.selected = null; mapUI.view = null;
  selectCity(id);
}

function openMapPicker() {
  state.tab = 'map';
  mapUI.mode = 'cities';
  mapUI.country = curCity()?.country || (getLang() === 'ko' ? 'KR' : (state.cities[0]?.country || 'KR'));
  mapUI.selected = null; mapUI.view = null;
  render();
}

/* ------------------------------------------------------------------ */
/* 지역(도시) 선택 + 전 세계 장소 검색                                    */
/* ------------------------------------------------------------------ */
function renderRegionSheet() {
  const dlg = $('#regionSheet');
  dlg.setAttribute('aria-labelledby', 'regionSheetTitle');
  dlg.innerHTML = `
    <div class="grab" aria-hidden="true"></div>
    <div class="sheet-head" id="regionSheetTitle">${t('region.sheet')}</div>
    <div class="region-search">
      <input id="regionSearch" class="search-input" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off"
        value="${esc(state.regionQuery)}" placeholder="${esc(t('region.searchPh'))}" aria-label="${esc(t('region.searchAria'))}" aria-controls="regionResults">
    </div>
    <div class="scroll">
      <div class="region-results" id="regionResults">${regionResultsHTML()}</div>
    </div>`;
}

// 지원 지역: 대한민국 → 독일 순 (그 외 나라는 뒤에)
// 지역 선택 시트의 나라 순서: 한국·독일(1단계) → 유럽(2단계, 서→동 대략). 목록에 없는 나라는 뒤에 이름순.
const COUNTRY_ORDER = ['KR', 'DE', 'FR', 'GB', 'ES', 'IT', 'AT', 'CH', 'NL', 'BE', 'PT', 'CZ', 'HU',
  'US', 'AU', 'JP', 'TW', 'HK', 'SG', 'TH', 'VN', 'MY', 'PH', 'ID', 'CN', // 3단계: 미국·호주·아시아
  'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'ZA', 'EG', 'MA', 'KE', 'NG', 'GH', 'TZ', 'ET', 'SN', 'RW']; // 4단계: 미주·아프리카
const countryRank = cc => { const i = COUNTRY_ORDER.indexOf(cc); return i < 0 ? COUNTRY_ORDER.length : i; };

const cityMatches = (c, q) => norm([c.id, c.name?.ko, c.name?.en, c.country, countryName(c), c.countryName?.ko, c.countryName?.en].filter(Boolean).join(' ')).includes(norm(q));

function cityButtonHTML(c, note = '') {
  const on = !state.near && state.cityId === c.id;
  return `<button class="region-item ${on ? 'active' : ''}" data-city="${esc(c.id)}" aria-pressed="${on}">
    <span class="region-name">${esc(cityName(c))}</span>${note || (c.count ? `<small>${esc(t('count', { n: c.count }))}</small>` : '')}</button>`;
}

function groupedCitiesHTML() {
  const groups = new Map();
  for (const c of state.cities) { if (!groups.has(c.country)) groups.set(c.country, []); groups.get(c.country).push(c); }
  const dist = cc => (state.coords ? Math.min(...groups.get(cc).filter(hasCoords).map(c => distanceKm(state.coords, c)), Infinity) : Infinity);
  const keys = [...groups.keys()].sort((a, b) => {
    const r = countryRank(a) - countryRank(b);
    if (r) return r;
    const d = dist(a) - dist(b);
    if (Number.isFinite(d) && d !== 0) return d;
    return countryName(groups.get(a)[0]).localeCompare(countryName(groups.get(b)[0]), locale());
  });
  return keys.map(k => {
    const cs = groups.get(k).sort((a, b) => (b.count || 0) - (a.count || 0) || cityName(a).localeCompare(cityName(b), locale()));
    return `<section class="region-group"><h3>${esc(countryName(cs[0]))}</h3><div class="region-grid">${cs.map(c => cityButtonHTML(c)).join('')}</div></section>`;
  }).join('');
}

function regionResultsHTML() {
  const q = state.regionQuery.trim();
  if (state.geoMiss) {
    return `<div class="nearest-note miss">${esc(t('region.noneNear', { place: state.geoMiss.name, km: NEAREST_MAX_KM }))}</div>
      ${deeplinksHTML(state.geoMiss.name, 'any')}
      <button class="btn wide block" data-action="geo-back">${esc(t('region.back'))}</button>`;
  }
  if (!q) {
    return `<div class="region-near">
        <button class="region-item near ${state.near ? 'active' : ''}" data-near="1" aria-pressed="${state.near}">${t('region.nearBtn')}</button>
        <button class="region-item pick-map" data-action="pick-map">${t('region.pickMap')}</button>
        <div class="radius-row">${t('region.radius')}
          ${[5, 10, 20, 50].map(k => `<button class="filter ${state.radiusKm === k ? 'active' : ''}" data-radius="${k}" aria-pressed="${state.radiusKm === k}">${k}km</button>`).join('')}
        </div>
      </div>
      ${state.cities.length ? groupedCitiesHTML() : `<p class="note">${esc(t('loading'))}</p>`}`;
  }
  const covered = state.cities.filter(c => cityMatches(c, q));
  let html = `<section class="region-group"><h3>${esc(t('region.covered'))}</h3>`;
  html += covered.length ? `<div class="region-grid">${covered.map(c => cityButtonHTML(c, `<small>${esc(countryName(c))}</small>`)).join('')}</div>` : `<p class="note">${esc(t('region.noCovered'))}</p>`;
  html += `</section><section class="region-group"><h3>${esc(t('region.world'))}</h3>`;
  if (state.geoError) html += `<p class="note">${esc(t('region.geoError'))}</p>`;
  else if (state.geoResults == null) html += `<p class="note">${esc(t('region.searching'))}</p>`;
  else if (!state.geoResults.length) html += `<p class="note">${esc(t('region.geoNone', { q }))}</p>`;
  else {
    html += `<div class="region-list">${state.geoResults.map((g, i) => {
      const n = nearestCity(g);
      const ok = n && n.d <= NEAREST_MAX_KM;
      const note = ok
        ? (n.d < 5 ? t('region.isCovered', { city: cityName(n.city) }) : t('region.nearest', { city: cityName(n.city), km: fmtKm(n.d) }))
        : t('region.nearestNone', { km: NEAREST_MAX_KM });
      const sub = [g.admin1, g.country].filter(Boolean).join(', ');
      return `<button class="region-item geo" data-geo="${i}"><span class="region-name">${esc(g.name)}</span><small>${esc(sub)}</small><span class="nearest-note ${ok ? '' : 'miss'}">${esc(note)}</span></button>`;
    }).join('')}</div>`;
  }
  html += `<p class="attribution">${t('region.geoCredit')}</p></section>`;
  return html;
}

function renderRegionResults() { const r = $('#regionResults'); if (r) r.innerHTML = regionResultsHTML(); }

let geoAbort = null;
function searchPlaces(q) {
  clearTimeout(searchPlaces.t);
  state.geoMiss = null;
  if (!q.trim()) { state.geoResults = null; state.geoError = false; return renderRegionResults(); }
  state.geoResults = null; state.geoError = false; renderRegionResults();
  searchPlaces.t = setTimeout(async () => {
    geoAbort?.abort(); geoAbort = new AbortController();
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=8&language=${getLang() === 'en' ? 'en' : 'ko'}&format=json`;
      const res = await fetch(url, { signal: geoAbort.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      if (q !== state.regionQuery) return;
      state.geoResults = (j.results || []).map(r => ({ name: r.name, lat: r.latitude, lng: r.longitude, country: r.country, admin1: r.admin1, cc: r.country_code }));
    } catch (err) {
      if (err.name === 'AbortError') return;
      state.geoError = true;
    }
    renderRegionResults();
  }, 300);
}

function openRegionSheet() { state.geoMiss = null; renderRegionSheet(); openSheet($('#regionSheet')); }

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

/* ------------------------------------------------------------------ */
/* 데이터 로딩                                                          */
/* ------------------------------------------------------------------ */
async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

const validEvent = e => e && e.id && e.title && e.startDate && e.endDate && e.kind;

// v1 형식(data/events.json, region 필드) 호환: 도시 목록을 합성
async function loadLegacy() {
  const j = await fetchJson('data/events.json');
  const byCity = new Map();
  for (const e of j.events || []) {
    if (!validEvent(e)) continue;
    const id = LEGACY_REGION[e.region] || 'seoul';
    e.cityId = id; e.tz ||= 'Asia/Seoul';
    if (!byCity.has(id)) byCity.set(id, []);
    byCity.get(id).push(e);
  }
  state.cities = [...byCity.entries()].map(([id, evs]) => {
    const ko = Object.keys(LEGACY_REGION).find(k => LEGACY_REGION[k] === id);
    const pts = evs.filter(hasCoords);
    return {
      id, name: { ko, en: REGION_EN[ko] || id }, country: 'KR', countryName: { ko: '대한민국', en: 'South Korea' }, tz: 'Asia/Seoul',
      lat: pts.length ? pts.reduce((s, e) => s + +e.lat, 0) / pts.length : null, lng: pts.length ? pts.reduce((s, e) => s + +e.lng, 0) / pts.length : null,
      count: evs.length,
    };
  });
  for (const [id, evs] of byCity) state.cityData.set(id, { meta: j.meta || {}, events: evs });
}

async function loadCities() {
  try {
    const j = await fetchJson('data/cities.json');
    state.cities = (j.cities || []).filter(c => c.id && c.name);
    if (!state.cities.length) throw new Error('empty cities');
  } catch (err) {
    console.warn('cities.json 없음 → v1 데이터 사용', err.message);
    try { await loadLegacy(); } catch (e2) { console.error(e2); toast(t('toast.loadFail')); }
  }
}

async function ensureCity(id) {
  if (state.cityData.has(id)) return state.cityData.get(id);
  const j = await fetchJson(`data/cities/${encodeURIComponent(id)}.json`);
  const c = cityById(id);
  const events = (j.events || []).filter(validEvent).map(e => ({ ...e, cityId: e.cityId || id, tz: e.tz || c?.tz }));
  const data = { meta: j.meta || {}, events };
  state.cityData.set(id, data);
  return data;
}

async function selectCity(id, { near = false } = {}) {
  const prev = state.cityId;
  state.cityId = id; state.near = near;
  LS.set('city', id); LS.set('near', near);
  if (prev !== id) { state.calSel = null; state.calMonth = null; state.query = ''; mapUI.bounds = null; mapUI.selected = null; mapUI.view = null; }
  state.loading = !state.cityData.has(id);
  render();
  try {
    const d = await ensureCity(id);
    if (state.cityId !== id) return; // 그 사이 다른 도시 선택
    state.events = d.events; state.meta = d.meta;
    refreshSaved(d.events);
  } catch (err) {
    console.error(err);
    state.events = []; state.meta = {};
    toast(t('toast.loadFail'));
  }
  state.loading = false;
  render();
}

// 저장된 이벤트 스냅샷을 최신 정보로 갱신
function refreshSaved(events) {
  let changed = false;
  for (const e of events) {
    const s = state.saved[e.id];
    if (s) { const { stops, ...rest } = e; state.saved[e.id] = { ...rest, stopsCount: stops?.length, savedAt: s.savedAt }; changed = true; }
  }
  if (changed) LS.set('saved', state.saved);
}

function pickInitialCity() {
  if (state.cityId && cityById(state.cityId)) return state.cityId;
  if (state.near && state.coords) { const n = nearestCity(state.coords); if (n) return n.city.id; }
  const tzMatch = state.cities.find(c => c.tz === LOCAL_TZ);
  return (getLang() === 'ko' && cityById('seoul')?.id) || tzMatch?.id || cityById('seoul')?.id || state.cities[0]?.id || null;
}

function changeLang(l) {
  setLang(l); LS.set('lang', getLang());
  render();
  if ($('#regionSheet').open) { renderRegionSheet(); if (state.regionQuery) searchPlaces(state.regionQuery); }
  const dlg = $('#detail');
  if (dlg.open && dlg.dataset.id) { const wasAudio = audio.e?.id === dlg.dataset.id; if (wasAudio) audio.stop(); openDetail(dlg.dataset.id, null, { fromHistory: true }); }
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
  if (el('[data-audio]')) {
    const a = el('[data-audio]').dataset.audio;
    if (a === 'toggle') audio.toggle();
    if (a === 'next') audio.go(audio.idx + 1);
    if (a === 'prev') audio.go(audio.idx - 1);
    return;
  }
  if (el('[data-audio-stop]')) return audio.go(+el('[data-audio-stop]').dataset.audioStop);
  if (el('[data-open]')) return openDetail(el('[data-open]').dataset.open, state.tab === 'calendar' ? state.calSel : null);

  if (el('.tabbar button')) { state.tab = el('.tabbar button').dataset.tab; render(); return scrollTo(0, 0); }
  if (el('[data-kind]')) {
    state.kind = el('[data-kind]').dataset.kind; LS.set('kind', state.kind);
    if (EXP_KINDS.has(state.kind)) state.filter = 'all';
    return render();
  }
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
    if (a === 'today') { const td = cityToday(); const d = parseYmd(td); state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); state.calSel = td; }
    return render();
  }

  if (el('#regionBtn')) return openRegionSheet();
  if (el('[data-city]')) {
    closeSheet($('#regionSheet'));
    state.regionQuery = '';
    const id = el('[data-city]').dataset.city;
    if (state.tab === 'map') return chooseCityFromMap(id);
    return selectCity(id);
  }
  if (el('[data-map-country]')) {
    mapUI.country = el('[data-map-country]').dataset.mapCountry; mapUI.view = null;
    return render();
  }
  if (el('[data-near]')) {
    if (!(await locate())) return;
    const n = nearestCity(state.coords);
    if (!n) return toast(t('toast.loadFail'));
    if (n.d > NEAREST_MAX_KM + state.radiusKm) toast(t('region.nearFar', { city: cityName(n.city), km: fmtKm(n.d) }));
    if (state.sort === 'date') { state.sort = 'distance'; LS.set('sort', state.sort); }
    closeSheet($('#regionSheet'));
    return selectCity(n.city.id, { near: true });
  }
  if (el('[data-geo]')) {
    const g = state.geoResults?.[+el('[data-geo]').dataset.geo]; if (!g) return;
    const n = nearestCity(g);
    if (n && n.d <= NEAREST_MAX_KM) {
      closeSheet($('#regionSheet'));
      state.regionQuery = '';
      if (n.d >= 5) toast(t('region.nearestToast', { city: cityName(n.city), km: fmtKm(n.d) }));
      return selectCity(n.city.id);
    }
    state.geoMiss = { name: g.name };
    return renderRegionResults();
  }
  if (el('[data-radius]')) {
    state.radiusKm = +el('[data-radius]').dataset.radius; LS.set('radiusKm', state.radiusKm);
    renderRegionResults(); return render();
  }

  const action = el('[data-action]')?.dataset.action;
  if (action) {
    const id = $('#detail').dataset.id; const e = id && findEvent(id);
    if (action === 'geo-back') { state.geoMiss = null; return renderRegionResults(); }
    if (action === 'pick-map') { closeSheet($('#regionSheet')); return openMapPicker(); }
    if (action === 'map-exit-cities') { mapUI.mode = 'events'; mapUI.view = null; return render(); }
    if (action === 'map-card-close') return hideMapCard();
    if (action === 'map-search-area' && mapUI.map) {
      mapUI.bounds = mapUI.map.getBounds();
      el('[data-action]').hidden = true;
      hideMapCard(); drawMarkers();
      const c = mapUI.map.getCenter();
      return offerCitySwitch({ lat: c.lat, lng: c.lng });
    }
    if (action === 'map-clear-area') { mapUI.bounds = null; const w = $('#mapSwitch'); if (w) w.innerHTML = ''; return drawMarkers(); }
    if (action === 'map-locate') {
      if (!(await locate())) return;
      if (!mapUI.map) return;
      mapUI.bounds = null; // 새 위치에서는 '이 지역' 범위를 풀고 전체를 보여준다
      const sa = $('#mapSearchArea'); if (sa) sa.hidden = true;
      drawUser(); drawMarkers();
      mapUI.map.setView([state.coords.lat, state.coords.lng], 14);
      return offerCitySwitch(state.coords);
    }
    if (action === 'add-own') return openAddForm();
    if (action === 'clear-search') { state.query = ''; const i = $('#searchInput'); if (i) { i.value = ''; i.focus(); } return renderResultsOnly(); }
    if (action === 'toggle-cal') {
      const p = $('#calPanel'); p.hidden = !p.hidden;
      el('[data-action]').setAttribute('aria-expanded', String(!p.hidden));
      if (!p.hidden) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (action === 'ics' && e) { const c = currentCalChoice(); deliverIcs(buildIcs([{ e, ...c }]), `${L(e, 'title')}.ics`); }
    if (action === 'gcal' && e) { const c = currentCalChoice(); window.open(gcalUrl(e, c.scope, c.day), '_blank', 'noopener'); }
    if (action === 'share' && e) {
      const when = isEvergreen(e) ? '' : ` · ${fmtRange(e.startDate, e.endDate)}`;
      const data = { title: L(e, 'title'), text: `${L(e, 'title')}${when} · ${L(e, 'place')}`, url: eventUrl(e) };
      if (navigator.share) navigator.share(data).catch(() => {});
      else { navigator.clipboard?.writeText(data.url); toast(t('toast.copied')); }
    }
    if (action === 'export-all') {
      const items = Object.values(state.saved).filter(x => !isEvergreen(x) && x.endDate >= todayIn(eventTz(x))).map(x => ({ e: x, scope: 'all' }));
      if (items.length) deliverIcs(buildIcs(items), t('ics.exportName'));
    }
    if (action === 'reset' && confirm(t('set.resetConfirm'))) { state.saved = {}; LS.set('saved', {}); render(); }
  }
});

document.addEventListener('submit', ev => {
  if (ev.target.id === 'addForm') { ev.preventDefault(); saveOwnEvent(ev.target); }
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
  if (ev.target.id === 'regionSearch') {
    state.regionQuery = ev.target.value;
    searchPlaces(state.regionQuery);
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
  // 입력 중·재생 중에는 다시 그리지 않음 (날짜가 바뀌었을 수 있으니 그 외엔 갱신)
  const typing = ['searchInput', 'regionSearch'].includes(document.activeElement?.id);
  if (!typing && !audio.playing) render();
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
async function main() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.error);
  render();
  await loadCities();
  const id = pickInitialCity();
  if (id) await selectCity(id, { near: state.near && !!state.coords });
  else { state.loading = false; render(); }
  setupInstallHint();
  // 공유 링크(#event=...)로 들어온 경우: 기본 화면 위에 상세를 열어 뒤로가기로 앱에 남도록
  const m = location.hash.match(/^#event=(.+)$/);
  if (m) {
    const eid = decodeURIComponent(m[1]);
    history.replaceState(null, '', location.pathname + location.search);
    if (!findEvent(eid)) {
      // 다른 도시의 이벤트일 수 있음: 모든 도시 파일을 순서대로 확인 (공유 링크 진입 시에만)
      for (const c of state.cities) { try { const d = await ensureCity(c.id); if (d.events.some(e => e.id === eid)) break; } catch { /* skip */ } }
    }
    openDetail(eid);
  }
  checkReminders();
}
main();
