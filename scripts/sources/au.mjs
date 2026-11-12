// 호주 소스 모듈 — 키 없는 공식 오픈데이터 (Ticketmaster 등 키 소스는 generic.mjs).
//   Brisbane City Council events (Trumba)  시의회 행사 전체(전시·도서관·투어·공연·축제·운동). 이미지 99%. CC BY 4.0
// 시드니(What's On 약관이 자동 수집 금지)·멜버른(공식 MCP 라이선스 불명)·퍼스·애들레이드는 공개 피드 없음 → places·오디오가이드·키 소스.
import { stripTags, clip, decodeEntities, kindEu, GENRE_KO, GENRE_EN, fixLatLng, todayIn, addDaysStr } from '../lib/util.mjs';
import { runSources, capList } from '../lib/sources.mjs';
import { trumba, field } from './trumba.mjs';

function brisKind(primary, types, title) {
  const t = `${primary} | ${types}`;
  if (/Exhibitions?/i.test(primary) || (!primary && /Exhibitions?/i.test(types))) return 'exhibition';
  if (/Tours/i.test(t)) return 'tour';
  if (/Music|Performing arts|Films/i.test(primary)) return 'performance';
  if (/Festivals|Markets|Christmas/i.test(primary)) return 'festival';
  if (/Workshops|Library event|Fitness|Creative/i.test(t)) return kindEu(title, 'workshop');
  if (/Music|Performing arts|Films/i.test(types)) return 'performance';
  if (/Markets|Festivals|Christmas/i.test(types)) return 'festival';
  return kindEu(title, 'festival');
}

async function brisbane(cities, ctx) {
  const city = cities.find(c => c.id === 'brisbane'); if (!city) return [];
  const list = await trumba('brisbane-city-council', {
    tz: city.tz, daysAhead: ctx.daysAhead, map: x => {
      const venue = field(x, 'Venue'), addrHtml = (x.customFields || []).find(c => c.label === 'Venue address')?.value || '';
      // 'Venue address' 링크: maps.google.com/?q={lat},{lng}(이름) 또는 ?q={주소}
      const q = decodeURIComponent((String(addrHtml).match(/[?&]q=([^"&]+)/) || [])[1] || '').replace(/\+/g, ' ');
      const ll = q.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      const [lat, lng] = ll ? fixLatLng(ll[1], ll[2], city) : [null, null];
      const addrText = stripTags(addrHtml);
      const primary = field(x, 'Primary event type'), types = field(x, 'Event type'), cost = field(x, 'Cost');
      const kind = brisKind(primary, types, x.title);
      return {
        id: `bris-${x.seriesID || x.eventID}`, kind, cityId: city.id, sourceKey: 'brisbane', title: stripTags(x.title),
        genre: GENRE_KO[kind], genreEn: clip((primary || types).split(',')[0], 60) || GENRE_EN[kind],
        place: venue || stripTags(x.location || ''),
        address: ll ? (addrText || undefined) : (q || addrText ? `${q || addrText}, QLD, Australia` : undefined), lat, lng,
        fee: clip(stripTags(cost), 160) || undefined, free: /^free/i.test(cost.trim()) || /\bFree\b/.test(types) || undefined,
        posterCredit: x.eventImage?.url ? 'Brisbane City Council (CC BY 4.0)' : undefined,
        source: 'Brisbane City Council events (CC BY 4.0)',
        _fitness: /Fitness/i.test(types) && !/Exhibitions|Tours|Music|Performing|Library|Creative|Culture|Art/i.test(types),
      };
    },
  });
  const today = todayIn(city.tz);
  // 공원 운동 강좌(피트니스)는 행사 수가 많아 따로 상한
  const fit = capList(list.filter(e => e._fitness), +(process.env.BRIS_FITNESS_MAX || 40), e => (e.startDate <= addDaysStr(today, 14) ? 1 : 0));
  const rest = capList(list.filter(e => !e._fitness), +(process.env.BRIS_MAX || 500), e => (e.poster ? 2 : 0) + (e.kind !== 'workshop' ? 1 : 0) + (e.startDate <= addDaysStr(today, 45) ? 1 : 0));
  return [...rest, ...fit].map(e => { delete e._fitness; return e; });
}

export const SOURCES = [
  { key: 'brisbane', name: 'Brisbane City Council events (Trumba)', fn: brisbane, cities: ['brisbane'], licence: 'CC BY 4.0 (Brisbane City Council, data.brisbane.qld.gov.au)', url: 'https://data.brisbane.qld.gov.au/explore/dataset/brisbane-city-council-events/' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx);
}
