// 현지 이벤트 사이트 안내 — 앱에 데이터가 없거나 부족할 때 "현지 사이트에서 더 찾아보기" 카드로 보여준다.
// 스크래핑하지 않고 각 사이트의 공식 캘린더/검색 페이지로 바로 보낸다 (2026-11 링크 확인).
//
// 항목: [이름, URL, 종류, 한국어 설명, 영어 설명]
//   종류: 이벤트 kind 목록(문자열 '*' = 전부). 탭에서 그 종류일 때만 보인다.
//   URL 자리표시자: {en} 도시 영문명, {ko} 도시 한글명, {enSlug} 소문자-하이픈, {country} 나라 영문 소문자-하이픈, {cc} 나라 코드 소문자
//
// 순서 = 화면 순서. 도시 → 나라 → 공통 순으로 이어 붙는다.

const ALL = '*';
const LIVE = ['performance', 'festival'];
const ART = ['exhibition'];
const DO = ['workshop', 'tour'];

export const GUIDES = {
  // ---- 모든 도시 공통 ----
  generic: [
    ['Google 이벤트', 'https://www.google.com/search?q=events+in+{en}&ibp=htl;events', ALL, '구글이 모은 이번 주 행사 전체', 'Everything Google lists for this week'],
    ['Eventbrite', 'https://www.eventbrite.com/d/{country}--{enSlug}/events/', ['festival', 'performance', 'workshop'], '소규모 모임·파티·클래스', 'Small gatherings, parties and classes'],
    ['Meetup', 'https://www.meetup.com/find/?location={cc}--{en}&source=EVENTS', ['workshop', 'tour'], '취미 모임·언어교환·워크숍', 'Hobby groups, language exchange, workshops'],
    ['Songkick', 'https://www.songkick.com/search?query={en}&type=locations', ['performance'], '콘서트 일정', 'Concert listings'],
  ],

  // ---- 나라별 ----
  countries: {
    KR: [
      ['네이버 공연·전시', 'https://search.naver.com/search.naver?query={ko}+%EA%B3%B5%EC%97%B0+%EC%A0%84%EC%8B%9C', ['performance', 'exhibition', 'festival'], '지금 열리는 공연·전시 한눈에', 'Shows and exhibitions on Naver'],
      ['대한민국 구석구석 축제', 'https://korean.visitkorea.or.kr/kfes/', ['festival'], '한국관광공사 전국 축제 달력', 'Korea Tourism Org. festival calendar'],
      ['인터파크 티켓', 'https://tickets.interpark.com/contents/search?keyword={ko}', LIVE.concat(ART), '공연·전시 예매 1위', 'Largest ticketing site in Korea'],
      ['티켓링크', 'https://www.ticketlink.co.kr/search?query={ko}', LIVE.concat(ART), '공연·전시·스포츠 예매', 'Shows, exhibitions and sports'],
      ['YES24 티켓', 'https://ticket.yes24.com/', LIVE.concat(ART), '공연·전시 예매', 'Shows and exhibitions'],
      ['KOPIS 공연예술통합전산망', 'https://www.kopis.or.kr/por/main/main.do', ['performance'], '전국 공연 공식 데이터베이스', 'Official national performance database'],
      ['문화포털', 'https://www.culture.go.kr/', ALL, '문화체육관광부 공연·전시·행사', 'Ministry of Culture events portal'],
      ['프립', 'https://www.frip.co.kr/search?keyword={ko}', DO, '원데이 클래스·액티비티', 'One-day classes and activities'],
      ['솜씨당', 'https://www.sssd.co.kr/', ['workshop'], '공방 원데이 클래스', 'Craft workshops'],
    ],
    DE: [
      ['Eventim', 'https://www.eventim.de/search/?searchterm={en}', LIVE, '독일 최대 티켓 예매처', "Germany's largest ticket seller"],
      ['Reservix', 'https://www.reservix.de/', LIVE, '지역 공연·축제 예매', 'Regional shows and festivals'],
      ['Rausgegangen', 'https://rausgegangen.de/', ALL, '독일 도시별 이번 주 추천', 'Weekly picks for German cities'],
    ],
  },

  // ---- 도시별 (공식 관광청·시청 캘린더, 도시 잡지) ----
  cities: {
    berlin: [
      ['berlin.de 행사 달력', 'https://www.berlin.de/en/events/', ALL, '베를린시 공식 행사 달력', 'Official city events calendar'],
      ['visitBerlin', 'https://www.visitberlin.de/en/event-calendar-berlin', ALL, '관광청 이벤트 캘린더', 'Tourism board event calendar'],
      ['Museumsportal Berlin', 'https://www.museumsportal-berlin.de/en/program/', ['exhibition', 'tour', 'workshop'], '박물관 200곳 전시·투어·워크숍', 'Exhibitions, tours and workshops at 200 museums'],
      ['tip Berlin', 'https://www.tip-berlin.de/event/', ALL, '베를린 시티 매거진 일정', 'City magazine listings'],
      ['Resident Advisor', 'https://ra.co/events/de/berlin', ['performance'], '클럽·전자음악 파티', 'Club nights and electronic music'],
    ],
    munich: [
      ['muenchen.de 행사', 'https://www.muenchen.de/veranstaltungen', ALL, '뮌헨시 공식 행사 달력', 'Official city events calendar'],
      ['München Tourismus', 'https://www.muenchen.travel/rubriken/planen/veranstaltungskalender', ALL, '관광청 이벤트 캘린더', 'Tourism board event calendar'],
      ['Mucbook', 'https://www.mucbook.de/', ALL, '뮌헨 도시 매거진', 'Munich city magazine'],
      ['Resident Advisor', 'https://ra.co/events/de/munich', ['performance'], '클럽·전자음악 파티', 'Club nights and electronic music'],
    ],
    hamburg: [
      ['hamburg.de 행사', 'https://www.hamburg.de/kultur/veranstaltungen', ALL, '함부르크시 공식 행사 달력', 'Official city events calendar'],
      ['Hamburg Tourismus', 'https://www.hamburg-travel.com/see-explore/events/', ALL, '관광청 이벤트 캘린더', 'Tourism board event calendar'],
      ['SZENE HAMBURG', 'https://szene-hamburg.com/', ALL, '함부르크 도시 매거진', 'Hamburg city magazine'],
    ],
    cologne: [
      ['KölnTourismus', 'https://www.cologne-tourism.com/experiences-lifestyle/events/calendar-of-events', ALL, '관광청 이벤트 캘린더', 'Tourism board event calendar'],
      ['koeln.de 행사', 'https://www.koeln.de/veranstaltungen/', ALL, '쾰른 행사 달력', 'Cologne events calendar'],
    ],
    frankfurt: [
      ['Visit Frankfurt', 'https://www.visitfrankfurt.travel/erleben/feste-und-veranstaltungen', ['festival', 'performance'], '관광청 축제·행사', 'Tourism board festivals and events'],
      ['Journal Frankfurt', 'https://www.journal-frankfurt.de/', ALL, '프랑크푸르트 도시 매거진', 'Frankfurt city magazine'],
    ],
    stuttgart: [
      ['Stuttgart Tourismus', 'https://www.stuttgart-tourist.de/veranstaltungskalender-stuttgart', ALL, '관광청 이벤트 캘린더', 'Tourism board event calendar'],
      ['LIFT Stuttgart', 'https://www.lift-online.de/', ALL, '슈투트가르트 도시 매거진', 'Stuttgart city magazine'],
    ],
    duesseldorf: [
      ['Visit Düsseldorf', 'https://www.visitduesseldorf.de/erleben/veranstaltungen', ALL, '관광청 이벤트 캘린더', 'Tourism board event calendar'],
    ],
    leipzig: [
      ['Leipzig Travel', 'https://www.leipzig.travel/entdecken/veranstaltungen-in-leipzig', ALL, '관광청 이벤트 캘린더', 'Tourism board event calendar'],
      ['leipzig.de 행사', 'https://www.leipzig.de/kultur-und-freizeit/veranstaltungen', ALL, '라이프치히시 공식 행사', 'Official city events'],
      ['kreuzer', 'https://kreuzer-leipzig.de/termine', ALL, '라이프치히 도시 매거진 일정', 'City magazine listings'],
    ],
    dresden: [
      ['dresden.de 행사', 'https://www.dresden.de/de/kultur/veranstaltungen.php', ALL, '드레스덴시 공식 행사 달력', 'Official city events calendar'],
      ['Dresden Elbland', 'https://www.visit-dresden-elbland.de/de/veranstaltungen/', ALL, '관광청 이벤트 캘린더', 'Tourism board event calendar'],
    ],
    nuremberg: [
      ['Nürnberg Tourismus', 'https://tourismus.nuernberg.de/en/events/', ALL, '관광청 이벤트 캘린더', 'Tourism board event calendar'],
      ['curt', 'https://www.curt.de/', ALL, '뉘른베르크 도시 매거진', 'Nuremberg city magazine'],
    ],
  },
};

const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// 도시와 탭 종류에 맞는 안내 사이트 목록 (중복 이름 제거)
export function guidesFor(city, kind = 'all') {
  if (!city || kind === 'audioguide') return []; // 오디오투어는 앱이 직접 만든다
  const rows = [...(GUIDES.cities[city.id] || []), ...(GUIDES.countries[city.country] || []), ...GUIDES.generic];
  const fill = u => u
    .replaceAll('{enSlug}', encodeURIComponent(slug(city.name?.en)))
    .replaceAll('{en}', encodeURIComponent(city.name?.en || ''))
    .replaceAll('{ko}', encodeURIComponent(city.name?.ko || city.name?.en || ''))
    .replaceAll('{country}', encodeURIComponent(slug(city.countryName?.en)))
    .replaceAll('{cc}', encodeURIComponent(String(city.country || '').toLowerCase()));
  const seen = new Set();
  return rows
    .filter(([name, , kinds]) => {
      if (seen.has(name)) return false;
      seen.add(name);
      return kind === 'all' || kinds === ALL || kinds.includes(kind);
    })
    .map(([name, url, kinds, ko, en]) => ({ name, url: fill(url), kinds, ko, en }));
}
