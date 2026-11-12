// 데이터 빌드 진입점: node scripts/build-data.mjs
// 결과: data/cities.json + data/cities/{cityId}.json  (형식: docs/data-contract.md)
//
// 흐름: 이전 배포본 로드(캐시) → 나라별 모듈(scripts/sources/{cc}.mjs) → 도시별 공통 소스(위키 오디오투어·Ticketmaster·Viator·GYG·izi)
//       → 실패한 소스는 이전 데이터로 대체 → 지오코딩 → og:image 보강 → 중복 제거 → 저장
//
// 환경변수 (모두 선택):
//   TOUR_API_KEY KOPIS_API_KEY SEOUL_API_KEY CULTURE_API_KEY TICKETMASTER_API_KEY VIATOR_API_KEY GYG_API_KEY IZI_API_KEY NPS_API_KEY(미국 국립공원)
//   PREV_BASE_URL  이전 배포본 기본 주소 (예: https://dayeonoh626-cyber.github.io/nolgot/data/cities/)
//   DAYS_AHEAD(120) OG_MAX(1200) GEOCODE_MAX(400) VENUE_MAX(3000) SKIP_PLACES=1 ONLY=seoul,berlin(디버그용 도시 제한) SKIP_WIKI=1
//   BUILD_COUNTRIES=FR,ES  일부 나라만 빌드 (나머지 도시 파일은 그대로 두고 cities.json에는 모든 도시를 유지)
//   WIKI_BUILD_MAX(20)     한 번에 새로 생성하는 오디오가이드 도시 수 (나머지는 다음 실행)
import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { CITIES, COUNTRIES } from './cities.mjs';
import { getJson, todayIn, addDaysStr, pool, isYmd, validLatLng } from './lib/util.mjs';
import { enrichImages, geocodeEvents, venueImages } from './lib/enrich.mjs';
import { dedupe } from './lib/dedupe.mjs';
import { wikipediaTours, meta as wikiMeta } from './sources/wikipedia-tours.mjs';
import { places, meta as placesMeta } from './sources/places.mjs';
import { GENERIC } from './sources/generic.mjs';

const T0 = Date.now();
const DAYS_AHEAD = +(process.env.DAYS_AHEAD || 120);
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const BUILD_COUNTRIES = (process.env.BUILD_COUNTRIES || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
const cities = CITIES.filter(c => (!ONLY.length || ONLY.includes(c.id)) && (!BUILD_COUNTRIES.length || BUILD_COUNTRIES.includes(c.country)));
const PARTIAL = cities.length < CITIES.length;
if (!cities.length) { console.error('빌드할 도시가 없음 (ONLY / BUILD_COUNTRIES 확인)'); process.exit(1); }
const phase = new Map(); let phaseT = Date.now();
const mark = name => { const now = Date.now(); phase.set(name, ((now - phaseT) / 1000).toFixed(0) + 's'); phaseT = now; };
const cityById = new Map(cities.map(c => [c.id, c]));
const OUT_DIR = 'data/cities';
mkdirSync(OUT_DIR, { recursive: true });

const warnings = new Map(cities.map(c => [c.id, []]));
const globalWarnings = [];
const warn = (cityId, msg) => { (cityId && warnings.get(cityId) || globalWarnings).push(msg); };
const elapsed = () => `${((Date.now() - T0) / 1000).toFixed(0)}s`;

/* ---------- 1. 이전 데이터 ---------- */
async function loadPrev(city) {
  const base = process.env.PREV_BASE_URL;
  if (base) {
    try { return await getJson(`${base.replace(/\/?$/, '/')}${city.id}.json`, { tries: 1, timeout: 15000 }); } catch { /* 첫 배포 등 */ }
  }
  try { const p = `${OUT_DIR}/${city.id}.json`; if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8')); } catch { /* 무시 */ }
  return null;
}
const prevByCity = new Map();
await pool(cities, 8, async c => { prevByCity.set(c.id, (await loadPrev(c))?.events || []); });
const prevById = new Map(); const prevByEnSource = new Map();
for (const list of prevByCity.values()) for (const e of list) { prevById.set(e.id, e); if (e.enSourceId) prevByEnSource.set(e.enSourceId, e); }
console.log(`[${elapsed()}] 이전 데이터: ${prevById.size}건 · 도시 ${cities.length}/${CITIES.length}${BUILD_COUNTRIES.length ? ' (BUILD_COUNTRIES=' + BUILD_COUNTRIES.join(',') + ')' : ''}`);
mark('prev');

const ctxBase = { daysAhead: DAYS_AHEAD, prevById, prevByEnSource, warn };
const byCity = new Map(cities.map(c => [c.id, []]));
const statusByCity = new Map(cities.map(c => [c.id, []]));
const push = (e) => { if (byCity.has(e.cityId)) byCity.get(e.cityId).push(e); };

/** 실패한 소스의 이전 데이터를 그대로 이어서 쓴다 (빈 화면 방지) */
function carryOver(cityId, sourceKey) {
  const prev = (prevByCity.get(cityId) || []).filter(e => e.sourceKey === sourceKey);
  for (const e of prev) push({ ...e, stale: true });
  return prev.length;
}

/* ---------- 2. 나라별 모듈 ---------- */
// 나라 모듈은 서로 독립(다른 호스트)이라 동시에 돌린다. 모듈 전체가 실패해도 다른 나라는 계속.
const countries = [...new Set(cities.map(c => c.country))];
await pool(countries, +(process.env.COUNTRY_CONCURRENCY || 4), async cc => {
  const conf = COUNTRIES[cc];
  const list = cities.filter(c => c.country === cc);
  if (!conf.module) return;
  let events, status;
  try {
    const mod = await import(new URL(conf.module, import.meta.url));
    ({ events, status } = await mod.fetchCountry(list, { ...ctxBase, country: conf }));
  } catch (err) {
    console.log(`[${elapsed()}] ${cc}: 모듈 실패 ${err.message}`);
    for (const c of list) warn(c.id, `${cc} 소스 모듈 실패: ${String(err.message).slice(0, 160)}`);
    return;
  }
  for (const e of events) push(e);
  for (const s of status) {
    for (const c of list) {
      if (s.cities && !s.cities.includes(c.id)) continue; // 특정 도시 전용 소스
      const n = events.filter(e => e.cityId === c.id && e.sourceKey === s.key).length;
      const st = { ...s, count: s.enabled && s.ok ? n : 0 };
      if (s.enabled && !s.ok) { st.carriedOver = carryOver(c.id, s.key); warn(c.id, `${s.name} 실패: ${s.error}`); }
      statusByCity.get(c.id).push(st);
    }
  }
  console.log(`[${elapsed()}] ${cc}: ${events.length}건 · ` + status.map(s => `${s.key}=${s.enabled ? (s.ok ? s.count : 'FAIL ' + s.error?.slice(0, 80)) : 'off'}`).join(' · '));
});

mark('country');
/* ---------- 3. 도시별 공통 소스 ---------- */
const generic = [
  ...(process.env.SKIP_WIKI === '1' ? [] : [{ key: wikiMeta.key, name: wikiMeta.name, fn: wikipediaTours, licence: wikiMeta.licence, url: wikiMeta.url }]),
  ...(process.env.SKIP_PLACES === '1' ? [] : [{ key: placesMeta.key, name: placesMeta.name, fn: places, licence: placesMeta.licence, url: placesMeta.url }]),
  ...GENERIC,
];
// 공통 소스끼리는 호스트가 달라 동시에 돌리고(호스트별 속도 제한은 util.http가 지킴), 각 소스 안에서는 도시 동시성 제한
const genTimes = [];
await Promise.all(generic.map(async g => {
  const t0 = Date.now();
  await pool(cities, g.key === 'wikipedia' ? +(process.env.WIKI_CONCURRENCY || 3) : 2, async city => {
    const ctx = { ...ctxBase, country: COUNTRIES[city.country] };
    const st = { key: g.key, name: g.name, licence: g.licence, url: g.url };
    try {
      const list = await g.fn(city, ctx);
      if (list === null) { statusByCity.get(city.id).push({ ...st, enabled: false, reason: '키 없음 또는 해당 국가 미지원' }); return; }
      for (const e of list) { e.cityId = city.id; e.tz ||= city.tz; push(e); }
      statusByCity.get(city.id).push({ ...st, enabled: true, ok: true, count: list.length });
    } catch (err) {
      const carried = carryOver(city.id, g.key);
      statusByCity.get(city.id).push({ ...st, enabled: true, ok: false, error: err.message.slice(0, 200), carriedOver: carried });
      warn(city.id, `${g.name} 실패: ${err.message.slice(0, 160)}`);
    }
  });
  console.log(`[${elapsed()}] ${g.key} 완료`);
  genTimes.push(`${g.key}:${((Date.now() - t0) / 1000).toFixed(0)}s`);
}));
mark('generic(' + genTimes.join(',') + ')');

/* ---------- 4. 정리·검증 ---------- */
let all = [];
for (const c of cities) {
  const today = todayIn(c.tz), until = addDaysStr(today, Math.max(DAYS_AHEAD, 366));
  const valid = byCity.get(c.id).filter(e =>
    e.id && e.title && e.kind && isYmd(e.startDate) && isYmd(e.endDate) && e.endDate >= today && e.startDate <= until);
  for (const e of valid) {
    if (e.endDate < e.startDate) e.endDate = e.startDate;
    if (!(validLatLng(e.lat, e.lng))) { e.lat = null; e.lng = null; }
  }
  byCity.set(c.id, valid);
  all.push(...valid);
}

/* ---------- 5. 지오코딩 (독일 주소 → Nominatim, 캐시) ---------- */
const geoTargets = all.filter(e => COUNTRIES[cityById.get(e.cityId).country].geocode);
const geo = await geocodeEvents(geoTargets, cityById, { max: +(process.env.GEOCODE_MAX || 400), countries: Object.entries(COUNTRIES).filter(([, v]) => v.geocode).map(([k]) => k.toLowerCase()) });
console.log(`[${elapsed()}] 지오코딩: 호출 ${geo.calls} · 좌표 확보 ${geo.hits}`);
mark('geocode');

/* ---------- 6. og:image 보강 ---------- */
const img = await enrichImages(all, { max: +(process.env.OG_MAX || 1200), concurrency: +(process.env.OG_CONCURRENCY || 8) });
console.log(`[${elapsed()}] og:image: 요청 ${img.fetched} · 확보 ${img.found} · 대기 ${img.pending} · 공통 이미지 제거 ${img.generic}`);
mark('ogimage');

/* ---------- 6b. 대표 이미지 대체 체인: 장소 사진 → 장소 사이트 og:image → 주변 명소 사진 (posterKind) ---------- */
const vimg = await venueImages(all, cityById, { max: +(process.env.VENUE_MAX || 3000), concurrency: +(process.env.VENUE_CONCURRENCY || 6) });
console.log(`[${elapsed()}] 대표 이미지: 장소 사진 ${vimg.venue} · 장소 사이트 ${vimg.venueSite} · 주변 명소 ${vimg.area} · 없음 ${vimg.none} · 조회 ${vimg.lookups} · 대기 ${vimg.pending} · 좌표 빌림 ${vimg.coordsBorrowed}`);
mark('venueimg');

/* ---------- 7. 중복 제거 + 저장 ---------- */
const clean = e => {
  const o = {};
  for (const [k, v] of Object.entries(e)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    if (k === 'stale' || k.startsWith('_')) continue;
    o[k] = v;
  }
  return o;
};
const index = [];
let totalMerged = 0;
for (const c of cities) {
  const { events, merged } = dedupe(byCity.get(c.id));
  totalMerged += merged;
  events.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
  const counts = {}; for (const e of events) counts[e.kind] = (counts[e.kind] || 0) + 1;
  const nonAudio = events.filter(e => e.kind !== 'audioguide');
  const pct = (arr, f) => arr.length ? Math.round(arr.filter(f).length / arr.length * 1000) / 10 : null;
  const meta = {
    cityId: c.id, updatedAt: new Date().toISOString(), tz: c.tz, total: events.length, counts,
    coordCoverage: pct(events, e => e.lat != null), posterCoverage: pct(nonAudio, e => !!e.poster),
    sources: statusByCity.get(c.id).map(s => ({ key: s.key, name: s.name, enabled: !!s.enabled, ok: s.enabled ? !!s.ok : undefined, count: s.count ?? 0, carriedOver: s.carriedOver || undefined, reason: s.reason, error: s.error, licence: s.licence, url: s.url })),
    warnings: (warnings.get(c.id) || []).slice(0, 30),
    source: [...new Set(statusByCity.get(c.id).filter(s => s.enabled && (s.count || s.carriedOver)).map(s => s.name))].join(' · '),
  };
  writeFileSync(`${OUT_DIR}/${c.id}.json`, JSON.stringify({ meta, events: events.map(clean) }));
  index.push({
    id: c.id, name: c.name, country: c.country, countryName: c.countryName,
    lat: c.lat, lng: c.lng, radiusKm: c.radiusKm, tz: c.tz,
    count: events.length, counts, coordCoverage: meta.coordCoverage, posterCoverage: meta.posterCoverage,
  });
  console.log(`  ${c.id.padEnd(12)} ${String(events.length).padStart(5)}건  좌표 ${meta.coordCoverage ?? '-'}%  포스터 ${meta.posterCoverage ?? '-'}%  ${JSON.stringify(counts)}`);
}

// 전체 실행이면 cities.json 갱신 (ONLY / BUILD_COUNTRIES 부분 실행이면 기존 목록에 병합 → 모든 도시 유지)
let finalIndex = index;
if (PARTIAL && existsSync('data/cities.json')) {
  try { const old = JSON.parse(readFileSync('data/cities.json', 'utf8')).cities || []; const m = new Map(old.map(x => [x.id, x])); for (const x of index) m.set(x.id, x); finalIndex = CITIES.map(c => m.get(c.id)).filter(Boolean); } catch { /* 무시 */ }
}
writeFileSync('data/cities.json', JSON.stringify({ updatedAt: new Date().toISOString(), cities: finalIndex }, null, 1));
if (existsSync('data/events.json')) rmSync('data/events.json'); // v1 단일 파일은 폐기 (앱은 cities.json 없을 때만 v1 사용)
mark('write');
console.log(`[${elapsed()}] 완료: ${finalIndex.length}개 도시 · 중복 병합 ${totalMerged}건${globalWarnings.length ? ' · 경고 ' + globalWarnings.length : ''}`);
console.log('단계별 시간: ' + [...phase].map(([k, v]) => `${k}=${v}`).join(' '));
if (globalWarnings.length) console.log('경고: ' + globalWarnings.slice(0, 10).join(' | '));
