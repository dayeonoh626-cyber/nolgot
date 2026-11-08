// 공공 API에서 이벤트를 모아 data/events.json 으로 저장한다.
// GitHub Actions에서 매일 실행되며, API 키는 저장소 Secrets에만 보관된다(앱에 노출되지 않음).
//
//   TOUR_API_KEY   한국관광공사 TourAPI (data.go.kr '국문 관광정보 서비스_GW') — 축제·행사
//   KOPIS_API_KEY  공연예술통합전산망 KOPIS — 공연(연극·뮤지컬·콘서트 등)
//   PREV_URL       (선택) 이전 배포본 events.json 주소 — 상세정보 캐시로 API 호출 절약
//
// 키가 하나도 없으면 샘플 데이터를 만든다.
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { sampleEvents } from './sample-events.mjs';

const TOUR_KEY = process.env.TOUR_API_KEY?.trim();
const KOPIS_KEY = process.env.KOPIS_API_KEY?.trim();
const TOUR_BASE = process.env.TOUR_API_BASE || 'https://apis.data.go.kr/B551011/KorService2';
const DAYS_AHEAD = +(process.env.DAYS_AHEAD || 90);
const MAX_TOUR_DETAILS = +(process.env.MAX_TOUR_DETAILS || 250);
const MAX_KOPIS_DETAILS = +(process.env.MAX_KOPIS_DETAILS || 400);
const OUT = 'data/events.json';

/* ---------- 공통 ---------- */
const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000); // UTC 기준 러너에서도 한국 날짜로
const ymdC = d => d.toISOString().slice(0, 10).replace(/-/g, '');
const TODAY = ymdC(kstNow());
const UNTIL = ymdC(new Date(kstNow().getTime() + DAYS_AHEAD * 86400000));
const dash = s => s && s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;
const dotDate = s => s ? s.replace(/\./g, '-') : null; // 2026.11.08 → 2026-11-08
const sleep = ms => new Promise(r => setTimeout(r, ms));
const https = u => u ? String(u).replace(/^http:\/\//, 'https://') : '';
const stripTags = s => String(s || '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/\n{3,}/g, '\n\n').trim();
const firstHref = s => (String(s || '').match(/href=["']?([^"' >]+)/i) || [])[1] || (String(s || '').match(/https?:\/\/[^\s"'<]+/) || [])[0] || '';
const isFree = fee => !!fee && /무료/.test(fee) && !/\d[\d,]*\s*원/.test(fee);

const REGION_RULES = [
  [/^서울/, '서울'], [/^부산/, '부산'], [/^대구/, '대구'], [/^인천/, '인천'], [/^광주/, '광주'], [/^대전/, '대전'],
  [/^울산/, '울산'], [/^세종/, '세종'], [/^경기/, '경기'], [/^강원/, '강원'], [/^(충청북|충북)/, '충북'], [/^(충청남|충남)/, '충남'],
  [/^(전라북|전북)/, '전북'], [/^(전라남|전남)/, '전남'], [/^(경상북|경북)/, '경북'], [/^(경상남|경남)/, '경남'], [/^제주/, '제주'],
];
const regionOf = addr => { const a = String(addr || '').trim(); for (const [re, r] of REGION_RULES) if (re.test(a)) return r; return null; };

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      try { return JSON.parse(text); } catch { throw new Error(`JSON 아님 (키/파라미터 확인): ${text.slice(0, 300)}`); }
    } catch (e) { if (i === tries - 1) throw e; await sleep(800 * (i + 1)); }
  }
}
async function getText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { const res = await fetch(url); if (!res.ok) throw new Error('HTTP ' + res.status); return await res.text(); }
    catch (e) { if (i === tries - 1) throw e; await sleep(800 * (i + 1)); }
  }
}

/* ---------- 이전 데이터(상세 캐시) ---------- */
async function loadPrevious() {
  try {
    if (process.env.PREV_URL) { const j = await getJson(process.env.PREV_URL, 1); return j.events || []; }
    if (existsSync(OUT)) return JSON.parse(readFileSync(OUT, 'utf8')).events || [];
  } catch (e) { console.warn('이전 데이터 없음:', e.message); }
  return [];
}

/* ---------- TourAPI: 축제·행사 ---------- */
// cat3 코드 → [kind, 장르]
const TOUR_CAT = {
  A02070100: ['festival', '문화관광축제'], A02070200: ['festival', '축제'],
  A02080100: ['performance', '전통공연'], A02080200: ['performance', '연극'], A02080300: ['performance', '뮤지컬'],
  A02080400: ['performance', '오페라'], A02080500: ['exhibition', '전시회'], A02080600: ['festival', '박람회'],
  A02080800: ['performance', '무용'], A02080900: ['performance', '클래식'], A02081000: ['performance', '콘서트'],
  A02081100: ['festival', '영화'], A02081200: ['festival', '스포츠'], A02081300: ['festival', '행사'],
};
const tourItems = j => {
  const body = j?.response?.body; const header = j?.response?.header;
  if (header && header.resultCode && header.resultCode !== '0000') throw new Error(`TourAPI ${header.resultCode} ${header.resultMsg}`);
  const it = body?.items?.item; return { items: it ? (Array.isArray(it) ? it : [it]) : [], total: +(body?.totalCount || 0) };
};
const tourUrl = (op, params) => {
  const p = new URLSearchParams({ serviceKey: TOUR_KEY, MobileOS: 'ETC', MobileApp: 'nolgot', _type: 'json', ...params });
  return `${TOUR_BASE}/${op}?${p}`;
};

async function fetchTour(prevById) {
  const list = [];
  for (let page = 1; page <= 30; page++) {
    const { items, total } = tourItems(await getJson(tourUrl('searchFestival2', { numOfRows: 100, pageNo: page, arrange: 'A', eventStartDate: TODAY })));
    list.push(...items);
    if (list.length >= total || !items.length) break;
  }
  console.log(`TourAPI 목록 ${list.length}건`);

  const events = [];
  let detailCalls = 0;
  // 가까운 날짜부터 상세정보를 채운다
  list.sort((a, b) => String(a.eventstartdate).localeCompare(String(b.eventstartdate)));
  for (const it of list) {
    const start = dash(it.eventstartdate), end = dash(it.eventenddate) || start;
    if (!start || start > dash(UNTIL)) continue;
    const id = `tour-${it.contentid}`;
    const [kind, genre] = TOUR_CAT[it.cat3] || ['festival', '축제·행사'];
    const e = {
      id, kind, genre, title: stripTags(it.title),
      region: regionOf(it.addr1), address: [it.addr1, it.addr2].filter(Boolean).join(' ').trim(), place: '',
      lat: it.mapy ? +it.mapy : null, lng: it.mapx ? +it.mapx : null,
      startDate: start, endDate: end, time: '', fee: '', free: false,
      poster: https(it.firstimage || it.firstimage2), overview: '', homepage: '', tel: stripTags(it.tel),
      source: '한국관광공사 TourAPI', sourceUrl: `https://korean.visitkorea.or.kr/detail/fes_detail.do?cotid=${it.contentid}`,
    };
    const prev = prevById.get(id);
    if (prev?.detail) Object.assign(e, { place: prev.place, time: prev.time, fee: prev.fee, free: prev.free, overview: prev.overview, homepage: prev.homepage, detail: true });
    else if (detailCalls < MAX_TOUR_DETAILS) {
      try {
        const intro = tourItems(await getJson(tourUrl('detailIntro2', { contentId: it.contentid, contentTypeId: it.contenttypeid || 15 }))).items[0] || {};
        const common = tourItems(await getJson(tourUrl('detailCommon2', { contentId: it.contentid }))).items[0] || {};
        detailCalls += 2;
        e.place = stripTags(intro.eventplace);
        e.time = stripTags(intro.playtime);
        e.fee = stripTags(intro.usetimefestival);
        e.free = isFree(e.fee);
        e.homepage = firstHref(intro.eventhomepage) || firstHref(common.homepage);
        e.overview = stripTags(common.overview).slice(0, 1200);
        if (!e.tel) e.tel = stripTags(intro.sponsor1tel);
        e.detail = true;
        await sleep(60);
      } catch (err) { console.warn(`상세 실패 ${id}: ${err.message}`); }
    }
    if (e.region) events.push(e);
  }
  console.log(`TourAPI 상세 호출 ${detailCalls}회`);
  return events;
}

/* ---------- KOPIS: 공연 ---------- */
const xmlRecords = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => m[1]);
const xv = (rec, tag) => { const m = rec.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)); return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''; };
const KOPIS = 'http://www.kopis.or.kr/openApi/restful';

async function fetchKopis(prevById) {
  const st = TODAY, ed = UNTIL; // KOPIS는 조회기간 최대 31일 → 31일 단위로 나눔
  const seen = new Map();
  for (let from = new Date(`${dash(st)}T00:00:00Z`); ymdC(from) <= ed; from = new Date(from.getTime() + 31 * 86400000)) {
    const to = new Date(Math.min(from.getTime() + 30 * 86400000, new Date(`${dash(ed)}T00:00:00Z`).getTime()));
    for (let page = 1; page <= 40; page++) {
      const xml = await getText(`${KOPIS}/pblprfr?service=${KOPIS_KEY}&stdate=${ymdC(from)}&eddate=${ymdC(to)}&cpage=${page}&rows=100`);
      if (/<returncode>/.test(xml) && !/<db>/.test(xml)) throw new Error('KOPIS 오류: ' + xml.slice(0, 300));
      const recs = xmlRecords(xml, 'db');
      for (const r of recs) seen.set(xv(r, 'mt20id'), r);
      if (recs.length < 100) break;
      await sleep(80);
    }
  }
  console.log(`KOPIS 목록 ${seen.size}건`);

  const events = []; let details = 0;
  const facilityCache = new Map();
  const recs = [...seen.values()].sort((a, b) => xv(a, 'prfpdfrom').localeCompare(xv(b, 'prfpdfrom')));
  for (const r of recs) {
    const id = `kopis-${xv(r, 'mt20id')}`;
    const e = {
      id, kind: 'performance', genre: xv(r, 'genrenm') || '공연', title: xv(r, 'prfnm'),
      region: regionOf(xv(r, 'area')), place: xv(r, 'fcltynm'), address: '', lat: null, lng: null,
      startDate: dotDate(xv(r, 'prfpdfrom')), endDate: dotDate(xv(r, 'prfpdto')),
      time: '', fee: '', free: false, poster: https(xv(r, 'poster')), overview: '', homepage: '', tel: '',
      source: 'KOPIS 공연예술통합전산망', sourceUrl: `https://www.kopis.or.kr/por/db/pblprfr/pblprfrView.do?menuId=MNU_00020&mt20Id=${xv(r, 'mt20id')}`,
    };
    const prev = prevById.get(id);
    if (prev?.detail) Object.assign(e, { time: prev.time, fee: prev.fee, free: prev.free, overview: prev.overview, homepage: prev.homepage, address: prev.address, lat: prev.lat, lng: prev.lng, detail: true });
    else if (details < MAX_KOPIS_DETAILS) {
      try {
        const d = xmlRecords(await getText(`${KOPIS}/pblprfr/${xv(r, 'mt20id')}?service=${KOPIS_KEY}`), 'db')[0] || '';
        details++;
        e.time = xv(d, 'dtguidance');
        e.fee = xv(d, 'pcseguidance');
        e.free = isFree(e.fee);
        e.overview = [xv(d, 'prfcast') && `출연: ${xv(d, 'prfcast')}`, xv(d, 'prfruntime') && `공연시간: ${xv(d, 'prfruntime')}`, xv(d, 'prfage') && `관람연령: ${xv(d, 'prfage')}`].filter(Boolean).join('\n');
        e.homepage = (d.match(/<relateurl>([^<]+)<\/relateurl>/) || [])[1] || '';
        const fid = xv(d, 'mt10id');
        if (fid) {
          if (!facilityCache.has(fid)) {
            const f = xmlRecords(await getText(`${KOPIS}/prfplc/${fid}?service=${KOPIS_KEY}`), 'db')[0] || '';
            facilityCache.set(fid, { address: xv(f, 'adres'), lat: +xv(f, 'la') || null, lng: +xv(f, 'lo') || null });
            details++;
          }
          Object.assign(e, facilityCache.get(fid));
        }
        e.detail = true;
        await sleep(60);
      } catch (err) { console.warn(`KOPIS 상세 실패 ${id}: ${err.message}`); }
    }
    if (e.region && e.startDate && e.endDate) events.push(e);
  }
  console.log(`KOPIS 상세 호출 ${details}회`);
  return events;
}

/* ---------- 실행 ---------- */
async function main() {
  mkdirSync('data', { recursive: true });
  const meta = { updatedAt: new Date().toISOString(), source: '', counts: {} };
  let events = [];

  if (!TOUR_KEY && !KOPIS_KEY) {
    events = sampleEvents(kstNow());
    meta.source = 'sample';
  } else {
    const prev = await loadPrevious();
    const prevById = new Map(prev.map(e => [e.id, e]));
    const sources = []; const errors = [];
    if (TOUR_KEY) try { events.push(...await fetchTour(prevById)); sources.push('한국관광공사 TourAPI'); } catch (e) { errors.push(e); console.error('TourAPI 실패:', e.message); }
    if (KOPIS_KEY) try { events.push(...await fetchKopis(prevById)); sources.push('KOPIS'); } catch (e) { errors.push(e); console.error('KOPIS 실패:', e.message); }
    if (!events.length) {
      // 모두 실패: 기존 파일을 그대로 두고 실패로 종료 (빈 데이터로 덮어쓰지 않음)
      console.error('가져온 이벤트가 없어 기존 데이터를 유지합니다.');
      if (prev.length) writeFileSync(OUT, JSON.stringify({ meta: { ...meta, source: 'cache' }, events: prev }));
      process.exit(1);
    }
    meta.source = sources.join(' · ');
    if (errors.length) meta.warnings = errors.map(e => e.message.slice(0, 200));
  }

  const today = dash(TODAY);
  events = events.filter(e => e.endDate >= today);
  for (const e of events) meta.counts[e.kind] = (meta.counts[e.kind] || 0) + 1;
  writeFileSync(OUT, JSON.stringify({ meta, events }, null, events.length > 300 ? 0 : 1));
  console.log(`저장: ${OUT} (${events.length}건)`, meta.counts);
}

main().catch(e => { console.error(e); process.exit(1); });
