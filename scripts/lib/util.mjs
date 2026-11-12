// 공통 유틸: HTTP(재시도·타임아웃·호스트별 속도 제한), 텍스트, 날짜(타임존), 거리.
// 외부 의존성 없음 (Node 20+ 내장 fetch).

// Wikimedia·Nominatim 정책: 앱 이름/버전 + https 연락처 URL 형식이어야 함 (형식이 다르면 Wikimedia가 429로 차단)
export const UA = 'nolgot-build/1.0 (https://github.com/dayeonoh626-cyber/nolgot)';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 호스트별 최소 간격 (요청/초 제한) ---------- */
const hostGap = new Map([
  ['nominatim.openstreetmap.org', 1100],
  ['app.ticketmaster.com', 550],      // 공식 FAQ 2 req/s 기준
  ['api.getyourguide.com', 500],
  ['api.viator.com', 300],
  ['meta.et4.de', 150],
  ['apis.data.go.kr', 60],
  ['www.kopis.or.kr', 80],
  ['openapi.seoul.go.kr', 100],
  // Wikimedia: 비로그인 API 속도 제한 → 호스트당 요청 간격 + 직렬 실행
  ['www.wikidata.org', 400],
  ['commons.wikimedia.org', 400],
  ...['en', 'ko', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'cs', 'hu', 'ca', 'ja', 'zh', 'th', 'vi', 'ms', 'id', 'tl'].map(l => [`${l}.wikipedia.org`, 400]),
  ['www.agendalx.pt', 300],
  // 3단계 (미국·호주·아시아)
  ['api.doorkeeper.jp', 1200],        // 비인증 요청 레이트 리밋이 낮다
  ['developer.nps.gov', 400],
  ['cloud.culture.tw', 300],
]);
// 3단계 소스 모듈이 쓰는 봇 User-Agent (사용자 지정 형식)
export const BOT_UA = 'NolgotBot/1.0 (+https://github.com/dayeonoh626-cyber/nolgot)';
export const BOT = { headers: { 'User-Agent': BOT_UA } };
const hostNext = new Map();
async function throttle(url) {
  let host; try { host = new URL(url).host; } catch { return; }
  const gap = hostGap.get(host) ?? 0;
  if (!gap) return;
  const now = Date.now();
  const at = Math.max(now, hostNext.get(host) ?? 0);
  hostNext.set(host, at + gap);
  if (at > now) await sleep(at - now);
}

export async function http(url, { tries = 3, timeout = 20000, headers = {}, method = 'GET', body, accept } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    await throttle(url);
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(url, {
        method, body, signal: ctl.signal, redirect: 'follow',
        headers: { 'User-Agent': UA, ...(accept ? { Accept: accept } : {}), ...headers },
      });
      const text = await res.text();
      if (process.env.DEBUG_HTTP) console.log(`  http ${res.status} ${url.slice(0, 110)}`);
      if (res.status === 429 || res.status >= 500) {
        const ra = Math.min(60, +(res.headers.get('retry-after') || 0) || (res.status === 429 ? 10 : 0));
        throw Object.assign(new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`), { retry: true, wait: ra * 1000 });
      }
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`), { status: res.status });
      return { text, res };
    } catch (e) {
      lastErr = e;
      if (e.status && e.status < 500 && e.status !== 429) break; // 4xx는 재시도 무의미
      if (i < tries - 1) await sleep(e.wait || 700 * (i + 1) * (e.retry ? 2 : 1));
    } finally { clearTimeout(t); }
  }
  throw lastErr;
}
export async function getJson(url, opts = {}) {
  const { text } = await http(url, { accept: 'application/json', ...opts });
  try { return JSON.parse(text); } catch { throw new Error(`JSON 아님: ${text.slice(0, 240)}`); }
}
export async function getText(url, opts = {}) { return (await http(url, opts)).text; }

/** 동시성 제한 map */
export async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = undefined; } }
  }));
  return out;
}

/* ---------- 텍스트 ---------- */
const ENT = { nbsp: ' ', lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", '#39': "'", hellip: '…', ndash: '–', mdash: '—', middot: '·', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’' };
export const decodeEntities = s => String(s ?? '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z0-9#]+);/gi, (m, k) => ENT[k.toLowerCase()] ?? m);
export const stripTags = s => decodeEntities(String(s ?? '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ''))
  .replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
export const clip = (s, n = 1200) => { s = String(s ?? '').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
export const firstHref = s => (String(s || '').match(/href=["']?([^"' >]+)/i) || [])[1] || (String(s || '').match(/https?:\/\/[^\s"'<]+/) || [])[0] || '';

/** https 이미지 URL만 통과. http는 https로 올려본다(대부분의 CDN이 지원). */
export function httpsUrl(u, base) {
  if (!u) return '';
  try {
    const url = new URL(String(u).trim(), base);
    if (url.protocol === 'http:') url.protocol = 'https:';
    if (url.protocol !== 'https:') return '';
    return url.href;
  } catch { return ''; }
}
export function normUrl(u) {
  if (!u) return '';
  u = String(u).trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
  try { return new URL(u).href; } catch { return ''; }
}

/** 제목 비교용 정규화 (한글·라틴·숫자만, 소문자) */
export const normTitle = s => String(s || '').toLowerCase()
  .normalize('NFKC')
  .replace(/[\[(（【〈《<].*?[\])）】〉》>]/g, ' ')
  .replace(/[^\p{L}\p{N}]+/gu, '');

/* ---------- 날짜 ---------- */
export const todayIn = tz => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const addDaysStr = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const isYmd = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
export const ymd8 = s => s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null; // 20261108
export const dotYmd = s => { const m = String(s || '').match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/); return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null; };
/** 독일식 DD.MM.YYYY / DD.MM.YY → YYYY-MM-DD */
export const deDate = s => {
  const m = String(s || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!m) return null;
  const y = m[3].length === 2 ? '20' + m[3] : m[3];
  return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};
/** 유럽식 DD/MM/YYYY (스페인·이탈리아·포르투갈) → YYYY-MM-DD */
export const dmyDate = s => {
  const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};
/** UTC ISO 시각 → 도시 타임존의 현지 날짜/시각 { date: 'YYYY-MM-DD', time: 'HH:MM' } */
export function tzParts(iso, tz) {
  const d = new Date(iso);
  if (isNaN(d)) return { date: null, time: null };
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
export const allDeDates = s => [...String(s || '').matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)].map(m => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
/** ISO(오프셋 포함)의 현지 날짜/시각 부분 */
export const isoLocalDate = s => (String(s || '').match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
export const isoLocalTime = s => { const m = String(s || '').match(/T(\d{2}):(\d{2})/); return m && !(m[1] === '00' && m[2] === '00') ? `${m[1]}:${m[2]}` : null; };

/* ---------- 유럽 공통 종류 분류 (fr/es/ca/it/pt/nl/de/en 키워드) ---------- */
// 우선순위: 가이드투어 > 워크숍 > 전시 > 공연 > (나머지) 축제·행사
const EU_TOUR = /visite[s]? guidée|balade|promenade|parcours|randonn|visita[s]? guiad|visites? guiad|visita teatral|itinerari|recorrid|ruta[s]?\b|rutes\b|percorso|passeggiata|visitas guiadas|roteiro|passeio|rondleiding|stadswandeling|führung|stadtrundgang|guided (tour|walk)|\b(walking|city|food|bike|boat|museum|gallery|night|ghost|history|audio) tour|tour guidé|\bvisite\b|\bvisita\b/i; // 단독 'tour'는 'World Tour'(콘서트)와 겹쳐 제외
const EU_WORK = /atelier|cours\b|initiation|taller|tallers|curs\b|cursos|laboratorio|laboratori\b|workshop|oficina|\bcurso\b|masterclass|cursus|werkplaats|\bkurs\b|class\b/i;
const EU_EXPO = /exposition|\bexpo\b|exposici|exposici[oó]|esposizion|mostra\b|exposiç|exposição|exposicao|tentoonstelling|ausstellung|exhibition|gallery|galerie|installation|vernissage/i;
const EU_PERF = /concert|spectacle|théâtre|theatre|théatre|danse|opéra|opera\b|cirque|humour|one.man|cinéma|projection|ciné|lecture\b|conférence|conference|récital|concierto|concerts?|teatro|teatre|danza|dansa|baile|ball\b|flamenco|zarzuela|espectacl|cine\b|projecci|proyecci|cuentacuentos|títeres|marionet|recital|conferenci|confer[eèé]nci|xerrad|colloqui|col·loqui|lectures|charla|presentaci|concerto|spettacolo|danza|cinema|proiezion|incontro|reading|concerto|espetáculo|teatro|música|musica|fado|dança|cinema|conferência|sessão|performance|comedy|talk|screening|music|dance|jazz|orchestr|symphon|ballet|musical|voorstelling|toneel|theater|optreden|konzert|\bdj\b|techno|electro|house music|soirée|clubbing|\brave\b/i;
const EU_FEST = /festival|fête|fete\b|fiesta|festa|feira|fira\b|fires\b|marché|mercado|mercat|mercatino|markt|market|salon\b|carnaval|carnival|christmas|noël|navidad|nadal|natale|natal|kermis|braderie|brocante|parade|desfile|cavalcada|cercavila|correfoc/i;

/** 텍스트(분류·키워드·제목)로 kind 추정 */
export function kindEu(text, fallback = 'festival') {
  const t = String(text || '');
  if (EU_TOUR.test(t)) return 'tour';
  if (EU_WORK.test(t)) return 'workshop';
  if (EU_EXPO.test(t)) return 'exhibition';
  if (EU_PERF.test(t)) return 'performance';
  if (EU_FEST.test(t)) return 'festival';
  return fallback;
}
/* ---------- 아시아(중·일) 종류 분류 — 영어 키워드는 kindEu 로 넘긴다 ---------- */
const AS_TOUR = /導覽|导览|導賞|导赏|ガイドツアー|ツアー|まち歩き|街歩き|散策|見学会|走讀|走读|遊程|游程/;
const AS_WORK = /講座|讲座|工作坊|ワークショップ|体験|體驗|体验|教室|課程|课程|研習|研习|講習|讲习|手作|手作り|DIY|セミナー|勉強会|もくもく会|ハンズオン|學習|学習|講演会|讲座|親子活動|說故事|故事/;
const AS_EXPO = /展覽|展览|展示|展覧|特展|個展|个展|聯展|联展|企画展|写真展|美術展|作品展|展$|^展|》展|」展|博物館.*展|展出/;
const AS_PERF = /演出|音樂會|音乐会|演唱會|演唱会|演奏|戲劇|戏剧|舞蹈|舞劇|歌劇|歌剧|粵劇|粤剧|京劇|劇場|剧场|公演|コンサート|ライブ|リサイタル|上映|映画|電影|电影|落語|狂言|能楽|歌舞伎|舞台|ミュージカル|音楽祭|合唱|樂團|乐团|交響|交响/;
const AS_FEST = /祭|節|节|フェス|フェスタ|市集|マルシェ|市場|嘉年華|嘉年华|花火|燈會|灯会|イルミネーション|パレード|フェア|博覧会|博覽會/;
export function kindAsia(text, fallback = 'festival') {
  const t = String(text || '');
  if (AS_TOUR.test(t)) return 'tour';
  if (AS_PERF.test(t)) return 'performance';
  if (AS_EXPO.test(t)) return 'exhibition';
  if (AS_WORK.test(t)) return 'workshop';
  if (AS_FEST.test(t)) return 'festival';
  return kindEu(t, fallback);
}
export const GENRE_KO = { tour: '가이드 투어', workshop: '워크숍·클래스', exhibition: '전시', performance: '공연', festival: '축제·행사', audioguide: '오디오 가이드' };
export const GENRE_EN = { tour: 'Guided tour', workshop: 'Workshop', exhibition: 'Exhibition', performance: 'Performance', festival: 'Festival & event', audioguide: 'Audio guide' };

/* ---------- 지리 ---------- */
export function km(a, b) {
  const R = 6371, t = x => x * Math.PI / 180;
  const h = Math.sin(t(b.lat - a.lat) / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(t(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const validLatLng = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
/** 위경도가 뒤바뀌어 들어온 경우(한국 데이터에서 흔함) 바로잡기 */
export function fixLatLng(lat, lng, city) {
  lat = parseFloat(lat); lng = parseFloat(lng);
  if (!validLatLng(lat, lng)) return [null, null];
  if (city && km({ lat, lng }, city) > 400 && km({ lat: lng, lng: lat }, city) < 400) [lat, lng] = [lng, lat];
  return [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6];
}

/** 같은 이벤트의 여러 회차(날짜별 레코드)를 하나로 합친다 */
export function mergeOccurrences(list, keyFn) {
  const map = new Map();
  for (const e of list) {
    const k = keyFn(e);
    const cur = map.get(k);
    if (!cur) { map.set(k, { ...e, _occ: [e.startDate] }); continue; }
    if (e.startDate < cur.startDate) { cur.startDate = e.startDate; cur.startTime = e.startTime ?? cur.startTime; }
    if (e.endDate > cur.endDate) cur.endDate = e.endDate;
    cur._occ.push(e.startDate);
    for (const [f, v] of Object.entries(e)) if (cur[f] == null || cur[f] === '') cur[f] = v;
  }
  return [...map.values()].map(e => {
    const n = new Set(e._occ).size; delete e._occ;
    if (n > 1 && e.startTime) { e.time = e.time || `${e.startTime} (${n}회 / ${n} dates)`; delete e.startTime; }
    return e;
  });
}

export const log = (...a) => console.log(...a);
