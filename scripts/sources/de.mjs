// 독일 소스 모듈 — 모두 키 없이 쓰는 공식 오픈데이터 (Ticketmaster 등 키 소스는 generic.mjs).
//   destination.one Open Data (meta.et4.de)  NRW: 쾰른·뒤셀도르프 / 작센: 라이프치히·드레스덴 — 이미지·좌표·라이선스 포함
//   Stadt Köln Veranstaltungen (stadt-koeln.de open data) — 쾰른시 이벤트, 이미지·좌표
//   kulturdaten.berlin API v2 — 베를린 문화행사 (이미지 없음 → og:image 보강, 주소 → 지오코딩)
//   Berlin Straßen- und Volksfeste / Weihnachtsmärkte (berlin.de simplesearch JSON)
//   Leipzig Weihnachtsmärkte (opendata.leipzig.de GeoJSON)
//   museum-digital 전시 (global.museum-digital.org/json/exhibitions) — 현재/예정 전시, 이미지
//   Hamburg Tourismus Veranstaltungsdatenbank (api.hamburg.de OGC API "MRH Veranstaltungen", dl-de/by-2.0) — 함부르크
//   BayernCloud Tourismus Open-Data-Dump (de-bayerncloud.mjs, CC0/BY/BY-SA) — 뮌헨·뉘른베르크
//   München Weihnachtsmärkte (opendata.muenchen.de, CC BY 4.0)
//   Landeshauptstadt Stuttgart 공식 행사 RSS(분류별) + 행사별 iCal(주소) — 슈투트가르트
//   Frankfurt Tourismus destination.one (항목 라이선스 CC0/BY/BY-SA 만) — 프랑크푸르트
//   Wikidata SPARQL (CC0) — 축제·박람회·대형 행사 회차
//   OpenAgenda 공개 미러 (Licence Ouverte) — 독일 도시 반경 내 소수
import { getJson, getText, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, isoLocalDate, isoLocalTime, deDate, allDeDates, fixLatLng, pool, mergeOccurrences, km, decodeEntities } from '../lib/util.mjs';
import { bayernCloud } from './de-bayerncloud.mjs';
import { openagenda, OPENAGENDA_META } from './openagenda.mjs';

const TZ = 'Europe/Berlin';
const isFreeDe = s => /kostenlos|kostenfrei|eintritt frei|frei\b|gratis|free/i.test(s || '') && !/\d+[,.]?\d*\s*(€|eur)/i.test(s || '');

function kindDe(text) {
  const t = String(text || '');
  if (/Führung|Besichtigung|Rundgang|Stadtrundfahrt|Tour\b|Guided/i.test(t)) return 'tour';
  if (/Workshop|Kurs\b|Kurse|Seminar|Mitmach|Basteln|Werkstatt|Atelier|Class/i.test(t)) return 'workshop';
  if (/Ausstellung|Exhibition|Museum|Galerie|Vernissage/i.test(t)) return 'exhibition';
  if (/Konzert|Bühne|Theater|Oper|Ballett|Musical|Comedy|Kabarett|Schauspiel|Tanz|Lesung|Vortrag|Kino|Film|Show|Varieté|Zirkus|Musik|Performance|Concert/i.test(t)) return 'performance';
  return 'festival';
}
const GENRE_KO = { tour: '가이드 투어', workshop: '워크숍', exhibition: '전시', performance: '공연', festival: '행사' };
const GENRE_EN = { tour: 'Guided tour', workshop: 'Workshop', exhibition: 'Exhibition', performance: 'Performance', festival: 'Event' };

/* ================= destination.one ================= */
// 도시 중심 반경(city.radiusKm) 검색 — 예전 'city:' 필터보다 많다 (뒤셀도르프 15→87, 드레스덴 10→35, 라이프치히 55→66:
// 에르크라트·라팅겐·힐덴·라데보일 등 반경 안 이웃 도시 포함). 함부르크는 니더작센 오픈데이터의 반경 내 항목(남쪽 근교).
const D1 = {
  cologne: 'open-data-nrw-tourismus',
  duesseldorf: 'open-data-nrw-tourismus',
  leipzig: 'open-data-sachsen-tourismus',
  dresden: 'open-data-sachsen-tourismus',
  hamburg: 'open-data-niedersachsen-tourismus',
};
// 'visitfrankfurt' = Frankfurt Tourismus 웹사이트용 공개(키 없는) experience. 오픈데이터 전용 풀이 아니므로
// 항목 라이선스가 CC0 / CC BY / CC BY-SA / PD 인 것만 쓰고(라이선스 없는 항목은 버림) 이미지도 열린 라이선스만 쓴다.
const D1_FRANKFURT = { frankfurt: 'visitfrankfurt' };
const D1_OPEN = /^(CC0|CC-BY|CC-BY-SA|PD|CC BY|CC BY-SA)(\s*-?[\d.]+)?$/i; // NC·ND 제외
const destinationOne = (cities, ctx) => d1Search(cities, ctx, D1, false);
const visitFrankfurt = (cities, ctx) => d1Search(cities, ctx, D1_FRANKFURT, true);
async function d1Search(cities, ctx, confMap, strict) {
  const out = [];
  for (const city of cities) {
    const exp = confMap[city.id]; if (!exp) continue;
    const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
    const items = [];
    for (let offset = 0; offset < 3000; offset += 200) {
      const j = await getJson(`https://meta.et4.de/rest.ashx/search/?${new URLSearchParams({ experience: exp, type: 'Event', template: 'ET2014A.json', latitude: String(city.lat), longitude: String(city.lng), distance: String(city.radiusKm * 1000), limit: '200', offset: String(offset) })}`);
      if (j.status !== 'OK') throw new Error(`destination.one ${exp} ${j.status} ${j.message || ''}`);
      items.push(...(j.items || []));
      if ((j.items || []).length < 200) break;
    }
    for (const it of items) {
      if (strict && !D1_OPEN.test((it.attributes || []).find(a => a.key === 'license')?.value || '')) continue;
      const tis = it.timeIntervals || [];
      let start = null, end = null, startTime;
      for (const ti of tis) {
        const s = isoLocalDate(ti.start), e = isoLocalDate(ti.repeatUntil) || isoLocalDate(ti.end) || s;
        if (!s) continue;
        if (!start || s < start) { start = s; }
        if (!end || e > end) end = e;
      }
      if (!start || end < today || start > until) continue;
      const next = tis.find(ti => (isoLocalDate(ti.repeatUntil) || isoLocalDate(ti.end) || isoLocalDate(ti.start)) >= today) || tis[0];
      if (tis.length === 1 && !next?.repeatUntil) startTime = isoLocalTime(next?.start) || undefined;
      const img = (it.media_objects || []).filter(m => /^image\//.test(m.type || '') && m.url && (!strict || D1_OPEN.test(m.license || ''))).sort((a, b) => (a.rel === 'default' ? -1 : 0) - (b.rel === 'default' ? -1 : 0) || (a.prio ?? 9) - (b.prio ?? 9))[0];
      const text = rel => (it.texts || []).find(t => t.rel === rel && t.type === 'text/plain')?.value || stripTags((it.texts || []).find(t => t.rel === rel)?.value || '');
      const price = (it.texts || []).find(t => /price/i.test(t.rel) && t.type === 'text/plain')?.value || stripTags((it.texts || []).find(t => /price/i.test(t.rel))?.value || '');
      const cats = (it.categories || []).filter(Boolean);
      const kind = kindDe(`${cats.join(' ')} ${it.title}`);
      const lic = (it.attributes || []).find(a => a.key === 'license')?.value;
      const [lat, lng] = fixLatLng(it.geo?.main?.latitude, it.geo?.main?.longitude, city);
      const booking = (it.media_objects || []).find(m => /booking|PRICE_KARTENLINK/i.test(m.rel) && m.url)?.url;
      const web = (it.media_objects || []).find(m => /venuewebsite|canonical/i.test(m.rel) && m.url)?.url || it.web;
      out.push({
        id: `d1-${it.id}`, kind, cityId: city.id, sourceKey: strict ? 'visitfrankfurt' : 'destinationone',
        title: stripTags(it.title), genre: cats[0] || GENRE_KO[kind], genreEn: GENRE_EN[kind],
        place: it.name && it.name !== it.title ? it.name : '', address: [it.street, [it.zip, it.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        lat, lng, startDate: start < today ? start : start, endDate: end, startTime, tz: TZ,
        time: tis.length > 1 || next?.repeatUntil ? `${next?.freq ? next.freq + ' · ' : ''}${isoLocalTime(next?.start) || ''}`.replace(/ · $/, '') : '',
        fee: clip(price, 200), free: isFreeDe(price),
        poster: httpsUrl(img?.url), posterCredit: img ? [img.source || img.author, img.license].filter(Boolean).join(' / ') : undefined,
        overview: clip(text('details') || text('teaser'), 1200),
        homepage: normUrl(web), bookingUrl: normUrl(booking) || undefined,
        source: strict ? `Frankfurt Tourismus / destination.one (${lic})` : `destination.one Open Data (${lic || 'open licence'})`, sourceUrl: normUrl(web) || 'https://open.destination.one/',
      });
    }
  }
  return out;
}

/* ================= Stadt Köln ================= */
async function koeln(cities) {
  const city = cities.find(c => c.id === 'cologne'); if (!city) return [];
  const j = await getJson('https://www.stadt-koeln.de/externe-dienste/open-data/events-od.php');
  return (j.items || []).map(x => {
    const [lat, lng] = fixLatLng(x.latitude, x.longitude, city);
    const kind = kindDe(`${x.title} ${x.description}`);
    const idm = String(x.link || '').match(/daten\/(\d+)/);
    return {
      id: `koeln-${idm ? idm[1] : (x.title + x.beginndatum).replace(/\W+/g, '').slice(0, 40)}`, kind, cityId: city.id, sourceKey: 'koeln',
      title: stripTags(x.title), genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: x.veranstaltungsort || '', address: [[x.strasse, x.hausnummer].filter(Boolean).join(' '), [x.plz, x.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      lat, lng, startDate: x.beginndatum, endDate: x.endedatum || x.beginndatum, tz: TZ, time: x.uhrzeit || '',
      fee: clip(stripTags(x.preis), 200), free: isFreeDe(x.preis),
      poster: x.teaserbild ? httpsUrl(x.teaserbild, 'https://www.stadt-koeln.de') : '', posterCredit: x.teaserbild ? 'Stadt Köln' : undefined,
      overview: clip(stripTags(x.description), 1000), homepage: normUrl(x.link),
      source: 'Stadt Köln Open Data', sourceUrl: normUrl(x.link),
    };
  }).filter(e => e.startDate);
}

/* ================= kulturdaten.berlin ================= */
const KD = 'https://api-v2.kulturdaten.berlin/api';
const KD_TAG = [
  [/Exhibitions|\.Art\b/i, 'exhibition'], [/Walks|Tour|Guided/i, 'tour'],
  [/Music|Dance|Stages|Theat|Opera|Film|Cinema|Reading|Lectures|Comedy|Cabaret/i, 'performance'],
  [/Festivals|ChristmasTime|WeeklyMarkets/i, 'festival'], [/Education|Workshop|Course/i, 'workshop'],
];
// 문화·여가와 무관한 안내성 행사(경찰 상담, 정치, 건강 상담, 정보행사, 단순 여가모임)는 제외
const KD_KEEP = /Exhibitions|\.Art\b|Walks|Music|Dance|Stages|Lectures|Festivals|ChristmasTime|WeeklyMarkets|Education|Children/i;
const KD_DROP_ONLY = /^(attraction\.category\.(Police|Politics|Health|InformationEvents|Conferences|Recreation|Women)\s*)+$/;
async function kulturdaten(cities, ctx) {
  const city = cities.find(c => c.id === 'berlin'); if (!city) return [];
  // 하루 약 60~100회차 → 45일 ≈ 50~60쪽. (예전 21일·25쪽 상한은 실제로 16일 지점에서 잘렸음)
  const today = todayIn(TZ), horizon = addDaysStr(today, +(process.env.KD_DAYS || 45));
  const raw = [];
  for (let page = 1; page <= +(process.env.KD_MAX_PAGES || 70); page++) {
    const j = await getJson(`${KD}/events?page=${page}&pageSize=100`);
    const evs = j.data?.events || [];
    raw.push(...evs);
    if (evs.length < 100 || (evs.at(-1)?.schedule?.startDate || '') > horizon) break;
  }
  // 회차별 레코드 → 작품(attraction) 단위로 합치기
  const byAttr = new Map();
  for (const e of raw) {
    const s = e.schedule || {}; if (!s.startDate || s.startDate > horizon || (s.endDate || s.startDate) < today) continue;
    if (e.status && e.status !== 'event.published') continue;
    const aid = e.attractions?.[0]?.referenceId; if (!aid) continue;
    const cur = byAttr.get(aid);
    const free = e.admission?.ticketType === 'ticketType.freeOfCharge';
    if (!cur) byAttr.set(aid, { aid, lid: e.locations?.[0]?.referenceId, place: e.locations?.[0]?.referenceLabel?.de || '', title: e.attractions[0].referenceLabel?.de || '', start: s.startDate, end: s.endDate || s.startDate, time: s.startTime && s.startTime !== '00:00:00' ? s.startTime.slice(0, 5) : undefined, n: 1, free });
    else { cur.n++; if (s.startDate < cur.start) cur.start = s.startDate; if ((s.endDate || s.startDate) > cur.end) cur.end = s.endDate || s.startDate; }
  }
  const groups = [...byAttr.values()].slice(0, +(process.env.KD_MAX_ATTRACTIONS || 1200));
  // 작품·장소 상세 (캐시 우선)
  const attrs = new Map(), locs = new Map();
  await pool(groups, 6, async g => {
    try { const j = await getJson(`${KD}/attractions/${g.aid}`, { tries: 2 }); attrs.set(g.aid, j.data?.attraction || null); } catch { attrs.set(g.aid, null); }
  });
  const lids = [...new Set(groups.map(g => g.lid).filter(Boolean))];
  await pool(lids, 6, async lid => { try { const j = await getJson(`${KD}/locations/${lid}`, { tries: 2 }); locs.set(lid, j.data?.location || null); } catch { locs.set(lid, null); } });

  const out = [];
  for (const g of groups) {
    const a = attrs.get(g.aid); const l = locs.get(g.lid);
    const tags = (a?.tags || []).join(' ');
    if (!a || !KD_KEEP.test(tags) || KD_DROP_ONLY.test(tags)) continue;
    let kind = 'festival'; for (const [re, k] of KD_TAG) if (re.test(tags)) { kind = k; break; }
    if (kind === 'festival') kind = kindDe(g.title);
    const ad = l?.address || {};
    const prev = ctx.prevById.get(`kd-${g.aid}`);
    const web = normUrl(a?.website || a?.externalLinks?.[0]?.url || l?.website || '');
    out.push({
      id: `kd-${g.aid}`, kind, cityId: city.id, sourceKey: 'kulturdaten',
      title: stripTags(a?.title?.de || g.title), titleEn: a?.title?.en || undefined, genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: l?.title?.de || g.place, address: [ad.streetAddress, [ad.postalCode, ad.addressLocality || 'Berlin'].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      lat: prev?.lat ?? null, lng: prev?.lng ?? null,
      startDate: g.start, endDate: g.end, startTime: g.n === 1 ? g.time : undefined, time: g.n > 1 ? `${g.n}회 / ${g.n} dates` : (g.time || ''), tz: TZ,
      free: g.free, fee: g.free ? 'Eintritt frei' : '', feeEn: g.free ? 'Free' : undefined,
      poster: prev?.poster || '', posterCredit: prev?.posterCredit,
      overview: clip(stripTags(a?.description?.de || ''), 1000), overviewEn: a?.description?.en ? clip(stripTags(a.description.en), 1000) : undefined,
      homepage: web, source: 'kulturdaten.berlin (CC BY 4.0)', sourceUrl: web || 'https://kulturdaten.berlin/',
      detail: !!a,
    });
  }
  return out;
}

/* ================= Berlin Volksfeste / Weihnachtsmärkte ================= */
async function berlinMarkets(cities, ctx) {
  const city = cities.find(c => c.id === 'berlin'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const out = [];
  const sets = [
    ['xmas', 'https://www.berlin.de/sen/web/service/maerkte-feste/weihnachtsmaerkte/index.php/index/all.json?q=', '크리스마스 마켓', 'Christmas market'],
    ['fest', 'https://www.berlin.de/sen/web/service/maerkte-feste/strassen-volksfeste/index.php/index/all.json?q=', '거리 축제', 'Street festival'],
  ];
  for (const [k, url, gKo, gEn] of sets) {
    const j = await getJson(url);
    for (const x of j.index || []) {
      const dates = [deDate(x.von), deDate(x.bis), ...allDeDates(x.oeffnungszeiten)].filter(Boolean).sort();
      if (!dates.length) continue;
      const start = dates[0], end = dates.at(-1);
      if (end < today || start > until) continue;
      out.push({
        id: `berlin-${k}-${x.id}`, kind: 'festival', cityId: city.id, sourceKey: 'berlinmarkets',
        title: stripTags(x.name || x.bezeichnung), genre: gKo, genreEn: gEn,
        place: x.bezirk || '', address: [x.strasse, x.plz_ort || x.plz].filter(Boolean).join(', '),
        lat: null, lng: null, startDate: start, endDate: end, tz: TZ,
        time: clip(stripTags(x.zeit || x.oeffnungszeiten || ''), 200), free: true, fee: '',
        overview: clip(stripTags(x.bemerkungen || ''), 900), homepage: normUrl(x.www),
        poster: '', source: 'Land Berlin – berlin.de Open Data', sourceUrl: normUrl(x.www) || url.replace('/index/all.json?q=', ''),
      });
    }
  }
  return out;
}

/* ================= Leipzig Weihnachtsmärkte ================= */
async function leipzigMarkets(cities, ctx) {
  const city = cities.find(c => c.id === 'leipzig'); if (!city) return [];
  const today = todayIn(TZ);
  const j = await getJson('https://opendata.leipzig.de/dataset/1a595f9b-23e5-4afe-90fd-1543045cd8b0/resource/e3c4f820-beb8-4239-a952-8fe6bf15a6fe/download/markets.geojson');
  return (j.features || []).map(f => {
    const p = f.properties || {};
    const start = deDate(p.von), end = deDate(p.bis) || start;
    if (!start || end < today) return null;
    const [lat, lng] = fixLatLng(p.lat, p.lng, city);
    return {
      id: `leipzig-market-${p.id}`, kind: 'festival', cityId: city.id, sourceKey: 'leipzigmarkets',
      title: stripTags(p.name), genre: '크리스마스 마켓', genreEn: 'Christmas market',
      place: p.bezirk || '', address: [p.strasse, p.plz_ort].filter(Boolean).join(', '), lat, lng,
      startDate: start, endDate: end, tz: TZ, time: p.oeffnungszeiten || '', free: !!p['immer-kostenlos'], fee: p['immer-kostenlos'] ? 'kostenlos' : '',
      poster: httpsUrl(p.image), posterCredit: p.image ? (p.urheberschaft || 'Stadt Leipzig') : undefined,
      overview: clip(stripTags(p.bemerkungen || p['RSS-Beschreibung'] || ''), 600), homepage: normUrl(p.w3),
      source: 'Stadt Leipzig Open Data', sourceUrl: normUrl(p.w3) || 'https://opendata.leipzig.de/',
    };
  }).filter(Boolean);
}

/* ================= museum-digital ================= */
async function museumDigital(cities) {
  const j = await getJson('https://global.museum-digital.org/json/exhibitions', { timeout: 40000 });
  const out = [];
  const names = new Map(cities.map(c => [c.local.toLowerCase(), c]).concat(cities.map(c => [c.name.en.toLowerCase(), c])));
  names.set('frankfurt', cities.find(c => c.id === 'frankfurt'));
  for (const arr of Object.values(j)) for (const x of arr) {
    if (x.status === 'past') continue;
    const loc = String(x.institution_location || '').toLowerCase().replace(/\s*\(.*\)/, '');
    const city = names.get(loc); if (!city) continue;
    out.push({
      id: `md-${x.exhibition_id}`, kind: 'exhibition', cityId: city.id, sourceKey: 'museumdigital',
      title: stripTags(x.name), genre: '전시', genreEn: 'Exhibition', place: x.institution_name || '',
      lat: null, lng: null, address: `${x.institution_name || ''}, ${city.local}`,
      startDate: x.start, endDate: x.end || addDaysStr(x.start, 180), tz: TZ,
      poster: httpsUrl(x.image), posterCredit: x.image ? `${x.institution_name} / museum-digital` : undefined,
      overview: clip(stripTags(x.description || ''), 900),
      source: 'museum-digital', sourceUrl: `https://${x.subset || 'global'}.museum-digital.de${x.link || ''}`,
    });
  }
  return out.filter(e => e.startDate);
}

/* ================= Hamburg Tourismus Veranstaltungsdatenbank (MRH Veranstaltungen) ================= */
// OGC API Features (Urban Data Platform Hamburg). 회차(날짜) 단위 레코드, 향후 6주. 라이선스 dl-de/by-2.0,
// Quellenvermerk "Hamburg Tourismus GmbH" (metaver.de 메타데이터 73107851-234E-40AC-BCC2-8F355FC1516D).
const HH_API = 'https://api.hamburg.de/datasets/v1/mrh_veranstaltungsdaten/collections/spielstaetten_mit_veranstaltungen_6_wochen/items';
const HH_DROP = /Bürgerangebote|Religion|Sport & Bewegung/i;
const HH_KIND = [
  [/Rundgänge|Fahrten|Exkursion|Wanderung|Führung/i, 'tour'],
  [/Seminare|Kurse|Workshop|Bildung/i, 'workshop'],
  [/Ausstellung|Museum/i, 'exhibition'],
  [/Theater|Bühne|Konzert|Musical|Show|Lesung|Kabarett|Comedy|Film|Kino|Oper|Tanz|Party|Club/i, 'performance'],
  [/Märkte|Festival|Feste|Messe/i, 'festival'],
];
async function hamburgEvents(cities, ctx) {
  const city = cities.find(c => c.id === 'hamburg'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const dLat = city.radiusKm / 111, dLng = city.radiusKm / (111 * Math.cos(city.lat * Math.PI / 180));
  const bbox = [city.lng - dLng, city.lat - dLat, city.lng + dLng, city.lat + dLat].map(v => v.toFixed(4)).join(',');
  const feats = [];
  for (let offset = 0; offset < 60000; offset += 10000) {
    const j = await getJson(`${HH_API}?f=json&limit=10000&offset=${offset}&bbox=${bbox}`, { timeout: 120000 });
    feats.push(...(j.features || []));
    if ((j.features || []).length < 10000) break;
  }
  const series = new Map();
  for (const f of feats) {
    const p = f.properties || {}; const [lng0, lat0] = f.geometry?.coordinates || [];
    if (!p.datum || p.datum < today || p.datum > until || HH_DROP.test(p.kategorie || '')) continue;
    if (lat0 == null || km({ lat: lat0, lng: lng0 }, city) > city.radiusKm) continue;
    const k = `${p.eventserie || p.event_id}|${p.spielstaette_id}`;
    const time = (String(p.startzeit || '').match(/(\d{1,2}):(\d{2})/) || []).slice(1).map(x => x.padStart(2, '0')).join(':');
    const cur = series.get(k);
    if (!cur) series.set(k, { p, lat: lat0, lng: lng0, start: p.datum, end: p.datum, dates: new Set([p.datum]), time });
    else { cur.dates.add(p.datum); if (p.datum < cur.start) { cur.start = p.datum; cur.time = time; } if (p.datum > cur.end) cur.end = p.datum; }
  }
  const out = [];
  for (const [k, s] of series) {
    const p = s.p, n = s.dates.size;
    const cat = [p.kategorie, p.unterkategorie].filter(x => x && !/^(Neu|Sonstige|Weitere.*)$/.test(x)).join(' · ');
    let kind = null; for (const [re, kk] of HH_KIND) if (re.test(`${p.kategorie} ${p.unterkategorie || ''}`)) { kind = kk; break; }
    kind ||= kindDe(`${cat} ${p.veranstaltungstitel}`);
    const [lat, lng] = fixLatLng(s.lat, s.lng, city);
    const price = String(p.preis || '').trim();
    out.push({
      id: `hh-${k.replace(/\|/g, '-')}`, kind, cityId: city.id, sourceKey: 'hamburgtourismus',
      title: stripTags(p.veranstaltungstitel), genre: cat || GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: p.spielstaette || '', address: [p.adresse, String(p.ort || '').trim()].filter(Boolean).join(', '),
      lat, lng, startDate: s.start, endDate: s.end, tz: TZ,
      startTime: n === 1 && s.time ? s.time : undefined, time: n > 1 ? `${n}회 / ${n} dates${s.time ? ' · ' + s.time : ''}` : (s.time || ''),
      fee: clip(price, 120), free: isFreeDe(price) || (p.von_preis === '0,00' && !p.bis_preis) || undefined,
      homepage: normUrl(p.homepage) || undefined,
      source: 'Hamburg Tourismus GmbH – Veranstaltungsdatenbank (dl-de/by-2.0)', sourceUrl: normUrl(String(p.veranstaltungslink || '').replace(/#.*$/, '')) || 'https://www.hamburg-tourism.de/',
      _cat: p.kategorie, _noOg: true, // hamburg-tourism.de 행사 페이지에는 og:image 없음
    });
  }
  // 상한: 도시당 HH_MAX. '기타/신규' 분류보다 명확한 분류 우선, 그 안에서 가까운 날짜 우선
  const max = +(process.env.HH_MAX || 1500);
  out.sort((a, b) => (/^(Neu|Sonstige)$/.test(a._cat) ? 1 : 0) - (/^(Neu|Sonstige)$/.test(b._cat) ? 1 : 0) || a.startDate.localeCompare(b.startDate));
  return out.slice(0, max).map(e => { delete e._cat; return e; });
}

/* ================= München Weihnachtsmärkte (opendata.muenchen.de) ================= */
function parseCsv(text, sep = ',') {
  const rows = []; let row = [], f = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; continue; }
    if (ch === '"') q = true; else if (ch === sep) { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(x => x.trim())) rows.push(row); row = []; }
    else f += ch;
  }
  if (f || row.length) { row.push(f); if (row.some(x => x.trim())) rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim());
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}
async function munichXmas(cities, ctx) {
  const city = cities.find(c => c.id === 'munich'); if (!city) return [];
  const today = todayIn(TZ);
  const pkg = await getJson('https://opendata.muenchen.de/api/3/action/package_show?id=weihnachtsmaerkte-muenchen');
  const res = (pkg.result?.resources || []).filter(r => /csv/i.test(r.format || '') && r.url)
    .sort((a, b) => String(b.last_modified || b.created || '').localeCompare(String(a.last_modified || a.created || '')))[0];
  if (!res) throw new Error('München Weihnachtsmärkte: CSV 리소스 없음');
  const rows = parseCsv(await getText(res.url));
  return rows.map((r, i) => {
    const start = deDate(r.startdatum), end = deDate(r.enddatum) || start;
    if (!start || end < today) return null;
    const [lat, lng] = fixLatLng(r.latitude, r.longitude, city);
    const slug = (r.marktname || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    return {
      id: `muc-xmas-${slug || i}`, kind: 'festival', cityId: city.id, sourceKey: 'muenchenxmas',
      title: r.marktname, genre: '크리스마스 마켓', genreEn: 'Christmas market',
      place: r.ort || '', address: [r.adresse, r.plz].filter(Boolean).join(', '), lat, lng,
      startDate: start, endDate: end, tz: TZ, time: clip(r.datum_anmerkungen || '', 200), free: true, fee: '',
      overview: clip(r.beschreibung || '', 600), homepage: normUrl(r.website),
      source: 'Landeshauptstadt München Open Data (CC BY 4.0)', sourceUrl: normUrl(r.website) || 'https://opendata.muenchen.de/dataset/weihnachtsmaerkte-muenchen',
    };
  }).filter(Boolean);
}

/* ================= Landeshauptstadt Stuttgart — 공식 행사 RSS ================= */
// stuttgart.de 가 구독용으로 제공하는 RSS(분류별, 최대 1000회차). 제목·일시·짧은 소개·원문 링크만 쓴다(이미지 없음).
// 주소는 각 행사 페이지가 제공하는 iCal(sp:out=iCal)의 LOCATION. robots.txt: Allow, Content-Signal search=yes/use=reference.
const STG_CATS = { 79078: 'performance', 79091: 'performance', 79120: 'performance', 77317: 'performance', 79186: 'exhibition', 79281: 'festival', 79075: null };
const STG_CAT_NAME = { 79078: 'Bühne', 79091: 'Musik', 79120: 'Kino, Film', 77317: 'Literatur & Geschichte', 79186: 'Kunst & Design', 79281: 'Events & Feste', 79075: 'Stadtleben' };
const STG_DROP = /Gottesdienst|Messe\b|Sonntagsmesse|Vorabendmesse|Werktagsmesse|Eucharisti|Andacht|Rosenkranz|Beicht|Kommunion|Wort-?Gottes|Mittagsgebet|Vesper|Rorate|Lobpreis|Abendmahl|Gebet\b|Kirchenkaffee|Sprechstunde|Beratung|Lauftreff|Digital im Alter/i;
const MON = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
async function stuttgartEvents(cities, ctx) {
  const city = cities.find(c => c.id === 'stuttgart'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const byId = new Map();
  for (const [cat, kind0] of Object.entries(STG_CATS)) {
    const xml = await getText(`https://www.stuttgart.de/service/veranstaltungen?sp%3Acategories%5B77306%5D%5B%5D=${cat}&sp%3Aout=rss&sp%3Acmp=eventSearch-1-0-searchResult&action=submit`, { timeout: 60000 });
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const tag = t => decodeEntities((m[1].match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) || [])[1] || '').replace(/^<!\[CDATA\[|\]\]>$/g, '').trim();
      const link = tag('link'), title = stripTags(tag('title'));
      const idm = link.match(/veranstaltungen\/([^?#]*?-(\d+))(?:[?#]|$)/); if (!idm || !title || STG_DROP.test(title)) continue;
      const d = tag('pubDate').match(/(\d{1,2}) (\w{3}) (\d{4}) (\d{2}):(\d{2})/); if (!d) continue;
      const date = `${d[3]}-${MON[d[2]]}-${d[1].padStart(2, '0')}`, time = d[4] === '00' && d[5] === '00' ? '' : `${d[4]}:${d[5]}`;
      if (date < today || date > until) continue;
      const cur = byId.get(idm[2]);
      if (!cur) byId.set(idm[2], { slug: idm[1], title, desc: stripTags(tag('description')), cat, kind0, dates: new Set([date]), start: date, end: date, time });
      else { cur.dates.add(date); if (date < cur.start) { cur.start = date; cur.time = time; } if (date > cur.end) cur.end = date; }
    }
  }
  const groups = [...byId.entries()];
  // 주소: 이전 빌드 값 재사용, 없으면 iCal (상한 STG_ICAL_MAX, 가까운 날짜 우선)
  const need = groups.filter(([id]) => !ctx.prevById.get(`stg-${id}`)?.address).sort((a, b) => a[1].start.localeCompare(b[1].start)).slice(0, +(process.env.STG_ICAL_MAX || 250));
  const loc = new Map();
  await pool(need, 3, async ([id, g]) => {
    try {
      const ics = (await getText(`https://www.stuttgart.de/veranstaltungskalender/veranstaltungen/${g.slug}?sp%3Aout=iCal`, { tries: 1, timeout: 10000 })).replace(/\r?\n[ \t]/g, '');
      const val = k => ((ics.match(new RegExp(`^${k}[^:\\n]*:(.*)$`, 'm')) || [])[1] || '').replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ').trim();
      loc.set(id, { address: val('LOCATION'), cats: val('CATEGORIES') });
    } catch { /* 주소 없이 진행 */ }
  });
  return groups.map(([id, g]) => {
    const prev = ctx.prevById.get(`stg-${id}`);
    const l = loc.get(id) || {};
    const sub = (l.cats || '').split(',')[0];
    const kind = g.kind0 || kindDe(`${sub} ${g.title} ${g.desc}`);
    const n = g.dates.size;
    const url = `https://www.stuttgart.de/veranstaltungskalender/veranstaltungen/${g.slug}`;
    return {
      id: `stg-${id}`, kind, cityId: city.id, sourceKey: 'stuttgart',
      title: g.title, genre: sub && !/^(Ja|Nein)$/.test(sub) ? sub : STG_CAT_NAME[g.cat], genreEn: GENRE_EN[kind],
      place: '', address: l.address || prev?.address || '', lat: prev?.lat ?? null, lng: prev?.lng ?? null,
      startDate: g.start, endDate: g.end, tz: TZ,
      startTime: n === 1 && g.time ? g.time : undefined, time: n > 1 ? `${n}회 / ${n} dates${g.time ? ' · ' + g.time : ''}` : (g.time || ''),
      overview: clip(g.desc.replace(/\s*\.\.\.$/, '…'), 400), homepage: url,
      source: 'Landeshauptstadt Stuttgart – Veranstaltungskalender (RSS)', sourceUrl: url,
      _noOg: true, // stuttgart.de 행사 페이지의 og:image는 사이트 공통 로고
    };
  });
}

/* ================= Wikidata (CC0) ================= */
// 날짜(P580/P582)와 장소가 있는 축제·박람회·대형 행사 회차. 학술회의·스톨퍼슈타인·업계 전용 박람회 제외.
const WD_CITY = { Q64: 'berlin', Q1726: 'munich', Q1055: 'hamburg', Q365: 'cologne', Q1794: 'frankfurt', Q1022: 'stuttgart', Q1718: 'duesseldorf', Q2079: 'leipzig', Q1731: 'dresden', Q2090: 'nuremberg' };
const WD_DROP = /Stolperstein|Konferenz|Tagung|Workshop|Kongress|Summit|Symposium|wissenschaftlich|Fachmesse|Sitzung|Wahl|Hauptversammlung|Parteitag|Sportsaison|Meeting|Projekt|Tournee|Forschung/i;
async function wikidataEvents(cities, ctx) {
  const ids = Object.entries(WD_CITY).filter(([, c]) => cities.some(x => x.id === c));
  if (!ids.length) return [];
  const today = todayIn(TZ), until = addDaysStr(today, Math.max(ctx.daysAhead, 180));
  const q = `SELECT ?e ?eLabel ?start ?end ?city ?img ?web ?placeLabel (GROUP_CONCAT(DISTINCT ?tl; separator="|") AS ?types) WHERE {
  VALUES ?city { ${ids.map(([q]) => 'wd:' + q).join(' ')} }
  ?e wdt:P580 ?start . OPTIONAL { ?e wdt:P582 ?end }
  FILTER(?start <= "${until}T00:00:00Z"^^xsd:dateTime && COALESCE(?end, ?start) >= "${today}T00:00:00Z"^^xsd:dateTime)
  { ?e wdt:P276 ?place . ?place wdt:P131 ?city } UNION { ?e wdt:P276 ?place . ?place wdt:P131/wdt:P131 ?city } UNION { ?e wdt:P131 ?city } UNION { ?e wdt:P276 ?city }
  OPTIONAL { ?e wdt:P18 ?img } OPTIONAL { ?e wdt:P856 ?web }
  OPTIONAL { ?e wdt:P31 ?t . ?t rdfs:label ?tl FILTER(LANG(?tl) = "de") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
} GROUP BY ?e ?eLabel ?start ?end ?city ?img ?web ?placeLabel LIMIT 500`;
  const j = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { accept: 'application/sparql-results+json', timeout: 90000, tries: 2 });
  const seen = new Set(); const out = [];
  for (const b of j.results?.bindings || []) {
    const qid = b.e.value.split('/').pop(); if (seen.has(qid)) continue;
    const title = b.eLabel?.value || ''; const types = b.types?.value || '';
    if (!title || /^Q\d+$/.test(title) || WD_DROP.test(`${types} ${title}`)) continue;
    const cityId = WD_CITY[b.city.value.split('/').pop()]; const city = cities.find(c => c.id === cityId); if (!city) continue;
    seen.add(qid);
    if (addDaysStr(b.start.value.slice(0, 10), 400) < (b.end?.value || '').slice(0, 10)) continue; // 1년 넘는 기간 = 행사 아님
    const kind = kindDe(`${types} ${title}`);
    const file = b.img ? decodeURIComponent(b.img.value.split('/').pop()) : '';
    out.push({
      id: `wd-${qid}`, kind, cityId, sourceKey: 'wikidata',
      title, genre: types.split('|')[0] || GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: b.placeLabel?.value && !/^Q\d+$/.test(b.placeLabel.value) ? b.placeLabel.value : '', address: city.local, lat: null, lng: null,
      startDate: b.start.value.slice(0, 10), endDate: (b.end?.value || b.start.value).slice(0, 10), tz: TZ,
      poster: file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800` : '',
      posterCredit: file ? `Wikimedia Commons: ${file}` : undefined,
      homepage: normUrl(b.web?.value) || undefined,
      source: 'Wikidata (CC0)', sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
    });
  }
  return out;
}

/* ================= 모듈 진입점 ================= */
export const SOURCES = [
  { key: 'destinationone', name: 'destination.one Open Data (NRW·Sachsen·Niedersachsen)', fn: destinationOne, cities: Object.keys(D1), licence: '항목별 CC0 / CC BY / CC BY-SA / PD (이미지별 표기)', url: 'https://help.destination.one/portal/de/kb/articles/meta-service-features' },
  { key: 'koeln', name: 'Stadt Köln Veranstaltungen', fn: koeln, cities: ['cologne'], licence: 'Stadt Köln Open Data (출처표시)', url: 'https://www.offenedaten-koeln.de/' },
  { key: 'kulturdaten', name: 'kulturdaten.berlin API v2', fn: kulturdaten, cities: ['berlin'], licence: 'CC BY 4.0 (Technologiestiftung Berlin)', url: 'https://api-v2.kulturdaten.berlin/api/docs/' },
  { key: 'berlinmarkets', name: 'berlin.de Volksfeste & Weihnachtsmärkte', fn: berlinMarkets, cities: ['berlin'], licence: 'CC BY 3.0 DE (Land Berlin)', url: 'https://daten.berlin.de/' },
  { key: 'leipzigmarkets', name: 'Leipzig Weihnachtsmärkte', fn: leipzigMarkets, cities: ['leipzig'], licence: 'dl-de/by-2-0 (Stadt Leipzig)', url: 'https://opendata.leipzig.de/dataset/weihnachtsmarkte-im-stadtgebiet-leipzig-und-umland' },
  { key: 'museumdigital', name: 'museum-digital exhibitions', fn: museumDigital, licence: 'museum-digital (CC BY-NC-SA 단위 표기, 링크 백)', url: 'https://global.museum-digital.org/' },
  // BayernCloud 덤프(~120MB, 약 100초)가 가장 오래 걸리므로 SOURCES 앞쪽에 둔다 (pool 동시 실행)
  { key: 'bayerncloud', name: 'BayernCloud Tourismus Open Data (Veranstaltungen)', fn: bayernCloud, cities: ['munich', 'nuremberg'], licence: '항목별 CC0 / CC BY 4.0 / CC BY-SA 4.0 (Bayern Tourismus Marketing GmbH, 항목별 저작권 표기)', url: 'https://www.govdata.de/suche/daten/veranstaltungen-und-erlebnisse-in-bayern481ae' },
  { key: 'hamburgtourismus', name: 'Hamburg Tourismus Veranstaltungsdatenbank (MRH Veranstaltungen)', fn: hamburgEvents, cities: ['hamburg'], licence: 'dl-de/by-2.0 (Quellenvermerk: Hamburg Tourismus GmbH)', url: 'https://api.hamburg.de/datasets/v1/mrh_veranstaltungsdaten' },
  { key: 'stuttgart', name: 'Landeshauptstadt Stuttgart Veranstaltungskalender (RSS)', fn: stuttgartEvents, cities: ['stuttgart'], licence: '공식 구독용 RSS — 제목·일시·짧은 소개 + 원문 링크만 사용 (© Landeshauptstadt Stuttgart)', url: 'https://www.stuttgart.de/service/veranstaltungen' },
  { key: 'visitfrankfurt', name: 'Frankfurt Tourismus (destination.one, 오픈 라이선스 항목만)', fn: visitFrankfurt, cities: ['frankfurt'], licence: '항목별 CC0 / CC BY-SA (라이선스 없는 항목·NC 이미지 제외)', url: 'https://www.frankfurt-tourismus.de/Entdecken-und-Erleben/Veranstaltungen' },
  { key: 'muenchenxmas', name: 'München Weihnachtsmärkte (Open Data)', fn: munichXmas, cities: ['munich'], licence: 'CC BY 4.0 (Landeshauptstadt München)', url: 'https://opendata.muenchen.de/dataset/weihnachtsmaerkte-muenchen' },
  { key: 'wikidata', name: 'Wikidata 행사 회차', fn: wikidataEvents, licence: 'CC0 (이미지: Wikimedia Commons 파일별 라이선스)', url: 'https://query.wikidata.org/' },
  { ...OPENAGENDA_META, fn: openagenda },
];

export async function fetchCountry(cities, ctx) {
  const events = []; const status = [];
  // 디버그: DE_SOURCES=hamburgtourismus,stuttgart 처럼 일부 소스만
  const only = (process.env.DE_SOURCES || '').split(',').map(s => s.trim()).filter(Boolean);
  const list = only.length ? SOURCES.filter(s => only.includes(s.key)) : [...SOURCES];
  // 오래 걸리는 소스 먼저
  list.sort((a, b) => (b.key === 'bayerncloud') - (a.key === 'bayerncloud'));
  await pool(list, 4, async s => {
    const t0 = Date.now();
    try {
      const res = await s.fn(cities, ctx);
      for (const e of res) { e.tz ||= TZ; events.push(e); }
      status.push({ key: s.key, name: s.name, cities: s.cities, enabled: true, ok: true, count: res.length, ms: Date.now() - t0, licence: s.licence, url: s.url });
    } catch (err) {
      status.push({ key: s.key, name: s.name, cities: s.cities, enabled: true, ok: false, error: err.message.slice(0, 200), licence: s.licence, url: s.url });
    }
  });
  return { events, status };
}
export { mergeOccurrences };
