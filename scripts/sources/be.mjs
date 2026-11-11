// 벨기에 — 브뤼셀은 OpenAgenda 미러의 소량 이벤트만(agenda.brussels 오픈데이터는 현재 응답 없음).
// 안트베르펜·브뤼셀(네덜란드어권)의 핵심 소스 UiTdatabank는 키(UITDATABANK_CLIENT_ID)가 필요해 아직 통합하지 않음 — README 참고.
import { runSources } from '../lib/sources.mjs';
import { openagenda, OPENAGENDA_META } from './openagenda.mjs';

const TZ = 'Europe/Brussels';

export const SOURCES = [
  { ...OPENAGENDA_META, fn: openagenda, cities: ['brussels'] },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
