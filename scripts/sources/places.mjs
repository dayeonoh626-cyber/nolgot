// 상설 명소 (키 불필요) — 모든 도시에 자동 적용. "이번 주에 가볼 만한, 늘 열려 있는 곳".
// 1) Wikidata 검색(haswbstatement+nearcoord) 1~2회/도시: 도시 반경(radiusKm) 안의 박물관·미술관·과학관·수족관·동물원·식물원·궁전·성
//    (폐관 P576/P3999 제외, 나라 P17 일치, 한국 시·도·홍콩은 행정구역 P131* 일치) → 사이트링크 수(=유명도) 순
// 2) en/ko/현지어 위키백과 도입부 요약 → overview / overviewEn / overviewKo
// 3) P18 사진 → Wikimedia Commons 썸네일(폭 800) + 저작자·라이선스 표기 (extmetadata)
// 결과는 data/placescache.json 에 도시별로 저장(PLACES_TTL_DAYS, 기본 14일+분산) → 매일 빌드는 캐시 재사용.
// 이벤트: kind 'exhibition', permanent: true (날짜 있는 행사가 아님 — 앱은 상시 항목으로 취급), 오늘~+364일.
// 라이선스: Wikidata CC0 · 위키백과 텍스트 CC BY-SA 4.0 · 사진은 Commons 파일별 라이선스.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { getJson, stripTags, clip, todayIn, addDaysStr, km } from '../lib/util.mjs';

const UA = 'NolgotBot/1.0 (+https://github.com/dayeonoh626-cyber/nolgot)';
const H = { headers: { 'User-Agent': UA } };
const CACHE = 'data/placescache.json';
const CACHE_VER = 2;
const MAX = +(process.env.PLACES_MAX || 15);
const MIN = 10;

// 나라 → Wikidata 국가 (로마의 바티칸 박물관처럼 이웃 나라가 섞이는 경우 포함)
const COUNTRY_QID = {
  KR: ['Q884'], DE: ['Q183'], GB: ['Q145'], FR: ['Q142'], ES: ['Q29'], HU: ['Q28'], AT: ['Q40'], IT: ['Q38', 'Q237'], NL: ['Q55'], CH: ['Q39'], PT: ['Q45'], CZ: ['Q213'], BE: ['Q31'],
  // 3단계. 홍콩 항목은 Wikidata에서 대부분 P17=중국(Q148)이라 둘 다 받고, 아래 REGION_QID(홍콩 P131)로 선전(深圳)을 걸러낸다.
  US: ['Q30'], AU: ['Q408'], JP: ['Q17'], TW: ['Q865'], HK: ['Q8646', 'Q148'], SG: ['Q334'], TH: ['Q869'], VN: ['Q881'], MY: ['Q833'], PH: ['Q928'], ID: ['Q252'], CN: ['Q148'],
  // 4단계 (docs/sources-research-phase4.md 1장 표)
  CA: ['Q16'], MX: ['Q96'], BR: ['Q155'], AR: ['Q414'], CL: ['Q298'], CO: ['Q739'], PE: ['Q419'],
  ZA: ['Q258'], EG: ['Q79'], MA: ['Q1028'], KE: ['Q114'], NG: ['Q1033'], GH: ['Q117'], TZ: ['Q924'], ET: ['Q115'], SN: ['Q1041'], RW: ['Q1037'],
};
// 반경이 이웃 행정구역과 겹치는 도시는 행정구역(P131 상위 체인)으로 거른다:
// 한국 광역시·도(경기 ↔ 서울 등), 홍콩(반경 25km가 선전까지 닿음)
const REGION_QID = {
  seoul: 'Q8684', busan: 'Q16520', incheon: 'Q20934', daegu: 'Q20927', daejeon: 'Q20921', gwangju: 'Q41283', ulsan: 'Q41278', sejong: 'Q20929', gyeonggi: 'Q20937', gangwon: 'Q41071', chungbuk: 'Q41066', chungnam: 'Q41070', jeonbuk: 'Q41157', jeonnam: 'Q41161', gyeongbuk: 'Q41154', gyeongnam: 'Q41151', jeju: 'Q41164',
  hongkong: 'Q8646',
};
// P131 정보가 없는 항목의 대체 판정 (한국: 가장 가까운 시·도 / 홍콩: 선전 경계(북위 약 22.5°) 남쪽)
const regionFallback = (city, p) => city.country === 'KR' ? nearestKr(p) === city.id : city.id === 'hongkong' ? p.lat < 22.5 : true;

// 박물관류 → '상설 전시'
const MUSEUM = ['Q33506', 'Q207694', 'Q1007870', 'Q588140', 'Q3499307', 'Q1970365', 'Q16735822', 'Q3329412', 'Q17431399', 'Q1595639', 'Q2772772', 'Q1863818', 'Q2398990', 'Q842478', 'Q108860927', 'Q2327632', 'Q12104174', 'Q25047682', 'Q105725005', 'Q2244602', 'Q2516357', 'Q1200701', 'Q2087181', 'Q10624527', 'Q756102'];
// 동물원·수족관·식물원·궁전·성 → '명소'
const LANDMARK = ['Q43501', 'Q2281788', 'Q167346', 'Q272231', 'Q1711697', 'Q642682', 'Q16560', 'Q53536964', 'Q23413', 'Q57831'];
// 위 두 범주로 10곳이 안 될 때만 채우는 보조 명소 (주로 한국 광역시: 박물관 항목이 적다)
const EXTRA = ['Q2977', 'Q5393308', 'Q1566035', 'Q839954', 'Q570116', 'Q488856', 'Q5952771', 'Q276173', 'Q1440300', 'Q2416723',
  'Q22746', 'Q22698', 'Q1107656', 'Q330284', 'Q40080', 'Q46169', 'Q8502', 'Q23442', 'Q23397', 'Q34038']; // 대성당·사찰·유적·관광명소·서원·향교·정자·전망대·테마파크·(도시)공원·정원·시장·해변·국립공원·산·섬·호수·폭포
// 4단계: 모스크 · 교회 건물 — 이슬람권·라고스·중남미 구시가의 대표 명소(카사블랑카 하산 2세 모스크 등)가 이 분류라 보조 명소에 더한다.
// EXTRA 와 같은 '부족할 때만 채우는' 순위이지만 검색은 따로 한다: 유럽·한국은 교회 항목이 수천 건이라 같은 검색에 넣으면
// 결과 상한(500)을 교회가 차지해 기존 보조 명소(사찰·향교·전망대 등)가 밀려난다. 채움 단계에서도 도시당 WORSHIP_FILL_MAX 곳까지만.
const WORSHIP = ['Q32815', 'Q16970'];
const WORSHIP_FILL_MAX = +(process.env.PLACES_WORSHIP_MAX || 5);
const MUSEUM_SET = new Set(MUSEUM), LANDMARK_SET = new Set(LANDMARK), WORSHIP_SET = new Set(WORSHIP), EXTRA_SET = new Set(EXTRA);
// 관저 · 대통령궁 · 대사관 · 정부청사 · 의회 건물
const CLOSED_USE = new Set(['Q481289', 'Q2114972', 'Q3917681', 'Q16831714', 'Q7138926', 'Q1588733']);

/* ---------- 캐시 (다른 빌드와 동시에 써도 다른 도시 항목을 지우지 않게 읽고-합치고-쓰기) ---------- */
const loadCache = () => { try { return existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}; } catch { return {}; } };
let cache = null;
function saveCity(cityId, entry) {
  const cur = loadCache(); cur[cityId] = entry; cache[cityId] = entry;
  writeFileSync(CACHE, JSON.stringify(cur));
}
const hashDays = id => [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 11) % 5;

/* ---------- Wikidata 검색 (CirrusSearch: haswbstatement + nearcoord) ----------
 * WDQS(SPARQL)의 반경 검색은 도시 규모에서 504/429가 잦아, 같은 Wikidata 색인을 쓰는 검색 API를 쓴다(빠르고 안정적).
 * 후보(최대 500) → wbgetentities 사이트링크 수로 유명도 순위 → 상위 후보만 claims·labels 조회. */
const WD = 'https://www.wikidata.org/w/api.php';
async function search(classes, city, cc, radius) {
  const s = `haswbstatement:${classes.map(x => 'P31=' + x).join('|')} ${cc ? `haswbstatement:${cc.map(x => 'P17=' + x).join('|')} ` : ''}nearcoord:${radius}km,${city.lat},${city.lng}`;
  const j = await getJson(`${WD}?${new URLSearchParams({ action: 'query', list: 'search', format: 'json', srlimit: '500', srnamespace: '0', srprop: '', srsearch: s })}`, H);
  return (j.query?.search || []).map(x => x.title).filter(t => /^Q\d+$/.test(t));
}
async function entities(ids, props, langs) {
  const out = new Map();
  for (const part of chunks(ids, 50)) {
    const j = await getJson(`${WD}?${new URLSearchParams({ action: 'wbgetentities', format: 'json', ids: part.join('|'), props, ...(langs ? { languages: langs } : {}) })}`, { ...H, timeout: 40000 });
    for (const [id, e] of Object.entries(j.entities || {})) if (!e.missing) out.set(id, e);
  }
  return out;
}
const claimIds = (e, p) => (e?.claims?.[p] || []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const claimVal = (e, p) => (e?.claims?.[p] || []).find(c => c.rank !== 'deprecated' && c.mainsnak?.datavalue)?.mainsnak.datavalue.value;

// 행정구역(P131)이 없는 항목: 중심이 가장 가까운 한국 시·도에만 넣는다
import { CITIES } from '../cities.mjs';
const KR_CITIES = CITIES.filter(c => c.country === 'KR');
const nearestKr = p => KR_CITIES.reduce((b, c) => (km(p, c) < km(p, b) ? c : b)).id;
// 한국: 항목 → P131 상위 행정구역을 따라가며 해당 시·도인지 확인 (상위 항목 claims는 빌드 내 공유 캐시)
const parentCache = new Map();
const REGION_SET = new Set(Object.values(REGION_QID));
async function regionOf(startIds) {
  let frontier = [...new Set(startIds)];
  for (let depth = 0; depth < 4 && frontier.length; depth++) {
    const hit = frontier.find(q => REGION_SET.has(q)); if (hit) return hit;
    const need = frontier.filter(q => !parentCache.has(q));
    if (need.length) { const es = await entities(need, 'claims'); for (const q of need) parentCache.set(q, claimIds(es.get(q), 'P131')); }
    frontier = [...new Set(frontier.flatMap(q => parentCache.get(q) || []))];
  }
  return frontier.find(q => REGION_SET.has(q)) || null;
}

async function queryCity(city, lang) {
  const cc = COUNTRY_QID[city.country];
  const radius = city.country === 'KR' ? Math.max(40, Math.round(city.radiusKm * 1.6)) : city.radiusKm; // 한국은 시·도 경계(P131)로 다시 거른다
  const local = lang === 'en' || lang === 'ko' ? null : lang;
  const ids = await search([...MUSEUM, ...LANDMARK], city, cc, radius);
  const extraIds = await search(EXTRA, city, cc, radius);
  const worshipIds = await search(WORSHIP, city, cc, radius);
  const main = [...new Set([...ids, ...extraIds])];
  const mainSet = new Set(main);
  const out = [];
  const region = REGION_QID[city.id];
  // 모스크·교회는 따로 순위를 매기고 몫(WORSHIP_FILL_MAX*2)도 따로 둔다 — 같은 순위표에 넣으면 로마·베를린처럼
  // 사이트링크가 많은 성당이 상위 MAX*3 후보 자리를 차지해 박물관이 밀려난다.
  await collect(main, MAX * 3);
  await collect(worshipIds.filter(q => !mainSet.has(q)), WORSHIP_FILL_MAX * 2);
  return out;

  async function collect(qids, budget) {
  const sl = await entities(qids, 'sitelinks');
  const ranked = qids.map(q => ({ qid: q, n: Object.keys(sl.get(q)?.sitelinks || {}).length, sitelinks: sl.get(q)?.sitelinks || {} })).sort((a, b) => b.n - a.n);
  const start = out.length;
  for (let i = 0; i < ranked.length && out.length - start < budget; i += 50) {
    const slice = ranked.slice(i, i + 50);
    const es = await entities(slice.map(x => x.qid), 'claims|labels', ['ko', 'en', local].filter(Boolean).join('|'));
    for (const x of slice) {
      const e = es.get(x.qid); if (!e) continue;
      if (claimVal(e, 'P576') || claimVal(e, 'P3999')) continue; // 폐관
      const cls = [...new Set([...claimIds(e, 'P31'), ...claimIds(e, 'P366')])]; // 분류 + 용도(예: 궁전 → 박물관)
      // 관저·대통령궁·대사관·정부청사로 쓰이는 궁전·성은 일반 관람 불가 → 박물관 용도가 없으면 제외
      if (!cls.some(c => MUSEUM_SET.has(c)) && (cls.some(c => CLOSED_USE.has(c)) || claimIds(e, 'P466').length)) continue;
      const co = claimVal(e, 'P625'); if (!co?.latitude) continue;
      const lat = co.latitude, lng = co.longitude;
      if (km({ lat, lng }, city) > radius) continue;
      if (region) { // 다른 시·도로 확인되면 제외, 행정구역 정보가 없으면 원래 반경 안일 때만
        const r = await regionOf(claimIds(e, 'P131'));
        if (r ? r !== region : !regionFallback(city, { lat, lng })) continue;
      }
      const s = x.sitelinks;
      const wurl = (l, t) => t ? `https://${l}.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}` : undefined;
      const addr = claimVal(e, 'P6375');
      const img = claimVal(e, 'P18');
      out.push({
        qid: x.qid, n: x.n, lat, lng, cls,
        image: img ? `http://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(img.replace(/ /g, '_'))}` : undefined,
        site: claimVal(e, 'P856'), addr: addr?.text,
        labelKo: e.labels?.ko?.value, labelEn: e.labels?.en?.value, labelLocal: local ? e.labels?.[local]?.value : undefined,
        titleEn: s.enwiki?.title, titleKo: s.kowiki?.title, titleLocal: local ? s[`${local}wiki`]?.title : undefined,
        urlEn: wurl('en', s.enwiki?.title), urlKo: wurl('ko', s.kowiki?.title), urlLocal: local ? wurl(local, s[`${local}wiki`]?.title) : undefined,
        urlAny: anyWiki(s, wurl),
      });
    }
  }
  }
}

/* ---------- 위키백과 요약 · Commons 이미지 ---------- */
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
async function extracts(lang, titles) {
  const out = new Map();
  for (const part of chunks([...new Set(titles.filter(Boolean))], 20)) {
    const j = await getJson(`https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', action: 'query', titles: part.join('|'), prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '4', exlimit: '20', redirects: '1' })}`, H);
    const back = new Map([...(j.query?.normalized || []), ...(j.query?.redirects || [])].map(r => [r.to, r.from]));
    for (const p of j.query?.pages || []) if (p.extract) {
      const txt = clip(p.extract.replace(/\s*\([^()]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim(), 700);
      if (!txt) continue;
      out.set(p.title, txt);
      let t = p.title; while (back.has(t)) { t = back.get(t); out.set(t, txt); }
    }
  }
  return out;
}

async function commonsImages(files) {
  const out = new Map();
  for (const part of chunks([...new Set(files.filter(Boolean))], 40)) {
    const j = await getJson(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', action: 'query', titles: part.map(f => 'File:' + f).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '800' })}`, H);
    const back = new Map((j.query?.normalized || []).map(r => [r.to, r.from]));
    for (const p of j.query?.pages || []) {
      const ii = p.imageinfo?.[0]; if (!ii || p.missing) continue;
      const md = ii.extmetadata || {};
      const lic = md.LicenseShortName?.value || '';
      if (md.NonFree?.value === 'true' || /fair use|non-free|\bNC\b|\bND\b|noncommercial/i.test(`${lic} ${md.UsageTerms?.value || ''}`)) continue;
      const artist = clip(stripTags(md.Artist?.value || ''), 80) || 'Unknown author';
      const key = (back.get(p.title) || p.title).replace(/^File:/, '').replace(/_/g, ' ');
      out.set(key, { url: ii.thumburl || ii.url, credit: `${artist} / ${lic || 'see file page'} (Wikimedia Commons)` });
    }
  }
  return out;
}
const fileName = u => { try { return decodeURIComponent(String(u).split('/Special:FilePath/')[1] || '').replace(/_/g, ' '); } catch { return ''; } };

// en·ko·현지어 문서가 없는 항목의 다른 언어 위키백과 문서 (fr·es·pt·de·ar·sw·rw… 순) — 채움 단계 마지막 후보용
const ANY_LANGS = ['fr', 'es', 'pt', 'de', 'it', 'nl', 'ar', 'sw', 'rw', 'am', 'yo', 'ha', 'ig', 'zu', 'af', 'wo'];
function anyWiki(s, wurl) {
  for (const l of ANY_LANGS) if (s[`${l}wiki`]?.title) return wurl(l, s[`${l}wiki`].title);
  const k = Object.keys(s).find(k => /^[a-z]{2,3}wiki$/.test(k) && !/^(commons|species|meta|simple)wiki$/.test(k));
  return k ? wurl(k.slice(0, -4), s[k].title) : undefined;
}

/* ---------- 선정 ---------- */
function pick(cands, city) {
  const cityNames = new Set([city.name.en, city.name.ko, city.local].filter(Boolean));
  const ok = cands.filter(c => c.lat != null && (c.urlEn || c.urlKo || c.urlLocal)
    && ![c.labelEn, c.labelKo, c.labelLocal].some(l => cityNames.has(l)));
  // 1순위: 박물관류·동물원·궁전 등 중 사이트링크 2개 이상. 나머지(사이트링크 1개짜리 산성 터 등 포함)는 보조 순위로 유명도순
  const tier = c => c.cls.some(x => MUSEUM_SET.has(x) || LANDMARK_SET.has(x)) && c.n >= 2 ? 1 : 2;
  const primary = ok.filter(c => tier(c) === 1);
  const chosen = primary.slice(0, MAX);
  if (chosen.length < MIN) {
    // 보조 순위: 유명도순. 모스크·교회(다른 보조 분류에 속하지 않는 것)는 WORSHIP_FILL_MAX 곳까지만
    let worship = 0;
    const onlyWorship = c => c.cls.some(x => WORSHIP_SET.has(x)) && !c.cls.some(x => EXTRA_SET.has(x) || MUSEUM_SET.has(x) || LANDMARK_SET.has(x));
    // 같은 보조 순위 안에서는 사진(P18) 있는 곳 먼저 — 섬·산 등 사진 없는 항목이 대표 이미지 없이 들어오지 않게
    // 그다음 en·ko·현지어 문서는 없지만 다른 언어 문서와 사진이 있는 곳, 마지막으로 사진 없는 곳
    const t2 = ok.filter(c => tier(c) === 2);
    const okSet = new Set(ok);
    const other = cands.filter(c => !okSet.has(c) && c.lat != null && c.image && c.urlAny && (c.labelEn || c.labelKo || c.labelLocal) && ![c.labelEn, c.labelKo, c.labelLocal].some(l => cityNames.has(l)));
    for (const c of [...t2.filter(c => c.image), ...other, ...t2.filter(c => !c.image)]) {
      if (chosen.length >= MIN) break;
      if (onlyWorship(c)) { if (worship >= WORSHIP_FILL_MAX) continue; worship++; }
      chosen.push(c);
    }
  }
  // 좌표가 거의 같은 중복(같은 건물의 박물관 2개 항목 등)은 유명한 쪽 하나만
  const kept = [];
  for (const c of chosen) if (!kept.some(k => km(k, c) < 0.03 && (k.labelEn || '') === (c.labelEn || ''))) kept.push(c);
  return kept;
}

async function build(city, ctx) {
  const lang = city.wikiLang || ctx.country?.wikiLang || 'en';
  let chosen = pick(await queryCity(city, lang), city);
  // 반경 안 후보가 10곳 미만(키갈리 등)이면 반경을 1.6배로 넓혀 한 번 더
  if (chosen.length < MIN && city.country !== 'KR' && !REGION_QID[city.id]) {
    const wide = pick(await queryCity({ ...city, radiusKm: Math.round(city.radiusKm * 1.6) }, lang), city);
    if (wide.length > chosen.length) chosen = wide;
  }
  if (!chosen.length) return [];
  // P18 사진이 없으면 그 항목의 위키백과 문서 대표 사진(자유 라이선스만)으로
  const noImg = chosen.filter(c => !c.image);
  for (const [l, f] of [['ko', 'titleKo'], ['en', 'titleEn'], [lang, 'titleLocal']]) {
    const need = noImg.filter(c => !c.image && c[f]);
    if (!need.length || (f === 'titleLocal' && (lang === 'en' || lang === 'ko'))) continue;
    for (const part of chunks(need, 50)) {
      try {
        const j = await getJson(`https://${l}.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', action: 'query', titles: part.map(c => c[f]).join('|'), prop: 'pageimages', piprop: 'name', pilicense: 'free', pilimit: '50', redirects: '1' })}`, H);
        const back = new Map([...(j.query?.normalized || []), ...(j.query?.redirects || [])].map(r => [r.to, r.from]));
        for (const p of j.query?.pages || []) if (p.pageimage && !/\.svg$|^(Flag|Coat|Wappen|Logo|Emblem)/i.test(p.pageimage)) {
          let t = p.title; const names = [t]; while (back.has(t)) { t = back.get(t); names.push(t); }
          for (const c of part) if (names.includes(c[f]) && !c.image) c.image = `http://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p.pageimage)}`;
        }
      } catch { /* 사진 없이 진행 */ }
    }
  }
  // 그래도 사진이 없는 보조 항목(섬·산 등): 10곳이 넘으면 빼고, 모자라면 넓힌 반경의 사진 있는 후보로 바꾼다
  const bare = chosen.filter(c => !c.image && !(c.cls.some(x => MUSEUM_SET.has(x) || LANDMARK_SET.has(x)) && c.n >= 2));
  if (bare.length && city.country !== 'KR' && !REGION_QID[city.id]) {
    const keep = chosen.filter(c => !bare.includes(c));
    let extra = [];
    if (keep.length < MIN) {
      const cityNames = new Set([city.name.en, city.name.ko, city.local].filter(Boolean));
      const have = new Set(chosen.map(c => c.qid));
      try {
        extra = (await queryCity({ ...city, radiusKm: Math.round(city.radiusKm * 1.6) }, lang))
          .filter(c => !have.has(c.qid) && c.image && (c.urlEn || c.urlKo || c.urlLocal || c.urlAny) && (c.labelEn || c.labelKo || c.labelLocal)
            && ![c.labelEn, c.labelKo, c.labelLocal].some(l => cityNames.has(l)))
          .slice(0, MIN - keep.length);
      } catch { /* 그대로 */ }
    }
    // 대체 후보가 모자라면 사진 없는 항목을 남겨 10곳을 지킨다 (그 경우 근처 명소 사진 체인으로)
    chosen = [...keep, ...extra, ...bare.slice(0, Math.max(0, MIN - keep.length - extra.length))];
  }
  const [exEn, exKo, exLoc, imgs] = await Promise.all([
    extracts('en', chosen.map(c => c.titleEn)),
    extracts('ko', chosen.map(c => c.titleKo)),
    lang === 'en' || lang === 'ko' ? Promise.resolve(new Map()) : extracts(lang, chosen.map(c => c.titleLocal)),
    commonsImages(chosen.map(c => fileName(c.image))),
  ]);
  return chosen.map(c => {
    const museum = c.cls.some(x => MUSEUM_SET.has(x));
    const textEn = (c.titleEn && exEn.get(c.titleEn)) || '';
    const textKo = (c.titleKo && exKo.get(c.titleKo)) || '';
    const textLoc = lang === 'ko' ? textKo : lang === 'en' ? textEn : (c.titleLocal && exLoc.get(c.titleLocal)) || '';
    const im = imgs.get(fileName(c.image));
    const localTitle = lang === 'ko' ? (c.labelKo || c.titleKo) : lang === 'en' ? (c.labelEn || c.titleEn) : (c.labelLocal || c.titleLocal);
    const title = localTitle || c.labelEn || c.titleEn || c.labelKo || c.qid;
    return {
      qid: c.qid, n: c.n, museum, title,
      titleKo: c.labelKo || c.titleKo || undefined, titleEn: c.labelEn || c.titleEn || undefined,
      lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6), address: c.addr || undefined,
      overview: textLoc || textEn || textKo || undefined, overviewEn: textEn || undefined, overviewKo: textKo || undefined,
      poster: im?.url, posterCredit: im?.credit,
      homepage: c.site && /^https?:\/\//.test(c.site) ? c.site.replace(/^http:/, 'https:') : undefined,
      sourceUrl: c.urlEn || c.urlKo || c.urlLocal || c.urlAny, sourceUrlKo: c.urlKo || undefined,
    };
  });
}

export async function places(city, ctx) {
  cache ??= loadCache();
  const today = todayIn(city.tz);
  const hit = cache[city.id];
  const ttl = +(process.env.PLACES_TTL_DAYS || 14) + hashDays(city.id);
  let items;
  if (hit?.v === CACHE_VER && hit.items?.length && (Date.parse(today) - Date.parse(hit.builtAt)) / 864e5 < ttl && process.env.REBUILD_PLACES !== '1') {
    items = hit.items;
  } else {
    try {
      items = await build(city, ctx);
      saveCity(city.id, { v: CACHE_VER, builtAt: today, items });
    } catch (err) {
      if (hit?.items?.length) { ctx.warn?.(city.id, `상설 명소 갱신 실패, 캐시 사용: ${String(err.message).slice(0, 120)}`); items = hit.items; }
      else throw err;
    }
  }
  return items.map(p => ({
    id: `place-${p.qid}`, kind: 'exhibition', permanent: true, cityId: city.id, sourceKey: 'places',
    title: p.title, titleKo: p.titleKo, titleEn: p.titleEn,
    genre: p.museum ? '상설 전시' : '명소', genreEn: p.museum ? 'Permanent collection' : 'Landmark',
    place: p.titleKo && city.country === 'KR' ? p.titleKo : p.title, placeEn: p.titleEn,
    address: p.address, lat: p.lat, lng: p.lng,
    startDate: today, endDate: addDaysStr(today, 364), tz: city.tz,
    time: '상시 운영 (운영시간은 홈페이지 확인)', timeEn: 'Open year-round (check opening hours)',
    overview: p.overview, overviewEn: p.overviewEn, overviewKo: p.overviewKo,
    poster: p.poster, posterCredit: p.posterCredit, posterKind: p.poster ? 'venue' : undefined, _noOg: !p.poster || undefined, // 위키백과 og:image는 저작자 표기가 없어 → 대체 체인(장소 사진)으로
    homepage: p.homepage, popularity: p.n,
    source: 'Wikidata / Wikipedia (CC0 / CC BY-SA)', sourceUrl: p.sourceUrl, sourceUrlKo: p.sourceUrlKo,
  }));
}

export const meta = { key: 'places', name: 'Wikidata 상설 명소 (박물관·미술관·동물원·궁전 등)', licence: 'Wikidata CC0 · Wikipedia text CC BY-SA 4.0 · images per-file (Commons)', url: 'https://query.wikidata.org/' };

// 진단용 (scripts 밖에서 선정 결과만 비교할 때)
export const _internal = { queryCity, pick, build };
