// Trumba 공개 캘린더 JSON 피드 공통 파서 (키 불필요). us.mjs(스미소니언) · au.mjs(브리즈번 시의회)가 쓴다.
//   GET https://www.trumba.com/calendars/{calendar}.json  → 배열(최대 약 2,000건, 회차별 레코드)
//   필드: eventID, seriesID, title, description(HTML), location, locationType(In-Person|Online|Hybrid),
//         startDateTime/endDateTime(현지 시계값), allDay, canceled, eventImage{url,alt}, permaLinkUrl, customFields[{label,value}]
// 같은 seriesID(반복 행사)는 하나로 합친다(첫 회차 날짜~마지막 회차 날짜, "N회").
import { getJson, stripTags, clip, httpsUrl, normUrl, firstHref, decodeEntities, todayIn, addDaysStr, isoLocalDate, isoLocalTime, BOT } from '../lib/util.mjs';

export const field = (x, label) => decodeEntities((x.customFields || []).find(c => c.label === label)?.value || '');

/**
 * @param calendar  Trumba 캘린더 이름 (예: 'smithsonian-events')
 * @param tz        피드의 현지 타임존 (오늘 날짜 계산용)
 * @param map(x, occ) 레코드 → 이벤트 객체(공통 필드 제외) 또는 null(제외). occ = { startDate, endDate, startTime }
 */
export async function trumba(calendar, { tz, daysAhead, map }) {
  const rows = await getJson(`https://www.trumba.com/calendars/${calendar}.json`, { ...BOT, timeout: 120000 });
  if (!Array.isArray(rows)) throw new Error('Trumba 응답이 배열이 아님');
  const today = todayIn(tz), until = addDaysStr(today, daysAhead);
  const series = new Map();
  for (const x of rows) {
    if (x.canceled || !x.title) continue;
    let startDate = isoLocalDate(x.startDateTime), endDate = isoLocalDate(x.endDateTime) || startDate;
    if (!startDate) continue;
    // 종일 행사의 끝 시각 00:00은 '그 날 시작 전' → 전날까지
    if (x.allDay && endDate > startDate && /T00:00(:00)?$/.test(x.endDateTime || '')) endDate = addDaysStr(endDate, -1);
    if (endDate < today || startDate > until) continue;
    const startTime = x.allDay ? undefined : isoLocalTime(x.startDateTime) || undefined;
    const key = String(x.seriesID || x.eventID);
    const cur = series.get(key);
    if (!cur) { series.set(key, { x, startDate, endDate, startTime, n: 1, times: new Set([startTime]) }); continue; }
    cur.n++; cur.times.add(startTime);
    if (startDate < cur.startDate) { cur.startDate = startDate; cur.x = x; cur.startTime = startTime; }
    if (endDate > cur.endDate) cur.endDate = endDate;
  }
  const out = [];
  for (const s of series.values()) {
    const occ = { startDate: s.startDate < today ? today : s.startDate, endDate: s.endDate, startTime: (s.n > 1 && s.times.size > 1) || s.startDate < today ? undefined : s.startTime, n: s.n };
    const e = map(s.x, occ);
    if (!e) continue;
    const img = s.x.eventImage?.url || s.x.detailImage?.url;
    out.push({
      startDate: occ.startDate, endDate: occ.endDate, startTime: occ.startTime,
      time: s.n > 1 ? `${s.n}회 / ${s.n} dates` + (s.x.repeats ? ` · ${clip(decodeEntities(s.x.repeats), 80)}` : '') : stripTags(s.x.dateTimeFormatted || '').slice(0, 120),
      overview: clip(stripTags(s.x.description || ''), 900),
      poster: httpsUrl(img) || undefined,
      sourceUrl: normUrl(s.x.permaLinkUrl) || undefined,
      ...e,
    });
  }
  return out;
}

/** customFields 링크 값(HTML <a>)에서 URL만 */
export const fieldHref = (x, label) => normUrl(firstHref((x.customFields || []).find(c => c.label === label)?.value || '')) || undefined;
