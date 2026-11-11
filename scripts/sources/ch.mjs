// 스위스 — 제네바시 아젠다(Grand Théâtre·MAH·MEG·Victoria Hall·도서관 등)가 OpenAgenda에 공개돼 있어 미러로 받는다.
// 취리히는 공식 날짜별 이벤트 피드가 없어(zuerich.com API는 POI) Ticketmaster(키) + 공통 소스로 채운다.
import { runSources } from '../lib/sources.mjs';
import { openagenda, OPENAGENDA_META } from './openagenda.mjs';

const TZ = 'Europe/Zurich';

export const SOURCES = [
  { ...OPENAGENDA_META, fn: openagenda, cities: ['geneva'] },
];

export async function fetchCountry(cities, ctx) {
  return runSources(SOURCES, cities, ctx, { tz: TZ });
}
