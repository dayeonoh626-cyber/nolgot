// 커버하는 도시와 나라별 소스 모듈 등록부.
//
// 새 나라 추가 = (1) 아래 CITIES에 도시 추가  (2) 필요하면 scripts/sources/{cc}.mjs 작성 후 COUNTRIES에 등록.
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
].map(city => ({ ...city, countryName: COUNTRIES[city.country].name }));

export const cityById = new Map(CITIES.map(x => [x.id, x]));
