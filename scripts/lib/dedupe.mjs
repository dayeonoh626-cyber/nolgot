// 도시 내 중복 제거 (docs/data-contract.md 원칙):
// 날짜가 겹치고 + 제목이 같거나 한쪽이 다른 쪽을 포함(8자 이상) + (500m 이내 또는 좌표 없음+장소명 같음)
// → 하나로 합치고, 포스터가 있는 쪽을 기준으로 빈 필드를 채운다.
import { normTitle, km } from './util.mjs';

const score = e => (e.poster ? 4 : 0) + (e.lat != null ? 2 : 0) + (e.overview ? 1 : 0) + (e.fee ? 1 : 0);

function same(a, b) {
  if (a.kind === 'audioguide' || b.kind === 'audioguide') return false;
  if (a.permanent !== b.permanent) return false; // 상설 명소(permanent)는 날짜 있는 행사와 합치지 않는다
  if (!(a.startDate <= b.endDate && b.startDate <= a.endDate)) return false;
  const ta = a._nt, tb = b._nt;
  if (!ta || !tb) return false;
  const titleOk = ta === tb || (Math.min(ta.length, tb.length) >= 8 && (ta.includes(tb) || tb.includes(ta)));
  if (!titleOk) return false;
  if (a.lat != null && b.lat != null) return km(a, b) <= 0.5;
  const pa = normTitle(a.place), pb = normTitle(b.place);
  return !pa || !pb || pa === pb || pa.includes(pb) || pb.includes(pa);
}

export function dedupe(events) {
  for (const e of events) e._nt = normTitle(e.title);
  const sorted = [...events].sort((a, b) => score(b) - score(a));
  const kept = [];
  const byTitle = new Map(); // 앞 4글자 버킷으로 비교 횟수 축소
  let merged = 0;
  for (const e of sorted) {
    const k = e._nt.slice(0, 4);
    const bucket = byTitle.get(k) || [];
    const dup = bucket.find(x => same(x, e)) || (e._nt.length >= 8 ? kept.find(x => x._nt.length >= 8 && same(x, e)) : null);
    if (dup) {
      for (const [f, v] of Object.entries(e)) if ((dup[f] == null || dup[f] === '') && v != null && v !== '') dup[f] = v;
      if (e.startDate < dup.startDate) dup.startDate = e.startDate;
      if (e.endDate > dup.endDate) dup.endDate = e.endDate;
      (dup.alsoFrom ||= []).includes(e.source) || dup.source === e.source || dup.alsoFrom.push(e.source);
      merged++;
      continue;
    }
    kept.push(e); bucket.push(e); byTitle.set(k, bucket);
  }
  for (const e of kept) { delete e._nt; if (e.alsoFrom && !e.alsoFrom.length) delete e.alsoFrom; }
  return { events: kept, merged };
}
