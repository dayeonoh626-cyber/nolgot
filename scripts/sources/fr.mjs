// 프랑스 소스 모듈 — 모두 키 없이 쓰는 공식 오픈데이터 (Ticketmaster 등 키 소스는 generic.mjs).
//   Que faire à Paris (opendata.paris.fr)            파리시 공식 행사 달력. 사진·좌표·가격. ODbL
//   OpenAgenda 공개 미러 (public.opendatasoft.com)    리옹·마르세유·니스 핵심 + 파리 보조(Que faire à Paris와 중복 제거)
//   DATAtourisme 일일 CSV (data.gouv.fr)              전국 관광청 이벤트 → 도시 반경으로 필터. 이미지 없음(og:image 보강)
import { getJson, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, fixLatLng, kindEu, GENRE_KO, GENRE_EN, km } from '../lib/util.mjs';
import { runSources, capList } from '../lib/sources.mjs';
import { streamCsv } from '../lib/stream.mjs';
import { openagenda, OPENAGENDA_META } from './openagenda.mjs';

const TZ = 'Europe/Paris';

/* ================= Que faire à Paris ================= */
let qfapResolve; const qfapReady = new Promise(r => { qfapResolve = r; });
const QFAP_FIELDS = 'id,url,title,lead_text,description,date_start,date_end,occurrences,date_description,cover_url,cover_credit,address_name,address_street,address_zipcode,address_city,lat_lon,price_type,price_detail,access_link,access_link_text,contact_url,qfap_tags,audience';

async function qfap(cities, ctx) {
  const city = cities.find(c => c.id === 'paris'); if (!city) { qfapResolve([]); return []; }
  try {
    const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
    const where = `date_end >= "${today}" and date_start <= "${until}T23:59:59"`;
    const rows = await getJson(`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/exports/json?${new URLSearchParams({ where, select: QFAP_FIELDS })}`, { timeout: 120000 });
    const list = [];
    for (const x of rows) {
      // occurrences: "2027-03-13T15:00:00+02:00_2027-03-13T16:30:00+02:00;..." — 시계값이 현지 시각
      const occ = String(x.occurrences || '').split(';').map(s => s.split('_')).filter(p => p[0])
        .map(([b, e]) => ({ b, e: e || b })).filter(o => o.e.slice(0, 10) >= today).sort((a, b) => a.b.localeCompare(b.b));
      const startDate = occ[0]?.b.slice(0, 10) || String(x.date_start || '').slice(0, 10);
      const endDate = String(x.date_end || '').slice(0, 10) || occ.at(-1)?.e.slice(0, 10) || startDate;
      if (!startDate || endDate < today || startDate > until) continue;
      const tags = String(x.qfap_tags || '');
      const kind = kindEu(`${tags} ${x.title}`, kindEu(x.lead_text, 'festival'));
      const [lat, lng] = fixLatLng(x.lat_lon?.lat, x.lat_lon?.lon, city);
      const st = occ.length === 1 ? occ[0].b.slice(11, 16) : undefined;
      const fee = stripTags(x.price_detail || '') || (x.price_type === 'gratuit' ? 'Gratuit' : stripTags(x.access_link_text || ''));
      list.push({
        id: `qfap-${x.id}`, kind, cityId: city.id, sourceKey: 'parisqfap',
        title: stripTags(x.title), genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
        place: x.address_name || '', address: [x.address_street, [x.address_zipcode, x.address_city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        lat, lng, startDate, endDate, startTime: st && st !== '00:00' ? st : undefined, tz: TZ,
        time: occ.length > 1 ? `${occ.length}회 / ${occ.length} dates` : clip(stripTags(x.date_description || ''), 160),
        fee: clip(fee, 200), free: x.price_type === 'gratuit' ? true : x.price_type === 'payant' ? false : undefined,
        feeEn: x.price_type === 'gratuit' ? 'Free' : undefined,
        poster: httpsUrl(x.cover_url), posterCredit: x.cover_url ? clip(stripTags(x.cover_credit || '').replace(/^(Photo|Crédit)\s*:\s*/i, ''), 120) || 'Ville de Paris' : undefined,
        overview: clip(stripTags(x.lead_text ? `${x.lead_text}\n\n${x.description || ''}` : x.description), 1000),
        homepage: normUrl(x.contact_url) || undefined, bookingUrl: normUrl(x.access_link) || undefined,
        source: 'Que faire à Paris – Ville de Paris (ODbL)', sourceUrl: normUrl(x.url),
      });
    }
    const kept = capList(list, +(process.env.QFAP_MAX || 1500), e => (e.poster ? 2 : 0) + (e.startDate <= addDaysStr(today, 30) ? 1 : 0));
    qfapResolve(kept);
    return kept;
  } catch (e) { qfapResolve([]); throw e; }
}

/* ================= DATAtourisme FMA CSV ================= */
const DT_DATASET = 'https://www.data.gouv.fr/api/1/datasets/datatourisme-la-base-nationale-des-donnees-publiques-dinformation-touristique-en-open-data/';
const DT_SKIP = /#(BusinessEvent|Congress|Seminar|SportsCompetition|Rally)\b/;
function dtKind(cats, title) {
  if (/#(Visit|Rambling|OpenDay)\b/.test(cats)) return 'tour';
  if (/#(TrainingWorkshop|Traineeship|IntroductionCourse|Practice)\b/.test(cats)) return 'workshop';
  if (/#(Exhibition|VisualArtsEvent)\b/.test(cats)) return 'exhibition';
  if (/#(Concert|TheaterEvent|ShowEvent|ScreeningEvent|Opera|Recital|Cirque|Conference|Reading)\b/.test(cats)) return 'performance';
  return kindEu(title, 'festival');
}
async function datatourisme(cities, ctx) {
  const targets = cities.filter(c => ['paris', 'lyon', 'marseille', 'nice'].includes(c.id));
  if (!targets.length) return [];
  const ds = await getJson(DT_DATASET, { timeout: 30000 });
  const res = (ds.resources || []).find(r => r.title === 'datatourisme-fma.csv') || (ds.resources || []).find(r => /fma\.csv$/.test(r.url || ''));
  if (!res?.url) throw new Error('datatourisme-fma.csv 리소스를 찾지 못함');
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const byCity = new Map(targets.map(c => [c.id, []]));
  await streamCsv(res.url, r => {
    const lat = parseFloat(r.Latitude), lng = parseFloat(r.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const city = targets.find(c => Math.abs(c.lat - lat) < 0.5 && km(c, { lat, lng }) <= c.radiusKm);
    if (!city) return;
    const cats = r.Categories_de_POI || '';
    if (DT_SKIP.test(cats)) return;
    // Periodes_regroupees: "YYYY-MM-DD<->YYYY-MM-DD|..."
    const per = String(r.Periodes_regroupees || '').split('|').map(p => p.split('<->')).filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p[0]))
      .map(([a, b]) => [a, /^\d{4}-\d{2}-\d{2}$/.test(b || '') ? b : a]).filter(([a, b]) => b >= today && a <= until).sort();
    if (!per.length) return;
    const startDate = per[0][0];
    const endDate = per.map(p => p[1]).sort().at(-1);
    // 연중 상설 장터(주간 시장 등)는 '이벤트'가 아니라 제외. 크리스마스마켓처럼 기간이 짧은 장터는 유지.
    if (/#(Market|SaleEvent|GarageSale|BricABrac)\b/.test(cats) && (Date.parse(endDate) - Date.parse(startDate)) / 864e5 > 62) return;
    const title = stripTags(r.Nom_du_POI); if (!title) return;
    const kind = dtKind(cats, title);
    const links = String(r.Contacts_du_POI || '').match(/https?:\/\/[^\s#<>|"]+/g) || [];
    const web = links.at(-1) || '';
    const [cp, commune] = String(r.Code_postal_et_commune || '').split('#');
    const uri = r.URI_ID_du_POI || '';
    byCity.get(city.id).push({
      id: `dt-${uri.split('/').slice(-2).join('-') || title.replace(/\W+/g, '').slice(0, 40)}`, kind, cityId: city.id, sourceKey: 'datatourisme',
      title, genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: '', address: [r.Adresse_postale, [cp, commune].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      lat: +lat.toFixed(6), lng: +lng.toFixed(6), startDate, endDate, tz: TZ,
      time: per.length > 1 ? `${per.length}회 / ${per.length} dates` : '',
      overview: clip(stripTags(r.Description || ''), 900),
      homepage: normUrl(web) || undefined,
      source: `DATAtourisme – ${clip(r.SIT_diffuseur || r.Createur_de_la_donnee || 'Office de tourisme', 80)} (Licence Ouverte 2.0)`,
      sourceUrl: normUrl(web) || uri,
    });
  }, { timeout: 300000 });
  const out = [];
  for (const [, list] of byCity) {
    // 상시 시장(연중)은 뒤로, 기간이 짧고 가까운 행사 우선
    out.push(...capList(list, +(process.env.DT_MAX || 400), e => (e.endDate <= addDaysStr(today, 60) ? 2 : 0) + (e.kind !== 'festival' ? 1 : 0)));
  }
  return out;
}

/* ================= 모듈 진입점 ================= */
export const SOURCES = [
  { key: 'parisqfap', name: 'Que faire à Paris (Ville de Paris)', fn: qfap, cities: ['paris'], licence: 'ODbL (Ville de Paris); images: crédit par événement', url: 'https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/' },
  { ...OPENAGENDA_META, fn: (cities, ctx) => openagenda(cities, ctx, { against: async id => (id === 'paris' ? await qfapReady : []) }), cities: ['paris', 'lyon', 'marseille', 'nice'] },
  { key: 'datatourisme', name: 'DATAtourisme (fêtes et manifestations)', fn: datatourisme, cities: ['paris', 'lyon', 'marseille', 'nice'], licence: 'Licence Ouverte 2.0 (Etalab)', url: 'https://www.data.gouv.fr/datasets/datatourisme-la-base-nationale-des-donnees-publiques-dinformation-touristique-en-open-data' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
