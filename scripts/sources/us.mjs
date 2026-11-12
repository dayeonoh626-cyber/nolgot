// 미국 소스 모듈 — 키 없는 공식 오픈데이터 (Ticketmaster·Viator 등 키 소스는 generic.mjs).
//   Smithsonian (Trumba 공개 캘린더)        워싱턴 DC (+ 뉴욕 NMAI Heye Center). 이미지 거의 전 건. 개방 라이선스 아님(출처·링크 표기)
//   SF Our415 (data.sfgov.org 8i3s-ih2a)    샌프란시스코 공공도서관·레크파크 행사. PDDL. 레크파크 사진은 기관 로고라 쓰지 않음
//   NYC Parks 이벤트 피드                   뉴욕 시립공원 행사(14일치). 운동·자원봉사 제외. NYC Open Data 약관
//   Chicago Public Library (vsdy-d8k7)      시카고 공공도서관 행사. 이미지 없음(행사 페이지 og:image)
//   Chicago Park District (tn7v-6rnw)       공원국 '행사' + 공개 강좌 일부(workshop, 상한)
//   NPS Events API (선택, NPS_API_KEY)      국립공원청 행사 — 키가 없으면 꺼짐
import { getJson, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, fixLatLng, kindEu, GENRE_KO, GENRE_EN, mergeOccurrences, BOT, isoLocalDate, isoLocalTime } from '../lib/util.mjs';
import { runSources, capList } from '../lib/sources.mjs';
import { trumba, field, fieldHref } from './trumba.mjs';

const soqlDate = s => String(s || '').slice(0, 10);
const hhmm = s => { const m = String(s || '').match(/^(\d{2}):(\d{2})/); return m && m[0] !== '00:00' ? `${m[1]}:${m[2]}` : undefined; };
const ampm = s => { // "3:30 pm" → 15:30
  const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i); if (!m) return undefined;
  let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; return `${String(h).padStart(2, '0')}:${m[2]}`;
};
const ev = (kind, o) => ({ kind, genre: GENRE_KO[kind], genreEn: GENRE_EN[kind], ...o });

/* ================= Smithsonian (Trumba) ================= */
// 피드에 좌표가 없어 박물관 이름 → 좌표 표(공개 주소 기준). 순서 중요(구체적인 것 먼저).
const SI_VENUES = [
  [/American Indian Museum NY|Heye Center|George Gustav Heye/i, 'newyork', 'National Museum of the American Indian – New York', 40.7041, -74.0137],
  [/Cooper Hewitt/i, 'newyork', 'Cooper Hewitt, Smithsonian Design Museum', 40.7843, -73.9578],
  [/Udvar-Hazy/i, 'washingtondc', 'Steven F. Udvar-Hazy Center', 38.9111, -77.4440],
  [/Air and Space/i, 'washingtondc', 'National Air and Space Museum', 38.8882, -77.0199],
  [/American Indian/i, 'washingtondc', 'National Museum of the American Indian', 38.8882, -77.0164],
  [/African American History/i, 'washingtondc', 'National Museum of African American History and Culture', 38.8910, -77.0326],
  [/American History|Latino/i, 'washingtondc', 'National Museum of American History', 38.8913, -77.0300],
  [/Natural History/i, 'washingtondc', 'National Museum of Natural History', 38.8913, -77.0261],
  [/Postal Museum/i, 'washingtondc', 'National Postal Museum', 38.8983, -77.0080],
  [/Asian Art|Freer|Sackler/i, 'washingtondc', 'National Museum of Asian Art', 38.8879, -77.0273],
  [/African Art/i, 'washingtondc', 'National Museum of African Art', 38.8879, -77.0255],
  [/National Zoo|Zoo/i, 'washingtondc', "Smithsonian's National Zoo", 38.9296, -77.0498],
  [/Anacostia/i, 'washingtondc', 'Anacostia Community Museum', 38.8566, -76.9767],
  [/Ripley Center/i, 'washingtondc', 'S. Dillon Ripley Center', 38.8882, -77.0287],
  [/Renwick/i, 'washingtondc', 'Renwick Gallery', 38.8987, -77.0390],
  [/Portrait Gallery|American Art Museum/i, 'washingtondc', 'Smithsonian American Art Museum & National Portrait Gallery', 38.8977, -77.0230],
  [/Hirshhorn/i, 'washingtondc', 'Hirshhorn Museum and Sculpture Garden', 38.8881, -77.0230],
  [/Castle|Arts and Industries/i, 'washingtondc', 'Smithsonian Castle', 38.8888, -77.0260],
  [/National Mall/i, 'washingtondc', 'National Mall', 38.8895, -77.0230],
];
function siKind(cats, title) {
  if (/\bexhibition$/i.test(title)) return 'exhibition';
  if (/Tours/i.test(cats) || /\btour\b/i.test(title)) return 'tour';
  if (/Workshops|Demonstrations|Culinary/i.test(cats)) return 'workshop';
  if (/Performances?|Films|Lectures/i.test(cats)) return 'performance';
  if (/Celebrations|After Five/i.test(cats)) return 'festival';
  return kindEu(title, /Kids/i.test(cats) ? 'workshop' : 'festival');
}
async function smithsonian(cities, ctx) {
  const ids = new Set(cities.map(c => c.id));
  const list = await trumba('smithsonian-events', {
    tz: 'America/New_York', daysAhead: ctx.daysAhead, map: x => {
      if (x.locationType === 'Online') return null;
      const venue = field(x, 'Venue'), sponsor = field(x, 'Sponsor'), loc = field(x, 'Event Location');
      if (/^(online|zoom)\b|presented on zoom/i.test(loc) && !venue) return null;
      // 순회 전시 등 다른 주(州)에서 열리는 행사 제외 (주소에 'XX 12345' 형식 + DC·MD·VA·NY 아님)
      const st = (loc.match(/,\s*([A-Z]{2})\s+\d{5}\b/) || [])[1];
      if (st && !['DC', 'MD', 'VA', 'NY'].includes(st)) return null;
      const v = SI_VENUES.find(([re]) => re.test(venue)) || SI_VENUES.find(([re]) => re.test(`${sponsor} ${loc}`));
      if (!v || !ids.has(v[1])) return null;
      const cats = field(x, 'Categories'), cost = field(x, 'Cost');
      const kind = siKind(cats, x.title);
      return ev(kind, {
        id: `si-${x.seriesID || x.eventID}`, cityId: v[1], sourceKey: 'smithsonian', title: stripTags(x.title),
        genreEn: cats ? clip(cats.split(',')[0], 60) : GENRE_EN[kind],
        place: v[2], address: clip(loc, 160) || undefined, lat: v[3], lng: v[4],
        fee: clip(stripTags(cost), 160) || undefined, free: /^free/i.test(cost.trim()) || undefined,
        bookingUrl: fieldHref(x, 'Get Tickets/Register'),
        posterCredit: x.eventImage?.url ? 'Smithsonian' : undefined,
        source: 'Smithsonian Institution events (Trumba)',
      });
    },
  });
  // 상한: 이미지·가까운 날짜 우선, 도시별
  const out = [];
  for (const id of ids) out.push(...capList(list.filter(e => e.cityId === id), +(process.env.SI_MAX || 400), e => (e.poster ? 2 : 0) + (e.kind !== 'workshop' ? 1 : 0)));
  return out;
}

/* ================= SF Our415 ================= */
const SF_KEEP_REC = /\b(art|arts|craft|ceramic|pottery|paint|draw|dance|ballet|hula|music|guitar|piano|drum|choir|sing|theat|nature|garden|hike|hiking|walk|bird|tour|festival|photograph|film|cooking|archery|tai chi|yoga)\b/i;
const SF_DROP = /^(drop-in:|level \d|open swim|lap swim|swim|tutorial:|esl|citizenship|job|resume|tax)/i;
async function our415(cities, ctx) {
  const city = cities.find(c => c.id === 'sanfrancisco'); if (!city) return [];
  const today = todayIn(city.tz), until = addDaysStr(today, ctx.daysAhead);
  const q = new URLSearchParams({ $where: `event_end_date >= '${today}' AND event_start_date <= '${until}T23:59:59'`, $limit: '5000', $order: 'event_start_date' });
  const rows = await getJson(`https://data.sfgov.org/resource/8i3s-ih2a.json?${q}`, { ...BOT, timeout: 90000 });
  const list = [];
  for (const x of rows) {
    const title = stripTags(x.event_name || ''); if (!title || SF_DROP.test(title)) continue;
    const rec = /rec ?park/i.test(x.org_name || '');
    if (rec && !SF_KEEP_REC.test(`${title} ${x.event_description || ''}`.slice(0, 300))) continue; // 레크파크는 문화·자연 강좌만
    const startDate = soqlDate(x.event_start_date), endDate = soqlDate(x.event_end_date) || startDate;
    if (!startDate || endDate < today) continue;
    const kind = kindEu(`${title} ${x.events_category || ''}`, 'workshop');
    const [lat, lng] = fixLatLng(x.latitude, x.longitude, city);
    const photo = httpsUrl(x.event_photo?.url);
    const goodPhoto = photo && !/logo/i.test(photo) ? photo.replace(/([^:])\/\/+/g, '$1/') : '';
    list.push(ev(kind, {
      id: `our415-${x.id}`, cityId: city.id, sourceKey: 'our415', title,
      place: x.site_location_name || '', address: [x.site_address, 'San Francisco, CA'].filter(Boolean).join(', '), lat, lng,
      startDate: startDate < today ? today : startDate, endDate, startTime: hhmm(x.start_time), tz: city.tz,
      time: startDate !== endDate && x.days_of_week ? `${x.days_of_week} ${hhmm(x.start_time) || ''}`.trim() : undefined,
      free: x.fee === false ? true : x.fee === true ? false : undefined, fee: x.fee === false ? 'Free' : undefined, feeEn: x.fee === false ? 'Free' : undefined,
      poster: goodPhoto || undefined, posterCredit: goodPhoto ? (x.org_name || 'SF Public Library') : undefined,
      overview: clip(stripTags(x.event_description || ''), 900),
      homepage: normUrl(x.more_info) || undefined, sourceUrl: normUrl(x.more_info) || 'https://data.sfgov.org/d/8i3s-ih2a',
      source: `Our415 – ${x.org_name || 'City of San Francisco'} (DataSF, PDDL)`,
    }));
  }
  const merged = mergeOccurrences(list, e => `${e.title}|${e.place}`);
  return capList(merged, +(process.env.OUR415_MAX || 450), e => (e.poster ? 2 : 0) + (/storytime/i.test(e.title) ? -2 : 0) + (e.startDate <= addDaysStr(today, 30) ? 1 : 0));
}

/* ================= NYC Parks ================= */
const NYC_DROP = /^(Fitness|Exercise Classes|Shape Up NYC|Outdoor Fitness|Volunteer|It's My Park|Community Input Meetings|Recreation Center Programming|Running\/Jogging|Swimming\/Aquatics|Sports|Football|Fishing|Yoga & Pilates Classes|Virtual\/Online Events)$/;
const NYC_KEEP = /^(Tours|Art|Arts & Crafts|History|Nature|Education|Theater|Dance|Talks|Wildlife|Urban Park Rangers|Best for Kids|Waterfront|Gardening|Workshops|STEM Classes|Food|Arts, Culture & Fun Series|Hiking|Walking|Games)$/;
function nycKind(cats, title) {
  if (cats.some(c => /^(Tours|Walking|Hiking|Urban Park Rangers)$/.test(c)) || /\btour\b|walk\b/i.test(title)) return 'tour';
  if (cats.some(c => /^(Theater|Talks|Arts, Culture & Fun Series)$/.test(c))) return 'performance';
  if (cats.includes('Dance') && !cats.includes('Dance Classes')) return 'performance';
  if (cats.some(c => /^(Art|Arts & Crafts|Workshops|Education|STEM Classes|Gardening|Dance Classes)$/.test(c))) return 'workshop';
  return kindEu(title, 'festival');
}
async function nycparks(cities, ctx) {
  const city = cities.find(c => c.id === 'newyork'); if (!city) return [];
  const today = todayIn(city.tz);
  const rows = await getJson('https://www.nycgovparks.org/xml/events_300_rss.json', { ...BOT, timeout: 90000 });
  const list = [];
  for (const x of Array.isArray(rows) ? rows : []) {
    const title = stripTags(x.title || '');
    if (!title || /^cancel+ed\b/i.test(title)) continue;
    const cats = String(x.categories || '').split('|').map(s => s.trim()).filter(Boolean);
    if (!cats.some(c => NYC_KEEP.test(c)) && (cats.some(c => NYC_DROP.test(c)) || !cats.length)) continue;
    if (cats.every(c => NYC_DROP.test(c) || c === 'Seniors' || c === 'Accessible Activities')) continue;
    const startDate = x.startdate, endDate = x.enddate || x.startdate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || '') || endDate < today) continue;
    const [la, ln] = String(x.coordinates || '').split(',');
    const [lat, lng] = fixLatLng(la, ln, city);
    const kind = nycKind(cats, title);
    const link = normUrl(x.link);
    const img = httpsUrl(x.image);
    list.push(ev(kind, {
      id: `nycparks-${x.guid || link}`, cityId: city.id, sourceKey: 'nycparks', title,
      genreEn: cats.filter(c => NYC_KEEP.test(c))[0] || GENRE_EN[kind],
      place: x.location || x.parknames || '', address: x.parknames ? `${x.parknames}, New York, NY` : undefined, lat, lng,
      startDate, endDate, startTime: ampm(x.starttime), tz: city.tz,
      time: x.starttime && x.endtime ? `${x.starttime} – ${x.endtime}` : undefined,
      poster: img || undefined, posterCredit: img ? 'NYC Parks' : undefined,
      overview: clip(stripTags(x.description || ''), 900),
      bookingUrl: normUrl(x.registration_url) || undefined, sourceUrl: link || 'https://www.nycgovparks.org/events',
      source: 'NYC Parks events (NYC Open Data)',
    }));
  }
  return capList(mergeOccurrences(list, e => `${e.title}|${e.place}`), +(process.env.NYCPARKS_MAX || 400), e => (e.poster ? 2 : 0) + (e.kind === 'tour' ? 1 : 0));
}

/* ================= Chicago Public Library ================= */
async function chipublib(cities, ctx) {
  const city = cities.find(c => c.id === 'chicago'); if (!city) return [];
  const today = todayIn(city.tz), until = addDaysStr(today, ctx.daysAhead);
  const q = new URLSearchParams({ $where: `start >= '${today}' AND start <= '${until}T23:59:59' AND cancelled = false`, $order: 'start', $limit: '5000' });
  const rows = await getJson(`https://data.cityofchicago.org/resource/vsdy-d8k7.json?${q}`, { ...BOT, timeout: 90000 });
  const list = [];
  for (const x of rows) {
    const title = stripTags(x.title || ''); if (!title) continue;
    if (/virtual|online/i.test(x.location_name || '') || /^(virtual|online)\b/i.test(title)) continue;
    const startDate = isoLocalDate(x.start), endDate = isoLocalDate(x.end) || startDate;
    if (!startDate) continue;
    const types = String(x.event_types || '');
    // event_types 는 도서관 분류(공예·스토리타임·영화 상영 등) → 직접 매핑 (영어 키워드 분류기는 'Play'·'Talk' 때문에 공연으로 오분류)
    const kind = /Exhibit/i.test(types) ? 'exhibition' : /\btours?\b/i.test(title) ? 'tour'
      : /Film Screenings|Art, Music and Performances|Author Events|Lectures/i.test(types) ? 'performance'
      : /Celebrations/i.test(types) ? 'festival' : 'workshop';
    const c = x.location?.coordinates;
    const [lat, lng] = c ? fixLatLng(c[1], c[0], city) : [null, null];
    const page = normUrl(x.event_page?.url);
    list.push(ev(kind, {
      id: `cpl-${x.event_id}`, cityId: city.id, sourceKey: 'chipublib', title,
      genreEn: clip(types.split('|')[0].trim(), 60) || GENRE_EN[kind],
      place: x.location_name ? `${x.location_name} (Chicago Public Library)` : 'Chicago Public Library',
      address: [x.location_address, 'Chicago, IL', x.location_zip].filter(Boolean).join(', '), lat, lng,
      startDate, endDate, startTime: isoLocalTime(x.start) || undefined, tz: city.tz,
      free: true, fee: 'Free', feeEn: 'Free',
      overview: clip(stripTags(x.description || ''), 900),
      sourceUrl: page || 'https://www.chipublib.org/events/', source: 'Chicago Public Library events (Chicago Data Portal)',
    }));
  }
  const merged = mergeOccurrences(list, e => `${e.title}|${e.place}`);
  const routine = /story ?time|book club|baby|toddler|homework|tech help|computer|esl|english conversation|citizenship|tax|resume|job/i;
  return capList(merged, +(process.env.CPL_MAX || 350), e => (routine.test(e.title) ? -3 : 0) + (e.startDate <= addDaysStr(today, 30) ? 1 : 0));
}

/* ================= Chicago Park District ================= */
const CPD_DROP_EVENT = /Out of School|Community Meetings|Permit|Volunteer|Internal Staff/i;
// 강좌(Program)는 '공개 + 날짜 있는' 문화·교양 강좌만 workshop 으로 (스포츠·캠프·방과후 제외)
const CPD_PROGRAM_CAT = /^(Dance|Educational\/Self-Help|Yoga|Fun & Games|Clubs|Culture and Arts|Arts|Visual Arts|Music|Theater|Drama|Nature|Cooking|Crafts|Photography|Ceramics|Gardening)/i;
function cpdKind(cat, title) {
  if (/Theater|Music|Dance/i.test(cat) && !/class|lesson/i.test(title)) return 'performance';
  if (/Art Exhibit/i.test(cat)) return 'exhibition';
  if (/Art Making|Wellness/i.test(cat)) return 'workshop';
  if (/Nature/i.test(cat)) return kindEu(title, 'tour');
  return kindEu(title, 'festival');
}
async function chiparks(cities, ctx) {
  const city = cities.find(c => c.id === 'chicago'); if (!city) return [];
  const today = todayIn(city.tz), until = addDaysStr(today, ctx.daysAhead);
  const base = 'https://data.cityofchicago.org/resource/tn7v-6rnw.json?';
  const [events, programs] = await Promise.all([
    getJson(base + new URLSearchParams({ $where: `type = 'Event' AND end_date >= '${today}' AND start_date <= '${until}T23:59:59'`, $limit: '2000' }), { ...BOT, timeout: 90000 }),
    getJson(base + new URLSearchParams({ $where: `type = 'Program' AND activity_type = 'Instruction' AND start_date >= '${today}' AND start_date <= '${until}T23:59:59'`, $limit: '3000' }), { ...BOT, timeout: 90000 }),
  ]);
  const toEv = (x, kind, prog) => {
    const [lat, lng] = fixLatLng(x.latitude, x.longitude, city);
    const img = httpsUrl(x.image_link?.url || x.image_link);
    const info = normUrl(x.information_link?.url);
    return ev(kind, {
      id: `cpd-${x.activity_id}`, cityId: city.id, sourceKey: 'chiparks', title: stripTags(x.title),
      genreEn: clip(String(x.category || '').split(',')[0].replace(/&amp;/g, '&'), 60) || GENRE_EN[kind],
      place: x.location_facility || '', address: [x.address, 'Chicago, IL', x.zip].filter(Boolean).join(', '), lat, lng,
      startDate: isoLocalDate(x.start_date), endDate: isoLocalDate(x.end_date) || isoLocalDate(x.start_date),
      startTime: prog ? undefined : isoLocalTime(x.start_date) || undefined, tz: city.tz,
      time: prog ? clip(x.date_notes || '', 160) : undefined,
      fee: x.fee != null ? (+x.fee ? `$${x.fee}` : 'Free') : undefined, free: x.fee != null ? !+x.fee : undefined,
      poster: img || undefined, posterCredit: img ? 'Chicago Park District' : undefined,
      overview: clip(stripTags(x.description || ''), 900) || undefined,
      bookingUrl: normUrl(x.registration_link?.url) || undefined,
      sourceUrl: info || 'https://www.chicagoparkdistrict.com/events', source: 'Chicago Park District (Chicago Data Portal)',
    });
  };
  const evs = events.filter(x => x.event_cancelled !== 'Y' && !CPD_DROP_EVENT.test(x.category || '') && x.title)
    .map(x => toEv(x, cpdKind(String(x.category || ''), x.title), false)).filter(e => e.startDate);
  const progs = programs.filter(x => CPD_PROGRAM_CAT.test(String(x.category || '').replace(/&amp;/g, '&')) && x.title && x.event_cancelled !== 'Y')
    .map(x => toEv(x, 'workshop', true)).filter(e => e.startDate);
  const mergedEv = mergeOccurrences(evs, e => `${e.title}|${e.place}`);
  const mergedProg = capList(mergeOccurrences(progs, e => `${e.title}|${e.place}`), +(process.env.CPD_PROGRAM_MAX || 40), e => (e.startDate <= addDaysStr(today, 30) ? 1 : 0));
  return [...capList(mergedEv, +(process.env.CPD_MAX || 250), e => (/Sports/i.test(e.genreEn) ? -1 : 0)), ...mergedProg];
}

/* ================= NPS Events API (선택 키) ================= */
const NPS_PARKS = {
  newyork: 'stli,gate,afbg,fedh,cacl,hagr', washingtondc: 'nama,whho,linc,wamo,frde,mlkm', boston: 'bost,bohf,frla',
  sanfrancisco: 'goga,safr,muwo,alca', neworleans: 'jazz,jela', chicago: 'pull', seattle: 'klse', losangeles: 'samo', miami: 'bica,ever', austin: 'lyjo',
};
async function nps(cities, ctx) {
  const key = process.env.NPS_API_KEY.trim();
  const out = [];
  for (const city of cities.filter(c => NPS_PARKS[c.id])) {
    const today = todayIn(city.tz), until = addDaysStr(today, ctx.daysAhead);
    const seen = new Map();
    for (let page = 1; page <= 10; page++) {
      const j = await getJson(`https://developer.nps.gov/api/v1/events?${new URLSearchParams({ parkCode: NPS_PARKS[city.id], dateStart: today, dateEnd: until, pageSize: '50', pageNumber: String(page), api_key: key })}`, { ...BOT, timeout: 30000 });
      const data = j.data || [];
      for (const x of data) {
        const dates = (x.dates || []).filter(d => d >= today && d <= until).sort();
        if (!dates.length) continue;
        const k = x.eventid || x.id;
        const cur = seen.get(k);
        if (cur) { cur.dates.push(...dates); continue; }
        seen.set(k, { x, dates: [...dates] });
      }
      if (!data.length || page * 50 >= +(j.total || 0)) break;
    }
    for (const { x, dates } of seen.values()) {
      const ds = [...new Set(dates)].sort();
      const img = x.images?.[0];
      const imgUrl = img?.url ? httpsUrl(img.url, 'https://www.nps.gov') : '';
      const [lat, lng] = fixLatLng(x.latitude, x.longitude, city);
      const t = x.times?.[0];
      // 레인저 해설·산책은 '가이드 투어' (영어 분류기는 'talk'를 공연으로 본다)
      const kind = /ranger|talk|walk|hike|tour|program|guided/i.test(x.title) ? 'tour' : kindEu(`${x.title} ${(x.types || []).join(' ')}`, 'festival');
      out.push(ev(kind, {
        id: `nps-${x.eventid || x.id}`, cityId: city.id, sourceKey: 'nps', title: stripTags(x.title),
        place: x.location || x.parkfullname || '', placeEn: x.parkfullname || undefined, lat, lng,
        startDate: ds[0], endDate: ds.at(-1), startTime: ds.length === 1 ? ampm(t?.timestart) : undefined, tz: city.tz,
        time: ds.length > 1 ? `${ds.length}회 / ${ds.length} dates${t ? ` · ${t.timestart}–${t.timeend}` : ''}` : (t ? `${t.timestart} – ${t.timeend}` : undefined),
        free: x.isfree === 'true' ? true : undefined, fee: x.isfree === 'true' ? 'Free' : clip(stripTags(x.feeinfo || ''), 160) || undefined,
        poster: imgUrl || undefined, posterCredit: imgUrl ? clip(img.credit || 'NPS', 100) : undefined,
        overview: clip(stripTags(x.description || ''), 900),
        bookingUrl: normUrl(x.regresurl) || undefined, homepage: normUrl(x.infourl) || undefined,
        sourceUrl: `https://www.nps.gov/planyourvisit/event-details.htm?id=${x.id}`, source: `National Park Service – ${x.parkfullname || 'NPS'}`,
      }));
    }
  }
  return out;
}

/* ================= 모듈 진입점 ================= */
export const SOURCES = [
  { key: 'smithsonian', name: 'Smithsonian events (Trumba)', fn: smithsonian, cities: ['washingtondc', 'newyork'], licence: 'Smithsonian website terms of use — not an open licence; non-commercial-friendly, credit + link back to si.edu', url: 'https://www.si.edu/events' },
  { key: 'our415', name: 'Our415 Events and Activities (DataSF)', fn: our415, cities: ['sanfrancisco'], licence: 'ODC Public Domain Dedication and Licence (PDDL)', url: 'https://data.sfgov.org/d/8i3s-ih2a' },
  { key: 'nycparks', name: 'NYC Parks Events', fn: nycparks, cities: ['newyork'], licence: 'NYC Open Data Terms of Use', url: 'https://data.cityofnewyork.us/d/w3wp-dpdi' },
  { key: 'chipublib', name: 'Chicago Public Library Events', fn: chipublib, cities: ['chicago'], licence: 'City of Chicago Data Portal Terms of Use', url: 'https://data.cityofchicago.org/d/vsdy-d8k7' },
  { key: 'chiparks', name: 'Chicago Park District Activities', fn: chiparks, cities: ['chicago'], licence: 'City of Chicago Data Portal Terms of Use', url: 'https://data.cityofchicago.org/d/tn7v-6rnw' },
  { key: 'nps', name: 'National Park Service Events API', fn: nps, requires: 'NPS_API_KEY', cities: Object.keys(NPS_PARKS), licence: 'NPS API (api.data.gov) — data public domain; images credited per item (NPS photos are US federal public domain)', url: 'https://www.nps.gov/subjects/developer/api-documentation.htm' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx);
}
