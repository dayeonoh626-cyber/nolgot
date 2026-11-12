// 캐나다 소스 모듈 — 키 없는 공식 오픈데이터 (Ticketmaster 등 키 소스는 generic.mjs). docs/sources-research-phase4.md 2-1 · 5-A
//   City of Toronto Festivals & Events (CKAN festivals-events)   토론토 시 공식 행사 달력. 회차별 행 약 2.9만(240MB) → 스트리밍.
//                                                                 이미지: c3api retrieve URL (예정 행 87%). Open Government Licence – Toronto
//   Ville de Montréal « Événements publics » (Données Québec 미러)  몬트리올 시·구·도서관 행사. 좌표 전 건. 이미지 없음 → 행사 페이지(montreal.ca) og:image
//                                                                 (enrich 단계). CC BY 4.0. 원본 donnees.montreal.ca 는 봇 UA에 403 → UA를 바꾸지 않고 공식 미러 사용
//   Toronto Public Library Programs & Events (CKAN, 보조)          도서관 프로그램. 분류 아이콘·공용 배너 이미지는 버리고 분관 좌표(분관 정보 데이터셋) → 분관 사진
import { getJson, stripTags, clip, normUrl, todayIn, addDaysStr, fixLatLng, GENRE_KO, GENRE_EN, isoLocalDate, isoLocalTime, BOT } from '../lib/util.mjs';
import { runSources, capList } from '../lib/sources.mjs';
import { streamJsonArray } from '../lib/stream.mjs';

const TZ = 'America/Toronto';
const ev = (kind, o) => ({ kind, genre: GENRE_KO[kind], genreEn: GENRE_EN[kind], ...o });
const nan = s => { s = String(s ?? '').trim(); return s === 'nan' || s === 'None' || s === 'null' ? '' : s; };

/* ================= City of Toronto Festivals & Events ================= */
const TO_URL = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/9201059e-43ed-4369-885e-0b867652feac/resource/8900fdb2-7f6c-4f50-8581-b463311ff05d/download/file.json';
const TO_IMG = id => `https://secure.toronto.ca/c3api_upload/retrieve/festivals_events/${encodeURIComponent(id)}`;
const TO_DROP = /^(Virtual\/Online Event|Charity\/Cause|Run\/Walk)$/;
function toKind(cats, title) {
  const has = re => cats.some(c => re.test(c));
  if (has(/^Tour$/)) return 'tour';
  if (has(/^(Seminars\/Workshops)$/)) return 'workshop';
  if (has(/^(Live Performances|Theatre|Music|Dance|Comedy|Film|Talks)$/)) return 'performance';
  if (has(/^(Arts\/Exhibits|Museum)$/)) return 'exhibition';
  if (has(/^(Celebrations|Street Festival|Farmers' Market|Food\/Culinary|Artisan|Consumer Show\/Convention)$/)) return 'festival';
  if (/workshop|class\b/i.test(title)) return 'workshop';
  return 'festival';
}
const gps = s => { try { const a = JSON.parse(s || '[]'); return a[0] || null; } catch { return null; } };

async function torontoEvents(cities, ctx) {
  const city = cities.find(c => c.id === 'toronto'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const groups = new Map();
  await streamJsonArray(TO_URL, x => {
    const end = isoLocalDate(x.event_enddate) || isoLocalDate(x.calendar_date);
    if (!x.event_name || !end || end < today) return;
    if (x.event_status && x.event_status !== 'Approved') return;
    const cats = (x.event_category || []).map(String);
    if (cats.some(c => TO_DROP.test(c))) return;
    const loc = (x.event_locations || [])[0] || {};
    const key = `${x.event_name}|${loc.location_name || ''}`;
    let g = groups.get(key);
    if (!g) { g = { x, cats, loc, dates: new Set(), times: new Set(), end }; groups.set(key, g); }
    const cd = isoLocalDate(x.calendar_date);
    if (cd && cd >= today && cd <= until) { g.dates.add(cd); g.times.add(isoLocalTime(x.calendar_date)); }
    if (end > g.end) g.end = end;
    if (!(g.x.event_image || []).some(i => i.bin_id) && (x.event_image || []).some(i => i.bin_id)) g.x = x;
  }, { itemDepth: 3, timeout: 600000, ...BOT });

  const list = [];
  for (const g of groups.values()) {
    const { x, cats, loc } = g;
    const start0 = isoLocalDate(x.event_startdate) || today;
    const ds = [...g.dates].sort();
    // 다음 회차가 있으면 그 날, 없으면(진행 중인 전시 등) 오늘
    const startDate = ds[0] || (start0 <= today ? today : start0);
    if (startDate > until) continue;
    const endDate = g.end < startDate ? startDate : g.end;
    const kind = toKind(cats, x.event_name);
    const p = gps(loc.location_gps);
    const [lat, lng] = p ? fixLatLng(p.gps_lat, p.gps_lng, city) : fixLatLng(loc.geo_lat, loc.geo_long, city);
    const img = (x.event_image || []).find(i => i.bin_id && (!i.status || i.status === 'success'));
    const credit = clip(stripTags(img?.fields?.credit || ''), 80);
    const lo = parseFloat(x.event_price_low), hi = parseFloat(x.event_price_high);
    const free = x.free_event === 'Yes' ? true : x.free_event === 'No' ? false : undefined;
    const fee = free ? 'Free' : Number.isFinite(lo) ? (Number.isFinite(hi) && hi > lo ? `$${lo}–$${hi}` : `$${lo}`) : undefined;
    const single = ds.length <= 1 && startDate === endDate;
    const web = normUrl(x.event_website), tix = normUrl(x.ticket_website);
    list.push(ev(kind, {
      id: `torontoevents-${x.submission_id || x.id}`, cityId: city.id, sourceKey: 'torontoevents', title: stripTags(x.event_name),
      genreEn: cats.filter(c => !/Family\/Children/.test(c))[0] || GENRE_EN[kind],
      place: loc.location_name || '', address: loc.location_address || undefined, lat, lng,
      startDate, endDate, startTime: single ? (isoLocalTime(x.calendar_date) || isoLocalTime(x.event_startdate) || undefined) : undefined, tz: TZ,
      time: ds.length > 1 ? `${ds.length}회 / ${ds.length} dates` : undefined,
      free, fee, feeEn: fee, price: !free && Number.isFinite(lo) && lo > 0 ? { amount: lo, currency: 'CAD' } : undefined,
      poster: img ? TO_IMG(img.bin_id) : undefined, posterCredit: img ? (credit ? `${credit} / City of Toronto` : 'City of Toronto Festivals & Events') : undefined,
      overview: clip(stripTags(x.event_description || x.short_description || ''), 900),
      homepage: web || undefined, bookingUrl: tix && tix !== web ? tix : undefined,
      sourceUrl: web || 'https://www.toronto.ca/explore-enjoy/festivals-events/festivals-events-calendar/',
      source: 'City of Toronto Festivals & Events (Open Government Licence – Toronto)',
    }));
  }
  return capList(list, +(process.env.TORONTO_MAX || 450), e => (e.poster ? 2 : 0) + (e.kind !== 'festival' ? 1 : 0) + (e.startDate <= addDaysStr(today, 45) ? 1 : 0));
}

/* ================= Montréal Événements publics (Données Québec) ================= */
const MTL_RES = '6decf611-6f11-4f34-bb36-324d804c9bad';
const MTL_DROP = ['Conseil et comité', 'Consultation publique', 'Rencontre avec personne élue', 'Soutien et échange'];
const MTL_KIND = {
  'Exposition': 'exhibition',
  'Musique': 'performance', 'Théâtre': 'performance', 'Danse': 'performance', 'Cirque': 'performance', 'Humour': 'performance', 'Cinéma': 'performance', 'Art de la parole': 'performance',
  'Fête et marché': 'festival',
  'Art et artisanat': 'workshop', 'Cuisine': 'workshop', 'Science et techno': 'workshop', 'Informatique': 'workshop', 'Langues': 'workshop',
  'Initiation à la musique': 'workshop', 'Heure du conte': 'workshop', 'Jeux': 'workshop', 'Jardinage': 'workshop', 'Bien-être': 'workshop',
  'Club de lecture et littérature': 'workshop', 'Société et histoire': 'performance', 'Sport et plein air': 'festival',
};
const MTL_ROUTINE = /^(Heure du conte|Jeux|Club de lecture et littérature|Informatique|Langues|Bien-être|Sport et plein air)$/;

async function montreal(cities, ctx) {
  const city = cities.find(c => c.id === 'montreal'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const rows = [];
  for (let off = 0; off < 20000; off += 1000) {
    const sql = `SELECT * FROM "${MTL_RES}" WHERE date_fin >= '${today}' AND date_debut <= '${until}' AND type_evenement NOT IN (${MTL_DROP.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}) ORDER BY _id LIMIT 1000 OFFSET ${off}`;
    const j = await getJson(`https://www.donneesquebec.ca/recherche/api/3/action/datastore_search_sql?${new URLSearchParams({ sql })}`, { ...BOT, timeout: 90000 });
    if (!j.success) throw new Error('Données Québec: ' + JSON.stringify(j.error || {}).slice(0, 160));
    const recs = j.result?.records || [];
    rows.push(...recs);
    if (recs.length < 1000) break;
  }
  const list = [];
  for (const x of rows) {
    const title = stripTags(nan(x.titre)); if (!title) continue;
    const type = nan(x.type_evenement);
    const kind = MTL_KIND[type] || 'festival';
    const s = nan(x.date_debut), e = nan(x.date_fin) || s;
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) continue;
    const startDate = s.slice(0, 10) < today ? today : s.slice(0, 10), endDate = e.slice(0, 10);
    const [lat, lng] = fixLatLng(nan(x.lat), nan(x.long), city);
    const cost = nan(x.cout);
    const free = /^gratuit/i.test(cost) ? true : cost ? false : undefined;
    const url = normUrl(nan(x.url_fiche));
    const place = nan(x.titre_adresse) || nan(x.emplacement);
    list.push(ev(kind, {
      id: `montreal-${(url.match(/-(\d+)\/?$/) || [])[1] || x._id}`, cityId: city.id, sourceKey: 'montreal', title,
      genreEn: type || GENRE_EN[kind], genre: GENRE_KO[kind],
      place: place && !/^À l'(extérieur|intérieur)$/i.test(place) ? place : nan(x.arrondissement),
      address: [nan(x.adresse_principale), nan(x.code_postal) ? `Montréal ${nan(x.code_postal)}` : 'Montréal'].filter(Boolean).join(', '),
      lat, lng, startDate, endDate, tz: TZ,
      free, fee: cost || undefined, feeEn: free ? 'Free' : undefined,
      time: [nan(x.public_cible), nan(x.inscription)].filter(Boolean).join(' · ') || undefined,
      overview: clip(stripTags(nan(x.description)), 900),
      sourceUrl: url || 'https://montreal.ca/evenements', _type: type,
      source: 'Ville de Montréal – Événements publics (Données Québec, CC BY 4.0)',
    }));
  }
  // 같은 행사가 날짜별 행으로 나뉜 경우 병합 (제목+장소)
  const merged = new Map();
  for (const e of list) {
    const k = `${e.title}|${e.address}`;
    const cur = merged.get(k);
    if (!cur) { merged.set(k, { ...e, _n: 1 }); continue; }
    cur._n++; if (e.startDate < cur.startDate) cur.startDate = e.startDate; if (e.endDate > cur.endDate) cur.endDate = e.endDate;
  }
  const out = [...merged.values()].map(e => { if (e._n > 1) e.time = [`${e._n}회 / ${e._n} dates`, e.time].filter(Boolean).join(' · '); delete e._n; return e; });
  // 이야기 시간·게임·독서 모임 등 일상 프로그램은 상한, 공연·전시·축제 우선 (og:image 요청량도 상한)
  const routine = capList(out.filter(e => MTL_ROUTINE.test(e._type)), +(process.env.MTL_ROUTINE_MAX || 60), e => (e.startDate <= addDaysStr(today, 21) ? 1 : 0));
  const main = out.filter(e => !MTL_ROUTINE.test(e._type));
  return capList([...main, ...routine], +(process.env.MONTREAL_MAX || 500),
    e => (e.kind === 'exhibition' || e.kind === 'performance' || e.kind === 'festival' ? 2 : 0) + (MTL_ROUTINE.test(e._type) ? -2 : 0) + (e.startDate <= addDaysStr(today, 30) ? 1 : 0))
    .map(e => { delete e._type; return e; });
}

/* ================= Toronto Public Library (보조) ================= */
const TPL_URL = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/fb343332-03cd-40b9-a1c8-c03a4a85ca1e/resource/aa5e1425-77f4-4cb4-a8ea-eb5ce7d4f34c/download/tpl-events-feed.json';
const TPL_BRANCHES = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/datastore/dump/7420a950-e62b-41da-826c-32d31c46e8f8?format=json';
const TPL_KEEP = /Culture|Arts & Entertainment|Science & Engineering|Author Talks|Nature & the Environment|History & Genealogy|Exhibits|Library Visits & Tours|Crafts & Hobbies|Audio & Visual|3D Printing|Fabrication|Coding & Robotics/;
const TPL_DROP_TITLE = /story ?time|baby|toddler|homework|after ?school|tech help|computer|esl|conversation circle|citizenship|tax clinic|resume|job|chess|book club|knit|cancel/i;
function tplKind(types, title) {
  if (/Exhibits/.test(types) || /exhibit/i.test(title)) return 'exhibition';
  if (/Library Visits & Tours/.test(types) || /\btour\b/i.test(title)) return 'tour';
  if (/Author Talks|Audio & Visual/.test(types) || /concert|performance|film|screening|lecture|talk\b/i.test(title)) return 'performance';
  return 'workshop';
}
async function tpl(cities, ctx) {
  const city = cities.find(c => c.id === 'toronto'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const [rows, br] = await Promise.all([getJson(TPL_URL, { ...BOT, timeout: 90000 }), getJson(TPL_BRANCHES, { ...BOT, timeout: 60000 })]);
  const f = (br.fields || []).map(x => x.id);
  const idx = n => f.indexOf(n);
  const branches = new Map();
  for (const r of br.records || []) {
    const rec = Array.isArray(r) ? Object.fromEntries(f.map((k, i) => [k, r[i]])) : r;
    if (rec.BranchName) branches.set(String(rec.BranchName).trim().toLowerCase(), rec);
  }
  if (idx('Lat') < 0 && !(br.records?.[0]?.Lat)) throw new Error('TPL 분관 좌표 필드 없음');
  // 같은 이미지를 여러 프로그램이 쓰면 분류 배너(아이콘) → 버린다
  const imgTitles = new Map();
  for (const x of rows) { const u = x.FeaturedImageUrl; if (!u) continue; if (!imgTitles.has(u)) imgTitles.set(u, new Set()); imgTitles.get(u).add(x.Title); }
  const list = [];
  for (const x of Array.isArray(rows) ? rows : []) {
    if (x.Status !== 'ACTIVE') continue;
    const title = stripTags(x.Title || ''); if (!title || TPL_DROP_TITLE.test(title)) continue;
    const types = String(x.EventTypes || '');
    if (!TPL_KEEP.test(types)) continue;
    const startDate = x.StartDateLocal || isoLocalDate(x.StartTime);
    if (!startDate || startDate < today || startDate > until) continue;
    const loc = String(x.LocationName || '').replace(/\s*-\s*Closed$/i, '').trim();
    if (!loc || loc === 'None' || /closed/i.test(x.LocationName || '')) continue;
    const b = branches.get(loc.toLowerCase());
    const [lat, lng] = b ? fixLatLng(b.Lat, b.Long, city) : [null, null];
    const u = x.FeaturedImageUrl;
    const ownImg = u && !/TPLIcon/i.test(u) && (imgTitles.get(u)?.size || 0) <= 2 ? u : '';
    const kind = tplKind(types, title);
    list.push(ev(kind, {
      id: `tpl-${x.EventID}`, cityId: city.id, sourceKey: 'tpl', title,
      genreEn: clip(types.split(',')[0].trim(), 60) || GENRE_EN[kind],
      place: /library/i.test(loc) ? loc : `${loc} Library`, placeEn: /library/i.test(loc) ? loc : `${loc} Library`,
      address: b?.Address || undefined, lat, lng,
      startDate, endDate: isoLocalDate(x.EndTime) || startDate, startTime: isoLocalTime(x.StartTime) || undefined, tz: TZ,
      free: true, fee: 'Free', feeEn: 'Free',
      time: x.Audiences ? clip(x.Audiences, 80) : undefined,
      poster: ownImg || undefined, posterCredit: ownImg ? 'Toronto Public Library' : undefined,
      homepage: normUrl(b?.Website) || undefined,
      sourceUrl: `https://tpl.bibliocommons.com/events/${x.EventID}`,
      _noOg: true, // 행사 페이지는 봇 요청에 202(챌린지) → og:image 대신 분관 사진(대체 체인)
      source: 'Toronto Public Library programs (City of Toronto Open Data, OGL – Toronto)',
    }));
  }
  // 회차 병합(제목+분관), 사진·문화·과학 우선, 상한
  const m = new Map();
  for (const e of list) {
    const k = `${e.title}|${e.place}`; const cur = m.get(k);
    if (!cur) { m.set(k, { ...e, _n: 1 }); continue; }
    cur._n++; if (e.startDate < cur.startDate) { cur.startDate = e.startDate; cur.startTime = e.startTime; cur.id = e.id; cur.sourceUrl = e.sourceUrl; }
    if (e.endDate > cur.endDate) cur.endDate = e.endDate; if (!cur.poster && e.poster) { cur.poster = e.poster; cur.posterCredit = e.posterCredit; }
  }
  const merged = [...m.values()].map(e => { if (e._n > 1) { e.time = [`${e._n}회 / ${e._n} dates`, e.time].filter(Boolean).join(' · '); delete e.startTime; } delete e._n; return e; });
  return capList(merged, +(process.env.TPL_MAX || 200), e => (e.poster ? 3 : 0) + (/Culture|Arts|Science|Author|Nature|History|Exhibits/.test(e.genreEn) ? 1 : 0) + (e.startDate <= addDaysStr(today, 30) ? 1 : 0));
}

/* ================= 모듈 진입점 ================= */
export const SOURCES = [
  { key: 'torontoevents', name: 'City of Toronto Festivals & Events', fn: torontoEvents, cities: ['toronto'], licence: 'Open Government Licence – Toronto (attribution: "Contains information licensed under the Open Government Licence – Toronto")', url: 'https://open.toronto.ca/dataset/festivals-events/' },
  { key: 'montreal', name: 'Ville de Montréal – Événements publics (Données Québec)', fn: montreal, cities: ['montreal'], licence: 'CC BY 4.0 (Ville de Montréal)', url: 'https://www.donneesquebec.ca/recherche/dataset/vmtl-evenements-publics' },
  { key: 'tpl', name: 'Toronto Public Library Programs & Events', fn: tpl, cities: ['toronto'], licence: 'Open Government Licence – Toronto', url: 'https://open.toronto.ca/dataset/library-branch-programs-and-events-feed/' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx);
}
