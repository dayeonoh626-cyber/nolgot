// 스페인 소스 모듈 — 모두 키 없이 쓰는 공식 오픈데이터.
//   Madrid — Agenda de actividades y eventos (próximos 100 días)   datos.madrid.es JSON-LD, 좌표·무료여부·가격 (이미지 없음)
//   Barcelona — Agenda cultural (Ajuntament)                        165 MB JSON 배열 → 스트리밍 파싱. 사진·좌표. CC BY 4.0
//   Generalitat Valenciana — Agenda cultural del IVC                 CSV(;) → 발렌시아. CC BY
//   Junta de Andalucía — Agenda de eventos                           JSON → 세비야. 사진. CC BY 4.0
import { getText, getJson, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, fixLatLng, kindEu, GENRE_KO, GENRE_EN, dmyDate, km } from '../lib/util.mjs';
import { runSources, capList } from '../lib/sources.mjs';
import { streamJsonArray, streamCsv } from '../lib/stream.mjs';

const TZ = 'Europe/Madrid';
const isFreeEs = s => /gratu[ií]t|entrada (libre|lliure)|free|lliure/i.test(s || '') && !/\d+([.,]\d+)?\s*(€|eur)/i.test(s || '');

/* ================= Madrid ================= */
const MAD_KIND = [
  [/EnLinea/, null],
  [/Exposiciones/, 'exhibition', '전시', 'Exhibition'],
  [/CursosTalleres|ClubesLectura|Campamentos|ActividadesEscolares/, 'workshop', '강좌·워크숍', 'Course & workshop'],
  [/ExcursionesItinerariosVisitas|Itinerarios/, 'tour', '투어·탐방', 'Tour & walk'],
  [/Musica|Flamenco|Zarzuela/, 'performance', '음악', 'Music'],
  [/TeatroPerformance|ComediaMonologo/, 'performance', '연극', 'Theatre'],
  [/DanzaBaile/, 'performance', '무용', 'Dance'],
  [/CineActividadesAudiovisuales/, 'performance', '영화', 'Film'],
  [/CircoMagia/, 'performance', '서커스·마술', 'Circus & magic'],
  [/CuentacuentosTiteresMarionetas/, 'performance', '어린이 공연', 'Storytelling & puppets'],
  [/ConferenciasColoquios|RecitalesPresentacionesActosLiterarios/, 'performance', '강연·낭독', 'Talk & reading'],
  [/Festivales|FiestasNavidadesReyes|Ferias/, 'festival', '축제', 'Festival'],
];
async function madrid(cities, ctx) {
  const city = cities.find(c => c.id === 'madrid'); if (!city) return [];
  // 원본 JSON에 이스케이프되지 않은 제어문자가 섞여 있어 파싱 전에 제거
  const raw = await getText('https://datos.madrid.es/egob/catalogo/206974-0-agenda-eventos-culturales-100.json', { timeout: 60000, accept: 'application/json' });
  const j = JSON.parse(raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').replace(/[\r\n\t]/g, ' '));
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const out = [];
  for (const x of j['@graph'] || []) {
    const type = String(x['@type'] || '');
    const m = MAD_KIND.find(([re]) => re.test(type));
    if (m && m[1] === null) continue;
    const title = stripTags(x.title); if (!title) continue;
    const kind = m ? m[1] : kindEu(title, 'festival');
    const startDate = String(x.dtstart || '').slice(0, 10), endDate = String(x.dtend || '').slice(0, 10) || startDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || endDate < today || startDate > until) continue;
    const [lat, lng] = fixLatLng(x.location?.latitude, x.location?.longitude, city);
    const ad = x.address?.area || {};
    const price = stripTags(x.price || '');
    const free = x.free === 1 || x.free === '1' || x.free === true;
    out.push({
      id: `madrid-${x.id || x.uid}`, kind, cityId: city.id, sourceKey: 'madrid',
      title, genre: m ? m[2] : GENRE_KO[kind], genreEn: m ? m[3] : GENRE_EN[kind],
      place: x['event-location'] || '', address: [titleCase(ad['street-address']), [ad['postal-code'], 'Madrid'].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      lat, lng, startDate, endDate, tz: TZ,
      startTime: startDate === endDate && /^\d{2}:\d{2}$/.test(x.time || '') ? x.time : undefined,
      time: startDate !== endDate ? (x.time || '') : '',
      free, fee: free ? 'Gratuito' : clip(price, 200), feeEn: free ? 'Free' : undefined,
      overview: clip(stripTags(x.description || ''), 900),
      homepage: normUrl(x.link), source: 'Ayuntamiento de Madrid – datos.madrid.es', sourceUrl: normUrl(x.link) || 'https://datos.madrid.es/',
      _noOg: true, // madrid.es 페이지의 og:image는 모두 시 문장(紋章) → 이벤트 이미지가 아니므로 보강하지 않음
    });
  }
  return out;
}
const titleCase = s => String(s || '').toLowerCase().replace(/(^|\s)(\p{L})/gu, (a, b, c) => b + c.toUpperCase());

/* ================= Barcelona (스트리밍) ================= */
const BCN_URL = 'https://opendata-ajuntament.barcelona.cat/data/dataset/2767159c-1c98-46b8-a686-2b25b40cb053/resource/59b9c807-f6c1-4c10-ac51-1ace65485079/download';
const BCN_SKIP = /Alteracions de trànsit|Agenda administrativa|Recollida de cartes|Congressos|Campanyes|Actes institucionals|Signatures|Actes religiosos(?! >> Pessebres)/;
function bcnKind(path) {
  if (/Visites|Itineraris|Gimcanes/.test(path)) return ['tour', '투어·탐방', 'Tour & walk'];
  if (/Cursos i tallers|Seminaris|Casals/.test(path)) return ['workshop', '강좌·워크숍', 'Course & workshop'];
  if (/Exposicions|Exhibicions|Instal·lacions/.test(path)) return ['exhibition', '전시', 'Exhibition'];
  if (/Concerts|Recitals|Audicions/.test(path)) return ['performance', '음악', 'Music'];
  if (/Espectacles|Performances|Balls|Sardanes/.test(path)) return ['performance', '공연', 'Show & dance'];
  if (/Projeccions|Retransmissions/.test(path)) return ['performance', '영화', 'Film'];
  if (/Conferències|Col·loquis|Debats|Taules rodones|Lectures|Narracions|Presentacions/.test(path)) return ['performance', '강연·낭독', 'Talk & reading'];
  if (/Festivals/.test(path)) return ['festival', '축제', 'Festival'];
  if (/Festes|Cercaviles|Correfoc|Focs|Cavalcades|Pregons|Desfilades|Diades/.test(path)) return ['festival', '전통 축제', 'Festa'];
  if (/Mostres, fires|Petits mercats|Fires/.test(path)) return ['festival', '마켓·박람회', 'Market & fair'];
  return null;
}
async function barcelona(cities, ctx) {
  const city = cities.find(c => c.id === 'barcelona'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const list = [];
  await streamJsonArray(BCN_URL, x => {
    if (x.status && x.status !== 'published') return;
    if (x.event_status && !/ok|correct/i.test(x.event_status)) return;
    const startDate = String(x.start_date || '').slice(0, 10), endDate = String(x.end_date || x.start_date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || endDate < today || startDate > until) return;
    const path = (x.classifications_data || []).filter(c => /^Tipologia AG/.test(c.full_path || '')).map(c => c.full_path).join(' | ');
    if (BCN_SKIP.test(path)) return;
    const k = bcnKind(path) || [kindEu(x.name, 'festival')];
    const kind = k[0];
    const a = (x.addresses || []).find(a => a.main_address) || x.addresses?.[0] || {};
    const [lat, lng] = fixLatLng(x.geo_epgs_4326_latlon?.lat, x.geo_epgs_4326_latlon?.lon, city);
    const vals = (x.values || []).filter(v => v.url_value);
    const web = vals.find(v => v.attribute_name === 'Web')?.url_value;
    const booking = vals.find(v => /venda d'entrades|inscripcions|Reserves/i.test(v.attribute_name))?.url_value;
    const tk = (x.tickets_data || []).map(t => t.name);
    const img = x.image_data || null;
    const st = String(x.start_date || '').slice(11, 16);
    list.push({
      id: `bcn-${x.register_id}`, kind, cityId: city.id, sourceKey: 'barcelona',
      title: stripTags(x.name), genre: k[1] || GENRE_KO[kind], genreEn: k[2] || GENRE_EN[kind],
      place: a.place || '', address: [[a.address_name, a.street_number_1 || a.start_street_number].filter(Boolean).join(' '), [a.zip_code, 'Barcelona'].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      lat, lng, startDate, endDate, tz: TZ,
      startTime: startDate === endDate && st && st !== '00:00' ? st : undefined,
      free: tk.includes('Lliure') ? true : tk.includes('Pagament') ? false : undefined,
      fee: tk.includes('Lliure') ? 'Gratuït / Entrada lliure' : tk.includes('Pagament') ? 'De pagament' : tk.includes('Inscripcions') ? 'Inscripció prèvia' : '',
      feeEn: tk.includes('Lliure') ? 'Free' : tk.includes('Pagament') ? 'Paid' : tk.includes('Inscripcions') ? 'Registration required' : undefined,
      poster: httpsUrl(img?.image_optimized || img?.image), posterCredit: img ? (clip([img.author, img.source].filter(Boolean).join(' / '), 120) || 'Ajuntament de Barcelona') : undefined,
      overview: clip(stripTags(x.body || ''), 900),
      homepage: normUrl(web) || undefined, bookingUrl: normUrl(booking) || undefined,
      source: 'Ajuntament de Barcelona – Agenda cultural (CC BY 4.0)', sourceUrl: normUrl(web) || 'https://opendata-ajuntament.barcelona.cat/data/ca/dataset/agenda-cultural',
    });
  }, { timeout: 600000 });
  const soon = addDaysStr(today, 30);
  return capList(list, +(process.env.BCN_MAX || 1500), e => (e.poster ? 2 : 0) + (e.kind !== 'workshop' ? 2 : 0) + (e.startDate <= soon ? 1 : 0));
}

/* ================= IVC (València) ================= */
const IVC_URL = 'https://dadesobertes.gva.es/dataset/25cc4d21-e1dd-4d05-b057-dbcc44d4338c/resource/f76b5222-c09f-46cb-8bb0-4fbe377c611d/download/lista-de-actividades-culturales-programadas-por-el-ivc.csv';
async function ivc(cities, ctx) {
  const city = cities.find(c => c.id === 'valencia'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const out = []; const seen = new Set();
  await streamCsv(IVC_URL, r => {
    const title = stripTags(r.titulo_evento || '').replace(/\s+/g, ' ');
    if (!title || /^\(?(CANCELAD|SUSPES|APLAZAD|AJORNAT)/i.test(title)) return;
    const lat = parseFloat(String(r.latitud).replace(',', '.')), lng = parseFloat(String(r.longitud).replace(',', '.'));
    const inCity = /^val[eè]ncia$/i.test((r.municipio || '').trim()) || (Number.isFinite(lat) && km(city, { lat, lng }) <= city.radiusKm);
    if (!inCity) return;
    const startDate = dmyDate(r.fecha_inicio), endDate = dmyDate(r.fecha_fin) || startDate;
    if (!startDate || endDate < today || startDate > until) return;
    const tipo = (r.tipo_evento || '').trim();
    const kind = /escénicas|Música|Audiovisual|pel[ií]cula/i.test(tipo) ? 'performance' : kindEu(`${tipo} ${title}`, 'festival');
    const key = `${title}|${startDate}|${r.lugar_evento}`; if (seen.has(key)) return; seen.add(key);
    const [la, ln] = fixLatLng(lat, lng, city);
    const precio = (r.precio || '').trim();
    out.push({
      id: `ivc-${hash(key)}`, kind, cityId: city.id, sourceKey: 'ivc',
      title: title === title.toUpperCase() ? titleCase(title) : title,
      genre: /pel[ií]cula|Audiovisual/i.test(tipo) ? '영화' : /Música/i.test(tipo) ? '음악' : /escénicas/i.test(tipo) ? '공연' : GENRE_KO[kind],
      genreEn: /pel[ií]cula|Audiovisual/i.test(tipo) ? 'Film' : /Música/i.test(tipo) ? 'Music' : /escénicas/i.test(tipo) ? 'Performing arts' : GENRE_EN[kind],
      place: (r.lugar_evento || '').trim(), address: (r.direccion || '').trim(), lat: la, lng: ln,
      startDate, endDate, tz: TZ, time: (r.hora || '').replace(/^[\s,]+/, '').trim(),
      fee: precio, free: precio ? isFreeEs(precio) : undefined,
      homepage: normUrl(r.web) || undefined, source: 'Institut Valencià de Cultura – GVA Dades Obertes (CC BY)', sourceUrl: normUrl(r.web) || 'https://dadesobertes.gva.es/dataset/cul-agc-ivc',
      _noOg: true, // ivc.gva.es 페이지에는 og:image 없음
    });
  }, { sep: ';', timeout: 60000 });
  return out;
}
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

/* ================= Junta de Andalucía (Sevilla) ================= */
const AND_DROP = /convocatoria|subvenci|ayudas|plazo de|licitaci|bolsa de empleo|oposici|ciberseguridad para empresas|jornada técnica/i;
async function andalucia(cities, ctx) {
  const city = cities.find(c => c.id === 'seville'); if (!city) return [];
  const rows = await getJson('https://datos.juntadeandalucia.es/api/v0/schedule/all?format=json', { timeout: 60000 });
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const out = [];
  for (const x of Array.isArray(rows) ? rows : []) {
    const loc = stripTags(x.location || '');
    const provs = (x.province || []).map(p => p.province).join(' ');
    if (!/^sevilla\b/i.test(loc) && !(/sevilla/i.test(provs) && /sevilla/i.test(stripTags(x.address || '')))) continue;
    const title = stripTags(x.title); if (!title || AND_DROP.test(title)) continue;
    const ds = (x.date_registration || []).map(d => [d.start_date_registration, d.end_date_registration || d.start_date_registration]).filter(d => /^\d{4}-\d{2}-\d{2}/.test(d[0] || ''));
    if (!ds.length) continue;
    const startDate = ds.map(d => d[0].slice(0, 10)).sort()[0], endDate = ds.map(d => String(d[1]).slice(0, 10)).sort().at(-1) || startDate;
    if (endDate < today || startDate > until) continue;
    const themes = (x.themes || []).map(t => t.theme || t.name || t).filter(t => typeof t === 'string').join(' ');
    const kind = kindEu(`${themes} ${title}`, kindEu(stripTags(x.description), 'festival'));
    const thumb = x.image?.[0]?.thumbnail?.[0]?.image_url;
    const more = x.more_info?.[0]?.field_url_mas_informacion?.[0]?.more_info_url;
    const c = x.coordinates?.[0] || {};
    const [lat, lng] = fixLatLng(c.latitude, c.longitude, city);
    const cost = stripTags(x.cost || '');
    out.push({
      id: `andalucia-${x.id}`, kind, cityId: city.id, sourceKey: 'andalucia',
      title, genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: stripTags(x.address || '').split('\n')[0], address: [stripTags(x.address || '').replace(/\n+/g, ', '), 'Sevilla'].filter(Boolean).join(', '),
      lat, lng, startDate, endDate, tz: TZ, time: clip(stripTags(x.schedule || ''), 160),
      fee: clip(cost, 160), free: cost ? isFreeEs(cost) : undefined,
      poster: thumb ? httpsUrl(thumb, 'https://www.juntadeandalucia.es') : '', posterCredit: thumb ? 'Junta de Andalucía' : undefined,
      overview: clip(stripTags(x.description || ''), 900),
      homepage: normUrl(more) || undefined,
      source: 'Junta de Andalucía – Agenda de eventos (CC BY 4.0)', sourceUrl: normUrl(more) || `https://www.juntadeandalucia.es/datosabiertos/portal/dataset/agenda-de-eventos-organizados-por-la-junta-de-andalucia`,
    });
  }
  return out;
}

/* ================= 모듈 진입점 ================= */
export const SOURCES = [
  { key: 'madrid', name: 'Madrid – Agenda de eventos culturales (100 días)', fn: madrid, cities: ['madrid'], licence: 'Ayuntamiento de Madrid open data terms (attribution)', url: 'https://datos.madrid.es/portal/site/egob/menuitem.c05c1f754a33a9fbe4b2e4b284f1a5a0/?vgnextoid=6c0b6d01df986410VgnVCM2000000c205a0aRCRD' },
  { key: 'barcelona', name: 'Barcelona – Agenda cultural', fn: barcelona, cities: ['barcelona'], licence: 'CC BY 4.0 (Ajuntament de Barcelona)', url: 'https://opendata-ajuntament.barcelona.cat/data/ca/dataset/agenda-cultural' },
  { key: 'ivc', name: 'IVC – Agenda cultural (Generalitat Valenciana)', fn: ivc, cities: ['valencia'], licence: 'CC BY 4.0 (Generalitat Valenciana)', url: 'https://dadesobertes.gva.es/dataset/cul-agc-ivc' },
  { key: 'andalucia', name: 'Junta de Andalucía – Agenda de eventos', fn: andalucia, cities: ['seville'], licence: 'CC BY 4.0 (Junta de Andalucía)', url: 'https://www.juntadeandalucia.es/datosabiertos/portal/dataset/agenda-de-eventos-organizados-por-la-junta-de-andalucia' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
