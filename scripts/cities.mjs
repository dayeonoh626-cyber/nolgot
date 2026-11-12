// 커버하는 도시와 나라별 소스 모듈 등록부.
//
// 새 나라 추가 = (1) 아래 CITIES에 도시 추가 (도시별 wikiLang 으로 나라 기본값을 덮어쓸 수 있음)  (2) 필요하면 scripts/sources/{cc}.mjs 작성 후 COUNTRIES에 등록.
// 공통 소스(Wikipedia 오디오투어, Ticketmaster, Viator, GetYourGuide, izi.TRAVEL, og:image 보강)는
// 나라 모듈 없이도 모든 도시에 자동 적용된다.

export const COUNTRIES = {
  KR: {
    name: { ko: '대한민국', en: 'South Korea' },
    wikiLang: 'ko',            // 오디오투어 랜드마크 선정에 쓰는 '현지' 위키백과
    currency: 'KRW',
    module: './sources/kr.mjs',
    ticketmaster: false,       // Ticketmaster는 한국 시장 미지원
  },
  DE: {
    name: { ko: '독일', en: 'Germany' },
    wikiLang: 'de',
    currency: 'EUR',
    module: './sources/de.mjs',
    ticketmaster: true,
    geocode: true,             // 주소만 있는 이벤트를 Nominatim으로 좌표화
  },

  // ---- 유럽 (2단계) — docs/sources-research-europe.md 표 1 ----
  // ticketmaster: 문자열이면 Discovery API countryCode 로도 거른다 (국경 너머 이벤트 제외). true = 반경만.
  // module 이 없는 나라(HU·NL·CZ)는 공식 오픈 이벤트 피드가 없어 공통 소스만 쓴다.
  GB: { name: { ko: '영국', en: 'United Kingdom' }, wikiLang: 'en', currency: 'GBP', module: './sources/gb.mjs', ticketmaster: 'GB', geocode: true },
  FR: { name: { ko: '프랑스', en: 'France' }, wikiLang: 'fr', currency: 'EUR', module: './sources/fr.mjs', ticketmaster: 'FR', geocode: true },
  ES: { name: { ko: '스페인', en: 'Spain' }, wikiLang: 'es', currency: 'EUR', module: './sources/es.mjs', ticketmaster: 'ES', geocode: true },
  HU: { name: { ko: '헝가리', en: 'Hungary' }, wikiLang: 'hu', currency: 'HUF', ticketmaster: 'HU', geocode: true },
  AT: { name: { ko: '오스트리아', en: 'Austria' }, wikiLang: 'de', currency: 'EUR', module: './sources/at.mjs', ticketmaster: 'AT', geocode: true },
  IT: { name: { ko: '이탈리아', en: 'Italy' }, wikiLang: 'it', currency: 'EUR', module: './sources/it.mjs', ticketmaster: 'IT', geocode: true },
  NL: { name: { ko: '네덜란드', en: 'Netherlands' }, wikiLang: 'nl', currency: 'EUR', ticketmaster: 'NL', geocode: true },
  CH: { name: { ko: '스위스', en: 'Switzerland' }, wikiLang: 'de', currency: 'CHF', module: './sources/ch.mjs', ticketmaster: 'CH', geocode: true }, // 제네바는 도시별 wikiLang fr
  PT: { name: { ko: '포르투갈', en: 'Portugal' }, wikiLang: 'pt', currency: 'EUR', module: './sources/pt.mjs', ticketmaster: 'PT', geocode: true },
  CZ: { name: { ko: '체코', en: 'Czechia' }, wikiLang: 'cs', currency: 'CZK', ticketmaster: 'CZ', geocode: true },
  BE: { name: { ko: '벨기에', en: 'Belgium' }, wikiLang: 'fr', currency: 'EUR', module: './sources/be.mjs', ticketmaster: 'BE', geocode: true }, // 안트베르펜은 도시별 wikiLang nl

  // ---- 3단계: 미국 · 호주 · 아시아 — docs/sources-research-phase3.md 표 1 ----
  // 아시아 Ticketmaster 는 국가코드만 확인(재고 미측정). VN·PH·ID 는 Discovery API 국가코드 목록에 없음 → false.
  US: { name: { ko: '미국', en: 'United States' }, wikiLang: 'en', currency: 'USD', module: './sources/us.mjs', ticketmaster: 'US', geocode: true },
  AU: { name: { ko: '호주', en: 'Australia' }, wikiLang: 'en', currency: 'AUD', module: './sources/au.mjs', ticketmaster: 'AU', geocode: true },
  JP: { name: { ko: '일본', en: 'Japan' }, wikiLang: 'ja', currency: 'JPY', module: './sources/jp.mjs', ticketmaster: 'JP', geocode: true },
  TW: { name: { ko: '대만', en: 'Taiwan' }, wikiLang: 'zh', currency: 'TWD', module: './sources/tw.mjs', ticketmaster: 'TW', geocode: true },
  HK: { name: { ko: '홍콩', en: 'Hong Kong' }, wikiLang: 'zh', currency: 'HKD', module: './sources/hk.mjs', ticketmaster: 'HK', geocode: true },
  SG: { name: { ko: '싱가포르', en: 'Singapore' }, wikiLang: 'en', currency: 'SGD', ticketmaster: 'SG', geocode: true },
  TH: { name: { ko: '태국', en: 'Thailand' }, wikiLang: 'th', currency: 'THB', ticketmaster: 'TH', geocode: true },
  VN: { name: { ko: '베트남', en: 'Vietnam' }, wikiLang: 'vi', currency: 'VND', ticketmaster: false, geocode: true },
  MY: { name: { ko: '말레이시아', en: 'Malaysia' }, wikiLang: 'ms', currency: 'MYR', ticketmaster: 'MY', geocode: true },
  PH: { name: { ko: '필리핀', en: 'Philippines' }, wikiLang: 'en', currency: 'PHP', ticketmaster: false, geocode: true },
  ID: { name: { ko: '인도네시아', en: 'Indonesia' }, wikiLang: 'id', currency: 'IDR', ticketmaster: false, geocode: true },
  CN: { name: { ko: '중국', en: 'China' }, wikiLang: 'zh', currency: 'CNY', ticketmaster: 'CN', geocode: true }, // 이벤트 수집 안 함 (places·오디오가이드만, 문서 2-9)

  // ---- 4단계: 아메리카 나머지 · 아프리카 — docs/sources-research-phase4.md 표 1 ----
  // Ticketmaster: Discovery API 국가코드 표에 있는 나라만 문자열(재고는 키 받은 뒤 실측, CA·MX 말고는 0일 수 있음). EG·KE·NG·TZ·ET·SN·RW 는 코드 없음 → false.
  CA: { name: { ko: '캐나다', en: 'Canada' }, wikiLang: 'en', currency: 'CAD', module: './sources/ca.mjs', ticketmaster: 'CA', geocode: true }, // 몬트리올은 도시별 wikiLang fr
  MX: { name: { ko: '멕시코', en: 'Mexico' }, wikiLang: 'es', currency: 'MXN', ticketmaster: 'MX', geocode: true },
  BR: { name: { ko: '브라질', en: 'Brazil' }, wikiLang: 'pt', currency: 'BRL', ticketmaster: 'BR', geocode: true },
  AR: { name: { ko: '아르헨티나', en: 'Argentina' }, wikiLang: 'es', currency: 'ARS', ticketmaster: 'AR', geocode: true },
  CL: { name: { ko: '칠레', en: 'Chile' }, wikiLang: 'es', currency: 'CLP', ticketmaster: 'CL', geocode: true },
  CO: { name: { ko: '콜롬비아', en: 'Colombia' }, wikiLang: 'es', currency: 'COP', ticketmaster: 'CO', geocode: true },
  PE: { name: { ko: '페루', en: 'Peru' }, wikiLang: 'es', currency: 'PEN', ticketmaster: 'PE', geocode: true },
  ZA: { name: { ko: '남아프리카공화국', en: 'South Africa' }, wikiLang: 'en', currency: 'ZAR', module: './sources/za.mjs', ticketmaster: 'ZA', geocode: true }, // Quicket(QUICKET_API_KEY) 선택 키
  EG: { name: { ko: '이집트', en: 'Egypt' }, wikiLang: 'ar', currency: 'EGP', ticketmaster: false, geocode: true },
  MA: { name: { ko: '모로코', en: 'Morocco' }, wikiLang: 'fr', currency: 'MAD', ticketmaster: 'MA', geocode: true },
  KE: { name: { ko: '케냐', en: 'Kenya' }, wikiLang: 'en', currency: 'KES', ticketmaster: false, geocode: true },
  NG: { name: { ko: '나이지리아', en: 'Nigeria' }, wikiLang: 'en', currency: 'NGN', ticketmaster: false, geocode: true },
  GH: { name: { ko: '가나', en: 'Ghana' }, wikiLang: 'en', currency: 'GHS', ticketmaster: 'GH', geocode: true },
  TZ: { name: { ko: '탄자니아', en: 'Tanzania' }, wikiLang: 'en', currency: 'TZS', ticketmaster: false, geocode: true },
  ET: { name: { ko: '에티오피아', en: 'Ethiopia' }, wikiLang: 'en', currency: 'ETB', ticketmaster: false, geocode: true },
  SN: { name: { ko: '세네갈', en: 'Senegal' }, wikiLang: 'fr', currency: 'XOF', ticketmaster: false, geocode: true },
  RW: { name: { ko: '르완다', en: 'Rwanda' }, wikiLang: 'en', currency: 'RWF', ticketmaster: false, geocode: true },
};

const c = (id, country, ko, en, lat, lng, radiusKm, tz, extra = {}) => ({ id, country, name: { ko, en }, lat, lng, radiusKm, tz, ...extra });

export const CITIES = [
  // ---- 대한민국 (광역시·도 단위; 한국 공공데이터가 시·도 기준이라 맞춤) ----
  c('seoul', 'KR', '서울', 'Seoul', 37.5665, 126.9780, 25, 'Asia/Seoul', { local: '서울' }),
  c('busan', 'KR', '부산', 'Busan', 35.1796, 129.0756, 25, 'Asia/Seoul', { local: '부산' }),
  c('incheon', 'KR', '인천', 'Incheon', 37.4563, 126.7052, 30, 'Asia/Seoul', { local: '인천' }),
  c('daegu', 'KR', '대구', 'Daegu', 35.8714, 128.6014, 25, 'Asia/Seoul', { local: '대구' }),
  c('daejeon', 'KR', '대전', 'Daejeon', 36.3504, 127.3845, 20, 'Asia/Seoul', { local: '대전' }),
  c('gwangju', 'KR', '광주', 'Gwangju', 35.1595, 126.8526, 20, 'Asia/Seoul', { local: '광주' }),
  c('ulsan', 'KR', '울산', 'Ulsan', 35.5384, 129.3114, 25, 'Asia/Seoul', { local: '울산' }),
  c('sejong', 'KR', '세종', 'Sejong', 36.4800, 127.2890, 20, 'Asia/Seoul', { local: '세종' }),
  c('gyeonggi', 'KR', '경기', 'Gyeonggi', 37.2636, 127.0286, 70, 'Asia/Seoul', { local: '경기', province: true, wikiCenter: [37.2866, 127.0118] }), // 수원 화성
  c('gangwon', 'KR', '강원', 'Gangwon', 37.7519, 128.8761, 120, 'Asia/Seoul', { local: '강원', province: true }), // 중심: 강릉
  c('chungbuk', 'KR', '충북', 'Chungbuk', 36.6424, 127.4890, 80, 'Asia/Seoul', { local: '충북', province: true }),
  c('chungnam', 'KR', '충남', 'Chungnam', 36.4562, 126.8022, 90, 'Asia/Seoul', { local: '충남', province: true, wikiCenter: [36.4655, 127.1190] }), // 공주
  c('jeonbuk', 'KR', '전북', 'Jeonbuk', 35.8242, 127.1480, 80, 'Asia/Seoul', { local: '전북', province: true, wikiCenter: [35.8150, 127.1530] }), // 전주
  c('jeonnam', 'KR', '전남', 'Jeonnam', 34.8161, 126.4629, 110, 'Asia/Seoul', { local: '전남', province: true, wikiCenter: [34.7604, 127.6622] }), // 여수
  c('gyeongbuk', 'KR', '경북', 'Gyeongbuk', 36.5760, 128.5056, 120, 'Asia/Seoul', { local: '경북', province: true, wikiCenter: [35.8346, 129.2190] }), // 경주
  c('gyeongnam', 'KR', '경남', 'Gyeongnam', 35.2383, 128.6925, 100, 'Asia/Seoul', { local: '경남', province: true }), // 창원
  c('jeju', 'KR', '제주', 'Jeju', 33.4996, 126.5312, 50, 'Asia/Seoul', { local: '제주' }),

  // ---- 독일 ----
  c('berlin', 'DE', '베를린', 'Berlin', 52.5200, 13.4050, 25, 'Europe/Berlin', { local: 'Berlin', wikiCenter: [52.5163, 13.3889] }),
  c('munich', 'DE', '뮌헨', 'Munich', 48.1374, 11.5755, 20, 'Europe/Berlin', { local: 'München' }),
  c('hamburg', 'DE', '함부르크', 'Hamburg', 53.5511, 9.9937, 20, 'Europe/Berlin', { local: 'Hamburg' }),
  c('cologne', 'DE', '쾰른', 'Cologne', 50.9375, 6.9603, 15, 'Europe/Berlin', { local: 'Köln' }),
  c('frankfurt', 'DE', '프랑크푸르트', 'Frankfurt', 50.1109, 8.6821, 15, 'Europe/Berlin', { local: 'Frankfurt am Main' }),
  c('stuttgart', 'DE', '슈투트가르트', 'Stuttgart', 48.7758, 9.1829, 15, 'Europe/Berlin', { local: 'Stuttgart' }),
  c('duesseldorf', 'DE', '뒤셀도르프', 'Düsseldorf', 51.2277, 6.7735, 15, 'Europe/Berlin', { local: 'Düsseldorf' }),
  c('leipzig', 'DE', '라이프치히', 'Leipzig', 51.3397, 12.3731, 15, 'Europe/Berlin', { local: 'Leipzig' }),
  c('dresden', 'DE', '드레스덴', 'Dresden', 51.0504, 13.7373, 15, 'Europe/Berlin', { local: 'Dresden' }),
  c('nuremberg', 'DE', '뉘른베르크', 'Nuremberg', 49.4521, 11.0767, 15, 'Europe/Berlin', { local: 'Nürnberg' }),

  // ---- 영국 ----
  c('london', 'GB', '런던', 'London', 51.5074, -0.1278, 30, 'Europe/London', { local: 'London' }),
  c('manchester', 'GB', '맨체스터', 'Manchester', 53.4808, -2.2426, 20, 'Europe/London', { local: 'Manchester' }),
  c('edinburgh', 'GB', '에든버러', 'Edinburgh', 55.9533, -3.1883, 15, 'Europe/London', { local: 'Edinburgh' }),
  c('liverpool', 'GB', '리버풀', 'Liverpool', 53.4084, -2.9916, 15, 'Europe/London', { local: 'Liverpool' }),
  // ---- 프랑스 ----
  c('paris', 'FR', '파리', 'Paris', 48.8566, 2.3522, 20, 'Europe/Paris', { local: 'Paris' }),
  c('lyon', 'FR', '리옹', 'Lyon', 45.7640, 4.8357, 15, 'Europe/Paris', { local: 'Lyon' }),
  c('marseille', 'FR', '마르세유', 'Marseille', 43.2965, 5.3698, 20, 'Europe/Paris', { local: 'Marseille' }),
  c('nice', 'FR', '니스', 'Nice', 43.7102, 7.2620, 15, 'Europe/Paris', { local: 'Nice' }),
  // ---- 스페인 ----
  c('madrid', 'ES', '마드리드', 'Madrid', 40.4168, -3.7038, 20, 'Europe/Madrid', { local: 'Madrid' }),
  c('barcelona', 'ES', '바르셀로나', 'Barcelona', 41.3874, 2.1686, 15, 'Europe/Madrid', { local: 'Barcelona' }),
  c('valencia', 'ES', '발렌시아', 'Valencia', 39.4699, -0.3763, 15, 'Europe/Madrid', { local: 'València' }),
  c('seville', 'ES', '세비야', 'Seville', 37.3891, -5.9845, 15, 'Europe/Madrid', { local: 'Sevilla' }),
  // ---- 헝가리 ----
  c('budapest', 'HU', '부다페스트', 'Budapest', 47.4979, 19.0402, 20, 'Europe/Budapest', { local: 'Budapest' }),
  // ---- 오스트리아 ----
  c('vienna', 'AT', '빈', 'Vienna', 48.2082, 16.3738, 20, 'Europe/Vienna', { local: 'Wien' }),
  c('salzburg', 'AT', '잘츠부르크', 'Salzburg', 47.8095, 13.0550, 15, 'Europe/Vienna', { local: 'Salzburg' }),
  // ---- 이탈리아 ----
  c('rome', 'IT', '로마', 'Rome', 41.9028, 12.4964, 20, 'Europe/Rome', { local: 'Roma' }),
  c('milan', 'IT', '밀라노', 'Milan', 45.4642, 9.1900, 20, 'Europe/Rome', { local: 'Milano' }),
  c('florence', 'IT', '피렌체', 'Florence', 43.7696, 11.2558, 12, 'Europe/Rome', { local: 'Firenze' }),
  c('venice', 'IT', '베네치아', 'Venice', 45.4408, 12.3155, 12, 'Europe/Rome', { local: 'Venezia' }),
  c('naples', 'IT', '나폴리', 'Naples', 40.8518, 14.2681, 15, 'Europe/Rome', { local: 'Napoli' }),
  // ---- 네덜란드 ----
  c('amsterdam', 'NL', '암스테르담', 'Amsterdam', 52.3676, 4.9041, 15, 'Europe/Amsterdam', { local: 'Amsterdam' }),
  c('rotterdam', 'NL', '로테르담', 'Rotterdam', 51.9244, 4.4777, 15, 'Europe/Amsterdam', { local: 'Rotterdam' }),
  // ---- 스위스 ----
  c('zurich', 'CH', '취리히', 'Zurich', 47.3769, 8.5417, 15, 'Europe/Zurich', { local: 'Zürich' }),
  c('geneva', 'CH', '제네바', 'Geneva', 46.2044, 6.1432, 12, 'Europe/Zurich', { local: 'Genève', wikiLang: 'fr' }),
  // ---- 포르투갈 ----
  c('lisbon', 'PT', '리스본', 'Lisbon', 38.7223, -9.1393, 15, 'Europe/Lisbon', { local: 'Lisboa' }),
  c('porto', 'PT', '포르투', 'Porto', 41.1579, -8.6291, 12, 'Europe/Lisbon', { local: 'Porto' }),
  // ---- 체코 ----
  c('prague', 'CZ', '프라하', 'Prague', 50.0755, 14.4378, 20, 'Europe/Prague', { local: 'Praha' }),
  // ---- 벨기에 ----
  c('brussels', 'BE', '브뤼셀', 'Brussels', 50.8503, 4.3517, 15, 'Europe/Brussels', { local: 'Bruxelles / Brussel', wikiLang: 'fr' }),
  c('antwerp', 'BE', '안트베르펜', 'Antwerp', 51.2194, 4.4025, 12, 'Europe/Brussels', { local: 'Antwerpen', wikiLang: 'nl' }),

  // ---- 미국 ----
  c('newyork', 'US', '뉴욕', 'New York', 40.7128, -74.0060, 25, 'America/New_York', { local: 'New York' }),
  c('losangeles', 'US', '로스앤젤레스', 'Los Angeles', 34.0522, -118.2437, 35, 'America/Los_Angeles', { local: 'Los Angeles' }),
  c('sanfrancisco', 'US', '샌프란시스코', 'San Francisco', 37.7749, -122.4194, 15, 'America/Los_Angeles', { local: 'San Francisco' }),
  c('chicago', 'US', '시카고', 'Chicago', 41.8781, -87.6298, 25, 'America/Chicago', { local: 'Chicago' }),
  c('seattle', 'US', '시애틀', 'Seattle', 47.6062, -122.3321, 20, 'America/Los_Angeles', { local: 'Seattle' }),
  c('boston', 'US', '보스턴', 'Boston', 42.3601, -71.0589, 20, 'America/New_York', { local: 'Boston' }),
  c('washingtondc', 'US', '워싱턴 DC', 'Washington, D.C.', 38.8899, -77.0091, 20, 'America/New_York', { local: 'Washington, D.C.' }),
  c('austin', 'US', '오스틴', 'Austin', 30.2672, -97.7431, 20, 'America/Chicago', { local: 'Austin' }),
  c('neworleans', 'US', '뉴올리언스', 'New Orleans', 29.9511, -90.0715, 15, 'America/Chicago', { local: 'New Orleans' }),
  c('miami', 'US', '마이애미', 'Miami', 25.7617, -80.1918, 25, 'America/New_York', { local: 'Miami' }),
  // ---- 호주 ----
  c('sydney', 'AU', '시드니', 'Sydney', -33.8688, 151.2093, 25, 'Australia/Sydney', { local: 'Sydney' }),
  c('melbourne', 'AU', '멜버른', 'Melbourne', -37.8136, 144.9631, 25, 'Australia/Melbourne', { local: 'Melbourne' }),
  c('brisbane', 'AU', '브리즈번', 'Brisbane', -27.4698, 153.0251, 25, 'Australia/Brisbane', { local: 'Brisbane' }),
  c('perth', 'AU', '퍼스', 'Perth', -31.9505, 115.8605, 25, 'Australia/Perth', { local: 'Perth' }),
  c('adelaide', 'AU', '애들레이드', 'Adelaide', -34.9285, 138.6007, 20, 'Australia/Adelaide', { local: 'Adelaide' }),
  // ---- 일본 ----
  c('tokyo', 'JP', '도쿄', 'Tokyo', 35.6812, 139.7671, 25, 'Asia/Tokyo', { local: '東京' }),
  c('osaka', 'JP', '오사카', 'Osaka', 34.6937, 135.5023, 20, 'Asia/Tokyo', { local: '大阪' }),
  c('kyoto', 'JP', '교토', 'Kyoto', 35.0116, 135.7681, 15, 'Asia/Tokyo', { local: '京都' }),
  // ---- 대만 ----
  c('taipei', 'TW', '타이베이', 'Taipei', 25.0330, 121.5654, 20, 'Asia/Taipei', { local: '臺北' }),
  c('kaohsiung', 'TW', '가오슝', 'Kaohsiung', 22.6273, 120.3014, 20, 'Asia/Taipei', { local: '高雄' }),
  // ---- 홍콩 ----
  c('hongkong', 'HK', '홍콩', 'Hong Kong', 22.3027, 114.1772, 25, 'Asia/Hong_Kong', { local: '香港' }),
  // ---- 동남아 ----
  c('singapore', 'SG', '싱가포르', 'Singapore', 1.2903, 103.8520, 20, 'Asia/Singapore', { local: 'Singapore' }),
  c('bangkok', 'TH', '방콕', 'Bangkok', 13.7563, 100.5018, 25, 'Asia/Bangkok', { local: 'กรุงเทพมหานคร' }),
  c('hochiminh', 'VN', '호찌민', 'Ho Chi Minh City', 10.7769, 106.7009, 20, 'Asia/Ho_Chi_Minh', { local: 'Thành phố Hồ Chí Minh' }),
  c('hanoi', 'VN', '하노이', 'Hanoi', 21.0285, 105.8542, 20, 'Asia/Ho_Chi_Minh', { local: 'Hà Nội' }), // 베트남 단일 시간대(UTC+7)
  c('kualalumpur', 'MY', '쿠알라룸푸르', 'Kuala Lumpur', 3.1390, 101.6869, 20, 'Asia/Kuala_Lumpur', { local: 'Kuala Lumpur' }),
  c('manila', 'PH', '마닐라', 'Manila', 14.5995, 120.9842, 20, 'Asia/Manila', { local: 'Maynila' }),
  c('jakarta', 'ID', '자카르타', 'Jakarta', -6.1754, 106.8272, 25, 'Asia/Jakarta', { local: 'Jakarta' }),
  c('bali', 'ID', '발리(덴파사르)', 'Bali (Denpasar)', -8.6500, 115.2167, 35, 'Asia/Makassar', { local: 'Denpasar' }),
  // ---- 중국 (이벤트 수집 없음: places·오디오가이드·딥링크만) ----
  c('shanghai', 'CN', '상하이', 'Shanghai', 31.2304, 121.4737, 25, 'Asia/Shanghai', { local: '上海' }),
  c('beijing', 'CN', '베이징', 'Beijing', 39.9042, 116.4074, 25, 'Asia/Shanghai', { local: '北京' }),

  // ---- 4단계: 캐나다 ----
  c('toronto', 'CA', '토론토', 'Toronto', 43.6532, -79.3832, 25, 'America/Toronto', { local: 'Toronto' }),
  c('montreal', 'CA', '몬트리올', 'Montreal', 45.5019, -73.5674, 20, 'America/Toronto', { local: 'Montréal', wikiLang: 'fr' }), // IANA 정식 이름은 America/Toronto
  c('vancouver', 'CA', '밴쿠버', 'Vancouver', 49.2827, -123.1207, 20, 'America/Vancouver', { local: 'Vancouver' }),
  // ---- 중남미 ----
  c('mexicocity', 'MX', '멕시코시티', 'Mexico City', 19.4326, -99.1332, 25, 'America/Mexico_City', { local: 'Ciudad de México' }),
  c('saopaulo', 'BR', '상파울루', 'São Paulo', -23.5505, -46.6333, 25, 'America/Sao_Paulo', { local: 'São Paulo' }),
  c('riodejaneiro', 'BR', '리우데자네이루', 'Rio de Janeiro', -22.9068, -43.1729, 25, 'America/Sao_Paulo', { local: 'Rio de Janeiro' }),
  c('buenosaires', 'AR', '부에노스아이레스', 'Buenos Aires', -34.6037, -58.3816, 20, 'America/Argentina/Buenos_Aires', { local: 'Buenos Aires' }),
  c('santiago', 'CL', '산티아고', 'Santiago', -33.4372, -70.6506, 20, 'America/Santiago', { local: 'Santiago' }),
  c('bogota', 'CO', '보고타', 'Bogotá', 4.5981, -74.0760, 20, 'America/Bogota', { local: 'Bogotá' }),
  c('medellin', 'CO', '메데인', 'Medellín', 6.2476, -75.5658, 15, 'America/Bogota', { local: 'Medellín' }),
  c('lima', 'PE', '리마', 'Lima', -12.0464, -77.0428, 20, 'America/Lima', { local: 'Lima' }),
  // ---- 아프리카 ----
  c('capetown', 'ZA', '케이프타운', 'Cape Town', -33.9249, 18.4241, 25, 'Africa/Johannesburg', { local: 'Cape Town' }),
  c('johannesburg', 'ZA', '요하네스버그', 'Johannesburg', -26.2041, 28.0473, 25, 'Africa/Johannesburg', { local: 'Johannesburg' }),
  c('cairo', 'EG', '카이로', 'Cairo', 30.0444, 31.2357, 25, 'Africa/Cairo', { local: 'القاهرة' }), // 기자 피라미드(약 18km)까지
  c('marrakech', 'MA', '마라케시', 'Marrakesh', 31.6295, -7.9811, 15, 'Africa/Casablanca', { local: 'مراكش' }),
  c('casablanca', 'MA', '카사블랑카', 'Casablanca', 33.5731, -7.5898, 20, 'Africa/Casablanca', { local: 'الدار البيضاء' }),
  c('nairobi', 'KE', '나이로비', 'Nairobi', -1.2864, 36.8172, 20, 'Africa/Nairobi', { local: 'Nairobi' }),
  c('lagos', 'NG', '라고스', 'Lagos', 6.4550, 3.3941, 25, 'Africa/Lagos', { local: 'Lagos' }),
  c('accra', 'GH', '아크라', 'Accra', 5.6037, -0.1870, 20, 'Africa/Accra', { local: 'Accra' }),
  c('zanzibar', 'TZ', '잔지바르(스톤타운)', 'Zanzibar (Stone Town)', -6.1630, 39.1880, 30, 'Africa/Dar_es_Salaam', { local: 'Zanzibar' }),
  c('addisababa', 'ET', '아디스아바바', 'Addis Ababa', 9.0300, 38.7400, 20, 'Africa/Addis_Ababa', { local: 'አዲስ አበባ' }),
  c('dakar', 'SN', '다카르', 'Dakar', 14.6928, -17.4467, 20, 'Africa/Dakar', { local: 'Dakar' }),
  c('kigali', 'RW', '키갈리', 'Kigali', -1.9441, 30.0619, 20, 'Africa/Kigali', { local: 'Kigali' }),
].map(city => ({ ...city, countryName: COUNTRIES[city.country].name }));

export const cityById = new Map(CITIES.map(x => [x.id, x]));
