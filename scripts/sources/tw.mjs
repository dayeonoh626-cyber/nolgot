// 대만 소스 모듈 — 키 없는 정부 오픈데이터 (政府資料開放授權條款).
//   문화부 iCulture 활동 피드 (cloud.culture.tw)     전국 공연·전시·강좌·영화 등 → 도시(주소/좌표)로 필터. 이미지 적음(og:image·장소 사진 보강)
//   교통부 관광서 관광자료 활동 (media.taiwan.net.tw)  전국 관광 축제·행사 ZIP(EventList.json). 이미지 100%
// 臺北旅遊網 Open API 는 Cloudflare 챌린지(403)라 보류 (문서 5-D).
import { inflateRawSync } from 'node:zlib';
import { getJson, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, fixLatLng, km, kindAsia, GENRE_KO, GENRE_EN, isoLocalDate, isoLocalTime, dotYmd, BOT } from '../lib/util.mjs';
import { runSources, capList } from '../lib/sources.mjs';

const TZ = 'Asia/Taipei';
// 도시 → 주소 패턴 (臺/台 이체자 모두)
const ADDR = { taipei: /[臺台]北市/, kaohsiung: /高雄市/ };
const cityOf = (cities, addr, lat, lng) => cities.find(c => (ADDR[c.id] && ADDR[c.id].test(addr || ''))
  || (Number.isFinite(lat) && Number.isFinite(lng) && km(c, { lat, lng }) <= c.radiusKm && !Object.entries(ADDR).some(([id, re]) => id !== c.id && re.test(addr || ''))));

/* ================= 문화부 iCulture ================= */
// category: 1 음악 · 2 연극 · 3 무용 · 4 가족 · 5 인디음악 · 6 전시 · 7 강좌 · 8 영화 · 11 버라이어티 · 15 기타 · 17 콘서트 · 19 연수·강좌 (13 대회·14 모집 제외)
const IC_CATS = { 1: ['performance', '음악', 'Music'], 2: ['performance', '연극', 'Theatre'], 3: ['performance', '무용', 'Dance'], 4: [null, '가족', 'Family'], 5: ['performance', '인디 음악', 'Indie music'], 6: ['exhibition', '전시', 'Exhibition'], 7: ['workshop', '강좌', 'Talk'], 8: ['performance', '영화', 'Film'], 11: ['performance', '버라이어티', 'Variety show'], 15: [null, '기타', 'Other'], 17: ['performance', '콘서트', 'Concert'], 19: ['workshop', '강좌·연수', 'Course'] };

async function iculture(cities, ctx) {
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const byCity = new Map(cities.map(c => [c.id, []]));
  const seen = new Set();
  for (const [cat, [fixedKind, genreKo, genreEn]] of Object.entries(IC_CATS)) {
    const rows = await getJson(`https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=${cat}`, { ...BOT, timeout: 90000 });
    for (const x of Array.isArray(rows) ? rows : []) {
      if (!x.UID || seen.has(x.UID)) continue;
      const startDate = dotYmd(x.startDate), endDate = dotYmd(x.endDate) || startDate;
      if (!startDate || endDate < today || startDate > until) continue;
      // 이 도시에 해당하는 회차
      let city = null; const shows = [];
      for (const s of x.showInfo || []) {
        const lat = parseFloat(s.latitude), lng = parseFloat(s.longitude);
        const c = cityOf(cities, s.location, lat, lng);
        if (!c || (city && c.id !== city.id)) continue;
        city = c; shows.push(s);
      }
      if (!city) continue;
      seen.add(x.UID);
      const up = shows.filter(s => dotYmd(s.endTime || s.time) >= today).sort((a, b) => String(a.time).localeCompare(String(b.time)));
      const first = up[0] || shows[0];
      const [lat, lng] = fixLatLng(first.latitude, first.longitude, city);
      const title = stripTags(x.title);
      const kind = fixedKind || kindAsia(`${title} ${x.descriptionFilterHtml || ''}`.slice(0, 300), 'festival');
      const t1 = String(first.time || '').match(/(\d{2}):(\d{2})/);
      const st = up.length === 1 && t1 && t1[0] !== '00:00' ? t1[0] : undefined;
      const sd = up.length ? (dotYmd(up[0].time) > startDate ? dotYmd(up[0].time) : startDate) : startDate;
      const promo = normUrl(x.sourceWebPromote), sales = normUrl(x.webSales);
      byCity.get(city.id).push({
        id: `iculture-${x.UID}`, kind, cityId: city.id, sourceKey: 'iculture', title,
        genre: kind === fixedKind ? genreKo : GENRE_KO[kind], genreEn: kind === fixedKind ? genreEn : GENRE_EN[kind],
        place: first.locationName || '', address: first.location || '', lat, lng,
        startDate: sd < today ? today : sd, endDate, startTime: st, tz: TZ,
        time: up.length > 1 ? `${up.length}회 / ${up.length} dates` : undefined,
        fee: clip(stripTags(first.price || ''), 160) || undefined, free: /免費|免费/.test(first.price || '') || undefined,
        poster: httpsUrl(x.imageUrl) || undefined, posterCredit: x.imageUrl ? (x.masterUnit?.[0] || 'iCulture 文化部') : undefined,
        overview: clip(stripTags(x.descriptionFilterHtml || ''), 900) || undefined,
        homepage: promo || undefined, bookingUrl: sales || undefined, sourceUrl: promo || sales || 'https://cloud.culture.tw/',
        source: `文化部 iCulture – ${clip(x.masterUnit?.[0] || x.showUnit || '', 60)} (政府資料開放授權條款)`.replace(' –  (', ' ('),
        _hit: +x.hitRate || 0,
      });
    }
  }
  const out = [];
  for (const [, list] of byCity) {
    out.push(...capList(list, +(process.env.ICULTURE_MAX || 500), e => (e.poster ? 2 : 0) + (e.startDate <= addDaysStr(today, 30) ? 1 : 0) + Math.min(1, e._hit / 5000)));
  }
  return out.map(e => { delete e._hit; return e; });
}

/* ================= 관광서 활동 (ZIP) ================= */
/** ZIP(로컬 헤더 순회, deflate/stored)에서 파일 하나를 꺼낸다 — 의존성 없음 */
export function unzipEntry(buf, name) {
  let off = 0;
  while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    const flags = buf.readUInt16LE(off + 6), method = buf.readUInt16LE(off + 8);
    let csize = buf.readUInt32LE(off + 18);
    const nlen = buf.readUInt16LE(off + 26), xlen = buf.readUInt16LE(off + 28);
    const fname = buf.subarray(off + 30, off + 30 + nlen).toString('utf8');
    const start = off + 30 + nlen + xlen;
    if (flags & 8 && !csize) throw new Error('ZIP 데이터 디스크립터 형식은 지원 안 함');
    if (fname === name) {
      const data = buf.subarray(start, start + csize);
      return method === 8 ? inflateRawSync(data) : data;
    }
    off = start + csize;
  }
  return null;
}

async function twtourism(cities, ctx) {
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  // util.http()는 본문을 text로 읽으므로 ZIP은 fetch로 바이너리 그대로 받는다
  const r = await fetch('https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Event-json.zip', { headers: BOT.headers, signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const raw = unzipEntry(Buffer.from(await r.arrayBuffer()), 'EventList.json');
  if (!raw) throw new Error('EventList.json 없음');
  const j = JSON.parse(raw.toString('utf8').replace(/^﻿/, ''));
  const out = [];
  for (const x of j.Events || []) {
    if (x.EventStatus && !/Scheduled|Rescheduled/i.test(x.EventStatus)) continue;
    const startDate = isoLocalDate(x.StartDateTime), endDate = isoLocalDate(x.EndDateTime) || startDate;
    if (!startDate || endDate < today || startDate > until) continue;
    const addr = `${x.PostalAddress?.City || ''}${x.PostalAddress?.Town || ''}${x.PostalAddress?.StreetAddress || ''}`;
    const city = cityOf(cities, x.PostalAddress?.City || '', +x.PositionLat, +x.PositionLon);
    if (!city) continue;
    const [lat, lng] = fixLatLng(x.PositionLat, x.PositionLon, city);
    const title = stripTags(x.EventName);
    const kind = kindAsia(`${title} ${x.Description || ''}`.slice(0, 300), 'festival');
    const img = (x.Images || []).map(i => httpsUrl(i.URL)).find(Boolean);
    const web = normUrl(x.WebsiteURL);
    const st = isoLocalTime(x.StartDateTime);
    out.push({
      id: `twtourism-${x.EventID}`, kind, cityId: city.id, sourceKey: 'twtourism', title,
      genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: x.PostalAddress?.StreetAddress || x.Organizations?.[0]?.Name || '', address: addr || undefined, lat, lng,
      startDate: startDate < today ? today : startDate, endDate, startTime: startDate === endDate && st ? st : undefined, tz: TZ,
      free: x.IsAccessibleForFree === 1 || x.IsAccessibleForFree === true || undefined, fee: clip(stripTags(x.FeeInfo || ''), 160) || undefined,
      poster: img || undefined, posterCredit: img ? '交通部觀光署 Tourism Administration, MOTC' : undefined,
      overview: clip(stripTags(x.Description || ''), 900) || undefined,
      homepage: web || undefined, sourceUrl: web || 'https://data.gov.tw/dataset/7778',
      source: '交通部觀光署 觀光資料 – 活動 (政府資料開放授權條款)',
    });
  }
  return out;
}

export const SOURCES = [
  { key: 'iculture', name: '文化部 iCulture 藝文活動', fn: iculture, cities: ['taipei', 'kaohsiung'], licence: 'Open Government Data License, version 1.0 (政府資料開放授權條款, CC BY 4.0 compatible); images per organiser', url: 'https://opendata.culture.tw/' },
  { key: 'twtourism', name: '交通部觀光署 觀光活動', fn: twtourism, cities: ['taipei', 'kaohsiung'], licence: 'Open Government Data License, version 1.0 (政府資料開放授權條款)', url: 'https://data.gov.tw/dataset/7778' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
