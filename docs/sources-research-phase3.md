# 놀곳 데이터 소스 조사 — 3단계 (미국 · 호주 · 아시아)

조사일: 2026-11-11 ~ 11-12 · 대상: 미국 10 · 호주 5 · 일본 3 · 대만 · 홍콩 · 싱가포르 · 태국 · 베트남 2 · 말레이시아 · 필리핀 · 인도네시아 2 · 중국 2 (총 31개 도시)
조사 방법: 웹 검색(영/일/중(번체·간체)/태/베/인니어 검색어), 공식 문서 열람, Socrata·CKAN·Opendatasoft 카탈로그 API 검색, 그리고 **키가 필요 없는 엔드포인트는 직접 호출해서**(User-Agent `nolgot-build/1.0 (https://github.com/dayeonoh626-cyber/nolgot)`) 구조·예정 건수·이미지 유무·갱신일을 확인했다.

검증 수준 (1·2단계와 같은 표기)
- ✅ 공식 문서·공식 페이지로 확인 · **✅실호출** = 실제로 호출해서 데이터가 나오는 것까지 확인 · 🟡 제3자 자료/일부만 확인 · ❓ 확인 못 함

판정 기준 (1·2단계와 동일)
- **바로 통합 (키 불필요)** · **키 받아 통합** · **딥링크만** · **사용 안 함** (+ 보류)

> 원칙: 약관이 자동 수집을 금지하거나 비공식 API만 있는 곳은 수집하지 않는다. 이미지는 API가 준 것, 이벤트 공식 페이지의 og:image, Wikimedia Commons만 쓴다.
>
> **바뀐 전제 (2026-11-12)**: `scripts/sources/places.mjs`(Wikidata 상설 명소, 모든 도시)와 `scripts/lib/enrich.mjs`의 이미지 대체 체인(장소 Commons 사진 → 장소 사이트 og:image → 근처 명소 사진)이 생겼다. 그래서 **"도시당 10건 이상 + 모든 항목 대표 이미지"는 이벤트 피드가 없는 도시도 places 모듈로 충족**된다. 이 문서는 그 위에 얹을 **날짜 있는 이벤트·전시 피드**(가능하면 이미지 포함)를 찾는 데 집중했다.

---

## 0. 요약

- **키 없이 바로 넣을 수 있는 공식 피드 (실호출 확인)**: 뉴욕(NYC Parks 이벤트 575건, 이미지 119), 샌프란시스코(Our415 예정 1,401건, 사진 URL 전 건), 시카고(공공도서관 3,276건 + 공원국 행사 286·프로그램 8,166건), 워싱턴 DC(스미소니언 Trumba 1,996건, **이미지 1,992건**), 브리즈번(시의회 Trumba 2,000건, **이미지 1,983건**, CC BY 4.0), 대만(문화부 iCulture 예정 1,275건 중 타이베이 410 / 관광서 활동 141건 **이미지 100%**), 홍콩(LCSD 문화행사 1,100건 영·중 / URBTIX 판매중 224건), 도쿄·오사카(Doorkeeper 63건, 배너 이미지), 도쿄 미나토구·빅사이트 CSV(CC BY).
- **정정 (2026-11-12, 통합 시)**: 아래에서 Ticketmaster·Viator·GYG·izi 키를 "이미 있음/기존 키"라고 쓴 부분은 **틀렸다 — 현재 설정된 API 키는 하나도 없다.** 이 소스들은 코드만 있고 키가 없으면 건너뛴다. 실제 통합 결과는 맨 아래 "10. 통합 상태" 참고.
- **키가 필요한 핵심**: Ticketmaster(키 미설정 — 미국·호주는 핵심 시장, 아시아는 국가코드만 있고 재고 미측정), **NPS Events API**(api.data.gov 무료 키, DEMO_KEY로 동작 확인, 대상 공원 177건, 이미지 다수 공공영역), **TAT Data API**(태국, `/api/v2/events`가 키 없이 401 → 엔드포인트 존재 확인), Connpass v2(일본, 신청제 무료 키), ATDW(호주, 배포 라이선스 계약·체험 30일), SeatGeek(미국, 무료 client_id).
- **공식 피드가 없는 도시**: LA·시애틀·보스턴·마이애미·뉴올리언스·오스틴(사실상), 시드니(약관이 자동 수집 금지), 멜버른(공식 MCP 엔드포인트는 있으나 라이선스 불명), 퍼스·애들레이드, 교토, 싱가포르, 방콕(키 전), 호찌민·하노이, 쿠알라룸푸르, 마닐라, 자카르타·발리, 상하이·베이징. → **Ticketmaster + NPS(미국) + places + Viator/GYG/izi + 위키백과 오디오가이드**로 채운다.
- **종료/중단 확인**: 싱가포르 관광청 TIH API(2025-07-31 종료 공지, 도메인 `tih.stb.gov.sg` DNS 응답 없음), 홍콩 EventHK(2026-06-08부터 갱신 중단 메시지), LA City Events(마지막 일정 2026-07-13), SA 지방정부 API(Parse.com 기반, 2017년 서비스 종료).

---

## 1. 도시 목록 (cities.mjs 후보)

`c(id, country, ko, en, lat, lng, radiusKm, tz, { local })` 형식 그대로. 반경은 도심 기준 제안값. "이벤트 피드" 열은 이 문서 기준 키 없이 들어오는 날짜 있는 이벤트 소스.

| id | 이름(ko) | 이름(en) | 현지명(`local`) | 국가 | lat | lng | radiusKm | tz | 이벤트 피드(키 불필요) |
|---|---|---|---|---|---|---|---|---|---|
| newyork | 뉴욕 | New York | New York | US | 40.7128 | -74.0060 | 25 | America/New_York | NYC Parks, NYC 허가행사(보조), 스미소니언(쿠퍼휴잇·NMAI 뉴욕) |
| losangeles | 로스앤젤레스 | Los Angeles | Los Angeles | US | 34.0522 | -118.2437 | 35 | America/Los_Angeles | 없음 |
| sanfrancisco | 샌프란시스코 | San Francisco | San Francisco | US | 37.7749 | -122.4194 | 15 | America/Los_Angeles | Our415 |
| chicago | 시카고 | Chicago | Chicago | US | 41.8781 | -87.6298 | 25 | America/Chicago | CPL 도서관, Chicago Park District |
| seattle | 시애틀 | Seattle | Seattle | US | 47.6062 | -122.3321 | 20 | America/Los_Angeles | 없음 (UW Trumba는 대학 행사, 보조 후보) |
| boston | 보스턴 | Boston | Boston | US | 42.3601 | -71.0589 | 20 | America/New_York | 없음 |
| washingtondc | 워싱턴 DC | Washington, D.C. | Washington, D.C. | US | 38.8899 | -77.0091 | 20 | America/New_York | 스미소니언 Trumba |
| austin | 오스틴 | Austin | Austin | US | 30.2672 | -97.7431 | 20 | America/Chicago | (ACCD 컨벤션 일정 68건, 약함) |
| neworleans | 뉴올리언스 | New Orleans | New Orleans | US | 29.9511 | -90.0715 | 15 | America/Chicago | 없음 (NPS 재즈 공원은 키 필요) |
| miami | 마이애미 | Miami | Miami | US | 25.7617 | -80.1918 | 25 | America/New_York | 없음 |
| sydney | 시드니 | Sydney | Sydney | AU | -33.8688 | 151.2093 | 25 | Australia/Sydney | 없음 (약관상 수집 금지) |
| melbourne | 멜버른 | Melbourne | Melbourne | AU | -37.8136 | 144.9631 | 25 | Australia/Melbourne | (공식 MCP, 보류) |
| brisbane | 브리즈번 | Brisbane | Brisbane | AU | -27.4698 | 153.0251 | 25 | Australia/Brisbane | 브리즈번 시의회 Trumba / ODS |
| perth | 퍼스 | Perth | Perth | AU | -31.9505 | 115.8605 | 25 | Australia/Perth | 없음 |
| adelaide | 애들레이드 | Adelaide | Adelaide | AU | -34.9285 | 138.6007 | 20 | Australia/Adelaide | 없음 |
| tokyo | 도쿄 | Tokyo | 東京 | JP | 35.6812 | 139.7671 | 25 | Asia/Tokyo | Doorkeeper, 미나토구 CSV, 빅사이트 CSV |
| osaka | 오사카 | Osaka | 大阪 | JP | 34.6937 | 135.5023 | 20 | Asia/Tokyo | Doorkeeper(소량) |
| kyoto | 교토 | Kyoto | 京都 | JP | 35.0116 | 135.7681 | 15 | Asia/Tokyo | 없음 |
| taipei | 타이베이 | Taipei | 臺北 | TW | 25.0330 | 121.5654 | 20 | Asia/Taipei | 문화부 iCulture, 관광서 활동 |
| hongkong | 홍콩 | Hong Kong | 香港 | HK | 22.3027 | 114.1772 | 25 | Asia/Hong_Kong | LCSD 문화행사, URBTIX |
| singapore | 싱가포르 | Singapore | Singapore | SG | 1.2903 | 103.8520 | 20 | Asia/Singapore | 없음 |
| bangkok | 방콕 | Bangkok | กรุงเทพมหานคร | TH | 13.7563 | 100.5018 | 25 | Asia/Bangkok | 없음 (TAT 키 필요) |
| hochiminh | 호찌민 | Ho Chi Minh City | Thành phố Hồ Chí Minh | VN | 10.7769 | 106.7009 | 20 | Asia/Ho_Chi_Minh | 없음 |
| hanoi | 하노이 | Hanoi | Hà Nội | VN | 21.0285 | 105.8542 | 20 | Asia/Bangkok | 없음 |
| kualalumpur | 쿠알라룸푸르 | Kuala Lumpur | Kuala Lumpur | MY | 3.1390 | 101.6869 | 20 | Asia/Kuala_Lumpur | 없음 |
| manila | 마닐라 | Manila | Maynila | PH | 14.5995 | 120.9842 | 20 | Asia/Manila | 없음 |
| jakarta | 자카르타 | Jakarta | Jakarta | ID | -6.1754 | 106.8272 | 25 | Asia/Jakarta | 없음 |
| bali | 발리(덴파사르) | Bali (Denpasar) | Denpasar | ID | -8.6500 | 115.2167 | 35 | Asia/Makassar | 없음 |
| shanghai | 상하이 | Shanghai | 上海 | CN | 31.2304 | 121.4737 | 25 | Asia/Shanghai | 없음 (딥링크만) |
| beijing | 베이징 | Beijing | 北京 | CN | 39.9042 | 116.4074 | 25 | Asia/Shanghai | 없음 (딥링크만) |

- 하노이 IANA는 `Asia/Bangkok`(베트남 북부, UTC+7)이 표준 표기이고 `Asia/Ho_Chi_Minh`도 같은 오프셋이다. 둘 다 써도 된다.
- 발리는 Wikidata·위키백과 명소가 덴파사르 시내보다 우붓·꾸따 쪽에 많아 반경 35km 제안.
- **대체 후보**: 대만은 가오슝(高雄, 22.6273 120.3014)이 문화부 피드에 이벤트가 충분하다(관광서 활동 23건 + 문화부 다수). 도시를 더 늘릴 수 있으면 1순위 추가 후보.

`COUNTRIES` 등록용 값

| 국가 | 국가명 ko / en | `wikiLang` | `currency` | `ticketmaster` | `geocode` | places `COUNTRY_QID` | 비고 |
|---|---|---|---|---|---|---|---|
| US | 미국 / United States | en | USD | ✅ `'US'` (핵심 시장) | 예 | Q30 | |
| AU | 호주 / Australia | en | AUD | ✅ `'AU'` (핵심 시장) | 예 | Q408 | |
| JP | 일본 / Japan | ja | JPY | 코드 `JP` 있음, 재고 ❓ | 예 | Q17 | 주소 지오코딩은 일본어 주소 그대로 Nominatim 가능(🟡) |
| TW | 대만 / Taiwan | zh (zh-tw 표시) | TWD | 코드 `TW` 있음, 재고 ❓ | 거의 불필요(좌표 75%) | Q865 | |
| HK | 홍콩 / Hong Kong | zh (영문 피드 병행) | HKD | 코드 `HK` 있음, 재고 ❓ | 예(장소 좌표 41%) | Q8646 | |
| SG | 싱가포르 / Singapore | en | SGD | 코드 `SG` 있음, Ticketmaster Singapore 운영(🟡) | 예 | Q334 | |
| TH | 태국 / Thailand | th | THB | 코드 `TH` 있음, 재고 ❓ | 예 | Q869 | |
| VN | 베트남 / Vietnam | vi | VND | ❌ (코드 목록에 없음) | 예 | Q881 | |
| MY | 말레이시아 / Malaysia | ms (en 보조) | MYR | 코드 `MY` 있음, 재고 ❓ | 예 | Q833 | |
| PH | 필리핀 / Philippines | en (tl 보조) | PHP | ❌ | 예 | Q928 | |
| ID | 인도네시아 / Indonesia | id | IDR | ❌ | 예 | Q252 | |
| CN | 중국 / China | zh | CNY | 코드 `CN` 있음, 재고 ❓ | 예 | Q148 | 아래 2-9 법적 제약 |

Ticketmaster 국가코드는 Discovery API 문서의 "Supported Country Codes" 표로 확인했다(✅ 공식 문서, 2026-11-11). 단 **KR도 이 표에 있지만 1단계에서 재고 0이었다** — 코드가 있다고 이벤트가 있는 것은 아니므로 아시아는 첫 빌드에서 실측 후 `ticketmaster` 값을 정한다.

`places.mjs`의 `COUNTRY_QID`에 위 Q값을 추가해야 새 나라 도시에서 명소가 나온다(현재 KR·DE·유럽 11개국만 등록).

---

## 2. 나라별 소스

### 2-1. 미국

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **NYC Parks Public Events – Upcoming 14 Days** (Socrata `w3wp-dpdi`) / 같은 데이터의 공원국 피드 `nycgovparks.org/xml/events_300_rss.json` | 뉴욕 시립공원 행사 **578건(향후 14일)**: 투어(47)·미술·역사·자연·댄스·운동 클래스·어린이. 좌표 573건 | 키 불필요. 매일 갱신(2026-11-10) | ✅ `image` 119건(nycgovparks.org/common_images, http → https 변환 필요) / NYC Open Data 이용약관(제한 없음) | 피트니스·자원봉사 비중 큼 → 카테고리 필터 | ✅실호출 | **바로 통합 (키 불필요) — 뉴욕 1순위** |
| NYC Permitted Event Information (Socrata `tvpp-9vvx`) | 시 허가 행사(거리축제·퍼레이드·공원 사용) | 키 불필요, 매일 | ❌ / NYC Open Data | 운동경기·잔디 폐쇄 등 잡음 많음 → `event_type` 필터(Street Event, Special Event 등) | ✅실호출 | **바로 통합 (보조)** — 거리축제만 |
| **SF Our415 Events and Activities** (Socrata `8i3s-ih2a`, data.sfgov.org) | 샌프란시스코 공공도서관(780)·레크파크(621) 예정 **1,401건**: 강좌·워크숍·어린이·스포츠. 좌표 전 건 | 키 불필요, 매일 | 🟡 `event_photo` 전 건 있으나 **레크파크 621건은 로고 이미지**(제외), 도서관은 프로그램 유형별 대표 사진 / **ODC PDDL**(퍼블릭 도메인) | 로고 URL(`..._Logo.jpg`)은 poster로 쓰지 말 것 | ✅실호출 | **바로 통합 (키 불필요) — 샌프란시스코 1순위** |
| **Chicago Public Library Events** (Socrata `vsdy-d8k7`) | 시카고 공공도서관 행사 **3,276건**(전부 예정, ~2027-12): 공작·스토리타임·북클럽·영화·워크숍·공연 | 키 불필요, 매일(2026-11-11) | ❌ 이미지 없음 → `event_page` og:image / Chicago Data Portal 이용약관 | `cancelled=false` 필터, 반복행사 많음 → `mergeOccurrences` | ✅실호출 | **바로 통합 (키 불필요)** |
| **Chicago Park District Activities** (Socrata `tn7v-6rnw`) | 공원국 **행사 286건 + 프로그램(강좌) 8,166건** 예정. 좌표·요금·등록링크 | 키 불필요, 매일 | 🟡 `image_link` 15건뿐 → `information_link` og:image / 동일 약관 | 프로그램은 수영강습 등 생활체육 위주 → `type='Event'` 우선, 프로그램은 카테고리 선별 | ✅실호출 | **바로 통합 (키 불필요)** |
| **Smithsonian events (Trumba)** `https://www.trumba.com/calendars/smithsonian-events.json` | 스미소니언 박물관(DC 대부분 + 뉴욕 쿠퍼휴잇·NMAI) 투어·강연·공연·가족 프로그램 **1,996건**(~2027-06) | 키 불필요(Trumba 공개 캘린더 피드) | ✅ `eventImage.url` **1,992건**(alt 텍스트 포함) / 스미소니언 웹 이용약관 — **개방 라이선스 아님**(❓) | 1회 최대 약 2,000건 상한. 좌표 없음 → `customFields` Venue 이름 지오코딩 | ✅실호출 / 약관 ❓ | **바로 통합 (조건부)** — 출처·링크백 표기, 상업 이용 전 스미소니언 확인 |
| **NPS Events API** `developer.nps.gov/api/v1/events?parkCode=…` | 국립공원청 사이트 행사: 뉴욕(gate·stli), DC(nama), 보스턴(bost), SF(goga·safr·muwo), 뉴올리언스(jazz), 오스틴 인근(lyjo), 마이애미(bica) 등 — 대상 16개 공원 **177건** | api.data.gov 무료 키(`DEMO_KEY`로 동작 확인, 시간당 30회 제한) | ✅ `images[].url`(nps.gov 상대경로) + `credit`(대부분 NPS = 미국 연방 공공영역) / 50건 중 35건 이미지 | `pageSize` 최대 50 → 페이지 반복. 좌표 있음 | ✅실호출(DEMO_KEY) | **키 받아 통합 (무료)** — 미국 피드 없는 도시 보강 |
| Ticketmaster US | 콘서트·공연·스포츠·가족 | 기존 키, `countryCode=US` | ✅ | 5,000건/일 → 미국 10도시 × 4페이지 = 40호출 | ✅ | **키 받아 통합 — 미국 전 도시 핵심** |
| SeatGeek Platform API `api.seatgeek.com/2/events` | 미국 공연·스포츠 | 무료 `client_id` (키 없이 403 "Client is required") | 🟡 공연자 이미지 | 상업 이용 조건 ❓ | ✅실호출(403) | **키 받아 통합 (후보)** — Ticketmaster와 중복 많음, 낮은 우선순위 |
| Smithsonian Open Access API (`api.si.edu/openaccess`) | 소장품(CC0) | api.data.gov 키(DEMO_KEY 동작) | ✅ CC0 이미지 | 전시 일정 아님 | ✅실호출 | 오디오가이드·places 사진 보강 후보 |
| LA City Events (Socrata `9aw9-mn4p`, data.lacity.org) | 과거 시 행사 | 키 불필요 | — | **마지막 일정 2026-07-13**, 예정 0건 (대부분 주민회의) | ✅실호출 | **사용 안 함** (갱신 중단) |
| LA El Pueblo 행사(`8sbu-dvfy`) | 과거 행사 통계 | | | 2025-08 이후 갱신 없음 | ✅실호출 | 사용 안 함 |
| Seattle Special Events Permits (`dm95-f8w5`) | 허가 기록 | | | 2025-01 이후 갱신 없음 | ✅실호출(카탈로그) | 사용 안 함 |
| Austin ACE Events(`teth-r7k8`) / ACCD Event Listings(`p9ma-z6y9`) | 허가 신청 기록 / 컨벤션센터·Palmer 일정 68건 | 키 불필요 | ❌ / Public Domain | ACE는 신청자 정보 위주(공개 행사 목록 아님), ACCD는 박람회·졸업식 위주 | ✅실호출 | ACE **사용 안 함** · ACCD 보조(선택) |
| NYC Public Programs Division Special Events(`6v4b-5gp4`) | 과거 행사 실적 통계 | | | 미래 일정 아님 | ✅실호출 | 사용 안 함 |
| UW Trumba `sea_campus` | 워싱턴대 강연·전시 | 키 불필요 | ✅ 이미지 | 대학 행사 | ✅실호출 | 보조 후보 (시애틀) |
| Library of Congress events (`loc.gov/events/?fo=json`) | 의회도서관 행사 | 키 불필요(문서상) | ❓ | **Cloudflare 403**(이 환경) | 🟡 | 보류 — CI에서 재시도 |
| Eventbrite / Meetup | 소규모 행사 | 공개 검색 종료 / Meetup은 Pro 구독자만 GraphQL | — | | ✅(1단계·Meetup 도움말) | **사용 안 함 / 딥링크** |
| NYC & Company, Discover LA, Choose Chicago, Do512, Time Out | 관광 행사 | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-2. 호주

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **Brisbane City Council events (Trumba)** `https://www.trumba.com/calendars/brisbane-city-council.json` | 시의회 행사 전체 **2,000건**(진행/예정 1,892): 전시(Museum of Brisbane)·도서관·공원 운동·축제·투어·어린이 | 키 불필요. 피드 상한 2,000건(약 3주치 + 장기 전시) | ✅ `eventImage.url` **1,983건** / 같은 데이터가 data.brisbane.qld.gov.au `brisbane-city-council-events`로 **CC BY 4.0** 게시 | 좌표는 `customFields`의 "Venue address" 링크(`maps.google.com/?q=lat,lng`)에서 추출 | ✅실호출 | **바로 통합 (키 불필요) — 브리즈번 1순위** |
| Brisbane 주제별 이벤트 데이터셋 (ODS: `music-events` 1,000, `gold-events` 2,000, `creative-events` 535, `mob-events` 103, `brisbane-botanic-gardens-events` 121, `films-events` 26, `green-events` 24 등) | 위 피드의 주제별 부분집합 + 일부 추가 | ODS v2.1 키 불필요, 매일(2026-11-10) | ✅ `eventimage` / CC BY 4.0 | 메인 피드와 중복 → `eventID`로 병합. 메인 2,000건 상한을 넘는 기간을 채울 때만 | ✅실호출 | **바로 통합 (보조)** |
| ATDW (Australian Tourism Data Warehouse) ATLAS API | 호주 전역 관광청 이벤트·투어·명소(사진 포함) | 배포자(Distributor) 등록 → 30일 체험 키 → **배포 라이선스 계약**(요금은 문의) | ✅ 사진 / 계약 조건 | 키는 단일 도메인 전용, 캐시는 주 2회 이상 갱신 의무 | 🟡 지원 문서 | **키 받아 통합 (유료일 수 있음)** — 시드니·멜버른·퍼스·애들레이드에 유일한 체계적 소스 |
| City of Sydney What's On (`whatson.cityofsydney.nsw.gov.au`) | 시드니 도심 7.5km 행사 | 공개 API ❌. **이용약관이 자동화 스크립트 사용 금지** | — | | 🟡 약관(검색 인용) | **딥링크만** |
| What's On Melbourne — 공식 MCP 엔드포인트 `POST https://whatson.melbourne.vic.gov.au/mcp` (`search_tool`) | 멜버른시 공식 행사·전시·워크숍·투어. "이번 주말" 418건 | 키 불필요(llms.txt·`.well-known/mcp.json`에 공개) | ❌ 응답이 **텍스트**(제목·요약·장소·날짜·URL), 이미지 없음 / **라이선스 표기 없음** | 재배포 허용 여부 불명 | ✅실호출 / 라이선스 ❓ | **보류** — opendata@melbourne.vic.gov.au에 이용 조건 문의 후 승격 |
| data.melbourne.vic.gov.au | 행사 허가(2014–2018) 등 과거 데이터뿐 | | | 현재 행사 데이터셋 없음 | ✅실호출(카탈로그) | 사용 안 함 |
| SA 지방정부 Statewide API (data.sa.gov.au, Parse.com) | 과거 SA 지자체 행사 | Parse.com 기반 | — | **Parse 서비스 2017년 종료** | ✅ 데이터셋 메타 | 사용 안 함 |
| Perth (City of Perth / Experience Perth), Adelaide (City of Adelaide / Adelaide Fringe) | 관광 행사 | 공개 피드 확인 못 함 | — | | ❓ | **딥링크만** |
| Ticketmaster AU | 콘서트·공연·스포츠 | 기존 키, `countryCode=AU` | ✅ | | ✅ | **키 받아 통합 — 호주 전 도시 핵심** (퍼스·애들레이드는 사실상 주 소스) |
| Moshtix, Oztix, Eventfinda AU | 예매 | Eventfinda는 API 있으나 유료·승인제(🟡) | — | | 🟡 | 딥링크 |

### 2-3. 일본 (도쿄 · 오사카 · 교토)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **Doorkeeper API** `https://api.doorkeeper.jp/events?prefecture={tokyo|osaka|kyoto}&since={오늘}&sort=starts_at&page={n}` | 커뮤니티 행사(IT 세미나·워크숍 위주). 예정 도쿄 **49**, 오사카 **14**, 교토 **1** | 키 불필요(비인증 요청은 레이트 리밋 낮음) | ✅ `banner` 48/64 / 이용 조건은 API 문서 기준(🟡) | 좌표 `lat`/`long` 전 건 | ✅실호출 | **바로 통합 (키 불필요, 보조)** — 양 적음, 워크숍 종류 |
| Connpass API v2 `connpass.com/api/v2/events/` | 일본 최대 IT 커뮤니티 행사 (도쿄 수백 건 예상) | **API 키 필수**(`X-API-Key`, 신청서 → 수일 내 메일 발급). v1은 403 | 🟡 이미지 없음(행사 페이지 og:image) | 상업 이용 조건 신청 시 확인 | ✅실호출(401) | **키 받아 통합** |
| **港区イベント情報** CSV (東京都オープンデータ `t131032d0000000003`) `https://opendata.city.minato.tokyo.jp/dataset/abb98f48-76fb-4013-9d7e-d3028830e7f2/resource/53b60f4a-f39e-41f2-b7a6-41f5c7ab23d3/download/minatokueventjoho.csv` | 미나토구 행사(강좌·체험·축제) 1,114행, 이 중 종료일이 11월 이후 **48건** | 키 불필요 | ❌ 이미지·좌표 없음 → `ページURL` og:image, `ところ` 지오코딩 / **CC BY** | 날짜 `2026年10月17日から2026年10月17日` 형식. 리소스 갱신 2026-09-01(월 단위로 보임) | ✅실호출 | **바로 통합 (키 불필요, 보조)** |
| 東京ビッグサイトのイベント情報 CSV `https://www.opendata.metro.tokyo.lg.jp/tokyobigsight/tokyobigsighteventinformation.csv` | 빅사이트 전시회 120건(11~1월) | 키 불필요, 분기 갱신 | ❌ / CC BY | **대부분 B2B 박람회**(`来場対象者=商談`) → 일반 관람 가능 행사만 | ✅실호출 | **바로 통합 (보조, 필터 필수)** |
| 기타 東京都 카탈로그 イベント 데이터셋 (板橋区 2021, 町田市 2019, 都立文化施設事業一覧 R5 등) | | | CC BY | **오래됨** | ✅실호출(카탈로그) | 사용 안 함 |
| 오사카시·교토시 오픈데이터 | 행사 피드 확인 못 함 | | | | ❓ | 딥링크 (osaka-info.jp, kyoto.travel) |
| Tokyo Art Beat | 미술 전시 | 2009년 공개 API 공지만 있음, 현재 운영 ❓ | | | ❓ | **딥링크만** (제휴 문의 후보) |
| Art Commons (국립신미술관 전시 DB) / Japan Search | 전국 전시 이력 | Japan Search API 키 불필요 | | 예정 전시 포함 여부·DB ID 확인 못 함 | 🟡 | 보류 |
| Peatix | 행사·워크숍 | 공개 API 없음 | — | | 🟡 | **딥링크만** |
| Ticketmaster JP | | 코드 `JP` 있음 | | 일본 티켓 시장은 ぴあ·e+·ローチケ 중심 → 재고 매우 적을 것 | ✅ 코드 / ❓ 재고 | 실측 후 결정 |
| ぴあ, e+, ローソンチケット, JNTO, GO TOKYO | 예매·관광 | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-4. 대만 (타이베이)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **문화부 iCulture 활동 피드** `https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category={c}` | 전국 공연·전시·강좌·가족·영화 등. category 1(음악)·2(연극)·3(무용)·4(가족)·5(인디)·6(전시)·7(강좌)·8(영화)·11·13·14·15·17(콘서트)·19 합계 예정 **1,275건**, 그중 **타이베이 410건** | 키 불필요, JSON | 🟡 `imageUrl` 56건뿐(4%) → `sourceWebPromote`/`webSales` og:image + 장소 사진 대체 / 정부 오픈데이터 라이선스(政府資料開放授權條款, CC BY 4.0 호환 — 이 피드 개별 표기는 🟡) | `showInfo[]`(회차별 시간·장소·`latitude`/`longitude`·가격) — 좌표 956/1,275(75%). 날짜 `YYYY/MM/DD` | ✅실호출 | **바로 통합 (키 불필요) — 타이베이 1순위** |
| **교통부 관광서 관광자료 — 활동(Event)** `https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Event-json.zip` (data.gov.tw 7778) | 전국 관광 축제·행사 1,186건 중 예정 **141건**(타이베이 3, 신베이 22, 가오슝 23) | 키 불필요, 매일(UpdateTime 2026-11-11), ZIP 안 `EventList.json`(BOM 제거) | ✅ `Images[].URL` **141/141** / **政府資料開放授權條款 第1版** (data.gov.tw `license: 1`) | 좌표 `PositionLat/Lon` | ✅실호출 | **바로 통합 (키 불필요, 보조)** — 타이베이 양 적음, 가오슝 추가 시 유용 |
| 臺北旅遊網 Open API `https://www.travel.taipei/open-api/zh-tw/Events/Activity?page=1` (`Accept: application/json`) | 타이베이시 관광 행사·전시(사진 포함으로 알려짐) | 키 불필요(문서상) | 🟡 | **이 환경에서 Cloudflare 챌린지 403** | 🟡 | 보류 — GitHub Actions에서 재시도, 통과하면 타이베이 2순위 |
| data.taipei 활동 데이터셋 | 동물원 행사력 등 단일 기관 | | | 시 전체 활동 피드 없음 | 🟡 | 사용 안 함 |
| KKTIX, 年代售票, 寬宏, OPENTIX | 예매 | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-5. 홍콩

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **LCSD 문화행사** `https://www.lcsd.gov.hk/datagovhk/event/events.xml` + 장소 `…/event/venues.xml` | 康文署 공연·전시·가족·강좌 **1,100건**, **영문·중문 제목/설명 모두 있음** | 키 불필요, 매일(submitdate 2026-11-10) | ❌ `prog_image` 필드는 있으나 **0건** → 장소 사진 대체 / DATA.GOV.HK 이용약관(출처 표기 시 상업 포함 재사용 허용, 🟡) | 날짜는 `predateE` 텍스트(`19/12/2026 (Sat) 19:30` 여러 줄) 파싱. 장소 159곳 중 좌표 65곳 → 나머지 지오코딩 | ✅실호출 | **바로 통합 (키 불필요) — 홍콩 1순위** |
| **URBTIX 판매 중 이벤트** `https://fs-open-1304240968.cos.ap-hongkong.myqcloud.com/prod/gprd/URBTIX_eventBatch_{YYYYMMDD}.xml` | 시 매표 시스템 판매 행사 **224건**(회차·카테고리·예매 링크, 영·중) | 키 불필요, 일일 파일(오늘 날짜) | ❌ 이미지 없음 / DATA.GOV.HK | LCSD와 상당 부분 중복 → 제목·날짜로 병합, `bookingUrl` 보강용 | ✅실호출 | **바로 통합 (보조)** |
| HKTB 주관 행사 CSV (`tourism.gov.hk/datagovhk/hktb_events/hktb_events_en.csv`) | 관광청 대형 행사 5건 | 키 불필요 | ❌ | **2025년 일정에서 멈춤** | ✅실호출 | 사용 안 함 (갱신 대기) |
| EventHK (`gov.hk/.../eventhk/event_message.json`) | 정부 행사 | | | **"2026-06-08부터 갱신 중단" 메시지만 반환** | ✅실호출 | 사용 안 함 |
| Discover Hong Kong, Cityline, HK Ticketing | 관광·예매 | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-6. 싱가포르

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| STB Tourism Information & Services Hub (TIH) API | 과거 관광 이벤트·명소 API | 키 | | **2025-07-31 종료 공지(STB FAQ, 검색 인용), `tih.stb.gov.sg` DNS 응답 없음** | ✅(종료 확인) | **사용 안 함** |
| data.gov.sg | 행사 데이터셋 확인 못 함(검색 API가 질의어를 무시함) | | | | ❓ | 사용 안 함 (현재) |
| Ticketmaster SG | Ticketmaster Singapore 운영 중으로 알려짐 | 기존 키 | ✅ | | ✅ 코드 / 🟡 재고 | **키 받아 통합** (실측) |
| Esplanade, National Gallery, NLB 행사, Visit Singapore, SISTIC | | 공개 API ❌ (NLB API는 도서 목록용) | — | | 🟡 | **딥링크만** |

### 2-7. 태국 (방콕)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **TAT Data API** `https://tatdataapi.io/api/v2/events` | 태국관광청 이벤트·명소(사진 포함으로 알려짐) | API 키 필요(키 없이 401 "No API key found") — tatdataapi.io 포털 가입 | 🟡 / 조건 ❓ | 무료 여부·레이트 리밋 ❓ | ✅실호출(401) / 조건 ❓ | **키 받아 통합 — 방콕 1순위** |
| 구 TAT API (`tatapi.tourismthailand.org`) | | | | TLS 인증서 오류(폐기된 것으로 보임) | ✅실호출(실패) | 사용 안 함 |
| Bangkok 오픈데이터, ThaiTicketMajor, Ticketmelon | | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-8. 베트남 · 말레이시아 · 필리핀 · 인도네시아

| 소스 | 다루는 것 | 접근 | 검증 | 판정 |
|---|---|---|---|---|
| 하노이 시 데이터 포털(결정 3478/QĐ-UBND 2023), 호찌민 오픈데이터, Bản đồ Văn hóa số(전국 400+ 행사 지도) | 행사 API·데이터셋 확인 못 함 | — | ❓ | **딥링크만** (Ticketbox.vn 포함) |
| archive.data.gov.my (InvestKL·MITI 행사 2017–2019), DBKL | 과거 데이터뿐 | — | 🟡 | 사용 안 함 / 딥링크 (Visit KL, TicketCharge) |
| data.gov.ph | 행사 데이터셋 확인 못 함 | — | ❓ | 딥링크 (SM Tickets, TicketNet) |
| Satu Data Jakarta, indonesia.travel 이벤트, 발리 주 관광청 | API 확인 못 함 (자카르타 2027 문화 달력 준비 중이라는 보도) | — | 🟡 | 딥링크 (Loket.com, indonesia.travel) |
| Ticketmaster MY | 코드 `MY` 있음 | 기존 키 | ✅ 코드 / ❓ 재고 | 실측 후 결정 |

이 6개 도시는 **places(Wikidata) + 위키백과 오디오가이드 + Viator/GYG/izi + Klook 딥링크**로 채운다.

### 2-9. 중국 (상하이 · 베이징) — 법적 제약

| 소스 | 접근 | 판정 |
|---|---|---|
| 大麦(Damai), 猫眼(Maoyan), 秀动(Showstart) | 공개 API 없음, 약관상 자동 수집 금지, 중국 개인정보보호법(PIPL)·데이터 반출 규정, 반(反)부정경쟁법상 크롤링 소송 판례 다수 | **딥링크만** |
| 豆瓣同城 | 공개 API 종료 | 사용 안 함 |
| 상하이·베이징 시 오픈데이터 포털 | 실명 등록 필요, 문화행사 피드 확인 못 함 | ❓ / 사용 안 함 |
| Ticketmaster CN | 코드 있음, 재고 거의 없을 것 | 실측만 |

중국 도시는 **places + 위키백과(zh/en) 오디오가이드 + 딥링크**만. 수집 코드는 중국 서버에 접근하지 않는다(빌드는 GitHub Actions, 해외). 참고로 중국 본토 사용자는 위키백과·Wikimedia 이미지·GitHub Pages에 접근이 불안정할 수 있다(앱 동작 문제이지 수집 합법성 문제는 아님).

---

## 3. 공통 (모든 3단계 도시)

| 소스 | 종류 | 접근 | 이미지 | 검증 | 판정 |
|---|---|---|---|---|---|
| **places.mjs (Wikidata 상설 명소)** | 박물관·미술관·명소 10~15곳/도시 | 키 불필요. `COUNTRY_QID`에 Q30·Q408·Q17·Q865·Q8646·Q334·Q869·Q881·Q833·Q928·Q252·Q148 추가 필요 | ✅ Commons P18 | ✅ (코드) / 3단계 도시 밀도 ❓ | **바로 통합** — "10건 이상 + 이미지" 요건의 바닥 |
| Wikipedia / Commons 오디오가이드 | 오디오가이드 | 키 불필요. wikiLang 위 표 | ✅ | ✅ / 아시아 언어 위키 밀도 실측 못 함 | **바로 통합** (이미 있음) |
| Ticketmaster Discovery | 공연·스포츠 | 기존 키. US·AU 핵심, JP·TW·HK·SG·TH·MY·CN 코드만 확인 | ✅ | ✅ 코드 표 | **키 받아 통합** (아시아 실측) |
| Viator / GetYourGuide / izi.TRAVEL | 투어·클래스·오디오가이드 | 기존 키 | ✅ | ✅ (1단계) | **키 받아 통합** — 아시아 도시는 사실상 주 소스 |
| Klook | 아시아 체험·입장권 | 제휴 링크 + **상품 피드는 요청 시**(Travelpayouts 경유) / 공급사용 OCTO API는 별개 | ✅ | 🟡 | **키 받아 통합 (후보)** — 제휴 승인 후 피드 |
| KKday | 아시아 체험 | 제휴 링크만(Ecomobi 등), API 확인 못 함 | — | 🟡 | **딥링크만** |
| Meetup | | Pro 구독자 전용 GraphQL(2025-02 전환) | — | ✅ 도움말 | **딥링크만** |
| Eventbrite | | 공개 검색 종료 | — | ✅ | **사용 안 함** |

---

## 4. 종류별 요약

| 종류 | 키 없이 | 키로 추가 | 딥링크 |
|---|---|---|---|
| 축제·행사 | NYC 허가행사, 브리즈번, 대만 관광서·문화부, 홍콩 LCSD | Ticketmaster, NPS, TAT, ATDW | 각 도시 관광청, Damai |
| 공연 | 홍콩 LCSD·URBTIX, 대만 문화부(음악·연극·무용), 스미소니언 | **Ticketmaster(미국·호주)**, SeatGeek | ぴあ, KKTIX, SISTIC, Ticketbox |
| 전시 | 스미소니언, 브리즈번(Museum of Brisbane), 대만 문화부(전시), 홍콩 LCSD, places(상설) | | Tokyo Art Beat |
| 클래스·워크숍 | SF Our415, 시카고 CPL·CPD, NYC Parks, Doorkeeper, 브리즈번 | Connpass, Viator, GYG | Peatix, Meetup, Klook |
| 가이드투어 | NYC Parks(Tours 47), 스미소니언(갤러리 투어), 브리즈번(Tours) | NPS(레인저 투어), Viator, GYG | Klook, KKday |
| 오디오가이드 | 위키백과 자동 생성 | izi.TRAVEL | |

---

## 5. 통합 우선순위 (정확한 엔드포인트)

모두 2026-11-11 실호출로 확인한 값(키 필요 항목 제외). 공통: `User-Agent` 헤더 필수. 이미지가 없는 소스는 기존 `enrich.mjs` 체인(og:image → 장소 Commons → 근처 명소)으로 채운다.

### A. 키 불필요 — 바로 통합

1. **Smithsonian Trumba** (`sourceKey` 제안: `smithsonian`) → washingtondc (+ newyork: 쿠퍼휴잇·NMAI)
   `GET https://www.trumba.com/calendars/smithsonian-events.json`
   필드: `eventID`, `title`, `description`(HTML), `startDateTime`/`endDateTime`(현지, `startTimeZoneOffset`), `allDay`, `canceled`, `location`, `eventImage{url,alt}`, `permaLinkUrl`, `customFields[]`(label: `Venue`, `Cost`, `Categories`, `Sponsor`, `Get Tickets/Register`). 반복행사는 `seriesID`로 병합. 좌표 없음 → `Venue` 이름 지오코딩(캐시). posterCredit `Smithsonian`. **이미지 99.8%.**
2. **Brisbane City Council Trumba** (`brisbane`) → brisbane
   `GET https://www.trumba.com/calendars/brisbane-city-council.json`
   필드는 1과 같은 Trumba 구조. `customFields`: `Venue`, `Venue address`(링크 `?q={lat},{lng}(이름)` → 좌표), `Event type`, `Primary event type`(종류 매핑: Exhibitions→exhibition, Tours→tour, Workshops/Fitness→workshop, Music/Theatre→performance, Festivals/Markets→festival), `Cost`. CC BY 4.0, 출처 "Brisbane City Council". **이미지 99%.** 보조: `https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/{music-events|creative-events|mob-events|brisbane-botanic-gardens-events}/exports/json?where=end_datetime>=now()`.
3. **SF Our415** (`our415`) → sanfrancisco
   `GET https://data.sfgov.org/resource/8i3s-ih2a.json?$where=event_end_date>='{오늘}'&$limit=5000`
   필드: `id`, `org_name`, `event_name`, `event_description`, `event_start_date`/`event_end_date`, `start_time`/`end_time`, `days_of_week`, `fee`, `admission_price`, `site_location_name`, `site_address`, `latitude`/`longitude`, `event_photo.url`(**`Logo` 포함 URL 제외**), `events_category`, `more_info`. PDDL.
4. **NYC Parks events** (`nycparks`) → newyork
   `GET https://data.cityofnewyork.us/resource/w3wp-dpdi.json?$limit=2000` (14일치) — 또는 같은 내용의 `https://www.nycgovparks.org/xml/events_300_rss.json`(`startdate`/`enddate` 분리, `image` 포함)
   필드: `title`, `description`(HTML), `starttime`/`endtime`, `parknames`, `location`, `categories`(`|` 구분: Tours→tour, Art/Dance/Education→workshop 등, Fitness·Volunteer는 제외 권장), `coordinates`("lat, lng" 문자열), `image`(http → https), `link`. NYC Open Data 약관.
5. **Chicago Public Library** (`chipublib`) → chicago
   `GET https://data.cityofchicago.org/resource/vsdy-d8k7.json?$where=start>='{오늘}' AND cancelled=false&$order=start&$limit=3000`
   필드: `event_id`, `title`, `description`(HTML), `event_types`, `event_audiences`, `start`/`end`, `location_name`, `location_address`, `location{coordinates}`, `event_page`(og:image). Story Time·Book Clubs는 상한(예: 200)으로 묶기.
6. **Chicago Park District** (`chiparks`) → chicago
   `GET https://data.cityofchicago.org/resource/tn7v-6rnw.json?$where=end_date>='{오늘}' AND type='Event'&$limit=1000` (+ 선택: `type='Program'` 중 Arts·Nature 카테고리)
   필드: `activity_id`, `title`, `description`, `start_date`/`end_date`, `date_notes`, `location_facility`, `address`, `latitude`/`longitude`, `category`, `fee`, `image_link`, `information_link`, `registration_link`, `event_cancelled`.
7. **대만 문화부 iCulture** (`iculture`) → taipei (+ 가오슝 추가 시)
   `GET https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category={1,2,3,4,5,6,7,8,11,13,15,17,19}` (14 = 모집, 제외)
   필드: `UID`, `title`, `category`, `showInfo[]{time, endTime, location, locationName, latitude, longitude, price, onSales}`, `descriptionFilterHtml`, `imageUrl`, `masterUnit`, `webSales`, `sourceWebPromote`, `startDate`/`endDate`(`YYYY/MM/DD`). 도시 필터: `showInfo[].location`에 `臺北市|台北市` 또는 좌표 반경. 이미지 4% → og:image 보강 필수.
8. **홍콩 LCSD** (`lcsd`) → hongkong
   `GET https://www.lcsd.gov.hk/datagovhk/event/events.xml` + `GET https://www.lcsd.gov.hk/datagovhk/event/venues.xml`
   필드: `event@id`, `titlec`/`titlee`(→ `title`/`titleEn`), `cat1`/`cat2`, `predateE`(여러 줄 `dd/mm/yyyy (Ddd) HH:MM` → 첫·마지막 날짜), `venueid`(→ venues.xml `venuee`, `latitude`/`longitude`), `pricee`, `desce`, `urle`, `presenterorge`. XML 파서 필요(CDATA).
9. **대만 관광서 활동** (`twtourism`) → taipei (보조)
   `GET https://media.taiwan.net.tw/XMLReleaseAll_public/v2.0/Zh_tw/Event-json.zip` → `EventList.json`(UTF-8 BOM) → `Events[]`
   필드: `EventID`, `EventName`, `Description`, `PositionLat`/`PositionLon`, `PostalAddress.City`, `Images[].URL`, `StartDateTime`/`EndDateTime`(ISO+08:00), `WebsiteURL`, `IsAccessibleForFree`. 政府資料開放授權條款. ZIP 해제는 Node 내장 `zlib`(inflateRaw)로 가능 — 새 의존성 없이.
10. **URBTIX** (`urbtix`) → hongkong (보조)
    `GET https://fs-open-1304240968.cos.ap-hongkong.myqcloud.com/prod/gprd/URBTIX_eventBatch_{YYYYMMDD}.xml` (홍콩 날짜 기준, 없으면 전날)
    `EVENT{ST_DATE, ED_DATE, EVENT_EG/TC, REFERENCE_LINK, CATEGORY.MAIN_CAT.EG, LOCATION.VENUE_EG, PERFORMANCES.PERFORMANCE[].PERFORMANCE_DATETIME}`.
11. **Doorkeeper** (`doorkeeper`) → tokyo, osaka, kyoto
    `GET https://api.doorkeeper.jp/events?prefecture={tokyo|osaka|kyoto}&since={오늘}&sort=starts_at&page={1..}` (빈 배열이면 종료)
    `event{id,title,starts_at,ends_at(UTC),venue_name,address,lat,long,banner,description,public_url}` → kind `workshop`.
12. **미나토구 イベント情報 CSV** (`minato`) → tokyo
    위 2-3 URL. 컬럼 `ページURL`, `第1分類`, `開催日時`(`…から…`), `ページタイトル`, `内容`, `ところ`(지오코딩), `費用`. CC BY.
13. **NYC Permitted Events** (`nycpermits`) → newyork (보조)
    `GET https://data.cityofnewyork.us/resource/tvpp-9vvx.json?$where=start_date_time>='{오늘}' AND event_type in('Street Event','Special Event','Street Festival','Parade')` (`event_type` 실제 값은 첫 구현 때 `$group`으로 확인)
14. **Tokyo Big Sight CSV** (`bigsight`) → tokyo (보조, `来場対象者`가 일반 관람인 행만)

### B. 키 필요 — 이미 있는 키로 확장

15. **Ticketmaster Discovery** — US 10도시·AU 5도시는 `countryCode` 그대로. JP·TW·HK·SG·TH·MY·CN은 첫 빌드에서 건수 측정 후 `ticketmaster` 값 결정(0이면 `false`). VN·PH·ID는 코드 없음 → `false`.
16. **Viator / GetYourGuide / izi.TRAVEL** — 도시 추가만으로 적용.

### C. 새 키 신청 (무료 또는 저렴한 것부터)

17. **NPS Events API** (`NPS_API_KEY` — api.data.gov 키 하나로 Smithsonian Open Access도 사용 가능)
    `GET https://developer.nps.gov/api/v1/events?parkCode={codes}&pageSize=50&pageNumber={n}&api_key={key}`
    도시별 parkCode 제안: newyork `stli,gate,afbg,fedh,cacl,hagr` · washingtondc `nama,whho,linc,wamo,frde,mlkm` · boston `bost,bohf,frla` · sanfrancisco `goga,safr,muwo,alca` · neworleans `jazz,jela` · chicago `pull` · seattle `klse` · losangeles `samo` · miami `bica,ever` · austin `lyjo`(근교). 필드: `title`, `description`, `dates[]`, `times[]`, `latitude`/`longitude`, `images[]{url(https://www.nps.gov 접두), credit}`, `isfree`, `feeinfo`, `infourl`, `category`. 공공영역(연방 저작물) 이미지 다수.
18. **TAT Data API** (`TAT_API_KEY`) — `https://tatdataapi.io/api/v2/events` (헤더/파라미터 형식은 포털 문서에서 확인) → bangkok. 무료 여부 확인.
19. **Connpass API v2** (`CONNPASS_API_KEY`, 헤더 `X-API-Key`) — `https://connpass.com/api/v2/events/?prefecture=tokyo&ymd_from…`(파라미터는 v2 문서 확인) → tokyo, osaka, kyoto.
20. **ATDW ATLAS** (`ATDW_API_KEY`) — 시드니·멜버른·퍼스·애들레이드 이벤트·투어. 체험 키로 양과 이미지 확인 → 배포 라이선스 비용 확인 후 결정.
21. 선택: SeatGeek `client_id`(미국 공연 보강), Klook 제휴 상품 피드(아시아 투어·체험).

### D. 감시·재확인 목록
- 臺北旅遊網 Open API — GitHub Actions에서 Cloudflare 통과 여부
- What's On Melbourne MCP — 재배포·상업 이용 조건 (opendata@melbourne.vic.gov.au)
- Library of Congress events JSON — CI에서 재시도
- HKTB 행사 CSV 갱신 재개 여부, LA City Events 데이터셋 후속 버전
- Japan Search / Art Commons의 예정 전시 포함 여부
- 아시아 Ticketmaster 실재고, 아시아 위키백과 좌표 밀도(places·오디오가이드)

### 받아야 할 키 (사용자 할 일)
| Secret 이름 | 발급처 | 비용 | 쓰는 곳 |
|---|---|---|---|
| `NPS_API_KEY` | https://api.data.gov/signup/ (이메일만) | 무료, 시간당 1,000회 | 미국 10도시 국립공원 행사 (+ Smithsonian Open Access) |
| `TAT_API_KEY` | https://tatdataapi.io/ 포털 가입 | ❓ (무료로 알려짐, 확인 필요) | 방콕 |
| `CONNPASS_API_KEY` | connpass 도움말의 API 이용 신청 폼 | 무료(신청 심사 수일) | 도쿄·오사카·교토 |
| `ATDW_API_KEY` | https://www.atdw.com.au/ 배포자 등록 (30일 체험) | 체험 무료, 이후 계약(요금 문의) | 시드니·멜버른·퍼스·애들레이드 |
| `SEATGEEK_CLIENT_ID` (선택) | https://seatgeek.com/account/develop | 무료 | 미국 |
| Klook 제휴 (선택) | Klook Affiliate / Travelpayouts → 상품 피드 요청 | 무료(수수료형) | 아시아 전 도시 |

---

## 6. 판정 집계

본문 표 기준(같은 소스는 한 번만 셈).

| 판정 | 개수 | 소스 |
|---|---|---|
| 바로 통합 (키 불필요) | 16 | NYC Parks, NYC 허가행사(보조), SF Our415, Chicago CPL, Chicago Park District, Smithsonian Trumba(조건부), Brisbane Trumba, Brisbane 주제별 ODS(보조), 대만 문화부 iCulture, 대만 관광서 활동, 홍콩 LCSD, URBTIX(보조), Doorkeeper(보조), 미나토구 CSV(보조), 빅사이트 CSV(보조), places+위키백과(공통) |
| 키 받아 통합 | 11 | Ticketmaster(US·AU·아시아 실측), Viator, GYG, izi.TRAVEL, NPS, TAT Data API, Connpass, ATDW(유료일 수 있음), SeatGeek(후보), Klook 피드(후보), Smithsonian Open Access(보강) |
| 딥링크만 | 약 40곳 | 시드니 What's On, 퍼스·애들레이드·각 관광청, Peatix, Tokyo Art Beat, ぴあ·e+, KKTIX, SISTIC, Esplanade, ThaiTicketMajor, Ticketbox, Loket, Damai·Maoyan, KKday, Meetup 등 |
| 사용 안 함 | 13 | LA City Events(중단), LA El Pueblo, Seattle 허가, Austin ACE, NYC PPD 통계, Melbourne 허가(과거), SA Parse API(종료), STB TIH(종료), EventHK(중단), HKTB CSV(2025에서 멈춤), 구 TAT API, Eventbrite, 豆瓣同城 |
| 보류 | 6 | What's On Melbourne MCP(라이선스), 臺北旅遊網 API(Cloudflare), Library of Congress(Cloudflare), Japan Search/Art Commons, UW Trumba(시애틀 보조), Austin ACCD(약함) |

---

## 7. 추천 도시 목록 (나라별)

| 나라 | 추천 | 근거 |
|---|---|---|
| 미국 (10) | 뉴욕, 샌프란시스코, 시카고, 워싱턴 DC — **이벤트 피드 강함** / 로스앤젤레스, 시애틀, 보스턴, 오스틴, 뉴올리언스, 마이애미 — Ticketmaster + NPS + places | Ticketmaster 키가 있으면 10곳 모두 충분 |
| 호주 (5) | 브리즈번 — **피드 강함(이미지 99%)** / 시드니, 멜버른, 퍼스, 애들레이드 — Ticketmaster + places (ATDW 받으면 강화) | |
| 일본 (3) | 도쿄, 오사카, 교토 | 이벤트 피드 약함 → places·오디오가이드·Viator 중심. Connpass 키로 워크숍 보강 |
| 대만 (1~2) | 타이베이 (+ **가오슝 추가 권장**) | 문화부 피드가 전국 단위라 도시 추가 비용이 거의 0 |
| 홍콩 (1) | 홍콩 | LCSD 1,100건 영·중 이중 언어 |
| 싱가포르·태국·베트남·말레이시아·필리핀·인도네시아 (8) | 싱가포르, 방콕, 호찌민, 하노이, 쿠알라룸푸르, 마닐라, 자카르타, 발리 | places + Viator/GYG/Klook 딥링크. 방콕은 TAT 키로 승격 |
| 중국 (2) | 상하이, 베이징 — **places·오디오가이드·딥링크만** | 이벤트 수집 안 함 |

---

## 8. 확인 못 한 것

- Ticketmaster JP·TW·HK·SG·TH·MY·CN 실제 이벤트 양 (키로 첫 빌드 때 측정)
- 아시아 도시의 위키백과·Wikidata 좌표 밀도 (places 10건 충족 여부 — 이번 조사에서 실측 못 함, 첫 빌드에서 확인)
- Smithsonian Trumba 피드·이미지의 재사용 조건 (스미소니언 웹 이용약관은 개방 라이선스가 아님)
- 대만 문화부 iCulture 피드의 개별 라이선스 표기, Doorkeeper API 이용 조건 원문, DATA.GOV.HK 약관 원문
- TAT Data API 요금·인증 방식, Connpass 상업 이용 조건, ATDW 요금
- 臺北旅遊網 API가 CI 환경에서 열리는지
- Chicago Data Portal "See Terms of Use"의 출처 표기 문구

---

## 9. 참고 링크
- NYC Open Data: https://data.cityofnewyork.us/d/w3wp-dpdi · https://data.cityofnewyork.us/d/tvpp-9vvx · NYC Parks 피드: https://www.nycgovparks.org/xml/events_300_rss.json
- SF Our415: https://data.sfgov.org/d/8i3s-ih2a
- Chicago: https://data.cityofchicago.org/d/vsdy-d8k7 · https://data.cityofchicago.org/d/tn7v-6rnw
- Smithsonian Trumba: https://www.trumba.com/calendars/smithsonian-events.json · NPS: https://www.nps.gov/subjects/developer/api-documentation.htm · api.data.gov: https://api.data.gov/signup/
- Brisbane: https://data.brisbane.qld.gov.au/explore/dataset/brisbane-city-council-events/
- ATDW: https://support.atdw.com.au/en/articles/43990-how-to-join-as-a-distributor
- What's On Melbourne: https://whatson.melbourne.vic.gov.au/llms.txt · https://whatson.melbourne.vic.gov.au/.well-known/mcp.json
- City of Sydney What's On 약관: https://whatson.cityofsydney.nsw.gov.au/pages/terms-and-conditions
- 東京都オープンデータ: https://catalog.data.metro.tokyo.lg.jp/dataset/t131032d0000000003 · https://catalog.data.metro.tokyo.lg.jp/dataset/t001001d0000000001
- Doorkeeper API: https://www.doorkeeper.jp/developer/api · connpass API v2: https://connpass.com/about/api/v2/
- 대만 문화부: https://opendata.culture.tw/ · 관광서 활동: https://data.gov.tw/dataset/7778
- 홍콩: https://data.gov.hk/en-data/dataset/hk-lcsd-event-event-information · https://data.gov.hk/en-data/dataset/hk-lcsd-event-urbtix-event
- TAT Data API: https://tatdataapi.io/
- Ticketmaster 국가코드: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- Klook 제휴: https://affiliate.klook.com/ · Meetup API 도움말: https://help.meetup.com/hc/en-us/articles/41453576628749

---

## 10. 통합 상태 (2026-11-12, 데이터 에이전트)

API 키는 하나도 설정돼 있지 않다(Ticketmaster·Viator·GYG·izi 포함). 아래 "통합됨"은 모두 **키 없이** 동작하는 것이다. 첫 빌드: `BUILD_COUNTRIES=US,AU,JP,TW,HK,SG,TH,VN,MY,PH,ID,CN`.

| 소스 (`sourceKey`) | 모듈 | 도시 | 상태 | 비고 |
|---|---|---|---|---|
| Smithsonian Trumba (`smithsonian`) | `us.mjs` (+ 공통 `trumba.mjs`) | washingtondc, newyork | ✅ 통합 | 회차를 seriesID로 병합, 온라인·타 주(州) 순회전 제외, 박물관 이름→좌표 표. 약관: 개방 라이선스 아님(출처·링크백) |
| SF Our415 (`our415`) | `us.mjs` | sanfrancisco | ✅ 통합 | 레크파크 로고 사진 제외, 레크파크는 문화·자연 강좌만, 상한 450 |
| NYC Parks (`nycparks`) | `us.mjs` | newyork | ✅ 통합 | `events_300_rss.json`(이미지 포함, 14일치). 운동·자원봉사 제외 |
| Chicago Public Library (`chipublib`) | `us.mjs` | chicago | ✅ 통합 | 회차 병합, 스토리타임·북클럽 후순위, 상한 350 |
| Chicago Park District (`chiparks`) | `us.mjs` | chicago | ✅ 통합 | 행사 + 공개 강좌(문화·교양 Instruction, 시작일 있음) `workshop` 상한 40 |
| NPS Events (`nps`) | `us.mjs` | 미국 10도시 | ⏸ 키 대기 | `NPS_API_KEY` 없으면 꺼짐. DEMO_KEY로 동작 확인(DC·보스턴·뉴올리언스 117건) |
| Brisbane Trumba (`brisbane`) | `au.mjs` | brisbane | ✅ 통합 | 피트니스 상한 40, 나머지 500. 좌표는 Venue address 링크, 없으면 지오코딩 |
| 대만 문화부 iCulture (`iculture`) | `tw.mjs` | taipei, kaohsiung | ✅ 통합 | 오늘 피드 전체 487건(조사일 1,275건보다 적음) → 타이베이 28 · 가오슝 124 |
| 대만 관광서 활동 (`twtourism`) | `tw.mjs` | taipei, kaohsiung | ✅ 통합 | ZIP을 Node 내장 zlib으로 해제 |
| 홍콩 LCSD (`lcsd`) | `hk.mjs` | hongkong | ✅ 통합 | 장기 수강 강좌(inc4sc14) 제외, 상한 550. `predateE` 여러 형식 파싱 |
| URBTIX (`urbtix`) | `hk.mjs` | hongkong | ✅ 통합 | 그날 파일 없으면 최근 3일. 좌표는 LCSD 장소 표에서 |
| Doorkeeper (`doorkeeper`) | `jp.mjs` | tokyo, osaka, kyoto | ✅ 통합 | API 약관 확인: Doorkeeper 이벤트 페이지 링크 표시 의무(nofollow 금지), 경쟁 서비스 금지 → 허용. 로고 배너 제외 |
| 미나토구 CSV (`minato`) | `jp.mjs` | tokyo | ✅ 통합 | 오늘 기준 CSV 312행 → 예정 54건 |
| NYC 허가행사 · 빅사이트 CSV · Brisbane ODS 보조 | — | — | 미통합 | 이번 범위 밖(보조 소스) |
| Ticketmaster · Viator · GYG · izi | `generic.mjs` | 전 도시 | ⏸ 키 없음 | 코드만 있음, 키가 없으면 건너뜀 |

places(`COUNTRY_QID` 12개국 추가, 홍콩은 P17=중국이라 P131 체인으로 홍콩만)·위키백과 오디오가이드는 31개 도시 모두 적용. 모든 도시 10건 이상, 대표 이미지는 enrich 체인(소스 이미지 → og:image → 장소 사진 → 주변 명소)으로 채운다.
