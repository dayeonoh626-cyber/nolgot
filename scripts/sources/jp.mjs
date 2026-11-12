// 일본 소스 모듈 — 키 없는 공식 피드.
//   Doorkeeper API (api.doorkeeper.jp)     도쿄·오사카·교토 커뮤니티 행사(워크숍·세미나). 배너 이미지.
//     API 이용약관(2016-05-10): 이벤트를 표시할 때 Doorkeeper 이벤트 페이지 링크를 반드시 함께 표시(nofollow 금지),
//     Doorkeeper와 경쟁하는 서비스(행사 관리·티켓팅)에 쓰지 말 것. → sourceUrl/bookingUrl = public_url, 앱은 출처 링크를 표시.
//   港区イベント情報 CSV (東京都オープンデータ)  미나토구 행사(강좌·체험·축제). CC BY. 좌표 거의 없음 → 지오코딩·장소 사진
// Connpass v2(키 필요)·Peatix·ぴあ 등은 키/약관 문제로 쓰지 않음 (문서 2-3).
import { getJson, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, tzParts, fixLatLng, kindAsia, GENRE_KO, GENRE_EN, BOT } from '../lib/util.mjs';
import { runSources, capList } from '../lib/sources.mjs';
import { streamCsv } from '../lib/stream.mjs';

const TZ = 'Asia/Tokyo';
const PREF = { tokyo: 'tokyo', osaka: 'osaka', kyoto: 'kyoto' };

/* ================= Doorkeeper ================= */
async function doorkeeper(cities, ctx) {
  const out = [];
  for (const city of cities.filter(c => PREF[c.id])) {
    const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
    for (let page = 1; page <= +(process.env.DOORKEEPER_PAGES || 6); page++) {
      const rows = await getJson(`https://api.doorkeeper.jp/events?${new URLSearchParams({ prefecture: PREF[city.id], since: today, until, sort: 'starts_at', page: String(page) })}`, { ...BOT, timeout: 30000 });
      if (!Array.isArray(rows) || !rows.length) break;
      for (const { event: x } of rows) {
        if (!x?.id || !x.public_url) continue;
        if (/オンライン|online|zoom|配信のみ/i.test(`${x.venue_name || ''} ${x.address || ''}`) && x.lat == null) continue; // 온라인 전용
        const s = tzParts(x.starts_at, TZ), e = tzParts(x.ends_at || x.starts_at, TZ);
        if (!s.date || (e.date || s.date) < today) continue;
        const [lat, lng] = fixLatLng(x.lat, x.long, city);
        const title = stripTags(x.title);
        const kind = kindAsia(title, 'workshop');
        const banner = /logo/i.test(x.banner || "") ? "" : httpsUrl(x.banner); // 로고 배너는 대표 이미지로 쓰지 않음
        const url = normUrl(x.public_url);
        out.push({
          id: `doorkeeper-${x.id}`, kind, cityId: city.id, sourceKey: 'doorkeeper', title,
          genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
          place: x.venue_name || '', address: x.address || undefined, lat, lng,
          startDate: s.date, endDate: e.date && e.date >= s.date ? e.date : s.date, startTime: s.time !== '00:00' ? s.time : undefined, tz: TZ,
          poster: banner || undefined, posterCredit: banner ? 'Doorkeeper (organiser banner)' : undefined,
          overview: clip(stripTags(x.description || ''), 900) || undefined,
          bookingUrl: url, sourceUrl: url, provider: 'Doorkeeper',
          source: 'Doorkeeper (link to the Doorkeeper event page required)',
        });
      }
      if (rows.length < 25) break;
    }
  }
  return out;
}

/* ================= 港区イベント情報 CSV ================= */
const MINATO_CSV = 'https://opendata.city.minato.tokyo.jp/dataset/abb98f48-76fb-4013-9d7e-d3028830e7f2/resource/53b60f4a-f39e-41f2-b7a6-41f5c7ab23d3/download/minatokueventjoho.csv';
const jpDates = s => [...String(s || '').matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)].map(m => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`);
async function minato(cities, ctx) {
  const city = cities.find(c => c.id === 'tokyo'); if (!city) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const list = [];
  await streamCsv(MINATO_CSV, r => {
    const title = stripTags(r['ページタイトル'] || ''); if (!title) return;
    const all = jpDates(r['開催日時']).sort();
    if (!all.length) return;
    // '…から…' 쌍: 기간. 오늘 이후로 끝나는 구간만
    const ranges = String(r['開催日時']).split(/[,、]/).map(p => jpDates(p)).filter(d => d.length).map(d => [d[0], d.at(-1)]).filter(([, b]) => b >= today);
    if (!ranges.length) return;
    const startDate = ranges.map(x => x[0]).sort()[0], endDate = ranges.map(x => x[1]).sort().at(-1);
    if (startDate > until) return;
    const where = stripTags(r['ところ'] || '');
    const [lat, lng] = fixLatLng(r['緯度'], r['経度'], city);
    const kind = kindAsia(`${title} ${r['内容'] || ''}`.slice(0, 300), 'festival');
    const url = normUrl(r['ページURL']);
    const fee = stripTags(r['費用'] || '');
    list.push({
      id: `minato-${(url || title).replace(/^https?:\/\/[^/]+\//, '').replace(/\W+/g, '-').slice(0, 80)}`, kind, cityId: city.id, sourceKey: 'minato', title,
      genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: clip(where.split(/\n/)[0], 80), address: where ? `東京都港区 ${clip(where.split(/\n/)[0], 80)}` : undefined, lat, lng,
      startDate: startDate < today ? today : startDate, endDate, tz: TZ,
      time: clip(stripTags(r['開催日詳細'] || ''), 160) || (ranges.length > 1 ? `${ranges.length}회 / ${ranges.length} dates` : undefined),
      fee: clip(fee, 160) || undefined, free: /^無料/.test(fee) || undefined,
      overview: clip(stripTags(r['内容'] || ''), 900) || undefined,
      sourceUrl: url || 'https://www.city.minato.tokyo.jp/', source: '港区イベント情報 (東京都オープンデータ, CC BY 4.0)',
    });
  }, { headers: BOT.headers, timeout: 120000 });
  return capList(list, +(process.env.MINATO_MAX || 150), e => (e.startDate <= addDaysStr(today, 30) ? 1 : 0));
}

export const SOURCES = [
  { key: 'doorkeeper', name: 'Doorkeeper API', fn: doorkeeper, cities: ['tokyo', 'osaka', 'kyoto'], licence: 'Doorkeeper API Terms of Use (2016-05-10): must display a followable link to the Doorkeeper event page; no use in a competing event-management service', url: 'https://www.doorkeeper.jp/developer/api' },
  { key: 'minato', name: '港区イベント情報 (Minato City events)', fn: minato, cities: ['tokyo'], licence: 'CC BY 4.0 (港区 / 東京都オープンデータカタログ)', url: 'https://catalog.data.metro.tokyo.lg.jp/dataset/t131032d0000000003' },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
