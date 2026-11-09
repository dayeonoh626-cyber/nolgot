// 오디오투어 생성기 (키 불필요) — 모든 도시에 자동 적용.
// 1) 현지 위키백과(ko/de) geosearch로 도시 중심 반경 10km의 문서 수집
// 2) Wikidata 사이트링크 수(=여러 언어로 다뤄진 정도)로 '유명한 명소' 순위, 역·행정구역·기관 등은 설명문으로 제외
// 3) 걷기 좋은 하이라이트 코스(시작점 2.5km 이내) + 박물관·미술관 코스, 최근접 이웃 순서로 동선 구성
// 4) 각 정류장: en/ko/현지어 위키백과 도입부 요약 + Wikimedia Commons 자유 라이선스 사진(저작자·라이선스 표기)
// 앱은 speechSynthesis로 text를 읽어준다. 텍스트 라이선스: CC BY-SA 4.0 (출처 링크 포함).
import { getJson, stripTags, clip, km, addDaysStr, todayIn, pool } from '../lib/util.mjs';

const WIKI = l => `https://${l}.wikipedia.org/w/api.php`;
const q = (base, params) => `${base}?${new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })}`;
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

// 명소가 아닌 것(역·행정구역·기관·학교·도로 등) — 영어 Wikidata 설명 기준
const EXCLUDE = /\b(station|stop|district|neighbo(u)?rhood|borough|quarter of|locality|ward|subdivision|administrative|municipality|village|dong\b|school|universit|college|academy|institute|compan(y|ies)|corporation|organi[sz]ation|agency|ministry|authority|party|foundation|association|society|hospital|clinic|hotel|street|road|avenue|boulevard|lane|motorway|expressway|highway|railway|line of|rail line|subway line|airport|apartment|residential|constituency|embassy|consulate|bank|club|team|office|police|court|prison|military|barracks|cemetery|company|broadcaster|newspaper|magazine|shopping mall|department store|restaurant|cinema|parliament(ary)? group|faction|event|battle|protest|parade|competition|festival|human settlement|family name|given name|person|politician|footballer|actor|singer|coup|incident|uprising|movement|treaty|massacre|disaster|election|rebellion|revolution|war\b|capital|\bcity\b|town\b|federal state|state of germany|former (country|state|capital|polity)|historical (country|state|region)|polity|constitutional|legislat|parliament|government|document|manuscript|writing system|alphabet|\bbook\b|novel|edict|chamber of)/i;
// 설명이 '도시/군/도 자체'인 문서, 음식·품종·소방서·경기장 등 명소가 아닌 것
const NOT_PLACE = /b(province of|self-governing|metropolitan city of)b|^(capital|(big |port |metropolitan |special |independent |county-level )?city|town|county|province|federal state|state|district)|(dish|food|cuisine|breed|cattle|pig|species|fire (station|department|headquarters)|stadium|arena|sports venue|ballpark|football ground)/i;
const MUSEUM = /\b(museum|gallery|art (center|centre|hall)|kunsthalle|exhibition)\b|박물관|미술관|기념관|Museum|Galerie|Kunsthalle/i;

// 도심은 지오태그 문서가 매우 많아 한 번의 검색(최대 500건)으로는 중심 1~2km만 잡힌다 → 중심+사방 2km 지점 5회 검색 합집합
async function geosearch(lang, lat, lng, ringKm = 2) {
  const d = ringKm / 111, dl = d / Math.cos(lat * Math.PI / 180);
  const pts = [[lat, lng], [lat + d, lng], [lat - d, lng], [lat, lng + dl], [lat, lng - dl]];
  const seen = new Map();
  for (const [a, b] of pts) {
    const j = await getJson(q(WIKI(lang), { action: 'query', list: 'geosearch', gscoord: `${a.toFixed(5)}|${b.toFixed(5)}`, gsradius: '10000', gslimit: '500' }));
    for (const g of j.query?.geosearch || []) if (!seen.has(g.title)) seen.set(g.title, g);
  }
  return [...seen.values()];
}

async function pageInfo(lang, titles) {
  const out = new Map();
  for (const part of chunks(titles, 50)) {
    const j = await getJson(q(WIKI(lang), {
      action: 'query', titles: part.join('|'), prop: 'pageprops|pageimages', ppprop: 'wikibase_item',
      piprop: 'name', pilicense: 'free', pilimit: '50', redirects: '1',
    }));
    for (const p of j.query?.pages || []) if (!p.missing) out.set(p.title, { qid: p.pageprops?.wikibase_item, image: p.pageimage });
  }
  return out;
}

async function wikidata(qids) {
  const out = new Map();
  for (const part of chunks(qids, 50)) {
    const j = await getJson(`https://www.wikidata.org/w/api.php?${new URLSearchParams({
      action: 'wbgetentities', ids: part.join('|'), props: 'sitelinks|descriptions|labels', languages: 'en|ko|de', format: 'json', origin: '*',
    })}`);
    for (const [id, e] of Object.entries(j.entities || {})) {
      const sl = e.sitelinks || {};
      out.set(id, {
        n: Object.keys(sl).length,
        en: sl.enwiki?.title, ko: sl.kowiki?.title, de: sl.dewiki?.title,
        descEn: e.descriptions?.en?.value || '', descLocal: e.descriptions?.ko?.value || e.descriptions?.de?.value || '',
        labelEn: e.labels?.en?.value, labelKo: e.labels?.ko?.value, labelDe: e.labels?.de?.value,
      });
    }
  }
  return out;
}

async function extracts(lang, titles) {
  const out = new Map();
  for (const part of chunks(titles.filter(Boolean), 20)) {
    const j = await getJson(q(WIKI(lang), { action: 'query', titles: part.join('|'), prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '5', exlimit: '20', redirects: '1' }));
    const norm = new Map((j.query?.redirects || []).map(r => [r.to, r.from]).concat((j.query?.normalized || []).map(r => [r.to, r.from])));
    for (const p of j.query?.pages || []) if (p.extract) {
      const txt = clip(p.extract.replace(/\s*\([^()]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim(), 900); // 괄호 속 발음·생몰년 제거 → 듣기 편하게
      out.set(p.title, txt); if (norm.has(p.title)) out.set(norm.get(p.title), txt);
    }
  }
  return out;
}

async function commonsImages(files) {
  const out = new Map();
  for (const part of chunks(files.filter(Boolean), 50)) {
    const j = await getJson(q('https://commons.wikimedia.org/w/api.php', {
      action: 'query', titles: part.map(f => 'File:' + f).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '960',
    }));
    const norm = new Map((j.query?.normalized || []).map(r => [r.to, r.from]));
    for (const p of j.query?.pages || []) {
      const ii = p.imageinfo?.[0]; if (!ii || p.missing) continue;
      const md = ii.extmetadata || {};
      const lic = md.LicenseShortName?.value || '';
      if (/fair use|non-free/i.test(lic)) continue;
      const artist = clip(stripTags(md.Artist?.value || ''), 80) || 'Unknown author';
      const key = (norm.get(p.title) || p.title).replace(/^File:/, '').replace(/ /g, '_');
      out.set(key, { url: ii.thumburl || ii.url, credit: `${artist} / ${lic || 'Wikimedia Commons'} (Wikimedia Commons)`, page: ii.descriptionurl });
    }
  }
  return out;
}

function nnOrder(stops) {
  if (stops.length < 3) return stops;
  const left = stops.slice(1); const route = [stops[0]];
  while (left.length) {
    const last = route.at(-1); let bi = 0;
    for (let i = 1; i < left.length; i++) if (km(last, left[i]) < km(last, left[bi])) bi = i;
    route.push(left.splice(bi, 1)[0]);
  }
  return route;
}
const routeKm = s => s.slice(1).reduce((acc, x, i) => acc + km(s[i], x), 0);

/** 도시 하나의 오디오투어 이벤트들 (보통 2개) */
export async function wikipediaTours(city, ctx) {
  const today0 = todayIn(city.tz);
  const prev = ['highlights', 'museums', 'more'].map(t => ctx.prevById?.get(`wikitour-${city.id}-${t}`)).filter(Boolean);
  const maxAge = +(process.env.TOUR_REBUILD_DAYS || 30);
  if (prev.length && prev.every(p => p.builtAt && (Date.parse(today0) - Date.parse(p.builtAt)) / 864e5 < maxAge) && process.env.REBUILD_TOURS !== '1') {
    return prev.map(p => ({ ...p, startDate: today0, endDate: addDaysStr(today0, 365) }));
  }
  const lang = ctx.country.wikiLang || 'en';
  const [clat, clng] = city.wikiCenter || [city.lat, city.lng];
  let cands = [], geo = [], why = {};
  // 명소가 적으면(지방·도 단위) 검색 범위를 넓혀 다시 시도: 중심±2km → ±12km
  for (const ring of [2, 12]) {
  geo = await geosearch(lang, clat, clng, ring);
  if (!geo.length) return [];
  const info = await pageInfo(lang, geo.map(g => g.title));
  const qids = [...new Set([...info.values()].filter(i => i.image).map(i => i.qid).filter(Boolean))];
  const wd = await wikidata(qids);

  cands = []; why = {};
  const minLinks = lang === 'ko' ? 3 : 6; // 한국 지역 명소는 다국어 문서 수가 적다
  for (const g of geo) {
    const i = info.get(g.title); const w = i?.qid && wd.get(i.qid);
    if (!i?.image || !w || w.n < minLinks) { why[!i ? 'noinfo' : !i.image ? 'noimg' : !w ? 'nowd' : 'fewlinks'] = (why[!i ? 'noinfo' : !i.image ? 'noimg' : !w ? 'nowd' : 'fewlinks'] || 0) + 1; continue; }
    if (process.env.DEBUG_TOURS && EXCLUDE.test(w.descEn)) { why.excl = (why.excl || 0) + 1; why.ex ||= []; if (why.ex.length < 8) why.ex.push(`${g.title}: ${w.descEn}`); }
    if ([city.name.en, city.name.ko, city.local].some(n => n && (w.labelEn === n || w.labelKo === n || w.labelDe === n || g.title === n))) continue; // 도시 문서 자체 제외
    if (EXCLUDE.test(w.descEn) || NOT_PLACE.test(w.descEn) || /품종|음식|요리|소방|의회|경기장|나들목|분기점|교차로|고속도로|Rasse|Gericht|Feuerwehr|Stadion|Autobahn/.test(w.descLocal) || (!w.descEn && EXCLUDE.test(w.labelEn || ''))) continue;
    if (/역$|선$|동$|구$|학교|대학교|병원|아파트|흑돼지|흑우|품종|소방|의회|경기장|운동장|체육관|나들목|분기점|교차로|터미널|경찰서|법원|청사$|요금소|Stadion|Arena|Feuerwehr|Polizei|Landtag|Autobahn|Anschlussstelle|Bahnhof|U-Bahn|S-Bahn|Straße$|straße$|Ministerium|Partei|Schule|Gymnasium/i.test(g.title)) continue;
    cands.push({ local: g.title, lat: g.lat, lng: g.lon, n: w.n, img: i.image, w, museum: MUSEUM.test(`${w.descEn} ${g.title} ${w.labelEn || ''}`) });
  }
  cands.sort((a, b) => b.n - a.n);
  if (cands.length >= 8) break;
  }
  if (process.env.DEBUG_TOURS) console.log(city.id, JSON.stringify(why), 'cands', cands.length, cands.slice(0, 6).map(c => c.local).join(', '));
  if (cands.length < 4) return [];

  // 코스 1: 하이라이트 산책 (최고 명소 기준 2.5km 이내 상위 8곳)
  const start = cands[0];
  // 명소가 흩어진 도시·도(道)는 반경을 넓혀 최소 5곳을 확보 (1.8km 도보 → 최대 10km 대중교통 코스)
  let walk = [];
  for (const r of [1.8, 3, 5, 10]) { walk = cands.filter(x => km(x, start) <= r).slice(0, 8); if (walk.length >= 5) break; }
  if (process.env.DEBUG_TOURS) console.log(city.id, 'geo', geo.length, 'cands', cands.length, 'walk', walk.length);
  // 코스 2: 박물관·미술관 (없으면 나머지 명소)
  const used = new Set(walk.map(x => x.local));
  let second = cands.filter(x => x.museum && !used.has(x.local)).slice(0, 7), secondType = 'museums';
  if (second.length < 4) { second = cands.filter(x => !used.has(x.local)).slice(0, 7); secondType = 'more'; }
  const tours = [['highlights', nnOrder(walk)]];
  if (second.length >= 4) tours.push([secondType, nnOrder(second)]);

  // 텍스트·이미지 일괄 조회
  const all = tours.flatMap(([, s]) => s);
  const [exEn, exKo, exLocal, imgs] = await Promise.all([
    extracts('en', all.map(s => s.w.en)),
    lang === 'ko' ? Promise.resolve(null) : extracts('ko', all.map(s => s.w.ko)),
    extracts(lang, all.map(s => s.local)),
    commonsImages(all.map(s => s.img)),
  ]);
  const exKoMap = lang === 'ko' ? exLocal : exKo;

  const today = todayIn(city.tz);
  const NAME = {
    highlights: { en: `${city.name.en} highlights: audio walk`, ko: `${city.name.ko} 하이라이트 오디오 산책`, genreEn: 'Audio walk', genre: '오디오 산책' },
    museums: { en: `${city.name.en} museums & galleries: audio guide`, ko: `${city.name.ko} 박물관·미술관 오디오 가이드`, genreEn: 'Museum audio guide', genre: '박물관 오디오 가이드' },
    more: { en: `More of ${city.name.en}: audio guide`, ko: `${city.name.ko} 명소 더 보기 오디오 가이드`, genreEn: 'Audio guide', genre: '오디오 가이드' },
  };

  const events = [];
  for (const [type, stopsRaw] of tours) {
    const stops = stopsRaw.map(s => {
      const im = imgs.get(String(s.img).replace(/ /g, '_'));
      const textEn = (s.w.en && exEn.get(s.w.en)) || '';
      const textKo = (s.w.ko && exKoMap?.get(s.w.ko)) || '';
      const textLocal = exLocal.get(s.local) || '';
      const text = textEn || textLocal;
      if (!text) return null;
      const words = text.split(/\s+/).length;
      const stop = {
        title: s.w.labelEn || s.w.en || s.local, titleKo: s.w.labelKo || s.w.ko || undefined,
        lat: +s.lat.toFixed(6), lng: +s.lng.toFixed(6),
        text, textKo: textKo || undefined,
        image: im?.url, imageCredit: im?.credit,
        sourceUrl: s.w.en ? `https://en.wikipedia.org/wiki/${encodeURIComponent(s.w.en.replace(/ /g, '_'))}` : `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(s.local.replace(/ /g, '_'))}`,
        sourceUrlKo: s.w.ko ? `https://ko.wikipedia.org/wiki/${encodeURIComponent(s.w.ko.replace(/ /g, '_'))}` : undefined,
        minutes: Math.max(1, Math.round(words / 140)),
      };
      if (lang === 'de') { stop.titleDe = s.w.labelDe || s.local; stop.textDe = textLocal || undefined; }
      return stop;
    }).filter(Boolean);
    if (stops.length < 4) continue;
    const dist = routeKm(stops);
    const listen = stops.reduce((a, s) => a + s.minutes, 0);
    const durationMin = Math.round(listen + (dist / 4.5) * 60 + stops.length * 5); // 듣기 + 걷기(4.5km/h) + 정류장당 5분 둘러보기
    const first = stops.find(s => s.image) || stops[0];
    const n = { ...NAME[type] };
    if (type === 'highlights' && dist > 6) { // 걸어서 돌기엔 먼 코스 → '투어'로 표기 (대중교통·차량 이동)
      Object.assign(n, { en: `${city.name.en} highlights: audio tour`, ko: `${city.name.ko} 하이라이트 오디오 투어`, genreEn: 'Audio tour', genre: '오디오 투어' });
    }
    events.push({
      id: `wikitour-${city.id}-${type}`, kind: 'audioguide', cityId: city.id, sourceKey: 'wikipedia',
      title: n.en, titleKo: n.ko, genre: n.genre, genreEn: n.genreEn,
      place: stops[0].titleKo || stops[0].title, placeEn: stops[0].title,
      lat: stops[0].lat, lng: stops[0].lng,
      startDate: today, endDate: addDaysStr(today, 365), tz: city.tz,
      poster: first.image, posterCredit: first.imageCredit,
      overview: `정류장 ${stops.length}곳 · 약 ${dist.toFixed(1)}km · ${durationMin}분\n` + stops.map((s, i) => `${i + 1}. ${s.titleKo || s.title}`).join('\n'),
      overviewEn: `${stops.length} stops · about ${dist.toFixed(1)} km · ${durationMin} min\n` + stops.map((s, i) => `${i + 1}. ${s.title}`).join('\n'),
      time: '언제든 (셀프 가이드)', timeEn: 'Any time (self-guided)',
      fee: '무료', feeEn: 'Free', free: true, durationMin, distanceKm: +dist.toFixed(2),
      builtAt: today, provider: 'Wikipedia', source: 'Wikipedia (CC BY-SA 4.0) · 사진 Wikimedia Commons', sourceUrl: stops[0].sourceUrl,
      stops,
    });
  }
  return events;
}

export const meta = { key: 'wikipedia', name: 'Wikipedia/Wikidata/Wikimedia Commons', licence: 'Text CC BY-SA 4.0; images per-file (Commons)', url: 'https://www.mediawiki.org/wiki/API:Main_page' };
export { pool };
