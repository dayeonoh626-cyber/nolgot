// 포르투갈 소스 모듈 — 키 없이 쓰는 공식 오픈데이터.
//   Agenda Cultural de Lisboa (AgendaLX, Câmara Municipal de Lisboa) WordPress REST. 사진·카테고리·회차. CC BY 4.0
//   좌표가 없어 장소명 + "Lisboa"를 공통 지오코딩 단계(Nominatim, 캐시)로 좌표화한다.
// 포르투는 공식 오픈 이벤트 피드가 없어 공통 소스(Ticketmaster·Viator·위키 오디오가이드)로 채운다.
import { http, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, kindEu, GENRE_KO, GENRE_EN, decodeEntities, sleep } from '../lib/util.mjs';
import { runSources } from '../lib/sources.mjs';

const TZ = 'Europe/Lisbon';
const LX = 'https://www.agendalx.pt/wp-json/agendalx/v1/events';

function lxKind(cats, title) {
  if (/visitas? guiad|percurso|roteiro|passeio/i.test(cats)) return 'tour';
  if (/oficina|workshop|curso|ateli/i.test(cats)) return 'workshop';
  if (/exposi|arte/i.test(cats)) return 'exhibition';
  if (/teatro|música|musica|dança|danca|cinema|circo|literatura|conversa|ópera|opera|stand-up|performance|espetáculo/i.test(cats)) return 'performance';
  if (/festa|feira|festiva|mercado|arraial/i.test(cats)) return 'festival';
  return kindEu(`${cats} ${title}`, 'festival');
}
/** PHP serialize 문자열에서 "value" 값만 뽑기 */
const phpValues = s => [...String(s || '').matchAll(/s:\d+:"value";s:\d+:"([^"]*)"/g)].map(m => m[1]).filter(Boolean);

async function agendalx(cities, ctx) {
  const city = cities.find(c => c.id === 'lisbon'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const maxPages = +(process.env.LX_MAX_PAGES || 30);
  const raw = [];
  let total = Infinity;
  for (let page = 1; page <= Math.min(maxPages, total); page++) {
    const { text, res } = await http(`${LX}?per_page=50&page=${page}`, { accept: 'application/json', timeout: 40000 });
    const tp = +res.headers.get('x-wp-totalpages'); if (tp > 0) total = tp; // 헤더가 없을 때는 빈 페이지까지
    let arr; try { arr = JSON.parse(text); } catch { throw new Error(`AgendaLX JSON 아님: ${text.slice(0, 120)}`); }
    if (!Array.isArray(arr) || !arr.length) break;
    raw.push(...arr);
    if (arr.length < 50) break;
    await sleep(150);
  }
  const out = []; const seen = new Set();
  for (const x of raw) {
    if (seen.has(x.id)) continue; seen.add(x.id);
    const occ = (x.occurences || []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today && d <= until).sort();
    const startDate = occ[0] || (x.StartDate >= today ? x.StartDate : today);
    const endDate = x.LastDate || occ.at(-1) || startDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || endDate < today || startDate > until) continue;
    const cats = Object.values(x.categories_name_list || {}).map(c => c.name).join(', ');
    const title = decodeEntities(stripTags(x.title?.rendered || ''));
    if (!title) continue;
    const kind = lxKind(cats, title);
    const venue = Object.values(x.venue || {}).map(v => decodeEntities(v.name))[0] || '';
    const prices = phpValues(x.price_val);
    const free = /free|gratuit|entrada livre/i.test(`${x.price_cat} ${x.price_val}`) || (!prices.length && x.price_cat === 'free');
    const desc = Array.isArray(x.description) ? x.description.join('\n') : x.description;
    out.push({
      id: `agendalx-${x.id}`, kind, cityId: city.id, sourceKey: 'agendalx',
      title, genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: venue, address: venue ? `${venue}, Lisboa` : '', lat: null, lng: null,
      startDate, endDate, tz: TZ,
      time: [stripTags(x.string_times || ''), occ.length > 1 ? `${occ.length}회 / ${occ.length} dates` : ''].filter(Boolean).join(' · ') || clip(stripTags(x.string_dates || ''), 120),
      fee: free ? 'Entrada livre' : prices.length ? prices.map(v => `${v} €`).join(' / ') : '',
      feeEn: free ? 'Free' : undefined, free: free || undefined,
      poster: httpsUrl(x.featured_media_large), posterCredit: x.featured_media_large ? 'AgendaLX / Câmara Municipal de Lisboa' : undefined,
      overview: clip(stripTags([x.subtitle, desc].filter(Boolean).join('\n\n')), 900),
      homepage: normUrl(x.link), source: 'Agenda Cultural de Lisboa – AgendaLX (CC BY 4.0)', sourceUrl: normUrl(x.link) || 'https://www.agendalx.pt/',
    });
  }
  return out;
}

export const SOURCES = [
  { key: 'agendalx', name: 'Agenda Cultural de Lisboa (AgendaLX)', fn: agendalx, cities: ['lisbon'], licence: 'CC BY 4.0 (Câmara Municipal de Lisboa)', url: 'https://dados.cm-lisboa.pt/dataset/agenda-cultural-de-lisboa' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
