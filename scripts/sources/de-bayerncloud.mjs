// BayernCloud Tourismus — "Aktuelle Open Data Veranstaltungen" (Bayern Tourismus Marketing GmbH, via open.bydata / GovData)
//   DCAT 배포 파일: https://data.bayerncloud.digital/dcat/36a736f7-9e2d-4be5-b0f0-45ada2ff7013.jsonld  (~120MB JSON-LD, 월 1회 정도 갱신)
//   API(api/v4/endpoints/...)는 토큰이 필요하지만 이 DCAT 덤프는 키 없이 공개. 항목별 라이선스 CC0 / CC BY 4.0 / CC BY-SA 4.0.
//   그래프가 평탄화돼 있어(@graph 안에 Event·Place·ImageObject·skos:Concept가 @id 참조로 연결) 이벤트를 먼저 모아 두고
//   장소·이미지·분류가 나온 뒤 조인한다. 120MB를 문자열 하나로 올리지 않도록 @graph 원소 단위로 스트리밍 파싱.
import { UA, sleep, stripTags, clip, httpsUrl, normUrl, todayIn, addDaysStr, isoLocalDate, isoLocalTime, fixLatLng, km, mergeOccurrences, kindEu, GENRE_KO, GENRE_EN } from '../lib/util.mjs';

const URL_DCAT = 'https://data.bayerncloud.digital/dcat/36a736f7-9e2d-4be5-b0f0-45ada2ff7013.jsonld';
const TZ = 'Europe/Berlin';
const OPEN_LIC = /creativecommons\.org\/(licenses\/by(-sa)?\/|publicdomain\/zero\/)/i; // NC·ND 제외

/** {"@context":..,"meta":..,"@graph":[ {...}, ... ]} 에서 @graph 원소를 하나씩 onItem(obj)로 넘긴다 */
async function streamGraph(url, onItem, { timeout = 420000 } = {}) {
  let res, lastErr;
  for (let i = 0; i < 2; i++) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
    try {
      res = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': UA } });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      res._t = t; break;
    } catch (e) { clearTimeout(t); lastErr = e; res = null; await sleep(3000); }
  }
  if (!res) throw lastErr;
  const dec = new TextDecoder('utf-8');
  let buf = '', found = false, depth = 0, inStr = false, esc = false, start = -1, items = 0;
  try {
    for await (const chunk of res.body) {
      const base = buf.length;
      buf += dec.decode(chunk, { stream: true });
      let i = base;
      if (!found) {
        const k = buf.indexOf('"@graph"');
        if (k < 0) { buf = buf.slice(-20); continue; }
        const b = buf.indexOf('[', k); if (b < 0) continue;
        found = true; buf = buf.slice(b + 1); i = 0; depth = 0;
      }
      for (; i < buf.length; i++) {
        const ch = buf.charCodeAt(i);
        if (inStr) { if (esc) esc = false; else if (ch === 92) esc = true; else if (ch === 34) inStr = false; continue; }
        if (ch === 34) { inStr = true; continue; }
        if (ch === 123 || ch === 91) { if (depth === 0) start = i; depth++; }
        else if (ch === 125 || ch === 93) {
          if (depth === 0) { i = buf.length; break; } // @graph 끝
          depth--;
          if (depth === 0 && start >= 0) {
            let obj = null; try { obj = JSON.parse(buf.slice(start, i + 1)); } catch { /* 깨진 원소 무시 */ }
            if (obj) { items++; onItem(obj); }
            buf = buf.slice(i + 1); i = -1; start = -1;
          }
        }
      }
      if (start < 0 && depth === 0) buf = '';
    }
  } finally { clearTimeout(res._t); }
  return items;
}

const types = x => [].concat(x['@type'] || []);
const ref = v => [].concat(v || []).map(r => (r && typeof r === 'object' ? r['@id'] : r)).filter(Boolean);
const licName = u => /zero/.test(u) ? 'CC0' : /by-sa/.test(u) ? 'CC BY-SA 4.0' : /by\//.test(u) ? 'CC BY 4.0' : u;

export async function bayernCloud(cities, ctx) {
  const targets = cities.filter(c => ['munich', 'nuremberg'].includes(c.id));
  if (!targets.length) return [];
  const today = todayIn(TZ), until = addDaysStr(today, ctx.daysAhead);
  const events = [], places = new Map(), images = new Map(), concepts = new Map();
  const n = await streamGraph(URL_DCAT, x => {
    const ty = types(x);
    if (ty.includes('Event')) {
      const end = isoLocalDate(x.endDate) || isoLocalDate(x.startDate);
      const start = isoLocalDate(x.startDate);
      if (!start || end < today || start > until) return;
      const lic = x.sdLicense || x['cc:license'] || '';
      if (!OPEN_LIC.test(lic)) return;
      events.push({
        id: x['@id'], name: x.name, start, end, startRaw: x.startDate, lic, notice: x.copyrightNotice,
        desc: x.description, url: [].concat(x.sameAs || [])[0], loc: ref(x.location)[0], img: ref(x.image), cls: ref(x['dc:classification']),
        sched: [].concat(x.eventSchedule || []).map(s => ({ start: s.startDate, end: s.endDate, time: s.startTime, freq: s.repeatFrequency })),
      });
    } else if (ty.includes('Place')) {
      if (x.geo?.latitude != null) places.set(x['@id'], { name: x.name, lat: x.geo.latitude, lng: x.geo.longitude, a: x.address || {} });
    } else if (ty.includes('ImageObject')) {
      if (x.contentUrl) images.set(x['@id'], { url: x.contentUrl, thumb: x.thumbnailUrl, lic: x.license || x['cc:license'] || '', notice: x.copyrightNotice || x.author?.name || '' });
    } else if (ty.includes('skos:Concept')) {
      if (x['skos:prefLabel']) concepts.set(x['@id'], x['skos:prefLabel']);
    }
  });
  if (!n) throw new Error('BayernCloud: @graph 비어 있음');

  const out = [];
  for (const e of events) {
    const p = places.get(e.loc); if (!p) continue;
    const city = targets.find(c => km({ lat: p.lat, lng: p.lng }, c) <= c.radiusKm); if (!city) continue;
    const labels = e.cls.map(id => concepts.get(id)).filter(Boolean);
    const labelText = labels.filter(l => !/^(Veranstaltung(en)?( & Erlebnisse)?|aktuell|CC .*|Teilnahme .*|Oberbayern|Mittelfranken|Landeshauptstadt München|Münchener Umland)$/.test(l)).join(' ');
    const kind = /Ausstellung/.test(labelText) ? 'exhibition' : kindEu(`${labelText} ${e.name}`, kindEu(stripTags(e.desc || '').slice(0, 300), 'festival'));
    const img = e.img.map(id => images.get(id)).find(i => i && (OPEN_LIC.test(i.lic) || !i.lic));
    const [lat, lng] = fixLatLng(p.lat, p.lng, city);
    const s0 = e.sched[0];
    const single = e.sched.length <= 1 && !s0?.freq && e.start === e.end;
    const genre = labels.find(l => /Ausstellung|Konzert|Führung|Theater|Markt|Kurs|Lesung|Vortrag|Fest|Kinder|Musik/.test(l));
    out.push({
      id: `bycloud-${e.id}`, kind, cityId: city.id, sourceKey: 'bayerncloud',
      title: stripTags(e.name), genre: genre || GENRE_KO[kind], genreEn: GENRE_EN[kind],
      place: p.name || '', address: [p.a.streetAddress, [p.a.postalCode, p.a.addressLocality].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      lat, lng, startDate: e.start, endDate: e.end, tz: TZ,
      startTime: single ? (isoLocalTime(e.startRaw) || s0?.time || undefined) : undefined,
      time: single ? '' : (s0?.time ? `${s0.time}` : ''),
      fee: '', poster: img ? httpsUrl(img.url) : '', posterCredit: img ? (clip(img.notice, 120) || 'BayernCloud Tourismus') + (img.lic ? ` / ${licName(img.lic)}` : '') : undefined,
      overview: clip(stripTags(e.desc || ''), 1000), homepage: normUrl(e.url),
      source: `BayernCloud Tourismus (${licName(e.lic)}${e.notice ? ' · ' + clip(e.notice.replace(/^(CC0|CC[\w -]*?[\d.]+)\s*/, ''), 60) : ''})`,
      sourceUrl: normUrl(e.url) || 'https://bayerncloud.digital/',
    });
  }
  // 같은 제목·장소의 날짜별 레코드(예: 매주 같은 전시 투어) → 하나로
  return mergeOccurrences(out, e => `${e.cityId}|${e.title}|${e.place}`);
}
