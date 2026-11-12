// 홍콩 소스 모듈 — 키 없는 DATA.GOV.HK 오픈데이터 (출처 표기 시 상업 포함 재사용 허용).
//   LCSD 康樂及文化事務署 문화행사 (events.xml + venues.xml)  공연·전시·가족·도서관 행사. 영·중 제목. 이미지 없음 → 장소 사진
//   URBTIX 城市售票網 판매 중 행사 (일일 XML)                 공연·전시 예매. 영·중. 예매 링크
// HKTB 행사 CSV(2025에서 멈춤)·EventHK(갱신 중단)는 쓰지 않음.
import { getText, stripTags, clip, normUrl, todayIn, addDaysStr, fixLatLng, kindEu, GENRE_KO, GENRE_EN, normTitle, BOT } from '../lib/util.mjs';
import { runSources, capList } from '../lib/sources.mjs';

const TZ = 'Asia/Hong_Kong';
const cdata = (s, tag) => { const m = String(s).match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`)); return m ? m[1].trim() : ''; };
const tagText = (s, tag) => stripTags(cdata(s, tag));

/* ---------- LCSD 장소 (좌표 65/158) — URBTIX도 같이 쓴다 ---------- */
let venuesP = null;
function lcsdVenues() {
  venuesP ??= getText('https://www.lcsd.gov.hk/datagovhk/event/venues.xml', { ...BOT, timeout: 60000 }).then(xml => {
    const m = new Map();
    for (const v of xml.matchAll(/<venue id="([^"]+)">([\s\S]*?)<\/venue>/g)) {
      const lat = parseFloat(cdata(v[2], 'latitude')), lng = parseFloat(cdata(v[2], 'longitude'));
      m.set(v[1], { zh: tagText(v[2], 'venuec'), en: tagText(v[2], 'venuee'), lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null });
    }
    return m;
  });
  return venuesP;
}
/** 이름으로 좌표 찾기: 'HONG KONG CITY HALL' ↔ 'Hong Kong City Hall Concert Hall' */
function venueCoords(venues, zh, en) {
  const a = normTitle(zh), b = normTitle(en);
  for (const v of venues.values()) {
    if (v.lat == null) continue;
    const vz = normTitle(v.zh), ve = normTitle(v.en);
    if ((a && a.length >= 3 && (vz.startsWith(a) || a.startsWith(vz))) || (b && b.length >= 8 && (ve.startsWith(b) || b.startsWith(ve)))) return v;
  }
  return null;
}

/* ---------- predateE 날짜 파싱 ----------
 * '19/12/2026 (Sat) 19:30' · '18-19/12/2026(Fri-Sat)' · '1-30/11/2026' · '7, 14, 21, 28/11/2026 (Sat)'
 * '16/08-22/11/2026' · '30/12/2026-12/01/2027' · '13 Jul- 14 Dec 2026 (Every Mon)' */
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const ymd = (y, m, d) => (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
export function hkDates(text) {
  let s = String(text || '');
  const out = [];
  // dd/mm - dd/mm/yyyy (시작 연도 생략)
  s = s.replace(/(\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/g, (_, d1, m1, d2, m2, y) => {
    out.push(ymd(+m1 > +m2 ? +y - 1 : y, m1, d1), ymd(y, m2, d2)); return ' ';
  });
  // [d, d-d, ...]dd/mm/yyyy
  s = s.replace(/((?:\d{1,2}\s*(?:[-–,&]|and)\s*)*)(\d{1,2})\/(\d{1,2})\/(\d{4})/g, (_, pre, d, m, y) => {
    for (const p of String(pre).match(/\d{1,2}/g) || []) out.push(ymd(y, m, p));
    out.push(ymd(y, m, d)); return ' ';
  });
  // 13 Jul - 14 Dec 2026
  const named = [...s.matchAll(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?(?:\s*(\d{4}))?/gi)];
  let lastY = null;
  for (let i = named.length - 1; i >= 0; i--) { if (named[i][3]) lastY = named[i][3]; named[i].y = named[i][3] || lastY; }
  for (const n of named) if (n.y) out.push(ymd(n.y, MON[n[2].toLowerCase().slice(0, 3)], n[1]));
  return [...new Set(out.filter(Boolean))].sort();
}

/* ================= LCSD ================= */
// cat2 → 종류 (없으면 영문 제목 키워드 → cat1 기본값)
const LCSD_KIND = {
  inc4sc1: 'performance', inc4sc2: 'performance', inc4sc3: 'performance', inc4sc4: 'exhibition', inc4sc5: 'performance', inc4sc6: 'performance',
  inc4sc7: 'performance', inc4sc9: 'performance', inc4sc10: 'performance', inc4sc12: 'performance',
  inc7sc3: 'exhibition', inc7sc8: 'exhibition', inc7sc5: 'workshop', inc7sc6: 'workshop',
};
const LCSD_DROP = /^(inc4sc14|inc6)/; // 장기 수강 강좌(등록제), 과거 영화 회고
async function lcsd(cities, ctx) {
  const city = cities.find(c => c.id === 'hongkong'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const [xml, venues] = await Promise.all([getText('https://www.lcsd.gov.hk/datagovhk/event/events.xml', { ...BOT, timeout: 90000 }), lcsdVenues()]);
  const list = [];
  for (const m of xml.matchAll(/<event id="([^"]+)">([\s\S]*?)<\/event>/g)) {
    const x = m[2];
    const cat1 = cdata(x, 'cat1'), cat2 = cdata(x, 'cat2');
    if (LCSD_DROP.test(cat2)) continue;
    const titleZh = tagText(x, 'titlec'), titleEn = tagText(x, 'titlee').replace(/^["'“‘\s]+|["'”’\s]+$/g, '') || undefined;
    if (!titleZh && !titleEn) continue;
    const pre = cdata(x, 'predateE') || cdata(x, 'predateC');
    const dates = hkDates(pre);
    if (!dates.length) continue;
    const startDate = dates[0], endDate = dates.at(-1);
    if (endDate < today || startDate > until) continue;
    const v = venues.get(cdata(x, 'venueid')) || {};
    const kind = LCSD_KIND[cat2] || kindEu(titleEn, cat1 === 'inc4' ? 'performance' : cat1 === 'inc7' ? 'workshop' : 'festival');
    const tm = dates.length === 1 ? pre.match(/\b(\d{1,2}):(\d{2})\b/) : null;
    const url = normUrl(cdata(x, 'urle')), tix = normUrl(cdata(x, 'tagenturle'));
    const fee = tagText(x, 'pricee');
    list.push({
      id: `lcsd-${m[1]}`, kind, cityId: city.id, sourceKey: 'lcsd', title: titleZh || titleEn, titleEn,
      genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: v.zh || v.en || '', placeEn: v.en || undefined, address: v.en ? `${v.en}, Hong Kong` : undefined,
      lat: v.lat ?? null, lng: v.lng ?? null,
      startDate: startDate < today ? today : startDate, endDate,
      startTime: tm ? `${tm[1].padStart(2, '0')}:${tm[2]}` : undefined, tz: TZ,
      time: clip(pre.replace(/\s*\n\s*/g, ' · '), 160),
      fee: clip(fee, 160) || undefined, free: /^free|免費/i.test(fee) || undefined, feeEn: fee || undefined,
      overview: clip(tagText(x, 'descc') || tagText(x, 'desce'), 900) || undefined,
      overviewEn: clip(tagText(x, 'desce'), 900) || undefined,
      homepage: url || undefined, bookingUrl: tix || undefined,
      sourceUrl: url || tix || 'https://data.gov.hk/en-data/dataset/hk-lcsd-event-event-information',
      _noOg: !url && !tix ? true : undefined,
      source: `LCSD 康文署 – ${clip(tagText(x, 'presenterorge') || 'Leisure and Cultural Services Department', 80)} (DATA.GOV.HK)`,
    });
  }
  // 같은 프로그램이 여러 도서관·회차로 나뉜 경우 장소별로 합친 뒤 상한 (공연·전시 우선)
  const merged = new Map();
  for (const e of list) {
    const k = `${normTitle(e.titleEn || e.title)}|${e.place}`;
    const cur = merged.get(k);
    if (!cur) { merged.set(k, e); continue; }
    if (e.startDate < cur.startDate) cur.startDate = e.startDate;
    if (e.endDate > cur.endDate) cur.endDate = e.endDate;
    cur.startTime = undefined;
  }
  return capList([...merged.values()], +(process.env.LCSD_MAX || 550), e => (e.kind === 'performance' || e.kind === 'exhibition' ? 2 : 0) + (/Library/i.test(e.placeEn || '') ? -1 : 0) + (e.startDate <= addDaysStr(today, 45) ? 1 : 0));
}

/* ================= URBTIX ================= */
const URB_KIND = { Exhibition: 'exhibition', Talk: 'workshop', Workshop: 'workshop', Seminar: 'workshop', Festival: 'festival' };
async function urbtix(cities, ctx) {
  const city = cities.find(c => c.id === 'hongkong'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  let xml = '';
  for (const d of [today, addDaysStr(today, -1), addDaysStr(today, -2)]) { // 그날 파일이 아직 없으면 전날
    try { xml = await getText(`https://fs-open-1304240968.cos.ap-hongkong.myqcloud.com/prod/gprd/URBTIX_eventBatch_${d.replace(/-/g, '')}.xml`, { ...BOT, timeout: 60000, tries: 2 }); break; } catch (e) { if (e.status !== 404 && e.status !== 403) throw e; }
  }
  if (!xml) throw new Error('URBTIX 일일 파일 없음 (최근 3일)');
  const venues = await lcsdVenues().catch(() => new Map());
  const out = [];
  for (const m of xml.matchAll(/<EVENT>([\s\S]*?)<\/EVENT>/g)) {
    const x = m[1];
    const code = cdata(x, 'EVENT_CODE');
    const titleZh = tagText(x, 'EVENT_TC'), titleEn = tagText(x, 'EVENT_EG');
    const venueZh = tagText(x, 'VENUE_TC'), venueEn = tagText(x, 'VENUE_EG');
    if (!code || (!titleZh && !titleEn) || !venueEn || venueEn === '-') continue; // 장소 없는 통행권 등 제외
    const perf = [...x.matchAll(/<PERFORMANCE_DATETIME>(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))?<\/PERFORMANCE_DATETIME>/g)].map(p => ({ d: p[1], t: p[2] })).filter(p => p.d >= today && p.d <= until).sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t));
    const st = cdata(x, 'ST_DATE'), ed = cdata(x, 'ED_DATE');
    const startDate = perf[0]?.d || `${st.slice(0, 4)}-${st.slice(4, 6)}-${st.slice(6, 8)}`;
    const endDate = perf.at(-1)?.d || `${ed.slice(0, 4)}-${ed.slice(4, 6)}-${ed.slice(6, 8)}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || endDate < today || startDate > until) continue;
    const mainCat = tagText(cdata(x, 'MAIN_CAT'), 'EG');
    const kind = URB_KIND[mainCat] || kindEu(`${mainCat} ${titleEn}`, 'performance');
    const v = venueCoords(venues, venueZh, venueEn);
    const link = normUrl(cdata(x, 'REFERENCE_LINK').replace(/&amp;/g, '&'));
    const nameEn = venueEn.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
    out.push({
      id: `urbtix-${code}`, kind, cityId: city.id, sourceKey: 'urbtix', title: titleZh || titleEn, titleEn: titleEn || undefined,
      genre: GENRE_KO[kind], genreEn: mainCat || GENRE_EN[kind],
      place: venueZh || nameEn, placeEn: nameEn, address: `${nameEn}, Hong Kong`, lat: v?.lat ?? null, lng: v?.lng ?? null,
      startDate: startDate < today ? today : startDate, endDate, startTime: perf.length === 1 && perf[0].t ? perf[0].t : undefined, tz: TZ,
      time: perf.length > 1 ? `${perf.length}회 / ${perf.length} performances` : undefined,
      bookingUrl: link || 'https://www.urbtix.hk/', sourceUrl: link || 'https://www.urbtix.hk/',
      provider: 'URBTIX', source: 'URBTIX 城市售票網 (DATA.GOV.HK)',
    });
  }
  return out;
}

export const SOURCES = [
  { key: 'lcsd', name: 'LCSD 康文署 文化節目 (DATA.GOV.HK)', fn: lcsd, cities: ['hongkong'], licence: 'DATA.GOV.HK Terms and Conditions of Use (free reuse incl. commercial, with attribution)', url: 'https://data.gov.hk/en-data/dataset/hk-lcsd-event-event-information' },
  { key: 'urbtix', name: 'URBTIX 城市售票網 (DATA.GOV.HK)', fn: urbtix, cities: ['hongkong'], licence: 'DATA.GOV.HK Terms and Conditions of Use (free reuse incl. commercial, with attribution)', url: 'https://data.gov.hk/en-data/dataset/hk-lcsd-event-urbtix-event' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
