// 나라 모듈 공통 실행기: SOURCES 배열을 동시성 제한으로 돌리고 { events, status } 를 돌려준다.
// 각 소스: { key, name, fn(cities, ctx), licence, url, cities?: ['paris', ...], requires?: 'ENV_KEY_NAME' }
//   cities 가 있으면 그 도시가 이번 실행에 포함될 때만 돌리고, 상태(meta.sources)도 그 도시들에만 기록한다.
import { pool } from './util.mjs';

export async function runSources(SOURCES, cities, ctx, { tz, concurrency = 3, log = true } = {}) {
  const events = []; const status = [];
  const ids = new Set(cities.map(c => c.id));
  const active = SOURCES.filter(s => !s.cities || s.cities.some(id => ids.has(id)));
  await pool(active, concurrency, async s => {
    const t0 = Date.now();
    const scope = s.cities ? s.cities.filter(id => ids.has(id)) : undefined;
    const base = { key: s.key, name: s.name, licence: s.licence, url: s.url, cities: scope };
    // requires: 'ENV_NAME' → 키가 없으면 호출하지 않고 비활성(enabled:false)으로 기록 (이월도 하지 않음)
    if (s.requires && !process.env[s.requires]?.trim()) {
      status.push({ ...base, enabled: false, reason: `${s.requires} 없음 (선택 키)` });
      if (log) console.log(`    · ${s.key}: 꺼짐 (${s.requires} 없음)`);
      return;
    }
    try {
      const list = await s.fn(cities.filter(c => !scope || scope.includes(c.id)), ctx);
      for (const e of list) { e.tz ||= tz || cities.find(c => c.id === e.cityId)?.tz; events.push(e); }
      status.push({ ...base, enabled: true, ok: true, count: list.length, ms: Date.now() - t0 });
      if (log) console.log(`    · ${s.key}: ${list.length}건 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    } catch (err) {
      status.push({ ...base, enabled: true, ok: false, error: String(err.message || err).slice(0, 200), ms: Date.now() - t0 });
      if (log) console.log(`    · ${s.key}: 실패 ${String(err.message || err).slice(0, 160)}`);
    }
  });
  return { events, status };
}

/** 같은 원본 이벤트가 여러 번 나오지 않게, 그리고 소스별 상한(cap)을 우선순위대로 적용 */
export function capList(list, max, score = () => 0) {
  if (!max || list.length <= max) return list;
  return [...list].sort((a, b) => score(b) - score(a) || a.startDate.localeCompare(b.startDate)).slice(0, max);
}
