// 남아공 소스 모듈 — Quicket API (선택 키 QUICKET_API_KEY, 무료: https://developer.quicket.co.za 가입). docs/sources-research-phase4.md 2-5
//   GET https://api.quicket.co.za/api/events?api_key={key}&pageSize=&page=   → ListItemResult { results: [Event] , ...페이지 메타데이터 }
//   Event: id, name, description(HTML), url, imageUrl(//quicket.azureedge.net/...), startDate/endDate(현지 시각, 오프셋 없음),
//          venue{name, addressLine1, addressLine2, latitude, longitude}, locality{levelOne(나라), levelTwo(주), levelThree(도시)},
//          categories[{id,name}], tickets[{price, soldOut, ...}], schedules[{startDate,endDate}]
//   (문서: https://docs.quicket.com/ "Get a list of events" — 공개 행사만, 기본 10건/쪽)
// 키가 없으면 runSources 가 호출하지 않고 enabled:false 로 기록한다. 약관·이미지 재사용 조건은 키 발급 시 확인할 것(문서 5-C).
import { getJson, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, km, kindEu, GENRE_KO, GENRE_EN, isoLocalDate, isoLocalTime, BOT } from '../lib/util.mjs';
import { runSources, capList } from '../lib/sources.mjs';

const TZ = 'Africa/Johannesburg';
const ev = (kind, o) => ({ kind, genre: GENRE_KO[kind], genreEn: GENRE_EN[kind], ...o });
const QK_KIND = [
  [/Exhibition|Art & Culture|Arts? /i, 'exhibition'],
  [/Music|Theatre|Comedy|Performing|Film|Dance|Concert/i, 'performance'],
  [/Workshop|Class|Course|Learning|Education|Business|Hobbies/i, 'workshop'],
  [/Tour|Travel & Outdoor/i, 'tour'],
  [/Festival|Market|Food|Drink|Party|Family|Holiday/i, 'festival'],
];

async function quicket(cities, ctx) {
  const key = process.env.QUICKET_API_KEY.trim();
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const pageSize = 100, maxPages = +(process.env.QUICKET_PAGES || 40);
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const j = await getJson(`https://api.quicket.co.za/api/events?${new URLSearchParams({ api_key: key, pageSize: String(pageSize), page: String(page) })}`, { ...BOT, timeout: 60000 });
    const res = j.results || j.Results || [];
    for (const x of res) {
      const v = x.venue || {};
      const lat = +v.latitude, lng = +v.longitude;
      const has = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
      const town = String(x.locality?.levelThree || '').toLowerCase();
      // 좌표가 있으면 도시 반경, 없으면 locality 도시명으로 배정
      const city = cities.find(c => has ? km({ lat, lng }, c) <= c.radiusKm : town && town === c.name.en.toLowerCase());
      if (!city) continue;
      // 회차(schedules)가 있으면 오늘 이후 회차만
      const sched = (x.schedules || []).map(s => isoLocalDate(s.startDate)).filter(d => d && d >= today).sort();
      let startDate = sched[0] || isoLocalDate(x.startDate);
      const endDate = isoLocalDate(x.endDate) || startDate;
      if (!startDate || endDate < today || startDate > until) continue;
      if (startDate < today) startDate = today;
      const cats = (x.categories || []).map(c => c.name).filter(Boolean).join(', ');
      const kind = (QK_KIND.find(([re]) => re.test(cats)) || [])[1] || kindEu(`${x.name} ${cats}`, 'festival');
      const prices = (x.tickets || []).filter(t => !t.donation).map(t => +t.price).filter(Number.isFinite);
      const min = prices.length ? Math.min(...prices) : null;
      const img = httpsUrl(x.imageUrl, 'https://www.quicket.co.za/');
      out.push(ev(kind, {
        id: `quicket-${x.id}`, cityId: city.id, sourceKey: 'quicket', provider: 'Quicket', title: stripTags(x.name),
        genreEn: clip(cats.split(',')[0], 60) || GENRE_EN[kind],
        place: v.name || '', address: [v.addressLine1, v.addressLine2].filter(Boolean).join(', ') || undefined,
        lat: has ? lat : null, lng: has ? lng : null,
        startDate, endDate, startTime: sched.length <= 1 ? isoLocalTime(x.startDate) || undefined : undefined, tz: TZ,
        time: sched.length > 1 ? `${sched.length}회 / ${sched.length} dates` : undefined,
        free: min === 0 && prices.every(p => p === 0) ? true : undefined,
        price: min > 0 ? { amount: min, currency: 'ZAR' } : undefined, fee: min > 0 ? `R${min}~` : min === 0 ? 'Free' : undefined,
        poster: img || undefined, posterCredit: img ? `Quicket – ${clip(x.organiser?.name || 'organiser', 60)}` : undefined,
        overview: clip(stripTags(x.description || ''), 900),
        bookingUrl: normUrl(x.url) || undefined, sourceUrl: normUrl(x.url) || 'https://www.quicket.co.za/events/',
        source: 'Quicket',
      }));
    }
    if (res.length < pageSize) break;
  }
  const r = [];
  for (const c of cities) r.push(...capList(out.filter(e => e.cityId === c.id), +(process.env.QUICKET_MAX || 300), e => (e.poster ? 1 : 0) + (e.startDate <= addDaysStr(today, 30) ? 1 : 0)));
  return r;
}

export const SOURCES = [
  { key: 'quicket', name: 'Quicket API', fn: quicket, requires: 'QUICKET_API_KEY', cities: ['capetown', 'johannesburg'], licence: 'Quicket API terms (free key; check reuse terms at sign-up) — link to the Quicket event page', url: 'https://docs.quicket.com/' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx);
}
