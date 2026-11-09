// 대한민국 소스 모듈.
//   TOUR_API_KEY   한국관광공사 TourAPI KorService2 + EngService2 (축제·행사, 영문)   data.go.kr
//                  같은 키로 한국문화정보원 '한눈에보는문화정보'(cultureinfo/period2: 공연·전시)도 조회 (별도 활용신청 필요)
//   CULTURE_API_KEY (선택) 위 문화정보 서비스용 키가 다를 때
//   KOPIS_API_KEY  공연예술통합전산망 KOPIS (공연)                                    kopis.or.kr
//   SEOUL_API_KEY  서울 열린데이터광장 culturalEventInfo (공연·전시·축제·교육)          data.seoul.go.kr
//                  — 키가 없으면 공개 'sample' 키로 최신 5건만 받는다.
// 모든 소스는 실제 이미지 URL만 쓴다(TourAPI firstimage, KOPIS poster, 문화정보 thumbnail, 서울 MAIN_IMG).
import { getJson, getText, stripTags, clip, firstHref, httpsUrl, ymd8, dotYmd, addDaysStr, todayIn, fixLatLng, km, sleep } from '../lib/util.mjs';

const env = k => process.env[k]?.trim() || '';
const TZ = 'Asia/Seoul';

const REGION_RULES = [
  [/^(서울|Seoul)/i, '서울'], [/^(부산|Busan)/i, '부산'], [/^(대구|Daegu)/i, '대구'], [/^(인천|Incheon)/i, '인천'], [/^(광주|Gwangju)/i, '광주'], [/^(대전|Daejeon)/i, '대전'],
  [/^(울산|Ulsan)/i, '울산'], [/^(세종|Sejong)/i, '세종'], [/^(경기|Gyeonggi)/i, '경기'], [/^(강원|Gangwon)/i, '강원'],
  [/^(충청북|충북|Chungcheongbuk|Chungbuk)/i, '충북'], [/^(충청남|충남|Chungcheongnam|Chungnam)/i, '충남'],
  [/^(전라북|전북|Jeollabuk|Jeonbuk)/i, '전북'], [/^(전라남|전남|Jeollanam|Jeonnam)/i, '전남'],
  [/^(경상북|경북|Gyeongsangbuk|Gyeongbuk)/i, '경북'], [/^(경상남|경남|Gyeongsangnam|Gyeongnam)/i, '경남'], [/^(제주|Jeju)/i, '제주'],
];
const regionOf = addr => {
  const a = String(addr || '').trim();
  for (const [re, r] of REGION_RULES) if (re.test(a)) return r;
  // 영문 주소는 시·도가 뒤에 온다 ("..., Jung-gu, Seoul")
  for (const [re, r] of REGION_RULES) if (new RegExp(re.source.replace('^', '\\b'), 'i').test(a)) return r;
  return null;
};
const isFree = fee => !!fee && /무료|free/i.test(fee) && !/\d[\d,]*\s*원/.test(fee);

const GENRE_EN = {
  '연극': 'Theater', '뮤지컬': 'Musical', '서양음악(클래식)': 'Classical music', '한국음악(국악)': 'Korean traditional music',
  '대중음악': 'Popular music', '무용(서양/한국무용)': 'Dance', '대중무용': 'Street dance', '서커스/마술': 'Circus & magic',
  '복합': 'Mixed genre', '무용': 'Dance', '클래식': 'Classical music', '오페라': 'Opera', '콘서트': 'Concert', '전통공연': 'Traditional performance',
  '축제': 'Festival', '문화관광축제': 'Cultural festival', '축제·행사': 'Festival', '전시회': 'Exhibition', '전시/미술': 'Exhibition', '전시': 'Exhibition', '미술': 'Art exhibition',
  '박람회': 'Expo', '영화': 'Film', '스포츠': 'Sports', '행사': 'Event', '공연': 'Performance', '국악': 'Korean traditional music',
  '교육/체험': 'Class & workshop', '뮤지컬/오페라': 'Musical & opera', '독주/독창회': 'Recital', '축제-문화/예술': 'Arts festival',
  '축제-전통/역사': 'Traditional festival', '축제-자연/경관': 'Nature festival', '축제-시민화합': 'Community festival', '축제-기타': 'Festival',
  '음악': 'Music', '사진': 'Photography', '기타': 'Other',
};

/* ================= TourAPI ================= */
const TOUR_BASE = env('TOUR_API_BASE') || 'https://apis.data.go.kr/B551011/KorService2';
const ENG_BASE = env('TOUR_API_ENG_BASE') || TOUR_BASE.replace(/KorService\d*/, 'EngService2');
const TOUR_CAT = {
  A02070100: ['festival', '문화관광축제'], A02070200: ['festival', '축제'],
  A02080100: ['performance', '전통공연'], A02080200: ['performance', '연극'], A02080300: ['performance', '뮤지컬'],
  A02080400: ['performance', '오페라'], A02080500: ['exhibition', '전시회'], A02080600: ['festival', '박람회'],
  A02080800: ['performance', '무용'], A02080900: ['performance', '클래식'], A02081000: ['performance', '콘서트'],
  A02081100: ['festival', '영화'], A02081200: ['festival', '스포츠'], A02081300: ['festival', '행사'],
};
const tourItems = j => {
  const h = j?.response?.header; const b = j?.response?.body;
  if (h?.resultCode && h.resultCode !== '0000') throw new Error(`TourAPI ${h.resultCode} ${h.resultMsg}`);
  const it = b?.items?.item; return { items: it ? (Array.isArray(it) ? it : [it]) : [], total: +(b?.totalCount || 0) };
};
const tourUrl = (op, params, base = TOUR_BASE) => `${base}/${op}?${new URLSearchParams({ serviceKey: env('TOUR_API_KEY'), MobileOS: 'ETC', MobileApp: 'nolgot', _type: 'json', ...params })}`;

async function lclsNames(base) {
  const m = new Map();
  try {
    const { items } = tourItems(await getJson(tourUrl('lclsSystmCode2', { numOfRows: 2000, pageNo: 1, lclsSystmListYn: 'Y' }, base), { tries: 1 }));
    for (const it of items) for (const lv of [1, 2, 3]) if (it[`lclsSystm${lv}Cd`] && it[`lclsSystm${lv}Nm`]) m.set(it[`lclsSystm${lv}Cd`], it[`lclsSystm${lv}Nm`]);
  } catch { /* 코드표 없으면 기본값 */ }
  return m;
}
function tourGenre(it, lcls) {
  if (TOUR_CAT[it.cat3]) return TOUR_CAT[it.cat3];
  const name = lcls.get(it.lclsSystm3) || lcls.get(it.lclsSystm2) || '';
  if (/전시|exhibit/i.test(name)) return ['exhibition', name];
  if (/공연|연극|뮤지컬|콘서트|음악|무용|perform|concert|musical|theat/i.test(name)) return ['performance', name];
  return ['festival', name || '축제·행사'];
}
async function listFestivals(base, today) {
  const list = [];
  for (let page = 1; page <= 30; page++) {
    const { items, total } = tourItems(await getJson(tourUrl('searchFestival2', { numOfRows: 100, pageNo: page, arrange: 'A', eventStartDate: today.replace(/-/g, '') }, base)));
    list.push(...items);
    if (list.length >= total || !items.length) break;
  }
  return list;
}

async function tourapi(ctx) {
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const list = await listFestivals(TOUR_BASE, today);
  const lcls = await lclsNames(TOUR_BASE);
  let calls = 0; const max = +(process.env.MAX_TOUR_DETAILS || 250);
  const out = [];
  list.sort((a, b) => String(a.eventstartdate).localeCompare(String(b.eventstartdate)));
  for (const it of list) {
    const start = ymd8(it.eventstartdate), end = ymd8(it.eventenddate) || start;
    if (!start || start > until) continue;
    const id = `tour-${it.contentid}`;
    const [kind, genre] = tourGenre(it, lcls);
    const e = {
      id, kind, genre, genreEn: GENRE_EN[genre], sourceKey: 'tourapi', title: stripTags(it.title),
      _region: regionOf(it.addr1), address: [it.addr1, it.addr2].filter(Boolean).join(' ').trim(), place: '',
      lat: it.mapy ? +it.mapy : null, lng: it.mapx ? +it.mapx : null,
      startDate: start, endDate: end, tz: TZ, time: '', fee: '', free: false,
      poster: httpsUrl(it.firstimage || it.firstimage2), posterCredit: it.firstimage ? '한국관광공사' : undefined,
      overview: '', homepage: '', tel: stripTags(it.tel),
      source: '한국관광공사 TourAPI', sourceUrl: `https://korean.visitkorea.or.kr/detail/fes_detail.do?cotid=${it.contentid}`,
    };
    const prev = ctx.prevById.get(id);
    if (prev?.detail) Object.assign(e, pick(prev, ['place', 'time', 'fee', 'free', 'overview', 'homepage', 'detail']));
    else if (calls < max) {
      try {
        const intro = tourItems(await getJson(tourUrl('detailIntro2', { contentId: it.contentid, contentTypeId: it.contenttypeid || 15 }))).items[0] || {};
        const common = tourItems(await getJson(tourUrl('detailCommon2', { contentId: it.contentid }))).items[0] || {};
        calls += 2;
        e.place = stripTags(intro.eventplace); e.time = stripTags(intro.playtime); e.fee = stripTags(intro.usetimefestival);
        e.free = isFree(e.fee); e.homepage = firstHref(intro.eventhomepage) || firstHref(common.homepage);
        e.overview = clip(stripTags(common.overview), 1200); if (!e.tel) e.tel = stripTags(intro.sponsor1tel);
        e.detail = true;
      } catch (err) { ctx.warn(null, `TourAPI 상세 ${id}: ${err.message.slice(0, 100)}`); }
    }
    out.push(e);
  }
  if (env('ENABLE_EN') !== '0') {
    try { await addEnglish(out, ctx, today, until); } catch (err) { ctx.warn(null, `EngService2: ${err.message.slice(0, 160)}`); }
  }
  return out;
}

async function addEnglish(events, ctx, today, until) {
  const list = await listFestivals(ENG_BASE, today);
  const kor = events.filter(e => e.lat != null);
  let calls = 0; const max = +(process.env.MAX_EN_DETAILS || 150);
  for (const it of list) {
    const start = ymd8(it.eventstartdate), end = ymd8(it.eventenddate) || start;
    if (!start || start > until) continue;
    const pos = it.mapy ? { lat: +it.mapy, lng: +it.mapx } : null;
    const en = { titleEn: stripTags(it.title), addressEn: [it.addr1, it.addr2].filter(Boolean).join(' ').trim(), genreEn: 'Festival' };
    const enId = `tour-en-${it.contentid}`;
    const prev = ctx.prevById.get(enId) || ctx.prevByEnSource.get(enId);
    if (prev?.enDetail) Object.assign(en, pick(prev, ['placeEn', 'timeEn', 'feeEn', 'overviewEn']), { enDetail: true });
    else if (calls < max) {
      try {
        const intro = tourItems(await getJson(tourUrl('detailIntro2', { contentId: it.contentid, contentTypeId: it.contenttypeid || 85 }, ENG_BASE))).items[0] || {};
        const common = tourItems(await getJson(tourUrl('detailCommon2', { contentId: it.contentid }, ENG_BASE))).items[0] || {};
        calls += 2;
        Object.assign(en, { placeEn: stripTags(intro.eventplace), timeEn: stripTags(intro.playtime), feeEn: stripTags(intro.usetimefestival), overviewEn: clip(stripTags(common.overview), 1200), enDetail: true });
      } catch { /* 무시 */ }
    }
    const match = pos && kor.find(k => k.startDate === start && k.endDate === end && km(k, pos) <= 0.7);
    if (match) { Object.assign(match, en, { enSourceId: enId }); continue; }
    events.push({
      id: enId, kind: 'festival', genre: '축제·행사', sourceKey: 'tourapi', enOnly: true, _region: regionOf(it.addr1),
      title: en.titleEn, address: en.addressEn, place: en.placeEn || '', lat: pos?.lat ?? null, lng: pos?.lng ?? null,
      startDate: start, endDate: end, tz: TZ, time: en.timeEn || '', fee: en.feeEn || '', free: /free/i.test(en.feeEn || '') && !/\d/.test(en.feeEn || ''),
      poster: httpsUrl(it.firstimage || it.firstimage2), posterCredit: it.firstimage ? 'Korea Tourism Organization' : undefined,
      overview: en.overviewEn || '', tel: stripTags(it.tel), source: 'Korea Tourism Organization TourAPI (English)', ...en,
    });
  }
}

/* ================= KOPIS ================= */
const KOPIS = 'http://www.kopis.or.kr/openApi/restful';
const xmlRecs = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => m[1]);
const xv = (rec, tag) => { const m = rec.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')); return m ? stripTags(m[1].replace(/<!\[CDATA\[|\]\]>/g, '')) : ''; };

async function kopis(ctx) {
  const key = env('KOPIS_API_KEY');
  const today = todayIn(TZ), until = addDaysStr(today, Math.min(ctx.daysAhead, 93));
  const seen = new Map();
  for (let from = today; from <= until; from = addDaysStr(from, 31)) {
    const to = addDaysStr(from, 30) < until ? addDaysStr(from, 30) : until;
    for (let page = 1; page <= 40; page++) {
      const xml = await getText(`${KOPIS}/pblprfr?service=${key}&stdate=${from.replace(/-/g, '')}&eddate=${to.replace(/-/g, '')}&cpage=${page}&rows=100`);
      const recs = xmlRecs(xml, 'db');
      if (recs.length && !xv(recs[0], 'mt20id')) throw new Error('KOPIS 오류: ' + recs[0].replace(/\s+/g, ' ').slice(0, 200));
      for (const r of recs) seen.set(xv(r, 'mt20id'), r);
      if (recs.length < 100) break;
    }
  }
  const out = []; let calls = 0; const max = +(process.env.MAX_KOPIS_DETAILS || 400);
  const fac = new Map();
  for (const r of [...seen.values()].sort((a, b) => xv(a, 'prfpdfrom').localeCompare(xv(b, 'prfpdfrom')))) {
    const mt = xv(r, 'mt20id'); const id = `kopis-${mt}`; const genre = xv(r, 'genrenm') || '공연';
    const e = {
      id, kind: 'performance', genre, genreEn: GENRE_EN[genre], sourceKey: 'kopis', title: xv(r, 'prfnm'),
      _region: regionOf(xv(r, 'area')), place: xv(r, 'fcltynm'), address: '', lat: null, lng: null,
      startDate: dotYmd(xv(r, 'prfpdfrom')), endDate: dotYmd(xv(r, 'prfpdto')), tz: TZ,
      time: '', fee: '', free: false, poster: httpsUrl(xv(r, 'poster')), posterCredit: 'KOPIS', overview: '', homepage: '',
      source: 'KOPIS 공연예술통합전산망', sourceUrl: `https://www.kopis.or.kr/por/db/pblprfr/pblprfrView.do?menuId=MNU_00020&mt20Id=${mt}`,
    };
    const prev = ctx.prevById.get(id);
    if (prev?.detail) Object.assign(e, pick(prev, ['time', 'fee', 'free', 'overview', 'homepage', 'bookingUrl', 'address', 'lat', 'lng', 'detail']));
    else if (calls < max) {
      try {
        const d = xmlRecs(await getText(`${KOPIS}/pblprfr/${mt}?service=${key}`), 'db')[0] || ''; calls++;
        e.time = xv(d, 'dtguidance'); e.fee = xv(d, 'pcseguidance'); e.free = isFree(e.fee);
        e.overview = [xv(d, 'prfcast') && `출연: ${xv(d, 'prfcast')}`, xv(d, 'prfruntime') && `공연시간: ${xv(d, 'prfruntime')}`, xv(d, 'prfage') && `관람연령: ${xv(d, 'prfage')}`].filter(Boolean).join('\n');
        e.bookingUrl = (d.match(/<relateurl>([^<]+)<\/relateurl>/) || [])[1] || '';
        const fid = xv(d, 'mt10id');
        if (fid) {
          if (!fac.has(fid)) { const f = xmlRecs(await getText(`${KOPIS}/prfplc/${fid}?service=${key}`), 'db')[0] || ''; calls++; fac.set(fid, { address: xv(f, 'adres'), lat: +xv(f, 'la') || null, lng: +xv(f, 'lo') || null }); }
          Object.assign(e, fac.get(fid));
        }
        e.detail = true;
      } catch (err) { ctx.warn(null, `KOPIS 상세 ${id}: ${err.message.slice(0, 100)}`); }
    }
    if (e.startDate && e.endDate) out.push(e);
  }
  return out;
}

/* ================= 한국문화정보원 한눈에보는문화정보 (공연·전시) ================= */
// 엔드포인트 존재는 확인(가짜 키 → 'SERVICE_KEY_IS_NOT_REGISTERED'). 응답 필드명은 구 culture.go.kr API 기준(미검증) → 방어적으로 파싱.
const CULTURE_BASE = env('CULTURE_API_BASE') || 'https://apis.data.go.kr/B553457/cultureinfo';
function cultureKind(realm) {
  if (/미술|전시|사진|공예|디자인/.test(realm)) return 'exhibition';
  if (/교육|체험|강좌|워크숍/.test(realm)) return 'workshop';
  if (/축제|행사/.test(realm)) return 'festival';
  return 'performance';
}
async function cultureinfo(ctx) {
  const key = env('CULTURE_API_KEY') || env('TOUR_API_KEY');
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const out = [];
  const maxPages = +(process.env.CULTURE_MAX_PAGES || 15);
  for (let page = 1; page <= maxPages; page++) {
    const xml = await getText(`${CULTURE_BASE}/period2?${new URLSearchParams({ serviceKey: key, from: today.replace(/-/g, ''), to: until.replace(/-/g, ''), cPage: String(page), rows: '100', sortStdr: '1' })}`);
    if (/<errMsg>|SERVICE_KEY|returnReasonCode/.test(xml) && !/<item>|<perforList>/.test(xml)) throw new Error('문화정보 API: ' + stripTags(xml).slice(0, 160));
    const recs = [...xmlRecs(xml, 'item'), ...xmlRecs(xml, 'perforList')];
    for (const r of recs) {
      const seq = xv(r, 'seq'); const title = xv(r, 'title');
      if (!seq || !title) continue;
      const realm = xv(r, 'realmName');
      const [lat, lng] = fixLatLng(xv(r, 'gpsY'), xv(r, 'gpsX'), { lat: 36.5, lng: 127.8 });
      out.push({
        id: `culture-${seq}`, kind: cultureKind(realm), genre: realm || '문화', genreEn: GENRE_EN[realm], sourceKey: 'cultureinfo',
        title, _region: regionOf(xv(r, 'area')), place: xv(r, 'place'), address: [xv(r, 'area'), xv(r, 'sigungu')].filter(Boolean).join(' '),
        lat, lng, startDate: ymd8(xv(r, 'startDate')) || dotYmd(xv(r, 'startDate')), endDate: ymd8(xv(r, 'endDate')) || dotYmd(xv(r, 'endDate')), tz: TZ,
        poster: httpsUrl(xv(r, 'thumbnail') || xv(r, 'imgUrl')), posterCredit: '한국문화정보원',
        fee: xv(r, 'price'), free: isFree(xv(r, 'price')), homepage: xv(r, 'url'),
        source: '한국문화정보원 한눈에보는문화정보', sourceUrl: `https://www.culture.go.kr/oneeye/oneEyeView.do?seq=${seq}`,
      });
    }
    if (recs.length < 100) break;
  }
  return out.filter(e => e.startDate && e.endDate);
}

/* ================= 서울 열린데이터광장 culturalEventInfo ================= */
function seoulKind(code) {
  if (/전시|미술/.test(code)) return 'exhibition';
  if (/교육|체험/.test(code)) return 'workshop';
  if (/축제/.test(code)) return 'festival';
  if (/영화/.test(code)) return 'performance';
  if (/기타/.test(code)) return 'festival';
  return 'performance';
}
async function seoulCulture(ctx) {
  const key = env('SEOUL_API_KEY') || 'sample';
  const step = key === 'sample' ? 5 : 1000;
  const maxRows = key === 'sample' ? 5 : +(process.env.SEOUL_MAX_ROWS || 5000);
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const out = [];
  for (let s = 1; s <= maxRows; s += step) {
    const j = await getJson(`http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/culturalEventInfo/${s}/${s + step - 1}/`);
    const body = j.culturalEventInfo;
    if (!body) { const r = j.RESULT || {}; if (r.CODE === 'INFO-200') break; throw new Error(`서울 API ${r.CODE} ${r.MESSAGE}`); }
    for (const r of body.row || []) {
      const start = (r.STRTDATE || '').slice(0, 10), end = (r.END_DATE || '').slice(0, 10) || start;
      if (!start || end < today || start > until) continue;
      const [lat, lng] = fixLatLng(r.LAT, r.LOT, { lat: 37.5665, lng: 126.978 });
      const fee = stripTags(r.USE_FEE);
      const idm = String(r.HMPG_ADDR || '').match(/cultcode=(\d+)/);
      out.push({
        id: `seoul-${idm ? idm[1] : (r.TITLE + start).replace(/\W+/g, '').slice(0, 40)}`, kind: seoulKind(r.CODENAME || ''), sourceKey: 'seoul',
        genre: r.CODENAME, genreEn: GENRE_EN[r.CODENAME], title: stripTags(r.TITLE), _region: '서울',
        place: stripTags(r.PLACE), address: r.GUNAME ? `서울특별시 ${r.GUNAME}` : '', lat, lng,
        startDate: start, endDate: end, tz: TZ, time: r.PRO_TIME || '', startTime: /^\d{1,2}:\d{2}$/.test(r.PRO_TIME || '') ? r.PRO_TIME.padStart(5, '0') : undefined,
        fee, free: r.IS_FREE === '무료' || isFree(fee),
        poster: httpsUrl(String(r.MAIN_IMG || '').replace(/&thumb=Y$/i, '')), posterCredit: r.MAIN_IMG ? '서울시 문화포털' : undefined,
        overview: clip([r.PROGRAM, r.PLAYER && `출연: ${r.PLAYER}`, r.USE_TRGT && `대상: ${r.USE_TRGT}`, r.ETC_DESC].filter(Boolean).map(stripTags).join('\n'), 900),
        homepage: r.ORG_LINK || '', bookingUrl: r.ORG_LINK || undefined, tel: r.INQUIRY || '',
        source: '서울 열린데이터광장 문화행사', sourceUrl: r.HMPG_ADDR || '',
      });
    }
    if ((body.row || []).length < step) break;
  }
  return out;
}

/* ================= 모듈 진입점 ================= */
function pick(o, keys) { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = o[k]; return r; }

export const SOURCES = [
  { key: 'tourapi', name: '한국관광공사 TourAPI (KorService2/EngService2)', need: ['TOUR_API_KEY'], fn: tourapi, licence: '공공누리 (출처표시) — 한국관광공사', url: 'https://www.data.go.kr/data/15101578/openapi.do' },
  { key: 'kopis', name: 'KOPIS 공연예술통합전산망', need: ['KOPIS_API_KEY'], fn: kopis, licence: 'KOPIS 이용약관 (출처표시)', url: 'https://www.kopis.or.kr/por/cs/openapi/openApiList.do?menuId=MNU_00074' },
  { key: 'cultureinfo', name: '한국문화정보원 한눈에보는문화정보', need: ['CULTURE_API_KEY|TOUR_API_KEY'], fn: cultureinfo, licence: '공공누리 (출처표시) — 한국문화정보원', url: 'https://www.data.go.kr/ (한눈에보는문화정보조회서비스)' },
  { key: 'seoul', name: '서울 열린데이터광장 문화행사 정보', need: [], fn: seoulCulture, licence: '공공누리 1유형 (출처표시) — 서울특별시', url: 'https://data.seoul.go.kr/dataList/OA-15486/S/1/datasetView.do' },
];

/**
 * @returns {{ events: object[], status: object[] }} — events에는 cityId가 채워져 있다.
 */
export async function fetchCountry(cities, ctx) {
  const byLocal = new Map(cities.map(c => [c.local, c]));
  const events = []; const status = [];
  for (const s of SOURCES) {
    const ok = s.need.every(n => n.split('|').some(k => env(k)));
    if (!ok) { status.push({ key: s.key, name: s.name, enabled: false, reason: `키 없음 (${s.need.join(', ')})` }); continue; }
    const t0 = Date.now();
    try {
      const list = await s.fn(ctx);
      let placed = 0;
      for (const e of list) {
        let city = byLocal.get(e._region);
        // 시·도 정보가 없으면 좌표로 가장 가까운 도시 배정
        if (!city && e.lat != null) city = cities.map(c => [c, km(c, e)]).filter(([c, d]) => d <= c.radiusKm * 1.3).sort((a, b) => a[1] - b[1])[0]?.[0];
        delete e._region;
        if (!city) continue;
        e.cityId = city.id; e.tz ||= city.tz; events.push(e); placed++;
      }
      status.push({ key: s.key, name: s.name, enabled: true, ok: true, count: placed, ms: Date.now() - t0, licence: s.licence, url: s.url });
    } catch (err) {
      status.push({ key: s.key, name: s.name, enabled: true, ok: false, error: err.message.slice(0, 200), licence: s.licence, url: s.url });
    }
  }
  return { events, status };
}
export { sleep };
