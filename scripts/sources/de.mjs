// 독일 소스 모듈 — 모두 키 없이 쓰는 공식 오픈데이터 (Ticketmaster 등 키 소스는 generic.mjs).
//   destination.one Open Data (meta.et4.de)  NRW: 쾰른·뒤셀도르프 / 작센: 라이프치히·드레스덴 — 이미지·좌표·라이선스 포함
//   Stadt Köln Veranstaltungen (stadt-koeln.de open data) — 쾰른시 이벤트, 이미지·좌표
//   kulturdaten.berlin API v2 — 베를린 문화행사 (이미지 없음 → og:image 보강, 주소 → 지오코딩)
//   Berlin Straßen- und Volksfeste / Weihnachtsmärkte (berlin.de simplesearch JSON)
//   Leipzig Weihnachtsmärkte (opendata.leipzig.de GeoJSON)
//   museum-digital 전시 (global.museum-digital.org/json/exhibitions) — 현재/예정 전시, 이미지
import { getJson, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, isoLocalDate, isoLocalTime, deDate, allDeDates, fixLatLng, pool, mergeOccurrences } from '../lib/util.mjs';

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
const D1 = {
  cologne: ['open-data-nrw-tourismus', 'Köln'],
  duesseldorf: ['open-data-nrw-tourismus', 'Düsseldorf'],
  leipzig: ['open-data-sachsen-tourismus', 'Leipzig'],
  dresden: ['open-data-sachsen-tourismus', 'Dresden'],
};
async function destinationOne(cities, ctx) {
  const out = [];
  for (const city of cities) {
    const conf = D1[city.id]; if (!conf) continue;
    const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
    const items = [];
    for (let offset = 0; offset < 2000; offset += 200) {
      const j = await getJson(`https://meta.et4.de/rest.ashx/search/?${new URLSearchParams({ experience: conf[0], type: 'Event', template: 'ET2014A.json', q: `city:${conf[1]}`, limit: '200', offset: String(offset) })}`);
      if (j.status !== 'OK') throw new Error(`destination.one ${j.status} ${j.message || ''}`);
      items.push(...(j.items || []));
      if ((j.items || []).length < 200) break;
    }
    for (const it of items) {
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
      const img = (it.media_objects || []).filter(m => /^image\//.test(m.type || '') && m.url).sort((a, b) => (a.rel === 'default' ? -1 : 0) - (b.rel === 'default' ? -1 : 0) || (a.prio ?? 9) - (b.prio ?? 9))[0];
      const text = rel => (it.texts || []).find(t => t.rel === rel && t.type === 'text/plain')?.value || stripTags((it.texts || []).find(t => t.rel === rel)?.value || '');
      const price = (it.texts || []).find(t => /price/i.test(t.rel) && t.type === 'text/plain')?.value || stripTags((it.texts || []).find(t => /price/i.test(t.rel))?.value || '');
      const cats = (it.categories || []).filter(Boolean);
      const kind = kindDe(`${cats.join(' ')} ${it.title}`);
      const lic = (it.attributes || []).find(a => a.key === 'license')?.value;
      const [lat, lng] = fixLatLng(it.geo?.main?.latitude, it.geo?.main?.longitude, city);
      const booking = (it.media_objects || []).find(m => /booking|PRICE_KARTENLINK/i.test(m.rel) && m.url)?.url;
      const web = (it.media_objects || []).find(m => /venuewebsite|canonical/i.test(m.rel) && m.url)?.url || it.web;
      out.push({
        id: `d1-${it.id}`, kind, cityId: city.id, sourceKey: 'destinationone',
        title: stripTags(it.title), genre: cats[0] || GENRE_KO[kind], genreEn: GENRE_EN[kind],
        place: it.name && it.name !== it.title ? it.name : '', address: [it.street, [it.zip, it.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        lat, lng, startDate: start < today ? start : start, endDate: end, startTime, tz: TZ,
        time: tis.length > 1 || next?.repeatUntil ? `${next?.freq ? next.freq + ' · ' : ''}${isoLocalTime(next?.start) || ''}`.replace(/ · $/, '') : '',
        fee: clip(price, 200), free: isFreeDe(price),
        poster: httpsUrl(img?.url), posterCredit: img ? [img.source || img.author, img.license].filter(Boolean).join(' / ') : undefined,
        overview: clip(text('details') || text('teaser'), 1200),
        homepage: normUrl(web), bookingUrl: normUrl(booking) || undefined,
        source: `destination.one Open Data (${lic || 'open licence'})`, sourceUrl: normUrl(web) || 'https://open.destination.one/',
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
  const today = todayIn(TZ), horizon = addDaysStr(today, +(process.env.KD_DAYS || 21));
  const raw = [];
  for (let page = 1; page <= +(process.env.KD_MAX_PAGES || 25); page++) {
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
  const groups = [...byAttr.values()].slice(0, +(process.env.KD_MAX_ATTRACTIONS || 500));
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

/* ================= 모듈 진입점 ================= */
export const SOURCES = [
  { key: 'destinationone', name: 'destination.one Open Data (NRW·Sachsen)', fn: destinationOne, licence: '항목별 CC0 / CC BY / CC BY-SA / PD (이미지별 표기)', url: 'https://help.destination.one/portal/de/kb/articles/meta-service-features' },
  { key: 'koeln', name: 'Stadt Köln Veranstaltungen', fn: koeln, licence: 'Stadt Köln Open Data (출처표시)', url: 'https://www.offenedaten-koeln.de/' },
  { key: 'kulturdaten', name: 'kulturdaten.berlin API v2', fn: kulturdaten, licence: 'CC BY 4.0 (Technologiestiftung Berlin)', url: 'https://api-v2.kulturdaten.berlin/api/docs/' },
  { key: 'berlinmarkets', name: 'berlin.de Volksfeste & Weihnachtsmärkte', fn: berlinMarkets, licence: 'CC BY 3.0 DE (Land Berlin)', url: 'https://daten.berlin.de/' },
  { key: 'leipzigmarkets', name: 'Leipzig Weihnachtsmärkte', fn: leipzigMarkets, licence: 'dl-de/by-2-0 (Stadt Leipzig)', url: 'https://opendata.leipzig.de/dataset/weihnachtsmarkte-im-stadtgebiet-leipzig-und-umland' },
  { key: 'museumdigital', name: 'museum-digital exhibitions', fn: museumDigital, licence: 'museum-digital (CC BY-NC-SA 단위 표기, 링크 백)', url: 'https://global.museum-digital.org/' },
];

export async function fetchCountry(cities, ctx) {
  const events = []; const status = [];
  await pool(SOURCES, 3, async s => {
    const t0 = Date.now();
    try {
      const list = await s.fn(cities, ctx);
      for (const e of list) { e.tz ||= TZ; events.push(e); }
      status.push({ key: s.key, name: s.name, enabled: true, ok: true, count: list.length, ms: Date.now() - t0, licence: s.licence, url: s.url });
    } catch (err) {
      status.push({ key: s.key, name: s.name, enabled: true, ok: false, error: err.message.slice(0, 200), licence: s.licence, url: s.url });
    }
  });
  return { events, status };
}
export { mergeOccurrences };
