# 놀곳 데이터 소스 조사 — 한국 · 독일

조사일: 2026-11-08 · 조사 방법: 웹 검색(한/영/독) 약 40회. 공식 문서 페이지를 직접 열지 못한 경우가 많아, 각 항목에 **검증 수준**을 표시했다.

- ✅ 공식 문서·공식 페이지로 확인 · 🟡 커뮤니티/제3자 자료로 확인(공식 미확인) · ❓ 확인 못 함

판정 기준
- **바로 통합 (키 불필요)** — 지금 빌드에 넣을 수 있음
- **키 받아 통합** — 무료/승인형 키 필요
- **딥링크만** — API 없음 또는 약관상 데이터 재사용 불가 → 해당 사이트 검색 링크로 연결
- **사용 안 함** — 서비스 종료, 유료 고가, 약관 위반 위험

> 원칙: 약관이 스크래핑을 금지하거나 비공식(문서화되지 않은) API만 있는 곳은 데이터 수집 대상에서 제외한다. 포스터/이미지는 API가 제공한 것, 이벤트 공식 페이지의 og:image, Wikimedia Commons만 쓴다.

---

## 1. 한국

### 1-1. 공공 API (공공데이터포털 data.go.kr 키 하나로 대부분 해결)

| 소스 | 다루는 것 | 접근 | 이미지 | 검증 | 판정 |
|---|---|---|---|---|---|
| 한국관광공사 TourAPI 4.0 KorService2 `searchFestival2` / `detailIntro2` / `detailCommon2` | 전국 축제·행사 | REST JSON, data.go.kr 키(Decoding 키) | ✅ firstimage (공공누리) | 🟡 경로 존재 확인(가짜 키로 인증오류 응답), 필드명 일부 미확인 | **키 받아 통합** (이미 통합) |
| TourAPI EngService2 (영문) | 외국인용 축제·관광지 영문 | 같은 키, 별도 활용신청 | ✅ | 🟡 | **키 받아 통합** (이미 통합) |
| TourAPI 기타 언어(일/중 등) | 다국어 | 같은 키 | ✅ | 🟡 | 보류 (현재 ko/en만) |
| KOPIS 공연예술통합전산망 `pblprfr`, `pblprfr/{id}`, `prfplc/{id}` | 전국 공연(연극·뮤지컬·클래식·국악·대중음악·무용·서커스) | REST XML, kopis.or.kr 키, 조회기간 최대 31일·100행 | ✅ 포스터 | 🟡 | **키 받아 통합** (이미 통합) |
| 한국문화정보원 **한눈에보는문화정보 조회서비스** | 전국 **공연+전시** — 기간·지역·분야별 목록/상세, 장소·일정·가격·**좌표·썸네일**·링크 | data.go.kr REST, 활용신청 | ✅ 썸네일 | 🟡 설명문으로 확인, 엔드포인트/필드명 ❓ | **키 받아 통합 — 전시 최우선 소스** |
| 한국문화정보원 문화포털 "문화공감" | 공연·축제 | LINK형(RSS/XML) | ❓ | 🟡 | 보조 (중복 많을 것) |
| 서울 열린데이터광장 `culturalEventInfo` (문화행사 정보) | 서울 공연·전시·축제·교육·체험(무료 다수) | `http://openapi.seoul.go.kr:8088/{KEY}/json/culturalEventInfo/{start}/{end}/`, 1회 최대 1000행, 결과코드 INFO-000 | ✅ `MAIN_IMG` | 🟡 MCP 구현 코드로 확인 | **키 받아 통합** (data.seoul.go.kr 키, 'sample' 키는 5행 제한) |
| 부산광역시 공연전시 계열 API (공연전시 테마 목록 15063761, 전시공간 목록 15063756, 무용 상세 15063864 등) | 부산 공연·전시 | data.go.kr REST JSON/XML, 개발계정 일 10,000건 | ❓ | 🟡 | **키 받아 통합** (같은 data.go.kr 키) |
| 부산교통공사 문화행사 정보 | 지하철 역사 공연·전시 | data.go.kr | ❓ | 🟡 | 낮은 우선순위 |
| 경기 시·군 문화행사 (고양시 축제행사, 용인시 문화행사공연 등) | 경기 일부 시 | data.go.kr 파일→API 자동변환, 갱신 연간 | ❌ 대부분 없음 | 🟡 | 낮은 우선순위 (한눈에보는문화정보가 경기 포함) |
| 경기데이터드림 gd.gg.go.kr | 경기 | 자체 키 | ❓ | ❓ 검색으로 문화행사 API 미확인 | 보류 |
| 국립현대미술관(MMCA) | 소장품·저작권만료 작품(파일) | data.go.kr 파일 | 작품 이미지 | 🟡 **전시 일정 API는 확인 못 함** | 전시 일정은 '한눈에보는문화정보'로 대체 |
| 국립중앙박물관·국가유산청 | 유물·문화유산 정보 | 각 기관 API | ✅ | ❓ 전시 일정 API 미확인 | 오디오투어 정류장 설명 보강용으로만 고려 |
| 한국관광공사 **오디(Odii) 스토리텔링** (data.go.kr 3041768) | 관광지별 **오디오 해설 대본·재생시간**, 한/영/중/일 4개 언어 | 파일(로그인 없이 다운로드) + 자동변환 API | ❌ | 🟡 2016년 등록·1회성 데이터 → 최신성 낮음 | **바로 통합(파일)** — 한국 오디오투어 대본 보강, 출처 표기 |
| 지자체 문화관광해설사 예약 (보령시 예약서비스 등), 강원 해설사 운영현황 | 해설사 투어 | data.go.kr | ❌ | 🟡 | 딥링크/정보 표시 (서울 도보해설관광 예약 API는 ❓) |

### 1-2. 민간 예매·전시·클래스·투어 (한국)

| 소스 | 다루는 것 | 공개 API | 판정 | 비고 |
|---|---|---|---|---|
| NOL 티켓(구 인터파크 티켓) | 공연·전시·스포츠 예매 1위 | ❌ 공개 API 없음 (확인 못 함) | **딥링크만** | 검색 링크 `tickets.interpark.com` |
| 예스24 티켓, 멜론티켓, 티켓링크 | 공연·콘서트 예매 | ❌ | **딥링크만** | |
| 네이버 예약/공연, 카카오 | 예약·공연 정보 | ❌ (네이버 검색 API에 공연 전용 엔드포인트 미확인) | **딥링크만** | |
| 문화N티켓, 대한민국 구석구석(korean.visitkorea.or.kr) | 공공 예매 / 관광공사 축제 페이지 | 구석구석 데이터 = TourAPI | TourAPI로 이미 커버 | 상세 원문 링크로 사용 중 |
| 아트맵(art-map.co.kr) | 전시 큐레이션 (하루 400건+, 미술관·갤러리 1,900곳+) | ❌ (문의: contact@art-map.co.kr) | **딥링크만** (제휴 문의 후보) | |
| 네오룩, 서울아트가이드, 아트허브 | 갤러리 전시 | ❌ 확인 못 함 | **딥링크만** | |
| 프립(Frip) | 원데이클래스·액티비티·모임 (호스트 3만+) | ❌ 공개 API 미확인 | **딥링크만** (제휴 문의 후보) | |
| 클래스101 오프라인, 탈잉, 숨고 | 클래스 | ❌ | **딥링크만** | |
| 마이리얼트립 | 투어·클래스 | 판매자용 파트너앱만 확인, 공개 데이터 API ❌ | **딥링크만** | |
| 클룩(Klook) | 투어·입장권 (한국관광공사와 파트너십 갱신) | 파트너 전용 API, 제휴(어필리에이트) 프로그램 있음 | **딥링크만** (어필리에이트 링크 가능) | 스크래핑 도구 존재하나 약관 위험 → 사용 안 함 |
| 와그, 트리플 | 투어·티켓 | ❌ | **딥링크만** | |
| 서울도보해설관광 / 비짓서울 | 무료 도보해설 | 예약 API ❓ | **딥링크만** | |

---

## 2. 독일

### 2-1. 공공·관광 오픈데이터

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 검증 | 판정 |
|---|---|---|---|---|---|
| **DZT German Tourism Knowledge Graph** (open-data-germany.org) | 전국 관광 자산 약 10만+(POI·투어·**이벤트**·식당 등), 주 관광청 데이터 통합 (BayernCloud, 작센, NRW 등) | API 키 **무료**(독일관광청 GNTB 신청), SPARQL/REST, 문서: purl.archive.org/gtkg/api-doc | schema.org 기반, 오픈 라이선스 레코드 | 🟡 논문·DZT 페이지로 확인, 엔드포인트 ❓ | **키 받아 통합 — 독일 축제/관광 이벤트 최우선** |
| BayernCloud Tourismus API (bayerncloud.digital/docs) | 바이에른 이벤트·POI (오픈데이터 약 1.2만 건, 2023 기준) | 계정/토큰 | 오픈 라이선스 레코드만 자동 공유 | 🟡 | **키 받아 통합** (뮌헨·뉘른베르크) — DZT 그래프로 일부 대체 가능 |
| **Travel-API Leipzig** (opendata.leipzig.de) | 라이프치히 및 주변 이벤트·POI·투어 | CSV/JSON/GeoJSON, destination.one Open Data Finder | **CC BY 3.0 DE** | 🟡 | **바로 통합 (키 불필요)** |
| Tourismusdaten Köln (offenedaten-koeln.de / open.nrw) | 쾰른 향후 3개월 이벤트 | destination.one Open Data Finder | cc-by/4.0 (카탈로그 표기) | 🟡 다운로드 URL ❓, 개방성 점수 낮음 | **바로 통합 시도** — 리소스 URL 확인 필요 |
| Open Data Finder RTG (루르 관광) | 루르 지역 이벤트 | destination.meta API, JSON/JSON-LD/GeoJSON/RSS | 오픈 | 🟡 | 참고 (현재 도시 목록 밖, 뒤셀도르프 인근) |
| destination.one meta-service (`meta.et4.de/rest.ashx/...`) | 위 Leipzig·Köln·Ruhr의 공통 백엔드: `features?experience={프로젝트}&type=Event&mode=json` | 프로젝트별 experience 이름 필요 | 프로젝트별 | 🟡 공식 help.destination.one 문서 | **통합 수단** — 각 도시 Open Data Finder의 experience 이름을 찾으면 동일 코드로 여러 도시 수집 가능 |
| kulturdaten.berlin API (api-v2.kulturdaten.berlin) | 베를린 문화 이벤트·장소·명소 | 오픈 API(Swagger) | 오픈데이터, 이미지 라이선스 ❓ | 🟡 **프로젝트 종료 표시**, 마지막 커밋 2024-03 | **통합 시도** — 미래 이벤트가 실제로 나오는지 확인 후 사용 |
| daten.berlin.de (CKAN) | 베를린 데이터셋 (축제 목록 'Straßen- und Volksfeste' 등) | CKAN API, 대부분 CSV | 데이터셋별 | 🟡 | 축제 목록 데이터셋만 **바로 통합** (연간 갱신) |
| berlin.de Veranstaltungskalender | 베를린 공식 행사 달력 (CTS/Eventim, BerlinBühnen, Museumsportal에서 유입) | 공개 API 미확인 | — | 🟡 | **딥링크만** |
| Museumsportal Berlin | 베를린 박물관 200곳 전시·행사 | 공개 API 미확인 (berlin.de·visitBerlin에 인터페이스로 공급) | — | 🟡 | **딥링크만** (데이터 제휴 문의: museumsportal@kulturprojekte.berlin) |
| visitBerlin 캘린더 | 베를린 관광 이벤트 | 공개 API 미확인 | — | ❓ | **딥링크만** |
| opendata.muenchen.de (CKAN) | Gasteig·Messe 등 일부 이벤트 데이터 | CKAN JSON | 오픈 | 🟡 | 낮은 가치 — 도시 전체 캘린더 아님 |
| Hamburg (transparenz.hamburg.de) | 함부르크 관광 캘린더는 CultureBase(Kulturserver) 기반 | CultureBase JSON은 **파트너 전용** | — | 🟡 | 보류 (Kulturserver 지원팀 문의) |
| Dresden (opendata.dresden.de) | 공식 행사 달력 인터페이스 존재(2018 Alexa 스킬 사례) | 공개 문서 ❓ | — | ❓ | 보류 |
| Frankfurt / Stuttgart / Düsseldorf / Nürnberg | — | 도시 이벤트 오픈데이터 확인 못 함 | — | ❓ | DZT 그래프 + Ticketmaster로 커버 |
| Staatliche Museen zu Berlin (SMB) | 소장품 오픈액세스(recherche.smb.museum), 전시 페이지는 HTML | 소장품 API 예정/NFDI4Culture 경유, **전시 일정 API 없음** | 소장품 이미지 오픈 | 🟡 | 전시: **딥링크만** / 오디오투어 이미지 보강 후보 |
| Deutsche Digitale Bibliothek API | 문화유산 메타데이터 (CC0), 가상전시(DDBstudio) | 키 필요(무료 등록) | CC0 메타데이터 | 🟡 이벤트/전시 일정 엔드포인트 ❓ | 이벤트 용도 아님 → 사용 안 함 |
| GovData.de | 독일 전체 오픈데이터 카탈로그 | CKAN | — | 🟡 | 탐색용 (새 이벤트 데이터셋 발견 시 추가) |
| VHS(시민대학) 강좌 데이터 | 클래스 | 베를린 공개 API 없음, 빌레펠트(CC BY 4.0 강좌장소)·모에르스 등 일부만 | — | 🟡 | 사용 안 함(대상 도시 아님) / 딥링크 |

### 2-2. 민간 예매·이벤트·클래스·투어 (독일)

| 소스 | 다루는 것 | 공개 API | 판정 | 비고 |
|---|---|---|---|---|
| **Ticketmaster Discovery API** | 콘서트·공연·스포츠·가족 (독일 지원 시장) | ✅ 무료 키, 일 5,000건. 초당 제한은 공식 페이지끼리 5 vs 2로 불일치 → 2/s로 운용 | **키 받아 통합** | 이미지 포함 |
| Eventim (CTS) | 독일 최대 예매처 | 공개 API ❌, **Awin 어필리에이트 프로그램(DE) 있음** — 제휴 승인 시 상품(티켓) 피드 가능성 | **딥링크만 → 제휴 승인 후 피드 검토** | 피드 필드 미확인 |
| Reservix | 7,500+ 주최사 | 공개 문서 ❌ (구형 Ruby 래퍼만), 어필리에이트 수익배분 있음 | **딥링크만** (제휴 문의) | |
| Eventbrite | 소규모 이벤트·클래스 | ❌ **공개 검색 API 2019-12-12 종료**, 자기 조직 이벤트만 조회 가능 | **사용 안 함** / 딥링크 | |
| Resident Advisor (ra.co) | 베를린 클럽·전자음악 | ❌ 비공식 GraphQL만(문서 없음) | **딥링크만** | 비공식 API 사용 안 함 |
| Meetup | 모임·워크숍 | GraphQL, 전체 검색은 Pro/OAuth 필요 가능성 | **딥링크만** | 무료 접근 범위 불명확 |
| Rausgegangen, Mit Vergnügen, tip/zitty Berlin, Prinz, Mux, curt | 도시 이벤트 큐레이션 | ❌ 공개 API 없음 | **딥링크만** | Rausgegangen: 베를린·뮌헨·쾰른·함부르크 등 |
| Kunstaspekte, Pinakotheken 등 미술 전시 사이트 | 전시 | ❌ | **딥링크만** | |
| Jochen Schweizer, mydays, Urlaubsguru | 체험 선물·액티비티 | ❌ (어필리에이트만) | **딥링크만** | |
| Berlin Walks, Sandemans free tours | 워킹투어 | ❌ | **딥링크만** | |

---

## 3. 국가 공통 (한국·독일 모두 해당)

| 소스 | 종류 | 접근 | 이미지 | 검증 | 판정 |
|---|---|---|---|---|---|
| **Viator Partner API** | 투어·클래스·입장권 | 어필리에이트 가입 즉시 **Basic Access 무료** (제목·설명·대표이미지·평점/리뷰수·가격·가용성). 전체 리뷰·여행자 사진은 인증 필요. 예약은 viator.com으로 보내고 30일 쿠키 커미션 | ✅ 대표 이미지 | ✅ 공식 문서(docs.viator.com) | **키 받아 통합 — 체험 최우선** |
| **GetYourGuide Partner API** | 투어·클래스·입장권 | OpenAPI 스펙 공개(GitHub getyourguide/partner-api-spec, Apache 2.0), `X-ACCESS-TOKEN`, 130회/분. **토큰은 파트너 승인 필요**. 출력 캐싱(스크랩) 자제, 실시간 호출 요구 | ✅ | ✅ 스펙 / 🟡 승인 조건 | **키 받아 통합 (승인 후)** — 승인 전엔 딥링크 |
| Airbnb Experiences | 체험 | ❌ 초대제 파트너만, 공개 문서 없음. API 약관이 비공식 API 사용 금지 | — | 🟡 | **딥링크만** |
| Klook | 투어·입장권 | 파트너 전용, 어필리에이트 있음 | — | 🟡 | **딥링크만** |
| **izi.TRAVEL API** | **무료 오디오가이드**: 박물관 1,750+, 도시 1,750+ | API 키 필요(`X-IZI-API-KEY`, `Accept: application/izi-api-v1.8+json`), 문서 api-docs.izi.travel. 키는 퍼블리셔 플랫폼 통해 발급(절차 ❓) | ✅ 이미지·오디오 | ✅ 공식 문서 | **키 받아 통합 — 실제 녹음 오디오투어** |
| Smartify | 박물관 오디오가이드 (Hamburger Kunsthalle 등) | 공개 API 미확인 (기관용 요금제) | — | 🟡 | **딥링크만** |
| Bloomberg Connects | 박물관 가이드 앱 | 공개 API ❓ | — | ❓ | **딥링크만** |
| **Wikipedia / Wikimedia Commons** (geosearch, extracts, pageimages, imageinfo extmetadata) | 오디오투어 자동 생성(명소·설명·사진) | 키 불필요, CORS 가능(origin=*) | ✅ Commons (파일별 라이선스, BY-SA 등) — **저작자·라이선스 표기 필수** | ✅ 재사용 가이드 | **바로 통합** (이미 계획됨) |
| Wikidata SPARQL | 전시(Q464980)·축제, 시작 P580/종료 P582/장소 P276 | 키 불필요 | Commons 이미지 | 🟡 모델 확인, 실제 커버리지 **희박** | 보조 — 대형 미술관 특별전 보강용 |
| OpenStreetMap Overpass | 박물관·미술관 POI(`tourism=museum/gallery`) | 키 불필요, 공용 인스턴스 하루 <100쿼리 권장 | ❌ | 🟡 | 보조 — 지도 레이어/장소 좌표 보강, 빌드에서 캐시 |
| Nominatim / Kakao 로컬 | 지오코딩 | Nominatim 1 req/s + User-Agent / Kakao 주소→좌표 REST 키, 일 10만 건 | — | 🟡/✅ | 한국 주소는 **Kakao**, 독일 주소는 **Nominatim** (캐시) |
| PredictHQ | 이벤트 인텔리전스 | 무료 플랜은 저장 위치 2곳·웹앱 설정 필요, 유료 연 $500~ (제3자 표기) | ❓ | 🟡 | **사용 안 함** (비용·제약) |
| SerpApi Google Events | 구글 이벤트 결과 | 유료 | 다양(저작권 불명) | ❓ | **사용 안 함** (구글 결과 재배포·이미지 권리 불명) |
| Bandsintown | 아티스트별 공연 | 아티스트(대리인)만 키 발급 | — | ✅ 공식 도움말 | **사용 안 함** |
| Songkick | 아티스트별 공연 | 키 신청 필요(신규 발급 여부 ❓) | — | 🟡 | 보류 |
| Wikivoyage | 도시 여행 가이드 텍스트 | 키 불필요, CC BY-SA | — | 🟡 | 오디오투어 도시 소개 보강 후보 |

---

## 4. 종류별 요약

| 종류 | 한국 | 독일 |
|---|---|---|
| 축제·행사 | TourAPI(ko/en), 서울 문화행사, 한눈에보는문화정보 | DZT Knowledge Graph, Leipzig Travel-API, Köln Tourismusdaten, BayernCloud, daten.berlin.de 축제 목록, Ticketmaster |
| 공연 | KOPIS, 서울 문화행사, 한눈에보는문화정보, 부산 공연전시 | Ticketmaster, kulturdaten.berlin, DZT |
| 전시 | **한눈에보는문화정보**, 서울 문화행사, 부산 전시 | kulturdaten.berlin, DZT, Wikidata(희박) — 대형 미술관 전시는 딥링크 |
| 클래스·워크샵 | Viator, GYG(승인 후) + 프립·클래스101·탈잉 딥링크 | Viator, GYG + Meetup·Jochen Schweizer 딥링크 |
| 가이드투어 | Viator, GYG, 해설사(정보) + 마이리얼트립·클룩 딥링크 | Viator, GYG + Sandemans 딥링크 |
| 오디오가이드 | **Wikipedia 자동 생성** + 오디 스토리텔링 대본 + izi.TRAVEL | **Wikipedia(de 위키 중심) 자동 생성** + izi.TRAVEL |

---

## 5. 통합 우선순위

1. **Wikipedia/Commons 오디오투어 생성** (키 불필요) — 모든 도시. 이미 진행 중.
2. **Travel-API Leipzig** (키 불필요, CC BY 3.0 DE)
3. **destination.one meta-service** (키 불필요) — Köln·Ruhr 등 Open Data Finder 프로젝트 experience 이름을 찾아 같은 수집기로 확장
4. **daten.berlin.de 축제 목록** (키 불필요)
5. **kulturdaten.berlin** (키 불필요) — 최신 데이터 있는지 먼저 검증
6. **오디(Odii) 스토리텔링 파일** (키 불필요) — 한국 오디오투어 대본 보강 (최신성 낮음 명시)
7. **한국문화정보원 한눈에보는문화정보** (data.go.kr 키) — 한국 전시 핵심
8. **서울 culturalEventInfo** (서울 열린데이터 키)
9. **TourAPI Kor/Eng + KOPIS** (이미 통합)
10. **부산 공연전시 API** (data.go.kr 키)
11. **Ticketmaster Discovery** (무료 키) — 독일 공연
12. **DZT German Tourism Knowledge Graph** (무료 키, GNTB 신청) — 독일 축제·관광 이벤트
13. **Viator Partner API** (어필리에이트 가입 즉시) — 클래스·투어
14. **izi.TRAVEL** (키) — 실제 녹음 오디오가이드
15. **BayernCloud** (계정) — 뮌헨·뉘른베르크 보강
16. **GetYourGuide Partner API** (파트너 승인 후)
17. 제휴 문의 후보(데이터 피드): Eventim(Awin DE), Reservix, Museumsportal Berlin, 아트맵, 프립

### 받아야 할 키 (사용자 할 일)
| 키 | 발급처 | 비용 |
|---|---|---|
| `TOUR_API_KEY` (+한눈에보는문화정보·부산 API 활용신청) | data.go.kr | 무료 |
| `KOPIS_API_KEY` | kopis.or.kr | 무료 |
| `SEOUL_API_KEY` | data.seoul.go.kr | 무료 |
| `TICKETMASTER_API_KEY` | developer.ticketmaster.com | 무료 |
| `DZT_API_KEY` | germany.travel/en/trade/open-data.html (GNTB) | 무료 |
| `VIATOR_API_KEY` | partnerresources.viator.com (어필리에이트) | 무료 |
| `GYG_API_KEY` | GetYourGuide 파트너 신청 | 승인제 |
| `IZI_API_KEY` | izi.TRAVEL | 신청 |
| `KAKAO_REST_KEY` (지오코딩) | developers.kakao.com | 무료 쿼터 |

---

## 6. 참고 링크
- TourAPI/Odii: https://www.data.go.kr/data/15101811/openapi.do · https://www.data.go.kr/data/3041768/fileData.do
- 한눈에보는문화정보 / 문화공감: https://www.data.go.kr/data/15087224/openapi.do
- 서울 문화행사: https://data.seoul.go.kr/dataList/OA-15486/S/1/datasetView.do · 구현 예: https://glama.ai/mcp/servers/pinnaclesoft-ko/seoul_data_mcp/tools/CulturalEventInfo
- 부산 공연전시: https://www.data.go.kr/data/15063761/openapi.do · https://www.data.go.kr/data/15063756/openapi.do
- KOPIS: https://kopis.or.kr/por/cs/openapi/openApiList.do?menuId=MNU_00074
- Ticketmaster: https://developer.ticketmaster.com/products-and-docs/apis/getting-started/ · https://developer.ticketmaster.com/support/faq/
- DZT Knowledge Graph: https://www.germany.travel/en/trade/open-data.html · https://arxiv.org/abs/2404.09587
- BayernCloud: https://bayerncloud.digital/docs/api-examples
- Leipzig Travel-API: https://opendata.leipzig.de/dataset/travel-api-leipzig
- Köln Tourismusdaten: https://ckan.open.nrw.de/ar/dataset/tourismusdaten-koln-koln-tourismus-k
- destination.one meta-service: https://help.destination.one/portal/de/kb/articles/meta-service-features
- kulturdaten.berlin: https://kulturdaten.readme.io · https://www.technologiestiftung-berlin.de/en/projects/kulturdatenberlin
- berlin.de 행사 입력 안내(파트너 유입 경로): https://www.berlin.de/tickets/termine/formular.513265.php
- Museumsportal Berlin: https://www.museumsportal-berlin.de/en/about-us/
- SMB 오픈액세스: https://www.smb.museum/nachrichten/detail/sammlungen-online-open-access-wikimedia-commons-staatliche-museen-zu-berlin-erweitern-digitales-angebot/
- Viator: https://docs.viator.com/partner-api/ · https://partnerresources.viator.com/travel-commerce/affiliate/
- GetYourGuide: https://github.com/getyourguide/partner-api-spec
- izi.TRAVEL: https://api-docs.izi.travel · https://izi.travel/en/api
- Eventbrite 검색 종료: https://groups.google.com/g/eventbrite-api/c/FT2MsDswdrA
- Airbnb Experiences API 현황: https://supergood.ai/api-report-card/airbnb-experiences
- Bandsintown: https://help.artists.bandsintown.com/en/articles/3372745-can-i-have-access-to-the-api-and-an-app-id-if-i-m-not-an-artist
- PredictHQ 무료 플랜: https://docs.predicthq.com/getting-started/guides/using-the-api-with-the-free-plan
- Wikimedia 재사용: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
- Wikidata 전시 모델: https://nfdi4culture.github.io/linked-open-exhibition/data-models/exhibition-datamodel.html
- Overpass 사용 한도: https://wiki.openstreetmap.org/wiki/Overpass_API
- Kakao 로컬: https://developers.kakao.com/docs/latest/ko/local/dev-guide
