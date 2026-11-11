// 오스트리아 소스 모듈 — 키 없이 쓰는 공식 오픈데이터.
//   Stadt Wien — Adventmärkte & Silvesterstände (WFS ogdwien:ADVENTMARKTOGD) 크리스마스마켓·연말 부스. 좌표. CC BY 4.0
// 빈 시 행사 DB(Veranstaltungen Wien)는 2025-12 제공 중단 → 새 인터페이스가 나오면 여기에 추가.
// 잘츠부르크는 공식 오픈 이벤트 피드가 없어 공통 소스(Ticketmaster·Viator·위키 오디오가이드)로 채운다.
import { getJson, stripTags, clip, normUrl, todayIn, fixLatLng } from '../lib/util.mjs';
import { runSources } from '../lib/sources.mjs';

const TZ = 'Europe/Vienna';

/** "13.11. bis 24.12.2026" / "31.12.2026 bis 1.1.2027" → [start, end] */
function parseRange(s) {
  const toks = [...String(s || '').matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})?/g)].map(m => ({ d: +m[1], m: +m[2], y: m[3] ? +m[3] : null }));
  if (!toks.length) return [null, null];
  const last = toks.at(-1);
  let y = last.y || new Date().getFullYear();
  for (let i = toks.length - 1; i >= 0; i--) { // 연도가 없는 앞쪽 날짜는 뒤 날짜의 연도에서 거꾸로 추론
    const t = toks[i];
    if (t.y) y = t.y; else { const nx = toks[i + 1]; if (nx && (t.m > nx.m || (t.m === nx.m && t.d > nx.d))) y = (nx.y || y) - 1; t.y = y; }
    t.y ||= y;
  }
  const f = t => `${t.y}-${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`;
  return [f(toks[0]), f(last)];
}

async function wienMarkets(cities) {
  const city = cities.find(c => c.id === 'vienna'); if (!city) return [];
  const j = await getJson('https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:ADVENTMARKTOGD&srsName=EPSG:4326&outputFormat=json', { timeout: 60000 });
  const today = todayIn(TZ);
  const out = [];
  for (const f of j.features || []) {
    const p = f.properties || {};
    const [startDate, endDate] = parseRange(p.DATUM);
    if (!startDate || endDate < today) continue;
    const [lat, lng] = fixLatLng(f.geometry?.coordinates?.[1], f.geometry?.coordinates?.[0], city);
    const silvester = p.SILVESTERMARKT === 1 || p.SILVESTERMARKT === '1';
    out.push({
      id: `wien-market-${p.OBJECTID}`, kind: 'festival', cityId: city.id, sourceKey: 'wienmarkets',
      title: stripTags(p.BEZEICHNUNG), genre: silvester ? '연말 마켓' : '크리스마스 마켓', genreEn: silvester ? "New Year's Eve market" : 'Christmas market',
      place: p.ADRESSE || '', address: p.ADRESSE ? `${p.ADRESSE.replace(/^(\d+)\.,\s*/, '')}, ${p.ADRESSE.match(/^(\d+)\./)?.[1] ? (1000 + 10 * +p.ADRESSE.match(/^(\d+)\./)[1]) + ' ' : ''}Wien` : '',
      lat, lng, startDate, endDate, tz: TZ, time: clip(stripTags(p.OEFFNUNGSZEIT || ''), 200),
      free: true, fee: 'Eintritt frei', feeEn: 'Free entry',
      homepage: normUrl(p.WEBLINK1) || undefined,
      source: 'Stadt Wien – data.wien.gv.at (CC BY 4.0)', sourceUrl: normUrl(p.WEBLINK1) || 'https://www.data.gv.at/katalog/dataset/adventmarkte-und-silvesterstande-standorte-wien',
    });
  }
  return out;
}

export const SOURCES = [
  { key: 'wienmarkets', name: 'Stadt Wien – Adventmärkte & Silvesterstände', fn: wienMarkets, cities: ['vienna'], licence: 'CC BY 4.0 (Stadt Wien – data.wien.gv.at)', url: 'https://www.data.gv.at/katalog/dataset/adventmarkte-und-silvesterstande-standorte-wien' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
export { parseRange };
