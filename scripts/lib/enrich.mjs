// 보강 단계: (1) 포스터 없는 이벤트에 공식 페이지의 og:image, (2) 주소만 있는 이벤트 지오코딩(Nominatim).
// 둘 다 결과를 data/*.json 캐시에 저장해 다음 실행에서 재사용 → 매일 호출량이 거의 늘지 않는다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { http, getJson, pool, httpsUrl, decodeEntities, validLatLng } from './util.mjs';

function loadJson(path) { try { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}; } catch { return {}; } }

/* ---------- og:image ---------- */
const IMG_CACHE = 'data/imagecache.json';
const IMG_TTL_DAYS = 30;
const BAD_IMG = /(logo|favicon|sprite|placeholder|default[-_]?(image|og)|blank|spacer|icon[-_]?\d*\.(png|svg)|\.svg(\?|$))/i;

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
  const targets = events.filter(e => !e.poster && e.kind !== 'audioguide');
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
  // 캐시 크기 제한
  const keys = Object.keys(cache);
  if (keys.length > 20000) for (const k of keys.sort((a, b) => cache[a].t - cache[b].t).slice(0, keys.length - 20000)) delete cache[k];
  writeFileSync(IMG_CACHE, JSON.stringify(cache));
  return { fetched, found, pending: Math.max(0, todo.length - batch.length) };
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
    const q = /\d{5}|berlin|münchen|hamburg|köln|frankfurt|stuttgart|düsseldorf|leipzig|dresden|nürnberg/i.test(addr) ? addr : `${addr}, ${city.name.en}`;
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
