// 보강 단계: (1) 포스터 없는 이벤트에 공식 페이지의 og:image, (2) 주소만 있는 이벤트 지오코딩(Nominatim).
// 둘 다 결과를 data/*.json 캐시에 저장해 다음 실행에서 재사용 → 매일 호출량이 거의 늘지 않는다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { http, getJson, pool, httpsUrl, decodeEntities, validLatLng, normTitle, stripTags, clip, km } from './util.mjs';

function loadJson(path) { try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}; } catch { return {}; } }

/* ---------- og:image ---------- */
const IMG_CACHE = 'data/imagecache.json';
const IMG_TTL_DAYS = 30;
const BAD_IMG = /(logo|favicon|sprite|placeholder|default[-_]?(image|og)|blank|spacer|escudo|wappen|\/marca\/|icon[-_]?\d*\.(png|svg)|\.svg(\?|$))/i;
const GENERIC_MIN = 5; // 서로 다른 이벤트 5개 이상이 같은 og:image → 사이트 공통 이미지로 보고 버린다

function ogFromHtml(html, base) {
  const head = html.slice(0, 200000);
  const metas = [...head.matchAll(/<meta\s+[^>]*>/gi)].map(m => m[0]);
  const attr = (tag, a) => (tag.match(new RegExp(`${a}\\s*=\\s*["']([^"']*)["']`, 'i')) || [])[1];
  for (const key of ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']) {
    for (const m of metas) {
      const k = (attr(m, 'property') || attr(m, 'name') || '').toLowerCase();
      if (k !== key) continue;
      const u = httpsUrl(decodeEntities(attr(m, 'content') || ''), base);
      if (u && !BAD_IMG.test(u)) return u;
    }
  }
  return '';
}

/**
 * events 중 poster 없고 homepage/sourceUrl/bookingUrl이 있는 것에 og:image를 붙인다.
 * 이미지를 '생성'하지 않는다: 이벤트 공식 페이지가 공유용으로 지정한 대표 이미지만 사용.
 */
export async function enrichImages(events, { max = 300, concurrency = 6 } = {}) {
  const cache = loadJson(IMG_CACHE);
  const now = Date.now();
  const fresh = c => c && now - c.t < IMG_TTL_DAYS * 864e5;
  let fetched = 0, found = 0;
  // _noOg: 소스가 "이 링크의 og:image는 이벤트 이미지가 아님"이라고 표시한 이벤트(예: madrid.es 문장)
  const cand = events.filter(e => !e.poster && e.kind !== 'audioguide' && !e._noOg);
  // 도시별로 번갈아(라운드로빈) 처리 → 한 도시가 상한(max)을 다 쓰지 않게. 도시 안에서는 가까운 날짜 우선.
  const byCity = new Map();
  for (const e of cand) { if (!byCity.has(e.cityId)) byCity.set(e.cityId, []); byCity.get(e.cityId).push(e); }
  for (const l of byCity.values()) l.sort((a, b) => a.startDate.localeCompare(b.startDate));
  const targets = []; const lists = [...byCity.values()];
  for (let i = 0; lists.some(l => i < l.length); i++) for (const l of lists) if (i < l.length) targets.push(l[i]);
  const todo = [];
  for (const e of targets) {
    // 사이트 첫 화면(경로 없음)의 og:image는 기관 로고·대표사진일 뿐 이벤트 이미지가 아니므로 제외
    const url = [e.homepage, e.sourceUrl, e.bookingUrl].map(u => httpsUrl(u)).find(u => u && new URL(u).pathname.replace(/\/(index\.(html?|php))?$/, '').length > 1);
    if (!url) continue;
    const c = cache[url];
    if (fresh(c)) { if (c.img) { e.poster = c.img; e.posterCredit ||= `${new URL(url).host} (og:image)`; found++; } continue; }
    todo.push([e, url]);
  }
  const batch = todo.slice(0, max);
  await pool(batch, concurrency, async ([e, url]) => {
    fetched++;
    let img = '';
    try {
      const { text, res } = await http(url, { tries: 1, timeout: 6000, accept: 'text/html' });
      if (/html/i.test(res.headers.get('content-type') || 'text/html')) img = ogFromHtml(text, res.url || url);
    } catch { /* 페이지 오류는 무시 */ }
    cache[url] = { img, t: now };
    if (img) { e.poster = img; e.posterCredit ||= `${new URL(url).host} (og:image)`; found++; }
  });
  // 사이트 공통 이미지(로고·대표사진)를 여러 이벤트에 붙인 경우 제거
  const isOg = e => e.poster && /\(og:image\)$/.test(e.posterCredit || '');
  const byImg = new Map();
  for (const e of events) if (isOg(e)) { if (!byImg.has(e.poster)) byImg.set(e.poster, new Set()); byImg.get(e.poster).add(e.title); }
  let generic = 0;
  for (const e of events) if (isOg(e) && byImg.get(e.poster).size >= GENERIC_MIN) { e.poster = ''; e.posterCredit = undefined; generic++; found--; }
  // 캐시 크기 제한
  const keys = Object.keys(cache);
  if (keys.length > 20000) for (const k of keys.sort((a, b) => cache[a].t - cache[b].t).slice(0, keys.length - 20000)) delete cache[k];
  writeFileSync(IMG_CACHE, JSON.stringify(cache));
  return { fetched, found: Math.max(0, found), pending: Math.max(0, todo.length - batch.length), generic };
}

/* ---------- 지오코딩 (Nominatim, 1 req/s, 캐시) ---------- */
const GEO_CACHE = 'data/geocache.json';
let geoCache = null;
const normAddr = a => String(a || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function geocodeCached(address) {
  geoCache ??= loadJson(GEO_CACHE);
  const c = geoCache[normAddr(address)];
  return c && c.lat != null ? c : null;
}

/**
 * Nominatim 이용정책: 최대 1 req/s, 식별 가능한 User-Agent, 결과 캐시 → 모두 준수.
 * countryCodes로 결과를 제한하고, 도시 중심에서 radiusKm 밖이면 버린다.
 */
export async function geocodeEvents(events, cityById, { max = 120, countries = ['de'] } = {}) {
  geoCache ??= loadJson(GEO_CACHE);
  let calls = 0, hits = 0;
  for (const e of events) {
    if (e.lat != null && e.lng != null) continue;
    const city = cityById.get(e.cityId);
    if (!city || !countries.includes(city.country.toLowerCase())) continue;
    const addr = e.address || '';
    if (!addr || addr.length < 6) continue;
    // 우편번호나 도시명이 이미 있으면 그대로, 아니면 ", 현지 도시명"을 붙인다 (나라 무관)
    const names = [city.name.en, ...String(city.local || '').split('/')].map(x => x.trim().toLowerCase()).filter(Boolean);
    const q = /\b\d{4,5}\b/.test(addr) || names.some(n => addr.toLowerCase().includes(n)) ? addr : `${addr}, ${String(city.local || city.name.en).split('/')[0].trim()}`;
    const key = normAddr(q);
    let c = geoCache[key];
    if (!c) {
      if (calls >= max) continue;
      calls++;
      try {
        const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=${city.country.toLowerCase()}&q=${encodeURIComponent(q)}`;
        const r = await getJson(u, { tries: 2, timeout: 15000 });
        c = r[0] ? { lat: +(+r[0].lat).toFixed(6), lng: +(+r[0].lon).toFixed(6) } : { lat: null };
      } catch { c = { lat: null, err: 1 }; }
      c.t = Date.now();
      if (!c.err) geoCache[key] = c;
    }
    if (c.lat != null && validLatLng(c.lat, c.lng)) {
      // 도시 반경 밖의 엉뚱한 결과는 버림
      const R = 6371, t = x => x * Math.PI / 180;
      const d = 2 * R * Math.asin(Math.sqrt(Math.sin(t(c.lat - city.lat) / 2) ** 2 + Math.cos(t(city.lat)) * Math.cos(t(c.lat)) * Math.sin(t(c.lng - city.lng) / 2) ** 2));
      if (d <= city.radiusKm * 1.5) { e.lat = c.lat; e.lng = c.lng; e.geocoded = true; hits++; }
    }
  }
  writeFileSync(GEO_CACHE, JSON.stringify(geoCache));
  return { calls, hits };
}

/* ---------- 대표 이미지 대체 체인 (포스터 없는 이벤트) ----------
 * 1) 이벤트 페이지 og:image (enrichImages, 위)                                   → posterKind 'event'
 * 2) 장소(venue) 사진: 위키백과 geosearch(현지어, 다음 en) 반경 300m 안에서 장소명과 맞는 문서의 대표 사진(자유 라이선스)  → 'venue'
 * 3) 장소 공식 사이트(이벤트 homepage 도메인이 그 장소 전용일 때) 첫 화면 og:image  → 'venue'
 * 4) 최후: 반경 1km(없으면 5km) 안 가장 가까운 명소·동네 문서의 실제 사진        → 'area'
 * 좌표 없는 이벤트: 같은 도시에서 같은 장소명을 가진 이벤트의 좌표를 빌려 쓰고, 그래도 없으면 도시 중심의 명소 사진('area').
 * Commons 파일은 extmetadata 로 저작자·라이선스를 확인하고, 비자유·NC/ND 파일은 쓰지 않는다.
 * 결과는 data/venuecache.json 에 캐시(장소 60일, 못 찾음 20일, 파일 60일) → 매일 빌드는 거의 호출하지 않음. */
const VENUE_CACHE = 'data/venuecache.json';
const VENUE_UA = { 'User-Agent': 'NolgotBot/1.0 (+https://github.com/dayeonoh626-cyber/nolgot)' };
const BAD_FILE = /\.svg$|^(flag|coat[ _]of[ _]arms|wappen|escudo|blason|stemma|logo|emblem|seal|signature)|locator|location[ _]map|[ _]map[ _.]|karte|lageplan|übersichtsplan|diagram|_plan\b|icon/i;
const BAD_AREA = /\b(station|bahnhof|haltestelle|u-bahnhof|s-bahnhof|stazione|estación|gare|metro|tram|line|linie|schule|school|gymnasium|universit|hospital|krankenhaus|klinik|liste|list of|bundesautobahn|autobahn)\b|역$|선$|학교|병원|나들목/i;
const VENUE_STOP = new Set(['museum', 'museo', 'musée', 'theater', 'theatre', 'teatro', 'théâtre', 'kirche', 'church', 'iglesia', 'chiesa', 'église', 'haus', 'halle', 'hall', 'saal', 'galerie', 'gallery', 'galleria', 'centre', 'center', 'centro', 'zentrum', 'sala', 'stadt', 'city', 'platz', 'plaza', 'piazza', 'place', 'park', 'parque', 'parco', 'garten', 'garden', 'jardin', 'jardín', 'bühne', 'club', 'kultur', 'cultural', 'culture', 'cultura', 'kunst', 'arte', 'arts', 'national', 'nacional', 'nazionale', 'municipal', 'biblioteca', 'bibliothek', 'library', 'bibliothèque', 'online', 'verschiedene', 'diverse', 'various', 'treffpunkt', 'ticket', 'tickets', 'großer', 'kleiner', 'grande', 'große', 'kleine', 'neue', 'alte', 'nuevo', 'nueva', 'with', 'from', 'über', 'unter', 'and', 'und', 'del', 'des', 'der', 'die', 'das', 'the', 'della', 'delle', 'dello']);

const toks = s => String(s || '').toLowerCase().normalize('NFKC').split(/[^\p{L}\p{N}]+/u).filter(t => t.length >= 4 && !VENUE_STOP.has(t));
/** 장소명 ↔ 위키 문서 제목 일치도: 3 같음 · 2 포함 · 1 핵심 단어 공유 · 0 */
function nameScore(place, title, cityNames) {
  const a = normTitle(place), b = normTitle(title);
  if (!a || !b || cityNames.has(b) || cityNames.has(a)) return 0; // 장소가 그냥 '도시 이름'이면 장소 사진 아님
  if (a === b) return 3;
  // 포함: 문서 제목이 장소명 전체를 담거나(예: 'Kampnagel' ⊂ 'Kampnagel K6' 반대 방향 포함), 길이가 비슷할 때만 강한 일치.
  // 'Favoriten'(구) ⊂ 'Favoritenstraße'(거리)처럼 짧은 지명이 긴 장소명에 들어간 경우는 약한 일치(150m 이내만).
  if (Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a))) return b.includes(a) || b.length >= a.length * 0.6 ? 2 : 1;
  const ta = toks(place).filter(t => !cityNames.has(t)), tb = new Set(toks(title));
  return ta.some(t => tb.has(t)) ? 1 : 0;
}
const venueName = e => String(e.place || (e.address || '').split(',')[0] || '').trim();
const LANG_OF = { KR: 'ko', DE: 'de', GB: 'en', FR: 'fr', ES: 'es', HU: 'hu', AT: 'de', IT: 'it', NL: 'nl', CH: 'de', PT: 'pt', CZ: 'cs', BE: 'fr' };

async function geoImages(lang, lat, lng, radius) {
  const j = await getJson(`https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'geosearch', ggscoord: `${lat}|${lng}`, ggsradius: String(radius), ggslimit: '50',
    prop: 'pageimages|coordinates', piprop: 'name', pilimit: '50', pilicense: 'free', colimit: '50',
  })}`, { headers: VENUE_UA, tries: 2, timeout: 15000 });
  return (j.query?.pages || []).filter(p => p.pageimage && p.coordinates?.[0] && !BAD_FILE.test(p.pageimage))
    .map(p => ({ title: p.title, file: p.pageimage.replace(/_/g, ' '), lang, d: km({ lat, lng }, { lat: p.coordinates[0].lat, lng: p.coordinates[0].lon }) }))
    .sort((a, b) => a.d - b.d);
}

async function commonsMeta(files, cache) {
  const need = [...new Set(files)].filter(f => f && !cache[f]);
  for (let i = 0; i < need.length; i += 50) {
    const part = need.slice(i, i + 50);
    let j;
    try {
      j = await getJson(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', titles: part.map(f => 'File:' + f).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '800', iiextmetadatafilter: 'Artist|LicenseShortName|UsageTerms|NonFree' })}`, { headers: VENUE_UA, tries: 2, timeout: 20000 });
    } catch { continue; }
    const back = new Map((j.query?.normalized || []).map(r => [r.to, r.from]));
    for (const p of j.query?.pages || []) {
      const key = (back.get(p.title) || p.title).replace(/^File:/, '').replace(/_/g, ' ');
      const ii = p.imageinfo?.[0];
      if (!ii) { cache[key] = { bad: 1, t: Date.now() }; continue; } // Commons에 없는 파일(로컬 위키 전용 = 대개 비자유)
      const md = ii.extmetadata || {};
      const lic = md.LicenseShortName?.value || '';
      const bad = md.NonFree?.value === 'true' || /fair use|non-free|\bNC\b|\bND\b|noncommercial|no deriv/i.test(`${lic} ${md.UsageTerms?.value || ''}`);
      const artist = clip(stripTags(md.Artist?.value || ''), 80) || 'Unknown author';
      cache[key] = bad ? { bad: 1, t: Date.now() } : { url: ii.thumburl || ii.url, credit: `${artist} / ${lic || 'see file page'} (Wikimedia Commons)`, t: Date.now() };
    }
  }
}

export async function venueImages(events, cityById, { max = 3000, concurrency = 6 } = {}) {
  const cache = loadJson(VENUE_CACHE);
  cache.venues ||= {}; cache.files ||= {}; cache.roots ||= {};
  const now = Date.now();
  const st = { event: 0, venue: 0, venueSite: 0, area: 0, none: 0, lookups: 0, coordsBorrowed: 0, pending: 0 };
  // 이전 빌드에서 이 체인이 붙인 사진이 소스 모듈의 캐시 재사용(prev 필드 복사)으로 posterKind 없이 돌아온 경우 → 지우고 다시 판정
  const rootImgs = new Set(Object.values(cache.roots).map(r => r.img).filter(Boolean));
  for (const e of events) if (e.poster && !e.posterKind && e.kind !== 'audioguide' && !e.permanent
    && (/ — .+\(Wikimedia Commons\)$/.test(e.posterCredit || '') || rootImgs.has(e.poster))) { e.poster = ''; e.posterCredit = undefined; }
  for (const e of events) if (e.poster && !e.posterKind) e.posterKind = e.kind === 'audioguide' ? 'venue' : 'event';
  const cand = events.filter(e => !e.poster);

  // 좌표 빌려오기: 같은 도시·같은 장소명의 좌표 있는 이벤트
  const coordByName = new Map();
  for (const e of events) if (e.lat != null && !e.geocoded) { const n = normTitle(venueName(e)); if (n.length >= 3 && !coordByName.has(`${e.cityId}|${n}`)) coordByName.set(`${e.cityId}|${n}`, e); }
  for (const e of cand) if (e.lat == null) {
    const s = coordByName.get(`${e.cityId}|${normTitle(venueName(e))}`);
    if (s) { e.lat = s.lat; e.lng = s.lng; e.geocoded = true; st.coordsBorrowed++; }
  }

  // 장소별 그룹 (장소명 + 약 100m 격자). 좌표 없는 것은 도시 단위 그룹.
  const groups = new Map();
  for (const e of cand) {
    const city = cityById.get(e.cityId); if (!city) continue;
    const hasXY = e.lat != null && e.lng != null;
    const key = hasXY ? `${e.cityId}|${normTitle(venueName(e)).slice(0, 40)}|${e.lat.toFixed(3)},${e.lng.toFixed(3)}` : `${e.cityId}|@center`;
    if (!groups.has(key)) groups.set(key, { key, city, name: hasXY ? venueName(e) : '', lat: hasXY ? e.lat : (city.wikiCenter?.[0] ?? city.lat), lng: hasXY ? e.lng : (city.wikiCenter?.[1] ?? city.lng), events: [] });
    groups.get(key).events.push(e);
  }
  const list = [...groups.values()].sort((a, b) => b.events.length - a.events.length);

  // 2·4) 위키백과 geosearch (캐시)
  const fresh = c => c && now - c.t < (c.venue || c.area ? 60 : 20) * 864e5;
  const todo = list.filter(g => !fresh(cache.venues[g.key]));
  const batch = todo.slice(0, max); st.pending = todo.length - batch.length;
  await pool(batch, concurrency, async g => {
    const lang = g.city.wikiLang || LANG_OF[g.city.country] || 'en';
    const cityNames = new Set([g.city.name.en, g.city.name.ko, ...String(g.city.local || '').split('/')].map(n => normTitle(n)).filter(Boolean));
    const res = { t: now };
    const best = arr => arr.map(x => ({ ...x, s: nameScore(g.name, x.title, cityNames) }))
      .filter(x => (x.s >= 2 && x.d <= 0.3) || (x.s === 1 && x.d <= 0.15)).sort((a, b) => b.s - a.s || a.d - b.d)[0];
    try {
      st.lookups++;
      const near = await geoImages(lang, g.lat, g.lng, 1000);
      let v = g.name && best(near);
      if (!v && g.name && lang !== 'en') { try { v = best(await geoImages('en', g.lat, g.lng, 300)); } catch { /* en 실패는 무시 */ } }
      if (v) res.venue = { file: v.file, title: v.title };
      let area = near.filter(x => !BAD_AREA.test(x.title));
      if (!area.length) area = (await geoImages(lang, g.lat, g.lng, 5000)).filter(x => !BAD_AREA.test(x.title));
      // 후보 몇 개를 저장(첫 파일이 NC 등으로 걸러지면 다음 것)
      if (area.length) res.area = area.slice(0, 4).map(x => ({ file: x.file, title: x.title, d: +x.d.toFixed(2) }));
    } catch { res.err = 1; }
    if (!res.err) cache.venues[g.key] = res;
  });

  // Commons 저작자·라이선스
  const files = [];
  for (const g of list) { const c = cache.venues[g.key]; if (!c) continue; if (c.venue) files.push(c.venue.file); for (const a of c.area || []) files.push(a.file); }
  await commonsMeta(files, cache.files);
  const fileOk = f => { const m = cache.files[f]; return m && !m.bad && m.url ? m : null; };

  // 3) 장소 전용 도메인 판별: 도시 안에서 2곳 이상의 장소에 쓰인 도메인 = 포털·예매처 → 제외
  const hostOf = u => { try { return new URL(httpsUrl(u)).host.replace(/^www\./, ''); } catch { return ''; } };
  const hostVenues = new Map();
  for (const g of list) for (const e of g.events) { const h = hostOf(e.homepage); if (!h) continue; const k = `${g.city.id}|${h}`; if (!hostVenues.has(k)) hostVenues.set(k, new Set()); hostVenues.get(k).add(g.key); }
  const ownHost = g => {
    if (g.key.endsWith('@center')) return '';
    for (const e of g.events) {
      const h = hostOf(e.homepage); if (!h) continue;
      if (hostVenues.get(`${g.city.id}|${h}`).size >= 2) continue;
      if (hostOf(e.sourceUrl) === h || hostOf(e.bookingUrl) === h) continue; // 소스 사이트 자체
      if (/ticket|eventim|reservix|eventbrite|facebook|instagram|google|bit\.ly|linktr|wikipedia|youtube/i.test(h)) continue;
      return h;
    }
    return '';
  };
  const needRoot = [...new Set(list.filter(g => { const c = cache.venues[g.key]; return !(c?.venue && fileOk(c.venue.file)); }).map(ownHost).filter(Boolean))]
    .filter(h => !(cache.roots[h] && now - cache.roots[h].t < 30 * 864e5));
  await pool(needRoot.slice(0, +(process.env.VENUE_ROOT_MAX || 400)), 6, async h => {
    let img = '';
    try {
      const { text, res } = await http(`https://${h}/`, { tries: 1, timeout: 8000, accept: 'text/html' });
      if (/html/i.test(res.headers.get('content-type') || 'text/html')) img = ogFromHtml(text, res.url || `https://${h}/`);
    } catch { /* 무시 */ }
    cache.roots[h] = { img, t: now };
  });

  // 적용
  for (const g of list) {
    const c = cache.venues[g.key] || {};
    let pick = null;
    const vm = c.venue && fileOk(c.venue.file);
    // 핵심 단어만 겹친 약한 일치(점수 1: 같은 거리·동네 이름 등)는 장소 자체 사진이라 단정할 수 없어 'area'로 표기
    const cityNames = new Set([g.city.name.en, g.city.name.ko, ...String(g.city.local || '').split('/')].map(n => normTitle(n)).filter(Boolean));
    const vs = vm ? nameScore(g.name, c.venue.title, cityNames) : 0;
    if (vm && vs >= 2) pick = { poster: vm.url, credit: `${c.venue.title} — ${vm.credit}`, kind: 'venue', k: 'venue' };
    if (!pick) { const h = ownHost(g); const r = h && cache.roots[h]; if (r?.img) pick = { poster: r.img, credit: `${h} (og:image)`, kind: 'venue', k: 'venueSite' }; }
    if (!pick && vm && vs === 1) pick = { poster: vm.url, credit: `${c.venue.title} — ${vm.credit}`, kind: 'area', k: 'area' };
    if (!pick) for (const a of c.area || []) { const m = fileOk(a.file); if (m) { pick = { poster: m.url, credit: `${a.title} — ${m.credit}`, kind: 'area', k: 'area' }; break; } }
    for (const e of g.events) {
      if (!pick) { st.none++; continue; }
      e.poster = pick.poster; e.posterCredit = pick.credit; e.posterKind = pick.kind; st[pick.k]++;
    }
  }
  st.event = events.filter(e => e.posterKind === 'event').length;

  // 캐시 크기 제한
  for (const sec of ['venues', 'files', 'roots']) {
    const keys = Object.keys(cache[sec]);
    if (keys.length > 30000) for (const k of keys.sort((a, b) => cache[sec][a].t - cache[sec][b].t).slice(0, keys.length - 30000)) delete cache[sec][k];
  }
  writeFileSync(VENUE_CACHE, JSON.stringify(cache));
  return st;
}
