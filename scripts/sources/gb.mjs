// 영국 소스 모듈 — 키 없이 쓰는 공식 API.
//   Wellcome Collection Content API (런던 웰컴 컬렉션 투어·토크·워크숍·전시). 이미지 copyright 필드 그대로 표기(CC-BY-NC 다수).
// 런던 전체·맨체스터·에든버러·리버풀은 공식 오픈 이벤트 피드가 없어 Ticketmaster(키) + 공통 소스로 채운다.
// 키를 받으면 추가할 후보: Edinburgh Festivals Listings API(EDFEST_API_KEY), Skiddle(SKIDDLE_API_KEY) — README 참고.
import { getJson, stripTags, clip, httpsUrl, todayIn, addDaysStr, tzParts, GENRE_KO, GENRE_EN } from '../lib/util.mjs';
import { runSources } from '../lib/sources.mjs';

const TZ = 'Europe/London';
const WC = { lat: 51.52594, lng: -0.13394, address: '183 Euston Road, London NW1 2BE' };

function wcKind(x) {
  if (x.isExhibition) return 'exhibition';
  const f = `${x.format?.label || ''} ${x.title}`;
  if (/tour/i.test(f)) return 'tour';
  if (/workshop|class|course|drawing|making/i.test(f)) return 'workshop';
  if (/festival|late|party/i.test(f)) return 'festival';
  return 'performance'; // Discussion, Performance, Screening, Session, Reading ...
}
/** "… © Wellcome Collection | | | | CC-BY-NC | |" → "… © Wellcome Collection / CC-BY-NC" + NC 경고 */
function credit(c) {
  const parts = String(c || '').split('|').map(s => s.trim()).filter(Boolean);
  if (!parts.length) return 'Wellcome Collection';
  let s = clip(parts.join(' / '), 160);
  if (/\bNC\b|non-?commercial/i.test(s)) s += ' (non-commercial licence)';
  return s;
}

async function wellcome(cities) {
  const city = cities.find(c => c.id === 'london'); if (!city) return [];
  const now = new Date().toISOString(), today = todayIn(TZ), until = addDaysStr(today, +(process.env.DAYS_AHEAD || 120));
  const raw = [];
  for (let page = 1; page <= +(process.env.WC_MAX_PAGES || 4); page++) {
    const j = await getJson(`https://api.wellcomecollection.org/content/v0/events?pageSize=100&sort=times.startDateTime&sortOrder=desc&page=${page}`, { timeout: 40000 });
    const res = j.results || [];
    raw.push(...res);
    // 시작일 내림차순: 이 페이지가 모두 과거면 더 볼 필요 없음
    if (!j.nextPage || res.every(x => (x.times || []).every(t => (t.endDateTime || t.startDateTime) < now))) break;
  }
  const out = [];
  for (const x of raw) {
    if (x.locations?.isOnline && !(x.locations?.places || []).length) continue;
    const times = (x.times || []).filter(t => t.startDateTime && (t.endDateTime || t.startDateTime) >= now);
    if (!times.length) continue;
    // 첫 원소가 전체 기간을 감싸는 경우가 있어 하루짜리 회차를 우선 사용
    const single = times.filter(t => (Date.parse(t.endDateTime || t.startDateTime) - Date.parse(t.startDateTime)) < 864e5);
    const use = (single.length ? single : times).sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
    const s = tzParts(use[0].startDateTime, TZ), e = tzParts(times.map(t => t.endDateTime || t.startDateTime).sort().at(-1), TZ);
    if (!s.date || s.date > until) continue;
    const kind = wcKind(x);
    const img = x.image?.['16:9'] || x.image;
    const places = (x.locations?.places || []).map(p => p.label).filter(Boolean);
    const startDate = s.date < today ? today : s.date;
    out.push({
      id: `wellcome-${x.id}`, kind, cityId: city.id, sourceKey: 'wellcome',
      title: stripTags(x.title), titleEn: undefined, genre: GENRE_KO[kind], genreEn: x.format?.label || GENRE_EN[kind],
      place: ['Wellcome Collection', places[0]].filter(Boolean).join(' – '), address: WC.address, lat: WC.lat, lng: WC.lng,
      startDate, endDate: e.date && e.date >= startDate ? e.date : startDate, tz: TZ,
      startTime: use.length === 1 ? s.time : undefined,
      time: use.length > 1 ? `${use.length}회 / ${use.length} dates` : '',
      free: kind === 'exhibition' ? true : undefined, fee: kind === 'exhibition' ? 'Free entry' : '',
      poster: httpsUrl(img?.url), posterCredit: img?.url ? credit(img.copyright) : undefined,
      overview: clip([(x.audiences || []).map(a => a.label).join(', '), (x.interpretations || []).map(i => i.label).join(', ')].filter(Boolean).join(' · '), 300),
      homepage: `https://wellcomecollection.org/${x.isExhibition ? 'exhibitions' : 'events'}/${x.uid || x.id}`,
      source: 'Wellcome Collection Content API', sourceUrl: `https://wellcomecollection.org/${x.isExhibition ? 'exhibitions' : 'events'}/${x.uid || x.id}`,
    });
  }
  return out;
}

export const SOURCES = [
  { key: 'wellcome', name: 'Wellcome Collection events', fn: wellcome, cities: ['london'], licence: 'Wellcome Collection Content API; images per-item (often CC BY-NC — attribution, non-commercial)', url: 'https://developers.wellcomecollection.org/api/content' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
