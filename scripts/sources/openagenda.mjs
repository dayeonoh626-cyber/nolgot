// OpenAgenda 공개 이벤트 미러 (public.opendatasoft.com `evenements-publics-openagenda`) — 키 불필요.
// 오픈 라이선스(Licence Ouverte)로 공개된 OpenAgenda 아젠다의 이벤트. 프랑스 중심 + 제네바·브뤼셀 일부.
// 도시 중심 반경(within_distance) + 기간으로 서버에서 거른 뒤 exports/json 한 번으로 받는다(1만 건 한도 없음).
// fr.mjs · ch.mjs · be.mjs 가 같은 함수를 쓴다.
import { getJson, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, tzParts, fixLatLng, kindEu, GENRE_KO, GENRE_EN, normTitle } from '../lib/util.mjs';
import { capList } from '../lib/sources.mjs';

const BASE = 'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/evenements-publics-openagenda/exports/json';
const FIELDS = 'uid,title_fr,description_fr,image,imagecredits,firstdate_begin,lastdate_end,timings,location_coordinates,location_name,location_address,location_city,keywords_fr,canonicalurl,originagenda_title,status,attendancemode,conditions_fr,registration,age_min';
// 여가와 무관한 아젠다(구직·채용·기업 행사·데이팅)는 제외
const DROP_AGENDA = /France Travail|emploi|économiques|sectoriels|business|recrutement|Semaine de l'industrie|RandoDate|célibataires|Pôle emploi|Mission locale|CCI |Chambre de commerce|Conseil municipal/i;
const DROP_TITLE = /job ?dating|recrutement|forum (de l')?emploi|réunion d'information|permanence|conseil municipal|atelier cv|entretien d'embauche/i;

export const OPENAGENDA_META = {
  key: 'openagenda', name: 'OpenAgenda (public open-licence mirror)',
  licence: 'Licence Ouverte / Open Licence 1.0 (images: crédits du contributeur)',
  url: 'https://public.opendatasoft.com/explore/dataset/evenements-publics-openagenda/',
};

/**
 * @param against (선택) async (cityId) => 이미 다른 소스로 받은 이벤트 배열. 제목+날짜가 겹치면 OpenAgenda 쪽을 버린다.
 */
export async function openagenda(cities, ctx, { against } = {}) {
  const out = [];
  for (const city of cities) {
    const today = todayIn(city.tz), until = addDaysStr(today, ctx.daysAhead);
    const where = `lastdate_end>="${today}" and firstdate_begin<="${until}T23:59:59" and within_distance(location_coordinates, geom'POINT(${city.lng} ${city.lat})', ${city.radiusKm}km)`;
    const rows = await getJson(`${BASE}?${new URLSearchParams({ where, select: FIELDS })}`, { timeout: 90000 });
    const prior = against ? await against(city.id) : [];
    const priorKeys = prior.map(e => ({ t: normTitle(e.title), s: e.startDate, e: e.endDate }));
    const list = [];
    for (const x of rows) {
      const status = safeJson(x.status)?.id, mode = safeJson(x.attendancemode)?.id;
      if (status === 6 || mode === 2) continue; // 취소 / 온라인 전용
      const title = stripTags(x.title_fr || ''); if (!title) continue;
      if (DROP_AGENDA.test(x.originagenda_title || '') || DROP_TITLE.test(title)) continue;
      // 회차 중 오늘 이후 것만 → 시작일·시간
      const timings = (safeJson(x.timings) || []).map(t => ({ b: t.begin, e: t.end })).filter(t => t.b);
      const upcoming = timings.filter(t => String(t.e || t.b).slice(0, 10) >= today).sort((a, b) => a.b.localeCompare(b.b));
      const first = upcoming[0];
      const startDate = first ? first.b.slice(0, 10) : tzParts(x.firstdate_begin, city.tz).date;
      const endDate = tzParts(x.lastdate_end, city.tz).date || startDate;
      if (!startDate || endDate < today || startDate > until) continue;
      const nT = upcoming.length;
      const kw = (x.keywords_fr || []).join(' ');
      const kind = kindEu(`${kw} ${title} ${x.originagenda_title || ''}`, kindEu(x.description_fr, 'festival'));
      const nt = normTitle(title);
      if (priorKeys.some(p => p.t && (p.t === nt || (Math.min(p.t.length, nt.length) >= 10 && (p.t.includes(nt) || nt.includes(p.t)))) && p.s <= endDate && startDate <= p.e)) continue;
      const [lat, lng] = fixLatLng(x.location_coordinates?.lat, x.location_coordinates?.lon, city);
      const reg = (safeJson(x.registration) || []).find(r => r.type === 'link')?.value;
      const cond = stripTags(x.conditions_fr || '');
      list.push({
        id: `oa-${x.uid}`, kind, cityId: city.id, sourceKey: 'openagenda',
        title, genre: GENRE_KO[kind], genreEn: GENRE_EN[kind],
        place: x.location_name || '', address: x.location_address || '',
        lat, lng, startDate, endDate, tz: city.tz,
        startTime: nT === 1 && first ? first.b.slice(11, 16) : undefined,
        time: nT > 1 ? `${nT}회 / ${nT} dates${first ? ' · ' + first.b.slice(11, 16) : ''}` : '',
        fee: clip(cond, 200), free: /gratuit|entrée libre|free|libre et gratuit/i.test(cond) && !/\d+\s*(€|euros?)/i.test(cond) ? true : undefined,
        poster: httpsUrl(x.image), posterCredit: x.image ? (x.imagecredits ? clip(stripTags(x.imagecredits), 120) : `OpenAgenda / ${x.originagenda_title || 'contributor'}`) : undefined,
        overview: clip(stripTags(x.description_fr || ''), 900),
        homepage: normUrl(x.canonicalurl), bookingUrl: normUrl(reg) || undefined,
        source: `OpenAgenda – ${clip(x.originagenda_title || 'agenda', 80)} (Licence Ouverte)`, sourceUrl: normUrl(x.canonicalurl),
      });
    }
    // 소스 상한: 도시당 OA_MAX (포스터·가까운 날짜 우선)
    const kept = capList(list, +(process.env.OA_MAX || 500), e => (e.poster ? 2 : 0) + (e.startDate <= addDaysStr(today, 30) ? 1 : 0));
    out.push(...kept);
  }
  return out;
}

function safeJson(s) { if (s == null) return null; if (typeof s !== 'string') return s; try { return JSON.parse(s); } catch { return null; } }
