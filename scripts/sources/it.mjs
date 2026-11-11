// 이탈리아 소스 모듈 — 키 없이 쓰는 공식 오픈데이터.
//   Comune di Firenze — Eventi a Firenze (FeelFlorence 공식 일정, 오늘부터 30일) GeoJSON. 좌표 있음, 이미지 없음 → og:image. CC BY 4.0
// 로마·밀라노·베네치아·나폴리는 공식 오픈 이벤트 피드가 없어 공통 소스(Ticketmaster·Viator·위키 오디오가이드)로 채운다.
import { getJson, stripTags, clip, normUrl, todayIn, addDaysStr, fixLatLng, kindEu, GENRE_KO, GENRE_EN, dmyDate } from '../lib/util.mjs';
import { runSources } from '../lib/sources.mjs';

const TZ = 'Europe/Rome';

async function firenze(cities, ctx) {
  const city = cities.find(c => c.id === 'florence'); if (!city) return [];
  const j = await getJson('https://data.comune.fi.it/datastore/download.php?id=6289&type=99&format=url&file_format=geojson&file_id=23095', { timeout: 60000 });
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const out = [];
  for (const f of j.features || []) {
    const p = f.properties || {};
    const title = stripTags(p.titolo || '').trim(); if (!title) continue;
    const startDate = dmyDate(p.data_inizio), endDate = dmyDate(p.data_fine) || startDate;
    if (!startDate || endDate < today || startDate > until) continue;
    const g = f.geometry || {};
    const pt = g.type === 'MultiPoint' ? g.coordinates?.[0] : g.coordinates;
    const [lat, lng] = fixLatLng(pt?.[1], pt?.[0], city);
    const app = String(p.appuntamenti || '');
    const place = (app.match(/Dove:\s*\n?\s*([^\n]+)/) || [])[1]?.trim() || '';
    const times = [...new Set([...app.matchAll(/dalle (\d{1,2}[:.]\d{2})/g)].map(m => m[1].replace('.', ':').padStart(5, '0')))];
    const kind = kindEu(title, kindEu(p.descrizione, 'festival'));
    const desc = stripTags(p.descrizione || '').replace(/Per consultare[^.]*clicca qui\.?/gi, '').trim();
    out.push({
      id: `firenze-${f.id ?? title.replace(/\W+/g, '').slice(0, 30)}-${startDate}`, kind, cityId: city.id, sourceKey: 'firenze',
      title, genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place, address: place ? `${place}, Firenze` : '', lat, lng, startDate, endDate, tz: TZ,
      startTime: startDate === endDate && times.length === 1 ? times[0] : undefined,
      time: times.length ? `dalle ${times.slice(0, 3).join(' / ')}` : '',
      overview: clip(desc, 900), tel: p.telefono || undefined,
      homepage: normUrl(p.link) || undefined,
      source: 'Comune di Firenze – Eventi a Firenze (CC BY 4.0)', sourceUrl: normUrl(p.feelflorence_link) || normUrl(p.link) || 'https://dati.toscana.it/dataset/eventi-a-firenze',
    });
  }
  return out;
}

export const SOURCES = [
  { key: 'firenze', name: 'Comune di Firenze – Eventi a Firenze', fn: firenze, cities: ['florence'], licence: 'CC BY 4.0 (Comune di Firenze)', url: 'https://dati.toscana.it/dataset/eventi-a-firenze' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
