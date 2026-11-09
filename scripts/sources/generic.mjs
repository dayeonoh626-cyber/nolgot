// 키가 있으면 모든 도시에 자동 적용되는 상용/제휴 API 소스.
//   Ticketmaster Discovery (TICKETMASTER_API_KEY) — 공연·전시·가족 이벤트, 이미지 포함
//   Viator Partner API Basic (VIATOR_API_KEY)     — 클래스·투어 (사진·평점·가격·예약링크)
//   GetYourGuide Partner API (GYG_API_KEY)        — 클래스·투어 (파트너 승인 필요)
//   izi.TRAVEL (IZI_API_KEY)                      — 오디오 가이드
// 웹페이지 스크래핑은 하지 않는다(Airbnb·GYG 약관). 앱은 Airbnb/GYG/Viator 검색 딥링크를 별도로 제공.
import { getJson, http, todayIn, addDaysStr, httpsUrl, stripTags, clip, isoLocalDate, mergeOccurrences, fixLatLng } from '../lib/util.mjs';

const env = k => process.env[k]?.trim() || '';

/* ---------------- Ticketmaster ---------------- */
const TM_KIND = { Music: 'performance', 'Arts & Theatre': 'performance', Film: 'performance', Family: 'festival', Sports: 'festival', Miscellaneous: 'festival' };
const TM_GENRE_KO = { Music: '음악', 'Arts & Theatre': '공연·예술', Film: '영화', Family: '가족', Sports: '스포츠', Miscellaneous: '행사', Theatre: '연극', 'Classical': '클래식', Opera: '오페라', Comedy: '코미디', Dance: '무용', 'Fine Art': '미술', Musical: '뮤지컬', Rock: '록', Pop: '팝', 'Hip-Hop/Rap': '힙합', Jazz: '재즈', Electronic: '일렉트로닉', 'Children\'s Theatre': '어린이 공연', Magic: '마술', Circus: '서커스' };

export async function ticketmaster(city, ctx) {
  const key = env('TICKETMASTER_API_KEY');
  if (!key || !ctx.country.ticketmaster) return null; // null = 소스 비활성
  const today = todayIn(city.tz);
  const until = addDaysStr(today, +(process.env.DAYS_AHEAD || 120));
  const raw = [];
  const maxPages = +(process.env.TM_MAX_PAGES || 4); // size 200 × 4 = 800 (딥페이징 한도 1000)
  for (let page = 0; page < maxPages; page++) {
    const u = `https://app.ticketmaster.com/discovery/v2/events.json?${new URLSearchParams({
      apikey: key, latlong: `${city.lat},${city.lng}`, radius: String(city.radiusKm), unit: 'km',
      startDateTime: `${today}T00:00:00Z`, endDateTime: `${until}T23:59:59Z`, size: '200', page: String(page), sort: 'date,asc',
      locale: '*',
    })}`;
    const j = await getJson(u);
    raw.push(...(j._embedded?.events || []));
    if (page + 1 >= (j.page?.totalPages || 0)) break;
  }
  const evs = raw.map(x => {
    const v = x._embedded?.venues?.[0] || {};
    const cls = x.classifications?.[0] || {};
    const seg = cls.segment?.name, gen = cls.genre?.name && cls.genre.name !== 'Undefined' ? cls.genre.name : '';
    let kind = TM_KIND[seg] || 'festival';
    if (/Fine Art|Exhibit/i.test(gen + ' ' + (cls.subGenre?.name || ''))) kind = 'exhibition';
    const img = (x.images || []).filter(i => i.url && !i.fallback).sort((a, b) => (b.ratio === '16_9') - (a.ratio === '16_9') || b.width - a.width).find(i => i.width <= 1300) || x.images?.[0];
    const [lat, lng] = fixLatLng(v.location?.latitude, v.location?.longitude, city);
    const pr = x.priceRanges?.[0];
    const d = x.dates?.start || {};
    return {
      id: `tm-${x.id}`, kind, cityId: city.id, sourceKey: 'ticketmaster', provider: 'Ticketmaster',
      title: x.name, genre: TM_GENRE_KO[gen] || TM_GENRE_KO[seg] || gen || seg || '이벤트', genreEn: gen || seg || 'Event',
      place: v.name || '', address: [v.address?.line1, v.postalCode, v.city?.name].filter(Boolean).join(', '),
      lat, lng, startDate: d.localDate, endDate: isoLocalDate(x.dates?.end?.localDate) || d.localDate,
      startTime: d.localTime ? d.localTime.slice(0, 5) : undefined, tz: city.tz,
      poster: img && !img.fallback ? httpsUrl(img.url) : '', posterCredit: img ? 'Ticketmaster' : undefined,
      price: pr ? { amount: pr.min, currency: pr.currency } : undefined,
      fee: pr ? `${pr.min}${pr.max && pr.max !== pr.min ? '–' + pr.max : ''} ${pr.currency}` : '',
      overview: clip(stripTags(x.info || x.pleaseNote || ''), 800), bookingUrl: x.url, sourceUrl: x.url,
      source: 'Ticketmaster Discovery API',
      _series: x._embedded?.attractions?.[0]?.id || x.name,
    };
  }).filter(e => e.startDate);
  // 같은 공연의 날짜별 레코드를 하나로
  return mergeOccurrences(evs, e => `${e._series}|${e.place}`).map(e => { delete e._series; return e; });
}

/* ---------------- Viator (Basic Access) ---------------- */
let viatorDest = null;
async function viatorDestinations(key) {
  if (viatorDest) return viatorDest;
  const j = await getJson('https://api.viator.com/partner/destinations', { headers: { 'exp-api-key': key, 'Accept-Language': 'en-US' }, accept: 'application/json;version=2.0' });
  viatorDest = j.destinations || j.data || [];
  return viatorDest;
}
const WORKSHOP_RE = /\b(class|workshop|lesson|course|cooking|baking|making|craft|tasting class|masterclass)\b|Kurs|Workshop|클래스|공방|체험/i;

export async function viator(city, ctx) {
  const key = env('VIATOR_API_KEY');
  if (!key) return null;
  const dests = await viatorDestinations(key);
  const near = dests
    .filter(d => (d.type || '').toUpperCase() === 'CITY' && d.center && Number.isFinite(d.center.latitude))
    .map(d => ({ d, dist: Math.hypot(d.center.latitude - city.lat, (d.center.longitude - city.lng) * Math.cos(city.lat * Math.PI / 180)) * 111 }))
    .filter(x => x.dist <= Math.max(25, city.radiusKm))
    .sort((a, b) => a.dist - b.dist)[0]?.d;
  if (!near) return [];
  const currency = ctx.country.currency === 'KRW' ? 'USD' : ctx.country.currency; // KRW 미지원 가능성 → USD
  const j = await getJson('https://api.viator.com/partner/products/search', {
    method: 'POST', accept: 'application/json;version=2.0',
    headers: { 'exp-api-key': key, 'Accept-Language': 'en-US', 'Content-Type': 'application/json' },
    body: JSON.stringify({ filtering: { destination: String(near.destinationId) }, sorting: { sort: 'TRAVELER_RATING', order: 'DESCENDING' }, pagination: { start: 1, count: +(process.env.VIATOR_MAX || 40) }, currency }),
  });
  const today = todayIn(city.tz);
  return (j.products || []).map(p => {
    const variants = p.images?.find(i => i.isCover)?.variants || p.images?.[0]?.variants || [];
    const img = variants.filter(v => v.width <= 900).sort((a, b) => b.width - a.width)[0] || variants[0];
    const dur = p.duration?.fixedDurationInMinutes || p.duration?.variableDurationFromMinutes;
    const from = p.pricing?.summary?.fromPrice;
    return {
      id: `viator-${p.productCode}`, kind: WORKSHOP_RE.test(`${p.title} ${p.description || ''}`.slice(0, 400)) ? 'workshop' : 'tour',
      cityId: city.id, sourceKey: 'viator', provider: 'Viator',
      title: p.title, genre: '체험', genreEn: 'Experience', overview: clip(p.description || '', 900),
      startDate: today, endDate: addDaysStr(today, 365), tz: city.tz,
      poster: httpsUrl(img?.url), posterCredit: img ? 'Viator' : undefined,
      rating: p.reviews?.combinedAverageRating, reviewCount: p.reviews?.totalReviews,
      durationMin: dur, price: from ? { amount: from, currency: p.pricing?.currency || currency } : undefined,
      fee: from ? `${p.pricing?.currency || currency} ${from}~` : '',
      bookingUrl: p.productUrl, sourceUrl: p.productUrl, source: 'Viator Partner API',
    };
  });
}

/* ---------------- GetYourGuide ---------------- */
export async function getyourguide(city, ctx) {
  const key = env('GYG_API_KEY');
  if (!key) return null;
  const fmt = env('GYG_IMG_FORMAT') || '21'; // [format_id] 값 — 파트너 위키의 포맷 목록 참고(미검증 기본값)
  const p = new URLSearchParams({ cnt_language: 'en', currency: ctx.country.currency === 'KRW' ? 'KRW' : ctx.country.currency, limit: String(+(process.env.GYG_MAX || 40)), sortfield: 'popularity', sortdirection: 'DESC' });
  for (const v of [city.lat, city.lng, Math.min(city.radiusKm, 30)]) p.append('coordinates[]', String(v));
  const j = await getJson(`https://api.getyourguide.com/1/tours?${p}`, { headers: { 'X-ACCESS-TOKEN': key } });
  const today = todayIn(city.tz);
  return (j.data?.tours || []).map(t => {
    const pic = t.pictures?.[0];
    const dur = t.durations?.[0];
    const amount = t.price?.values?.amount;
    return {
      id: `gyg-${t.tour_id}`, kind: WORKSHOP_RE.test(`${t.title} ${t.abstract || ''}`) ? 'workshop' : 'tour',
      cityId: city.id, sourceKey: 'getyourguide', provider: 'GetYourGuide',
      title: t.title, genre: '체험', genreEn: 'Experience', overview: clip(t.abstract || '', 900),
      lat: t.coordinates?.lat ?? null, lng: t.coordinates?.long ?? null,
      startDate: today, endDate: addDaysStr(today, 365), tz: city.tz,
      poster: httpsUrl((pic?.ssl_url || pic?.url || '').replace('[format_id]', fmt)), posterCredit: pic ? (pic.copyright || 'GetYourGuide') : undefined,
      rating: t.overall_rating, reviewCount: t.number_of_ratings,
      durationMin: dur ? (dur.unit === 'hour' ? dur.duration * 60 : dur.unit === 'day' ? dur.duration * 1440 : dur.duration) : undefined,
      price: amount ? { amount, currency: p.get('currency') } : undefined, fee: amount ? `${p.get('currency')} ${amount}~` : '',
      bookingUrl: t.url, sourceUrl: t.url, source: 'GetYourGuide Partner API',
    };
  });
}

/* ---------------- izi.TRAVEL ---------------- */
export async function izi(city, ctx) {
  const key = env('IZI_API_KEY');
  if (!key) return null;
  const u = `https://api.izi.travel/mtg/objects/search?${new URLSearchParams({
    languages: 'ko,en,de', type: 'tour', lat_lon: `${city.lat},${city.lng}`, radius: String(city.radiusKm * 1000),
    includes: 'geo_distance,location', form: 'compact', limit: '20',
  })}`;
  const j = await getJson(u, { headers: { 'X-IZI-API-KEY': key }, accept: 'application/izi-api-v1.8+json' });
  const today = todayIn(city.tz);
  return (Array.isArray(j) ? j : []).map(o => {
    const img = o.images?.[0];
    const imgUrl = img && o.content_provider?.uuid ? `https://media.izi.travel/${o.content_provider.uuid}/${img.uuid}_800x600.jpg` : '';
    return {
      id: `izi-${o.uuid}`, kind: 'audioguide', cityId: city.id, sourceKey: 'izi', provider: 'izi.TRAVEL',
      title: o.title, genre: '오디오 가이드', genreEn: 'Audio guide', overview: clip(stripTags(o.summary || o.description || ''), 600),
      lat: o.location?.latitude ?? null, lng: o.location?.longitude ?? null,
      startDate: today, endDate: addDaysStr(today, 365), tz: city.tz,
      poster: httpsUrl(imgUrl), posterCredit: imgUrl ? 'izi.TRAVEL' : undefined, free: true, fee: '무료', feeEn: 'Free',
      durationMin: o.duration ? Math.round(o.duration / 60) : undefined,
      bookingUrl: `https://izi.travel/en/${o.uuid}`, sourceUrl: `https://izi.travel/en/${o.uuid}`, source: 'izi.TRAVEL',
    };
  });
}

export const GENERIC = [
  { key: 'ticketmaster', name: 'Ticketmaster Discovery API', fn: ticketmaster, licence: 'Ticketmaster API Terms of Use (attribution, link back)', url: 'https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/' },
  { key: 'viator', name: 'Viator Partner API (Basic)', fn: viator, licence: 'Viator Partner terms (affiliate)', url: 'https://docs.viator.com/partner-api/technical/' },
  { key: 'getyourguide', name: 'GetYourGuide Partner API', fn: getyourguide, licence: 'GetYourGuide partner agreement', url: 'https://code.getyourguide.com/partner-api-spec/' },
  { key: 'izi', name: 'izi.TRAVEL API', fn: izi, licence: 'izi.TRAVEL API terms', url: 'https://api-docs.izi.travel/' },
];
export { http };
