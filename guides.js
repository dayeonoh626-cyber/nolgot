// 현지 이벤트 사이트 안내 — 앱에 데이터가 없거나 부족할 때 "현지 사이트에서 더 찾아보기" 카드로 보여준다.
// 스크래핑하지 않고 각 사이트의 공식 캘린더/검색 페이지로 바로 보낸다 (2026-11 링크 확인).
//
// 항목: [이름, URL, 종류, 한국어 설명, 영어 설명]
//   종류: 이벤트 kind 목록(문자열 '*' = 전부). 탭에서 그 종류일 때만 보인다.
//   URL 자리표시자: {en} 도시 영문명, {ko} 도시 한글명, {enSlug} 소문자-하이픈, {country} 나라 영문 소문자-하이픈, {cc} 나라 코드 소문자
//
// 순서 = 화면 순서. 도시 → 나라 → 공통 순으로 이어 붙는다.

const ALL = '*';
// Time Out 도시 가이드가 있는 도시 (2026-11 확인). id → URL slug
const TIMEOUT = {
  london: 'london', paris: 'paris', barcelona: 'barcelona', madrid: 'madrid', lisbon: 'lisbon', porto: 'porto', rome: 'rome', milan: 'milan',
  berlin: 'berlin', amsterdam: 'amsterdam', prague: 'prague', budapest: 'budapest', vienna: 'vienna', manchester: 'manchester', edinburgh: 'edinburgh',
  newyork: 'newyork', losangeles: 'los-angeles', sanfrancisco: 'san-francisco', chicago: 'chicago', seattle: 'seattle', boston: 'boston',
  washingtondc: 'washington-dc', austin: 'austin', neworleans: 'new-orleans', miami: 'miami',
  sydney: 'sydney', melbourne: 'melbourne', brisbane: 'brisbane', perth: 'perth', adelaide: 'adelaide',
  tokyo: 'tokyo', osaka: 'osaka', taipei: 'taipei', hongkong: 'hong-kong', singapore: 'singapore', bangkok: 'bangkok',
  kualalumpur: 'kuala-lumpur', hanoi: 'hanoi', manila: 'manila', jakarta: 'jakarta', bali: 'bali',
  toronto: 'toronto', montreal: 'montreal', vancouver: 'vancouver', mexicocity: 'mexico-city', buenosaires: 'buenos-aires', bogota: 'bogota',
  capetown: 'cape-town', johannesburg: 'johannesburg', marrakech: 'marrakech', accra: 'accra',
};
const LIVE = ['performance', 'festival'];
const ART = ['exhibition'];
const DO = ['workshop', 'tour'];

export const GUIDES = {
  // ---- 모든 도시 공통 ----
  generic: [
    ['Time Out', 'https://www.timeout.com/{timeout}/things-to-do', ALL, '현지 에디터가 고른 이번 주 할 일', 'What local editors recommend this week'],
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
    US: [
      ['Ticketmaster', 'https://www.ticketmaster.com/search?q={en}', LIVE, '콘서트·스포츠·공연 예매', 'Concerts, sports and shows'],
      ['National Park Service', 'https://www.nps.gov/planyourvisit/event-search.htm', ['tour', 'festival', 'workshop'], '국립공원 레인저 투어·행사', 'Ranger tours and park events'],
    ],
    AU: [
      ['Ticketmaster AU', 'https://www.ticketmaster.com.au/search?q={en}', LIVE, '콘서트·공연 예매', 'Concerts and shows'],
      ['Ticketek', 'https://www.ticketek.com.au/', LIVE, '호주 대표 티켓 예매처', "Australia's main ticket seller"],
    ],
    JP: [
      ['Peatix', 'https://peatix.com/search?q={en}', ['festival', 'workshop', 'performance'], '모임·워크숍·소규모 행사', 'Meetups, workshops and small events'],
      ['Time Out Japan', 'https://www.timeout.jp/', ALL, '일본 도시 가이드', 'Japanese city guide'],
    ],
    TW: [
      ['KKTIX', 'https://kktix.com/', LIVE, '대만 공연·행사 예매', 'Taiwan shows and events'],
      ['Accupass', 'https://www.accupass.com/search?q={en}', ALL, '행사·워크숍 플랫폼', 'Events and workshops'],
    ],
    HK: [
      ['Discover Hong Kong', 'https://www.discoverhongkong.com/eng/what-s-new/events.html', ALL, '홍콩관광청 행사 달력', 'Tourism board events'],
      ['LCSD 문화행사', 'https://www.lcsd.gov.hk/en/', ['performance', 'exhibition', 'festival'], '홍콩 정부 공연·전시', 'Government cultural venues'],
    ],
    SG: [
      ['Visit Singapore', 'https://www.visitsingapore.com/whats-happening/all-happenings/', ALL, '싱가포르관광청 이벤트', 'Tourism board events'],
    ],
    TH: [
      ['Thai Ticket Major', 'https://www.thaiticketmajor.com/', LIVE, '태국 공연 예매', 'Thai concerts and shows'],
    ],
    MY: [
      ['Visit Kuala Lumpur', 'https://www.visitkualalumpur.com/', ALL, '쿠알라룸푸르 관광청', 'Kuala Lumpur tourism board'],
    ],
    CA: [
      ["Ticketmaster Canada", "https://www.ticketmaster.ca/search?q={en}", LIVE, "콘서트·공연 예매", "Concerts and shows"],
    ],
    MX: [
      ["Ticketmaster México", "https://www.ticketmaster.com.mx/", LIVE, "콘서트·공연 예매", "Concerts and shows"],
      ["eticket.mx", "https://www.eticket.mx/", LIVE, "공연·행사 예매", "Shows and events"],
      ["Boletia", "https://boletia.com/", ALL, "행사·워크숍 예매", "Events and workshops"],
    ],
    BR: [
      ["Sympla", "https://www.sympla.com.br/eventos", ALL, "브라질 최대 행사 플랫폼", "Brazil's largest events platform"],
      ["Eventim Brasil", "https://www.eventim.com.br/", LIVE, "공연 예매", "Shows"],
      ["Ticketmaster Brasil", "https://www.ticketmaster.com.br/", LIVE, "콘서트 예매", "Concerts"],
    ],
    AR: [
      ["Alternativa Teatral", "https://www.alternativateatral.com/", ['performance'], "부에노스아이레스 연극 일정", "Buenos Aires theatre listings"],
      ["Ticketek Argentina", "https://www.ticketek.com.ar/", LIVE, "공연 예매", "Shows"],
    ],
    CL: [
      ["PuntoTicket", "https://www.puntoticket.com/", LIVE, "공연 예매", "Shows"],
      ["Ticketmaster Chile", "https://www.ticketmaster.cl/", LIVE, "콘서트 예매", "Concerts"],
    ],
    CO: [
      ["TuBoleta", "https://tuboleta.com/", LIVE, "공연·행사 예매", "Shows and events"],
    ],
    PE: [
      ["Joinnus", "https://www.joinnus.com/", ALL, "행사·워크숍", "Events and workshops"],
      ["Teleticket", "https://teleticket.com.pe/", LIVE, "공연 예매", "Shows"],
    ],
    ZA: [
      ["Quicket", "https://www.quicket.co.za/events/", ALL, "남아공 행사 예매", "South African events"],
      ["Webtickets", "https://www.webtickets.co.za/", LIVE, "공연 예매", "Shows"],
      ["Howler", "https://www.howler.co.za/", ['festival'], "페스티벌 티켓", "Festival tickets"],
      ["Computicket", "https://www.computicket.com/", LIVE, "남아공 대표 예매처", "Main South African ticket seller"],
    ],
    EG: [
      ["Tazkarti", "https://www.tazkarti.com/", LIVE, "이집트 공식 예매", "Official Egyptian tickets"],
      ["Ticketsmarché", "https://www.ticketsmarche.com/", LIVE, "공연·행사 예매", "Shows and events"],
    ],
    MA: [
      ["Guichet", "https://guichet.com/ma-fr", LIVE, "모로코 공연·행사 예매", "Moroccan shows and events"],
      ["Visit Morocco", "https://www.visitmorocco.com/en", ALL, "모로코 관광청", "Moroccan tourism board"],
    ],
    KE: [
      ["Ticketsasa", "https://www.ticketsasa.com/", LIVE, "케냐 행사 예매", "Kenyan events"],
      ["Mookh", "https://mookh.com/", ALL, "행사·체험 예매", "Events and experiences"],
    ],
    NG: [
      ["Nairabox", "https://nairabox.com/", LIVE, "나이지리아 행사 예매", "Nigerian events"],
      ["Tix Africa", "https://tix.africa/", LIVE, "행사 예매", "Events"],
    ],
    GH: [
      ["Visit Ghana Events", "https://visitghana.com/events/", ALL, "가나 관광청 행사", "Ghana tourism events"],
      ["Egotickets", "https://egotickets.com/", LIVE, "행사 예매", "Events"],
    ],
    RW: [
      ["Visit Rwanda Events", "https://visitrwanda.com/events/", ALL, "르완다 관광청 행사", "Rwanda tourism events"],
    ],
    SN: [
      ["Au Sénégal", "https://www.au-senegal.com/", ALL, "세네갈 여행·행사 가이드", "Senegal travel and events guide"],
    ],
    DE: [
      ['Eventim', 'https://www.eventim.de/search/?searchterm={en}', LIVE, '독일 최대 티켓 예매처', "Germany's largest ticket seller"],
      ['Reservix', 'https://www.reservix.de/', LIVE, '지역 공연·축제 예매', 'Regional shows and festivals'],
      ['Rausgegangen', 'https://rausgegangen.de/', ALL, '독일 도시별 이번 주 추천', 'Weekly picks for German cities'],
    ],
  },

  // ---- 도시별 (공식 관광청·시청 캘린더, 도시 잡지) ----
  cities: {
    sydney: [["City of Sydney What's On", 'https://www.whatson.cityofsydney.nsw.gov.au/', ALL, '시드니시 공식 행사 달력', 'Official city events calendar']],
    melbourne: [["What's On Melbourne", 'https://whatson.melbourne.vic.gov.au/', ALL, '멜버른시 공식 행사 달력', 'Official city events calendar']],
    brisbane: [['Visit Brisbane', 'https://www.visitbrisbane.com.au/whats-on', ALL, '관광청 이벤트', 'Tourism board events']],
    tokyo: [['Walkerplus 도쿄', 'https://www.walkerplus.com/event_list/today/ar0313/', ALL, '오늘 도쿄 이벤트 (일본어)', "Today's Tokyo events (Japanese)"]],
    toronto: [
      ["City of Toronto 행사", "https://www.toronto.ca/explore-enjoy/festivals-events/festivals-events-calendar/", ALL, "토론토시 공식 축제·행사 달력", "Official city festival calendar"],
      ["Destination Toronto", "https://www.destinationtoronto.com/events/", ALL, "관광청 이벤트", "Tourism board events"],
    ],
    montreal: [
      ["Ville de Montréal", "https://montreal.ca/evenements", ALL, "몬트리올시 공식 행사", "Official city events"],
      ["Tourisme Montréal", "https://www.mtl.org/en/what-to-do/festivals-and-events", ['festival', 'performance'], "관광청 축제·행사", "Tourism board festivals"],
    ],
    vancouver: [
      ["Destination Vancouver", "https://www.destinationvancouver.com/events", ALL, "관광청 이벤트", "Tourism board events"],
    ],
    mexicocity: [
      ["Cartelera CDMX", "https://cartelera.cdmx.gob.mx/", ALL, "멕시코시티 공식 문화 달력", "Official city culture calendar"],
      ["Time Out México", "https://www.timeoutmexico.mx/ciudad-de-mexico", ALL, "현지 도시 가이드 (스페인어)", "Local city guide (Spanish)"],
    ],
    saopaulo: [
      ["Sesc São Paulo", "https://www.sescsp.org.br/programacao/", ALL, "상파울루 최대 문화기관 프로그램", "Programme of the city's biggest cultural network"],
      ["Cidade de São Paulo", "https://www.cidadedesaopaulo.com/agenda/", ALL, "관광청 아젠다", "Tourism agenda"],
    ],
    riodejaneiro: [
      ["Visit.Rio", "https://visit.rio/", ALL, "리우 관광청", "Rio tourism board"],
    ],
    buenosaires: [
      ["Agenda BA", "https://linda.buenosaires.gob.ar/agenda", ALL, "부에노스아이레스시 공식 아젠다", "Official city agenda"],
      ["Teatro Colón", "https://teatrocolon.org.ar/", ['performance'], "콜론 극장 공연", "Teatro Colón programme"],
    ],
    santiago: [
      ["ChileCultura", "https://chilecultura.gob.cl/events/", ALL, "칠레 문화부 행사 달력", "Ministry of Culture events"],
      ["Santiago Cultura", "https://www.santiagocultura.cl/", ALL, "산티아고시 문화", "City culture"],
    ],
    bogota: [
      ["Agenda cultural de Bogotá", "https://bogota.gov.co/que-hacer/agenda-cultural", ALL, "보고타시 공식 문화 아젠다", "Official city culture agenda"],
      ["IDARTES", "https://www.idartes.gov.co/es/agenda", ALL, "보고타 예술청 아젠다", "City arts agency agenda"],
    ],
    medellin: [
      ["Medellín Travel", "https://www.medellin.travel/", ALL, "메데인 공식 관광", "Official tourism"],
    ],
    lima: [
      ["Ministerio de Cultura", "https://www.gob.pe/cultura", ALL, "페루 문화부", "Peruvian Ministry of Culture"],
    ],
    capetown: [
      ["Cape Town Tourism", "https://www.capetown.travel/events/", ALL, "관광청 이벤트", "Tourism board events"],
    ],
    cairo: [
      ["Cairo 360", "https://www.cairo360.com/", ALL, "카이로 현지 가이드", "Local Cairo guide"],
      ["Cairo Opera House", "https://www.cairoopera.org/", ['performance'], "카이로 오페라하우스", "Cairo Opera House"],
      ["Experience Egypt", "https://www.experienceegypt.eg/en", ALL, "이집트 관광청", "Egypt tourism board"],
    ],
    nairobi: [
      ["Magical Kenya", "https://magicalkenya.com/", ALL, "케냐 관광청", "Kenya tourism board"],
    ],
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
    .replaceAll('{timeout}', TIMEOUT[city.id] || '')
    .replaceAll('{enSlug}', encodeURIComponent(slug(city.name?.en)))
    .replaceAll('{en}', encodeURIComponent(city.name?.en || ''))
    .replaceAll('{ko}', encodeURIComponent(city.name?.ko || city.name?.en || ''))
    .replaceAll('{country}', encodeURIComponent(slug(city.countryName?.en)))
    .replaceAll('{cc}', encodeURIComponent(String(city.country || '').toLowerCase()));
  const seen = new Set();
  return rows
    .filter(([name, url, kinds]) => {
      if (seen.has(name)) return false;
      if (url.includes('{timeout}') && !TIMEOUT[city.id]) return false;
      seen.add(name);
      return kind === 'all' || kinds === ALL || kinds.includes(kind);
    })
    .map(([name, url, kinds, ko, en]) => ({ name, url: fill(url), kinds, ko, en }));
}
