# 놀곳 데이터 소스 조사 — 4단계 (아메리카 나머지 · 아프리카)

조사일: 2026-11-12 · 대상: 캐나다 3 · 멕시코 2 · 브라질 2 · 아르헨티나 · 칠레 · 콜롬비아 2 · 페루 · (쿠바) · 남아공 2 · 이집트 · 모로코 2 · 케냐 · 나이지리아 · 가나 · 탄자니아(잔지바르) · 에티오피아 · 세네갈 · 르완다 (총 25개 도시 제안, 쿠바 보류)
조사 방법: 웹 검색(영/스/포/불어 검색어), 공식 문서 열람, CKAN·Socrata·Opendatasoft·ArcGIS Hub 카탈로그 API 검색, **키가 필요 없는 엔드포인트는 node로 직접 호출**(User-Agent `NolgotBot/1.0 (+https://github.com/dayeonoh626-cyber/nolgot)`)해서 구조·예정 건수·이미지 유무·갱신일 확인. Wikidata 명소 밀도는 `places.mjs`와 같은 검색식(haswbstatement + nearcoord, 같은 P31 분류 목록)으로 도시별로 셌다.

검증 수준 (1~3단계와 같은 표기)
- ✅ 공식 문서·공식 페이지로 확인 · **✅실호출** = 실제로 호출해서 데이터가 나오는 것까지 확인 · 🟡 제3자 자료/일부만 확인 · ❓ 확인 못 함

판정 기준 (1~3단계와 동일)
- **바로 통합 (키 불필요)** · **키 받아 통합** · **딥링크만** · **사용 안 함** (+ 보류)

> 원칙: 약관이 자동 수집을 금지하거나 비공식 API만 있는 곳은 수집하지 않는다. 봇 User-Agent를 403으로 막는 곳은 **UA를 바꿔 우회하지 않는다**(공식 미러가 있으면 미러를 쓰고, 없으면 보류·딥링크). 이미지는 API가 준 것, 이벤트 공식 페이지의 og:image, Wikimedia Commons만 쓴다.
>
> 전제(3단계와 같음): `places.mjs`(Wikidata 상설 명소) + `wikipedia-tours.mjs`(오디오가이드) + `enrich.mjs` 이미지 대체 체인(소스 이미지 → og:image → 장소 Commons 사진 → 근처 명소 사진)이 모든 도시에 적용된다. 이 문서는 그 위에 얹을 **날짜 있는 이벤트·전시 피드**를 찾고, 피드가 없는 도시는 **places만으로 10건 + 이미지가 되는지**를 실측했다.

---

## 0. 요약

- **키 없이 바로 넣을 수 있는 공식 피드 (실호출 확인)는 캐나다 2개 도시뿐**: 토론토(시 Festivals & Events 피드 — 예정 회차 4,031행 / **고유 행사 473건**, 이미지 87%, 좌표 93%, Open Government Licence – Toronto + 토론토 공공도서관 피드 예정 5,746건), 몬트리올(시 "Événements publics" **예정 2,257건**, 좌표 전 건, **CC BY 4.0**, 이미지는 행사 페이지 og:image(Cloudinary)로 확인).
- **중남미 정부 포털은 이 환경에서 대부분 열리지 않았다**: CDMX(`*.cdmx.gob.mx` 연결 시간 초과), datos.gob.mx(Akamai 403), 상파울루 SP Cultura(Mapas Culturais, 연결 시간 초과), 페루(WAF 418), 보고타 포털(시간 초과), ChileCultura(봇 UA 403). 열린 포털(상파울루 CKAN, 부에노스아이레스 CKAN, datos.gob.cl, datos.gov.co Socrata)에는 **현재 행사 피드가 없다**(월 단위 연간 달력·과거 데이터·자치구 보고서뿐).
- **아프리카는 키 없는 공식 이벤트 피드를 하나도 찾지 못했다.** 남아공 Quicket만 무료 키 API가 있다(키 없이 401 확인). OpenAgenda 공개 미러도 아프리카 12개 도시 반경 안 **0건**.
- **places만으로 10건 + 이미지**: 아프리카 12개 도시 모두 후보 14~186곳으로 10건은 넘는다. 다만 **P18(대표 사진) 있는 항목이 카사블랑카 6, 잔지바르 8**로 10 미만 → 위키백과 대표사진·근처 명소 대체로 채워야 한다. **모스크·성당 분류(Q32815, Q16970)를 `EXTRA`에 넣으면** 카이로 +48, 라고스 +17, 마라케시 +13, 다카르 +8(P18 기준)으로 크게 좋아진다(3-1).
- **Ticketmaster 국가코드**(Discovery API 문서 표, ✅ 2026-11-12): CA·MX·BR·AR·CL·CO·PE·ZA·MA·GH **있음** / EG·KE·NG·TZ·ET·SN·RW·CU **없음**. 캐나다는 마켓 ID까지 있다(102 토론토, 111 밴쿠버, 120 몬트리올). 현재 키가 설정돼 있지 않으므로(3단계 정정) 재고는 키를 받은 뒤 첫 빌드에서 실측.
- **쿠바(아바나)는 보류**: 공식 피드·티켓 판매처 없음, 미국 제재(OFAC)로 Viator·GYG 상품이 제한될 수 있음. places(후보 45, P18 30)만으로는 가능.

---

## 1. 도시 목록 (cities.mjs 후보)

`c(id, country, ko, en, lat, lng, radiusKm, tz, { local })` 형식. "이벤트 피드"는 이 문서 기준 키 없이 들어오는 날짜 있는 이벤트 소스. "places"는 같은 검색식으로 센 Wikidata 후보 수(좌표 있음·폐관 제외) / 그중 P18 사진 있는 수.

| id | 이름(ko) | 이름(en) | 현지명(`local`) | 국가 | lat | lng | radiusKm | tz | places 후보/P18 | 이벤트 피드(키 불필요) |
|---|---|---|---|---|---|---|---|---|---|---|
| toronto | 토론토 | Toronto | Toronto | CA | 43.6532 | -79.3832 | 25 | America/Toronto | 충분(실측 생략) | **토론토 시 Festivals & Events**, 토론토 공공도서관 |
| montreal | 몬트리올 | Montreal | Montréal | CA | 45.5019 | -73.5674 | 20 | America/Toronto | 충분 | **몬트리올 Événements publics** (Données Québec 경유) |
| vancouver | 밴쿠버 | Vancouver | Vancouver | CA | 49.2827 | -123.1207 | 20 | America/Vancouver | 137 / 67 | 없음 (SFU LiveWhale은 대학 행사, 보조 후보) |
| mexicocity | 멕시코시티 | Mexico City | Ciudad de México | MX | 19.4326 | -99.1332 | 25 | America/Mexico_City | 충분 | 없음 (CDMX 포털 보류) |
| guadalajara | 과달라하라 | Guadalajara | Guadalajara | MX | 20.6767 | -103.3475 | 20 | America/Mexico_City | 58 / 15 | 없음 — **선택 도시** |
| saopaulo | 상파울루 | São Paulo | São Paulo | BR | -23.5505 | -46.6333 | 25 | America/Sao_Paulo | 충분 | 없음 (SP Cultura 보류) |
| riodejaneiro | 리우데자네이루 | Rio de Janeiro | Rio de Janeiro | BR | -22.9068 | -43.1729 | 25 | America/Sao_Paulo | 644 / 163 | 없음 |
| buenosaires | 부에노스아이레스 | Buenos Aires | Buenos Aires | AR | -34.6037 | -58.3816 | 20 | America/Argentina/Buenos_Aires | 충분 | 없음 |
| santiago | 산티아고 | Santiago | Santiago | CL | -33.4372 | -70.6506 | 20 | America/Santiago | 180 / 123 | 없음 |
| bogota | 보고타 | Bogotá | Bogotá | CO | 4.5981 | -74.0760 | 20 | America/Bogota | 94 / 41 | 없음 |
| medellin | 메데인 | Medellín | Medellín | CO | 6.2476 | -75.5658 | 15 | America/Bogota | 62 / 22 | 없음 |
| lima | 리마 | Lima | Lima | PE | -12.0464 | -77.0428 | 20 | America/Lima | 270 / 136 | 없음 |
| havana | 아바나 | Havana | La Habana | CU | 23.1136 | -82.3666 | 15 | America/Havana | 45 / 30 | 없음 — **보류** |
| capetown | 케이프타운 | Cape Town | Cape Town | ZA | -33.9249 | 18.4241 | 25 | Africa/Johannesburg | 77 / 47 | 없음 (Quicket 키) |
| johannesburg | 요하네스버그 | Johannesburg | Johannesburg | ZA | -26.2041 | 28.0473 | 25 | Africa/Johannesburg | 30 / 14 | 없음 (Quicket 키) |
| cairo | 카이로 | Cairo | القاهرة | EG | 30.0444 | 31.2357 | 25 | Africa/Cairo | 183 / 99 | 없음 |
| marrakech | 마라케시 | Marrakesh | مراكش | MA | 31.6295 | -7.9811 | 15 | Africa/Casablanca | 31 / 22 | 없음 |
| casablanca | 카사블랑카 | Casablanca | الدار البيضاء | MA | 33.5731 | -7.5898 | 20 | Africa/Casablanca | 24 / **6** | 없음 — **약함** |
| nairobi | 나이로비 | Nairobi | Nairobi | KE | -1.2864 | 36.8172 | 20 | Africa/Nairobi | 17 / 10 | 없음 |
| lagos | 라고스 | Lagos | Lagos | NG | 6.4550 | 3.3941 | 25 | Africa/Lagos | 52 / 22 | 없음 |
| accra | 아크라 | Accra | Accra | GH | 5.6037 | -0.1870 | 20 | Africa/Accra | 16 / 13 | 없음 |
| zanzibar | 잔지바르(스톤타운) | Zanzibar (Stone Town) | Zanzibar | TZ | -6.1630 | 39.1880 | 30 | Africa/Dar_es_Salaam | 27 / **8** | 없음 — **약함** |
| addisababa | 아디스아바바 | Addis Ababa | አዲስ አበባ | ET | 9.0300 | 38.7400 | 20 | Africa/Addis_Ababa | 26 / 16 | 없음 |
| dakar | 다카르 | Dakar | Dakar | SN | 14.6928 | -17.4467 | 20 | Africa/Dakar | 33 / 21 | 없음 |
| kigali | 키갈리 | Kigali | Kigali | RW | -1.9441 | 30.0619 | 20 | Africa/Kigali | 14 / 10 | 없음 |

- **몬트리올 tz**: IANA 정식 이름은 `America/Toronto`(`America/Montreal`은 2024 이후 링크로만 남은 별칭). 둘 다 동작하지만 정식 이름 권장. **도시별 `wikiLang: 'fr'`**(제네바와 같은 방식).
- **카이로 반경 25km**: 기자 피라미드(도심에서 약 18km)가 들어오도록.
- **잔지바르**: 스톤타운 중심. 섬 전체 명소(능귀 해변·조자니 숲)는 30~50km라 반경을 넓혀도 Wikidata 항목 자체가 적다.
- **카사블랑카 대안**: 페스(Fès, 34.0181 -5.0078) 또는 라바트(34.0209 -6.8416)가 문화유산·박물관 밀도가 더 높을 것(실측 안 함). 사용자의 "모로코 2개" 의도가 관광이라면 **마라케시 + 페스** 추천, 경제 수도 대표성이 필요하면 카사블랑카 유지(3-1의 모스크 분류 추가 필수).
- 과달라하라는 이벤트 소스가 Ticketmaster MX뿐이고 Time Out 페이지도 없다 → 첫 배치에서 빼도 된다.

### `COUNTRIES` 등록용 값

| 국가 | 국가명 ko / en | `wikiLang` | `currency` | `ticketmaster` | `geocode` | places `COUNTRY_QID` | 비고 |
|---|---|---|---|---|---|---|---|
| CA | 캐나다 / Canada | en (몬트리올 도시별 `fr`) | CAD | ✅ `'CA'` (마켓 102·111·120) | 예 | Q16 | 핵심 시장 |
| MX | 멕시코 / Mexico | es | MXN | ✅ `'MX'` (Ticketmaster México = 최대 판매처) | 예 | Q96 | |
| BR | 브라질 / Brazil | pt | BRL | 코드 `BR` 있음, ticketmaster.com.br 운영 중(200 확인), 재고 ❓ | 예 | Q155 | 시장 주력은 Sympla·Eventim |
| AR | 아르헨티나 / Argentina | es | ARS | 코드 `AR` 있음, 재고 ❓ | 예 | Q414 | 주력 판매처는 Ticketek AR·Alternativa Teatral |
| CL | 칠레 / Chile | es | CLP | 코드 `CL` 있음, ticketmaster.cl 운영 중(200), 재고 ❓ | 예 | Q298 | PuntoTicket 병행 |
| CO | 콜롬비아 / Colombia | es | COP | 코드 `CO` 있음, 재고 ❓ | 예 | Q739 | 주력은 TuBoleta |
| PE | 페루 / Peru | es | PEN | 코드 `PE` 있음, 재고 ❓ | 예 | Q419 | 주력은 Teleticket·Joinnus |
| CU | 쿠바 / Cuba | es | CUP | ❌ | 예 | Q241 | **보류**(2-7) |
| ZA | 남아프리카공화국 / South Africa | en | ZAR | 코드 `ZA` 있음, 재고 ❓ | 예 | Q258 | 주력은 Computicket·Quicket·Webtickets |
| EG | 이집트 / Egypt | ar (en 보조) | EGP | ❌ | 예 | Q79 | |
| MA | 모로코 / Morocco | fr (ar 보조) | MAD | 코드 `MA` 있음, 재고 ❓(거의 없을 것) | 예 | Q1028 | 모로코 명소는 fr 위키백과 문서가 ar보다 풍부(🟡) |
| KE | 케냐 / Kenya | en | KES | ❌ | 예 | Q114 | |
| NG | 나이지리아 / Nigeria | en | NGN | ❌ | 예 | Q1033 | |
| GH | 가나 / Ghana | en | GHS | 코드 `GH` 있음, 재고 ❓(거의 없을 것) | 예 | Q117 | |
| TZ | 탄자니아 / Tanzania | en (sw 보조) | TZS | ❌ | 예 | Q924 | |
| ET | 에티오피아 / Ethiopia | en (am 위키 작음) | ETB | ❌ | 예 | Q115 | |
| SN | 세네갈 / Senegal | fr | XOF | ❌ | 예 | Q1041 | |
| RW | 르완다 / Rwanda | en (fr 보조) | RWF | ❌ | 예 | Q1037 | |

Ticketmaster 국가코드는 `developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/`의 "Supported Country Codes" 표를 2026-11-12에 직접 받아 확인했다(✅). 표에 있는 아메리카·아프리카 코드: **AR, BR, CA, CL, CO, CR, DO, EC, JM, MX, PE, TT, UY, VE, GH, MA, ZA**. 3단계와 같은 주의: KR처럼 코드가 있어도 재고 0일 수 있다 → CA·MX 말고는 첫 빌드에서 실측 후 `false`로 바꿀지 결정.

---

## 2. 나라별 소스

### 2-1. 캐나다 (토론토 · 몬트리올 · 밴쿠버)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **City of Toronto Festivals & Events** (CKAN `festivals-events`, "Real-time") `https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/9201059e-43ed-4369-885e-0b867652feac/resource/8900fdb2-7f6c-4f50-8581-b463311ff05d/download/file.json` | 시 공식 행사 달력 전체: 전시(Arts/Exhibits 1,975행)·문화·박물관(714)·가족·공연(603)·음식·연극·역사·투어(307)·마켓·영화·코미디. 전체 28,685행(회차 단위) → **예정 4,031행 / 고유 행사 473건**(~2027-12) | 키 불필요, 매일 갱신(`last_refreshed` 2026-11-11, `__ModifiedOn` 최신 2026-11-11) | ✅ `event_image[].bin_id` → `https://secure.toronto.ca/c3api_upload/retrieve/festivals_events/{bin_id}` (실제 JPEG 200 확인) — **예정 행 87%**, `fields.alt`·`credit` 포함 / **Open Government Licence – Toronto**(출처 표기 시 상업 포함 재사용 허용) | 회차가 행 단위 → `event_name`+`event_startdate`로 병합. 좌표 `event_locations[].location_gps`(JSON 문자열 `[{"gps_lat":…,"gps_lng":…}]`) 93%. `Virtual/Online Event` 제외 | ✅실호출 | **바로 통합 (키 불필요) — 토론토 1순위** |
| **Toronto Public Library Programs & Events** (CKAN `library-branch-programs-and-events-feed`) `…/resource/aa5e1425-77f4-4cb4-a8ea-eb5ce7d4f34c/download/tpl-events-feed.json` | 도서관 프로그램 7,078행, **예정 5,746건 / 고유 제목 1,312**: 공예·문화·예술·과학·코딩·스토리타임·북클럽 | 키 불필요, 수시 갱신(2026-11-02) | 🟡 `FeaturedImageUrl` 전 건이지만 **2,324건은 유형 아이콘**(`TPLIcons-…jpg` → poster 제외) / Open Government Licence – Toronto | **설명·좌표·URL 필드 없음** → `LocationName`(분관 이름)을 `library-branch-general-information` 데이터셋 좌표로 매칭, 링크는 `https://tpl.bibliocommons.com/events/{EventID}` | ✅실호출 | **바로 통합 (보조)** — 아이콘 아닌 사진 있는 것 우선, 상한 200 |
| Events at Nathan Phillips Square | 시청 광장 행사 | | | `is_retired: true`, 2024 이후 갱신 없음 | ✅실호출 | 사용 안 함 |
| **Ville de Montréal "Événements publics"** — Données Québec CKAN 데이터스토어 `https://www.donneesquebec.ca/recherche/api/3/action/datastore_search_sql?sql=SELECT * FROM "6decf611-6f11-4f34-bb36-324d804c9bad" WHERE date_fin >= '{오늘}'` | 시·구·도서관·문화의 집 행사 전체 4,188건 중 **예정 2,257건**: 공예(355)·게임·스토리타임·음악(193)·연극(135)·과학·**전시(85)**·영화(82)·무용·요리·서커스·축제 | 키 불필요, 매일(2026-11-12 00:02) | ❌ 이미지 필드 없음 → `url_fiche`(montreal.ca 행사 페이지) og:image = `res.cloudinary.com/villemontreal/...` (봇 UA로 페이지 200, og:image 확인) / **CC BY 4.0** | **원본 donnees.montreal.ca는 우리 봇 UA에 403**(브라우저 UA는 200). UA를 바꾸지 말고 **Données Québec 미러**(같은 리소스 ID, 봇 UA 200) 사용. 좌표 `lat`/`long` 전 건. 날짜 `date_debut`/`date_fin`(시간 없음). `Conseil et comité`·`Consultation publique`·`Rencontre avec personne élue`·`Soutien et échange` 제외 | ✅실호출 | **바로 통합 (키 불필요) — 몬트리올 1순위** |
| Vancouver Open Data (Opendatasoft) | 행사 데이터셋 없음(검색 200건 중 이벤트 피드 0). 파머스마켓 데이터는 2016년 | | | | ✅실호출(카탈로그) | 사용 안 함 |
| SFU Events (LiveWhale) `https://events.sfu.ca/live/json/events/max/200` | 사이먼프레이저대 행사 200건/호출(시내 캠퍼스 SFU Contemporary Arts·갤러리 포함) | 키 불필요(LiveWhale 공개 JSON 피드) | ✅ `thumbnail` 192/200 / 대학 사이트 약관(개방 라이선스 아님 ❓) | 대부분 학위논문 심사·튜터링 → 그룹(갤러리·예술학부) 필터 필수. 좌표 `location_latitude/longitude` | ✅실호출 / 약관 ❓ | **보류 (밴쿠버 보조 후보)** |
| UBC events, McGill 캘린더 | | | | UBC Localist/Trumba 경로 404, McGill Azure WAF 챌린지 403 | ✅실호출(실패) | 사용 안 함 |
| Ticketmaster CA | 콘서트·공연·스포츠 | 키 필요(미설정), `countryCode=CA` 또는 `marketId=102/111/120` | ✅ | | ✅ 코드 표 | **키 받아 통합 — 캐나다 핵심**(밴쿠버는 사실상 주 소스) |
| Destination Toronto, Tourisme Montréal, Destination Vancouver, Time Out | 관광 행사 | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-2. 멕시코 (멕시코시티 · 과달라하라)

| 소스 | 다루는 것 | 접근 | 검증 | 판정 |
|---|---|---|---|---|
| Portal de Datos Abiertos CDMX (`datos.cdmx.gob.mx`, CKAN) | 카탈로그 검색 불가 | **이 환경에서 연결 시간 초과**(`cartelera.cdmx.gob.mx`, `cultura.cdmx.gob.mx`도 동일, `mexicocity.cdmx.gob.mx`만 200) | ✅실호출(실패) | **보류** — GitHub Actions(미국)에서 재시도 |
| Cartelera CDMX (`cartelera.cdmx.gob.mx`, 2025 개시, "1천 건 이상" 보도) | 시 공식 문화·스포츠 달력 | 공개 API 확인 못 함 + 연결 시간 초과 | 🟡 보도 | **딥링크 / 보류** — CI에서 열리면 공개 피드 여부 재확인 |
| datos.gob.mx (연방) | | Akamai 403 (봇 UA) | ✅실호출(실패) | 보류 |
| Secretaría de Cultura SIC (`sic.cultura.gob.mx/datos.php`) | 박물관·극장 등 **시설 목록**(행사 아님) | 200 | 🟡 | places 보강 후보(선택) |
| mexicoescultura.com | 연방 문화 달력 | 공개 API ❌ (HTML만) | 🟡 | **딥링크만** |
| Ticketmaster MX | 콘서트·공연·스포츠(멕시코 최대 판매처, OCESA) | 키 필요, `countryCode=MX` | ✅ 코드 | **키 받아 통합 — 멕시코 핵심** |
| Boletia, eticket.mx | 예매 | 공개 API ❌ | 🟡 | **딥링크만** |

### 2-3. 브라질 (상파울루 · 리우데자네이루)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 검증 | 판정 |
|---|---|---|---|---|---|
| **SP Cultura** (Mapas Culturais) `https://spcultura.prefeitura.sp.gov.br/api/event/findOccurrences?@from={오늘}&@to={+30일}&@select=id,name,shortDescription,location&@files=(avatar.avatarBig):url` | 상파울루시 문화국 공식 행사 지도(공연·전시·워크숍) | 키 불필요(Mapas Culturais 표준 API) | 🟡 Mapas Culturais는 `avatar` 이미지 제공, 플랫폼 데이터는 개방 데이터로 운영(라이선스 표기 ❓) | **연결 시간 초과**(이 환경). 같은 소프트웨어의 세아라·페르남부쿠 인스턴스는 200으로 API 형식 확인 | ✅실호출(다른 인스턴스) / SP ❓ | **보류 — CI에서 재시도, 열리면 상파울루 1순위** |
| 상파울루시 CKAN `dados.prefeitura.sp.gov.br` | `calendario-estrategico-de-eventos`(2026년 76건, **월 단위만**, 날짜 없음), 자치구 행사 보고서(Santana, Sapopemba — 행정 보고서) | 키 불필요 | ❌ / CC BY | ✅실호출 | **사용 안 함** (날짜·장소 없음) |
| Mapa de Cultura RJ / Rio "Rio o Ano Inteiro" | 리우 주 문화 지도(2012~), 시 공식 연간 달력 | API 확인 못 함. `visit.rio` 연결 시간 초과, `data.rio` 검색 "eventos" 0건 | — | 🟡 | **딥링크만** |
| dados.gov.br | | API는 토큰 필수(401) | | ✅실호출 | 사용 안 함 |
| Sesc São Paulo (`sescsp.org.br/wp-json/`) | Sesc 프로그램(상파울루 최대 문화 기관) | WP REST가 열려 있으나 **재사용용으로 공개된 피드가 아님**(사이트 내부 API) | — | ✅실호출 | **딥링크만** (제휴 문의 후보) |
| Ticketmaster BR | 대형 공연 | 키 필요, `countryCode=BR` | ✅ | ✅ 코드 · 사이트 200 | **키 받아 통합** (재고 실측) |
| Sympla, Eventim BR | 예매 1·2위 | Sympla API는 **주최자 본인 행사 전용 토큰**(검색 API 아님) | — | 🟡 | **딥링크만** |

### 2-4. 아르헨티나 · 칠레 · 콜롬비아 · 페루

| 소스 | 다루는 것 | 접근 | 검증 | 판정 |
|---|---|---|---|---|
| Buenos Aires Data (`data.buenosaires.gob.ar`, CKAN) | `agenda` 0건. `actividades-culturales`(리소스 2024-06), `eventos-direccion-general-musica`(2019), `teatro-colon-programacion-historica`(2019) — 모두 과거 | 키 불필요 | ✅실호출 | **사용 안 함** |
| BA 시 "Linda" 아젠다(`linda.buenosaires.gob.ar/agenda`), Descubrir BA 주간 PDF | 시 공식 문화 달력 | 공개 피드 ❌ | ✅(페이지 200) | **딥링크만** |
| 아르헨티나 문화부 아젠다 (`cultura.gob.ar/agenda`) | | Cloudflare 챌린지 403 | ✅실호출 | 딥링크 |
| datos.gob.cl (칠레, CKAN) | "agenda cultural" 0건, "eventos"는 2013년 자료(CC BY-NC) | 키 불필요 | ✅실호출 | **사용 안 함** |
| **ChileCultura** (`chilecultura.gob.cl/events/`, 문화부 공식 카르텔레라) | 칠레 전국 문화 행사 | 공개 API 확인 못 함. **봇 UA에 403**(openresty), 브라우저에선 200 | ✅실호출 | **딥링크만** (데이터 제공 문의 후보) |
| Santiago Cultura (`santiagocultura.cl`), Teatro Municipal, GAM | 산티아고시·주요 극장 | 공개 피드 ❌ (WP Events Calendar 경로 없음) | ✅실호출 | 딥링크 |
| datos.gov.co (콜롬비아, Socrata) | "eventos" 704건은 보건·치안 통계, "agenda cultural"은 칼리 2018뿐. IDARTES 데이터셋은 시설·예술가 명부 | 키 불필요 | ✅실호출 | **사용 안 함** |
| datosabiertos.bogota.gov.co, medata.gov.co | 보고타 포털 연결 시간 초과, 메데인 CKAN API 경로 404 | | ✅실호출(실패) | 보류(CI) |
| IDARTES RSS `idartes.gov.co/es/rss.xml` | 보고타 예술청 **뉴스** 10건(행사 날짜 없음) | 키 불필요 | ✅실호출 | 사용 안 함 (뉴스) → 아젠다 페이지는 딥링크 |
| datosabiertos.gob.pe (페루) | | WAF 418 | ✅실호출(실패) | 보류 |
| Ticketmaster AR·CL·CO·PE | 공연 | 키 필요, 코드 있음 | ✅ 코드 | **키 받아 통합 (재고 실측)** |
| Ticketek AR(봇 403), Alternativa Teatral, PuntoTicket, Passline(봇 403), TuBoleta, Joinnus, Teleticket | 예매 | 공개 API ❌ | 🟡 | **딥링크만** |

### 2-5. 남아프리카공화국 (케이프타운 · 요하네스버그)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 검증 | 판정 |
|---|---|---|---|---|---|
| **Quicket API** `https://api.quicket.co.za/api/events?api_key={key}` | 남아공 셀프 발권 행사(공연·마켓·파티·워크숍, 케이프타운·조벅 다수) | **무료 키**: developer.quicket.co.za 가입. 키 없이 401 "You need an API key… register at developer.quicket.co.za" | 🟡 이벤트 이미지 있는 것으로 알려짐 / 약관 ❓(가입 시 확인) | ✅실호출(401) | **키 받아 통합 — 남아공 1순위** |
| City of Cape Town Open Data (ArcGIS Hub `odp-cctegis.opendata.arcgis.com`) | "events" 검색 결과는 행사장(스타디움) 시설 레이어뿐. 구 CKAN(`odp.capetown.gov.za`)은 자체서명 인증서 오류 | | | ✅실호출 | **사용 안 함** |
| Cape Town Tourism (`capetown.travel/events`) | 관광 행사 | Cloudflare 403 | — | ✅ | 딥링크 |
| Computicket(Cloudflare 403), Webtickets, Howler | 예매 | 공개 API ❌ | — | 🟡 | **딥링크만** |
| Ticketmaster ZA | | 키, 코드 `ZA` 있음 | | ✅ 코드 | 실측 후 결정(재고 적을 것) |

### 2-6. 북·동·서아프리카 (카이로 · 마라케시 · 카사블랑카 · 나이로비 · 라고스 · 아크라 · 잔지바르 · 아디스아바바 · 다카르 · 키갈리)

| 소스 | 다루는 것 | 접근 | 검증 | 판정 |
|---|---|---|---|---|
| 각국 정부 오픈데이터·관광청 | 이벤트 피드 확인 못 함. Visit Ghana는 WP Events Calendar REST가 열려 있으나 **0건**(사용 안 함), Visit Rwanda·Santiago Cultura 경로 없음 | | ✅실호출 | 사용 안 함 |
| OpenAgenda 공개 미러 (2단계 재사용) | 아프리카 12개 도시 반경 **전부 0건**(Institut français 아젠다는 미러에 없음). 중남미도 토론토·BA·보고타 각 1건 | 키 불필요 | ✅실호출 | 사용 안 함 (양 없음) |
| Goethe-Institut, Institut français, Alliance française 현지 아젠다 | 문화원 행사 | 공개 재사용 피드 ❌ (goethe.de 403) | 🟡 | 딥링크 |
| Tazkarti, Ticketsmarché(이집트), Guichet(모로코), Ticketsasa·Mookh(케냐), Nairabox·Tix Africa(나이지리아, Tix는 Cloudflare 403), Egotickets(가나, 403) | 예매 | 공개 API ❌ | 🟡 | **딥링크만** |
| Ticketmaster MA·GH | | 코드만 있음 | ✅ 코드 | 실측만 (거의 0 예상) |

이 10개 도시는 **places(Wikidata) + 위키백과 오디오가이드 + Viator/GYG/izi(키 받은 뒤)** 로 채운다. 3-1의 places 분류 보강이 사실상 필수.

### 2-7. 쿠바 (아바나) — 보류

| 항목 | 내용 |
|---|---|
| 이벤트 소스 | 없음. `lahabana.gob.cu`는 시민 행정 포털(행사 달력 없음) |
| 티켓 | 온라인 판매처 사실상 없음, Ticketmaster 코드 없음 |
| 투어 | 미국 OFAC 제재로 미국 기업(Viator 등) 상품이 제한될 수 있음(🟡) |
| places | 후보 45 / P18 30 → 10건 + 이미지는 가능 |
| 판정 | **보류** — 넣는다면 places·오디오가이드만 있는 "명소 도시"로. Time Out Havana 가이드 페이지(200)는 딥링크 가능 |

---

## 3. 공통 (모든 4단계 도시)

| 소스 | 종류 | 접근 | 이미지 | 검증 | 판정 |
|---|---|---|---|---|---|
| **places.mjs (Wikidata 상설 명소)** | 박물관·미술관·명소 10~15곳/도시 | 키 불필요. `COUNTRY_QID`에 1장 표의 Q값 18개 추가 | ✅ Commons P18 | ✅실호출(밀도 실측, 3-1) | **바로 통합** — 아프리카 도시의 사실상 주 소스 |
| Wikipedia / Commons 오디오가이드 | 오디오가이드 | 키 불필요. wikiLang 1장 표 | ✅ | ✅(코드) / 아프리카 위키 밀도 미측정 | **바로 통합** (이미 있음) |
| Ticketmaster Discovery | 공연·스포츠 | **키 미설정**. CA·MX 핵심, BR·AR·CL·CO·PE·ZA·MA·GH 실측 | ✅ | ✅ 코드 표 | **키 받아 통합** |
| Viator / GetYourGuide / izi.TRAVEL | 투어·클래스·오디오가이드 | **키 미설정** | ✅ | ✅(1단계) | **키 받아 통합** — 아프리카·중남미 도시에서 가장 큰 보강 |
| Eventbrite / Meetup | | 공개 검색 종료 / Pro 전용 | — | ✅ | 사용 안 함 / 딥링크 |
| PredictHQ | 전 세계 행사 집계(아프리카 포함) | 유료 | ✅ | 🟡 | 사용 안 함 (비용) |

### 3-1. places 밀도 실측 (아프리카 + 중남미 일부)

`places.mjs`의 MUSEUM·LANDMARK·EXTRA 분류 그대로, 1장 표의 반경으로 검색(2026-11-12). "후보" = 좌표 있음·폐관 아님. 괄호 = P18 있음.

| 도시 | 박물관류 | 명소(동물원·궁전 등) | 보조(EXTRA) | P18 합계 | + 모스크·성당(Q32815·Q16970·기념물 등) P18 | 판단 |
|---|---|---|---|---|---|---|
| 케이프타운 | 28 (24) | 5 (3) | 44 (20) | **47** | — | 충분 |
| 요하네스버그 | 15 (8) | 3 (3) | 12 (3) | **14** | — | 충분 |
| 카이로 | 56 (37) | 27 (19) | 100 (43) | **99** | +48 | 충분 (모스크 추가 시 품질↑) |
| 마라케시 | 17 (12) | 3 (1) | 11 (9) | **22** | +13 | 충분 |
| 카사블랑카 | 4 (3) | 0 | 20 (3) | **6** | +4 | **부족** — 하산 2세 모스크가 분류 밖. 모스크 추가 + 대체 이미지 체인 필요 |
| 나이로비 | 5 (4) | 4 (2) | 8 (4) | **10** | — | 경계선 |
| 라고스 | 11 (4) | 1 (1) | 40 (17) | **22** | +17 | 충분 |
| 아크라 | 5 (4) | 3 (1) | 8 (8) | **13** | — | 충분(후보 16으로 빠듯) |
| 잔지바르 | 3 (3) | 0 | 24 (5) | **8** | +3 | **부족** — 대체 이미지 체인 의존 |
| 아디스아바바 | 9 (6) | 5 (5) | 12 (5) | **16** | — | 충분 |
| 다카르 | 12 (8) | 1 (1) | 20 (12) | **21** | +8 | 충분 |
| 키갈리 | 6 (5) | 0 | 8 (5) | **10** | — | 경계선(후보 14) |
| 밴쿠버 | 36 (16) | 6 (6) | 95 (45) | 67 | | 충분 |
| 과달라하라 | 39 (9) | 4 (2) | 15 (4) | 15 | | 충분(사진 적음) |
| 산티아고 / 보고타 / 메데인 / 리마 / 리우 / 아바나 | | | | 123 / 41 / 22 / 136 / 163 / 30 | | 충분 |

권장 코드 변경(구현 에이전트용, 이 문서는 제안만):
1. `EXTRA`에 **모스크 Q32815, 교회 건물 Q16970** 추가(이슬람권·라고스·중남미 구시가에서 대표 명소가 이 분류). 모로코는 Wikidata에 문화재 등록 모스크가 수천 건이라 검색 상한(500)에 걸리지만, 사이트링크 수 순위라 유명한 곳이 위로 온다.
2. 카사블랑카·잔지바르·나이로비·키갈리는 P18이 10 근처 → `enrich.mjs`의 "위키백과 대표사진 → 근처 명소 사진" 단계까지 내려간다. 첫 빌드에서 `nearby-photo` 라벨 비율을 확인.

---

## 4. 종류별 요약

| 종류 | 키 없이 | 키로 추가 | 딥링크 |
|---|---|---|---|
| 축제·행사 | 토론토 시 달력, 몬트리올 Événements publics | Ticketmaster, Quicket | Cartelera CDMX, Linda BA, ChileCultura, Bogotá agenda, 관광청 |
| 공연 | 토론토(Live Performances·Theatre·Comedy), 몬트리올(음악·연극·서커스) | **Ticketmaster(CA·MX 핵심)**, Quicket | Sympla, Eventim BR, Ticketek AR, PuntoTicket, TuBoleta, Teleticket, Computicket, Tazkarti, Guichet |
| 전시 | 토론토(Arts/Exhibits·Museum), 몬트리올(Exposition), places(상설) | | 각 미술관, Sesc SP |
| 클래스·워크숍 | 토론토 공공도서관, 몬트리올(공예·요리·과학) | Viator, GYG, Quicket | Meetup |
| 가이드투어 | 토론토(Tour 307행) | Viator, GYG | |
| 오디오가이드 | 위키백과 자동 생성 | izi.TRAVEL | |

---

## 5. 통합 우선순위 (정확한 엔드포인트)

모두 2026-11-12 실호출 확인. 공통: `User-Agent: NolgotBot/1.0 (+https://github.com/dayeonoh626-cyber/nolgot)`. 이미지가 없는 소스는 `enrich.mjs` 체인으로 채운다.

### A. 키 불필요 — 바로 통합

1. **Toronto Festivals & Events** (`sourceKey` 제안: `torontoevents`, 모듈 `ca.mjs`) → toronto
   `GET https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/9201059e-43ed-4369-885e-0b867652feac/resource/8900fdb2-7f6c-4f50-8581-b463311ff05d/download/file.json` → `{ value: [...] }` (약 28.7k행, 수십 MB → 스트리밍 또는 한 번 받아 필터)
   필드: `id`, `event_name`, `short_description`, `event_description`, `event_startdate`/`event_enddate`(ISO, -05:00), `calendar_date`(이 행의 회차), `event_category[]`(종류 매핑: Arts/Exhibits·Museum→exhibition, Live Performances·Theatre·Music·Dance·Comedy·Film→performance, Celebrations·Street Festival·Farmers' Market·Food/Culinary→festival, Seminars/Workshops·Talks→workshop, Tour→tour), `event_locations[]{location_name, location_address, location_gps(JSON 문자열)}`, `event_image[]{bin_id, fields.alt, fields.credit, status}`, `free_event`, `event_price_low/high`, `event_website`, `ticket_website`, `reservations_required`.
   - 이미지: `https://secure.toronto.ca/c3api_upload/retrieve/festivals_events/{bin_id}` (`status=="success"`만). 원본이 1~2MB → 앱은 그대로 쓰되 lazy load.
   - 병합: `calendar_date >= 오늘` 행을 `event_name`(+장소)로 묶고 시작=최소 `calendar_date`, 종료=`event_enddate`.
   - 제외: `Virtual/Online Event`, `Charity/Cause`, `Run/Walk`(선택).
   - 출처 표기: "Contains information licensed under the Open Government Licence – Toronto".
2. **Montréal Événements publics** (`montreal`, `ca.mjs`) → montreal
   `GET https://www.donneesquebec.ca/recherche/api/3/action/datastore_search_sql?sql=SELECT * FROM "6decf611-6f11-4f34-bb36-324d804c9bad" WHERE date_fin >= '{오늘}' AND type_evenement NOT IN ('Conseil et comité','Consultation publique','Rencontre avec personne élue','Soutien et échange')` (SQL은 URL 인코딩, 2,000건 이상이면 `LIMIT/OFFSET`)
   필드: `titre`, `url_fiche`, `description`, `date_debut`/`date_fin`(`YYYY-MM-DD`), `type_evenement`(Exposition→exhibition, Musique·Théâtre·Danse·Cirque·Humour·Cinéma→performance, Fête et marché→festival, Art et artisanat·Cuisine·Science et techno·Informatique·Langues·Initiation à la musique→workshop, Heure du conte·Jeux→workshop(가족, 상한)), `public_cible`, `inscription`, `cout`(Gratuit→무료), `arrondissement`, `titre_adresse`, `adresse_principale`, `lat`/`long`(문자열, `"nan"` 처리). 문자열 `"nan"`은 빈 값으로.
   - 이미지: `url_fiche` og:image(Cloudinary, 1200×630). **`donnees.montreal.ca` 원본 URL은 봇 UA에 403이므로 쓰지 말 것.**
   - 라이선스: CC BY 4.0, 출처 "Ville de Montréal".
3. **Toronto Public Library** (`tpl`, `ca.mjs`, 보조) → toronto
   `GET https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/fb343332-03cd-40b9-a1c8-c03a4a85ca1e/resource/aa5e1425-77f4-4cb4-a8ea-eb5ce7d4f34c/download/tpl-events-feed.json`
   필드: `EventID`, `Title`, `StartTime`/`EndTime`(현지, 오프셋 없음), `LocationName`, `Audiences`, `EventTypes`, `IsRecurring`, `Status`(ACTIVE만), `FeaturedImageUrl`(`TPLIcons` 포함 URL은 poster 제외 → 분관 사진 대체). 링크 `https://tpl.bibliocommons.com/events/{EventID}`(🟡 형식 추정 — 구현 시 200 확인). 좌표: CKAN `library-branch-general-information`의 분관 좌표 표. 회차는 `Title`+분관으로 병합, 문화·예술·과학 유형 우선, 상한 200.

### B. 키 필요 — 이미 코드가 있는 공통 소스 (키만 넣으면 됨)

4. **Ticketmaster Discovery** — `CA`(마켓 102/111/120)·`MX`는 바로. `BR`·`AR`·`CL`·`CO`·`PE`·`ZA`·`MA`·`GH`는 첫 빌드에서 건수 측정 후 0이면 `false`. EG·KE·NG·TZ·ET·SN·RW·CU는 `false`.
5. **Viator / GetYourGuide / izi.TRAVEL** — 도시 추가만으로 적용. 아프리카·중남미 도시에서 투어·체험이 가장 많이 들어올 소스.

### C. 새 키 신청

6. **Quicket API** (`QUICKET_API_KEY`) — `GET https://api.quicket.co.za/api/events?api_key={key}&pageSize=…` → capetown, johannesburg. 응답 형식·약관·이미지 여부는 키 발급 후 확인(문서는 developer.quicket.co.za).

### D. 보류·재확인 목록 (CI = GitHub Actions에서)
- **SP Cultura** `spcultura.prefeitura.sp.gov.br/api/event/findOccurrences` — 연결 시간 초과. CI에서 열리면 상파울루 1순위로 승격(형식은 세아라 인스턴스로 확인됨: `id, name, occurrence_id, starts_on, starts_at, ends_on, rule{spaceId, …}`; 공간 좌표는 `/api/space/find?id=IN(…)&@select=location,name`).
- **CDMX** `datos.cdmx.gob.mx`·`cartelera.cdmx.gob.mx` — 연결 시간 초과. CI에서 카탈로그 검색("cartelera", "eventos").
- datosabiertos.bogota.gov.co(시간 초과), datosabiertos.gob.pe(WAF 418), datos.gob.mx(Akamai 403) — CI 재시도.
- ChileCultura — 봇 403. 문화부에 데이터 제공(오픈데이터) 문의 후보.
- SFU LiveWhale — 밴쿠버 보조로 쓸지(재사용 조건 ❓).
- Sesc SP — 제휴/데이터 제공 문의 후보.

### 받아야 할 키 (사용자 할 일)
| Secret 이름 | 발급처 | 비용 | 쓰는 곳 |
|---|---|---|---|
| `TICKETMASTER_API_KEY` (기존 코드) | https://developer.ticketmaster.com/ 가입 → My Apps에서 Consumer Key | 무료, 하루 5,000회 | 캐나다·멕시코 핵심 + 중남미·남아공 실측 (이미 1~3단계 전 도시에도 필요) |
| `VIATOR_API_KEY` (기존 코드) | Viator Partner Program(affiliate) 가입 → API 키 | 무료(수수료형) | 전 도시, 특히 아프리카 |
| `GYG_…` (기존 코드) | GetYourGuide Partner 가입 → API 접근 신청 | 무료(수수료형, 승인제) | 전 도시 |
| `IZI_API_KEY` (기존 코드) | izi.TRAVEL API 키 요청(이메일) | 무료 | 오디오가이드 |
| `QUICKET_API_KEY` (신규) | https://developer.quicket.co.za 가입 → 키 발급 | 무료(❓ 약관 확인) | 케이프타운·요하네스버그 |

---

## 6. 판정 집계

| 판정 | 개수 | 소스 |
|---|---|---|
| 바로 통합 (키 불필요) | 4 | Toronto Festivals & Events, Montréal Événements publics(Données Québec), Toronto Public Library(보조), places+위키백과(공통) |
| 키 받아 통합 | 6 | Ticketmaster(CA·MX 핵심, 8개국 실측), Viator, GYG, izi.TRAVEL, Quicket(신규) |
| 딥링크만 | 약 40곳 | 9장 표 전부 + Sympla·Eventim·ChileCultura·Sesc SP·mexicoescultura 등 |
| 사용 안 함 | 12 | Nathan Phillips Square(폐기), Vancouver 마켓(2016), SP 전략 달력(월 단위), SP 자치구 보고서, BA CKAN 문화 데이터(과거), datos.gob.cl(2013), datos.gov.co(무관), IDARTES RSS(뉴스), Cape Town ArcGIS(시설), Visit Ghana WP(0건), OpenAgenda 미러(0건), dados.gov.br(토큰) |
| 보류 | 8 | SP Cultura, CDMX 포털·카르텔레라, datos.gob.mx, 보고타 포털, 페루 포털, ChileCultura, SFU LiveWhale, 쿠바(도시 자체) |

---

## 7. 추천 도시 목록 (나라별)

| 나라 | 추천 | 근거 |
|---|---|---|
| 캐나다 (3) | 토론토, 몬트리올 — **피드 강함** / 밴쿠버 — Ticketmaster + places | Ticketmaster 마켓 ID까지 있는 핵심 시장 |
| 멕시코 (1~2) | 멕시코시티 / (과달라하라 선택) | Ticketmaster MX가 주 소스. CDMX 포털은 CI에서 재확인 |
| 브라질 (2) | 상파울루, 리우데자네이루 | places 매우 풍부. SP Cultura가 CI에서 열리면 상파울루 강화 |
| 아르헨티나·칠레·콜롬비아·페루 (5) | 부에노스아이레스, 산티아고, 보고타, 메데인, 리마 | places 충분(메데인 P18 22로 가장 약함). 이벤트는 Ticketmaster 실측 + 딥링크 |
| 쿠바 | **보류** | 공식 피드·티켓 없음, 제재 이슈 |
| 남아공 (2) | 케이프타운, 요하네스버그 | Quicket 키로 이벤트 확보 가능 |
| 이집트·모로코 (3) | 카이로, 마라케시, 카사블랑카(또는 페스) | 모스크 분류 추가 권장, 카사블랑카는 사진 부족 |
| 동·서아프리카 (7) | 나이로비, 라고스, 아크라, 잔지바르, 아디스아바바, 다카르, 키갈리 | places + 오디오가이드 + 투어. 나이로비·키갈리·잔지바르는 경계선 |

`BUILD_COUNTRIES=CA,MX,BR,AR,CL,CO,PE,ZA,EG,MA,KE,NG,GH,TZ,ET,SN,RW` (CU 제외).

---

## 8. 확인 못 한 것

- Ticketmaster BR·AR·CL·CO·PE·ZA·MA·GH 실제 이벤트 양(키 없음)
- Viator·GYG의 아프리카 도시 상품 수(키 없음)
- SP Cultura·CDMX·보고타·페루 포털 — 이 환경에서 연결 불가(지역 차단 또는 네트워크 문제로 추정). CI에서 재확인 필요
- Quicket API 약관·응답 형식·이미지 유무
- TPL 행사 상세 URL 형식(`tpl.bibliocommons.com/events/{EventID}`) 실제 200 여부
- 아프리카 언어(ar·am·sw) 위키백과 기반 오디오가이드 밀도
- 페스·라바트 places 밀도(카사블랑카 대안 실측 안 함)

---

## 9. "현지 사이트에서 더 찾아보기" 카드 (guides.js 후보)

2026-11-12, 브라우저형 User-Agent로 GET 1회씩 확인. **200**만 링크로 쓰고, 봇 차단(403 챌린지)은 사람이 브라우저로 열면 대개 열리므로 "열림(봇 차단)"으로 표시 — 앱 사용자에게는 문제없지만 링크 점검 스크립트에서는 실패로 나온다.

### 9-1. Time Out (`TIMEOUT` 맵에 추가할 slug)
| 도시 | 결과 | 비고 |
|---|---|---|
| toronto `toronto`, montreal `montreal`, vancouver `vancouver`, mexicocity `mexico-city`, buenosaires `buenos-aires`, bogota `bogota`, capetown `cape-town`, johannesburg `johannesburg`, marrakech `marrakech`, accra `accra` | ✅ `/{slug}/things-to-do` 200 | 일부는 `best-things-to-do-in-…`로 리다이렉트(정상) |
| saopaulo `sao-paulo`, riodejaneiro `rio-de-janeiro`, havana `havana` | ⚠️ `/{slug}` 200, **`/things-to-do`는 404** | 현재 템플릿(`/{timeout}/things-to-do`)으로는 깨진다 → 이 셋은 넣지 말거나 템플릿을 도시별 전체 경로로 바꿀 것 |
| (대체) 멕시코시티 스페인어판 `https://www.timeoutmexico.mx/ciudad-de-mexico` | ✅ 200 | 현지어 카드로 추가 가능 |
| guadalajara, santiago, medellin, lima, cairo, casablanca, nairobi, lagos, zanzibar, addis-ababa, dakar, kigali | ❌ 404 | 넣지 말 것 (lima는 London 광고 페이지로 리다이렉트) |

### 9-2. 도시·관광청 공식 달력
| 도시 | 이름 | URL | 결과 |
|---|---|---|---|
| toronto | City of Toronto Festivals & Events | https://www.toronto.ca/explore-enjoy/festivals-events/festivals-events-calendar/ | ✅ 200 |
| toronto | Destination Toronto | https://www.destinationtoronto.com/events/ | ✅ 200 |
| montreal | Ville de Montréal Événements | https://montreal.ca/evenements | ✅ 200 |
| montreal | Tourisme Montréal 축제·행사 | https://www.mtl.org/en/what-to-do/festivals-and-events | ✅ 200 (`/en/events`·`/fr/evenements`는 404) |
| vancouver | Destination Vancouver Events | https://www.destinationvancouver.com/events | ✅ 200 |
| mexicocity | Mexico City 관광 가이드 | https://mexicocity.cdmx.gob.mx/ | ✅ 200 |
| mexicocity | Cartelera CDMX | https://cartelera.cdmx.gob.mx/ | ❓ 이 환경 시간 초과 (CI·브라우저 재확인) |
| saopaulo | Sesc São Paulo 프로그램 | https://www.sescsp.org.br/programacao/ | ✅ 200 |
| saopaulo | Cidade de São Paulo 아젠다 | https://www.cidadedesaopaulo.com/agenda/ | ⚠️ 열림(봇 차단, Cloudflare) |
| riodejaneiro | Visit.Rio | https://visit.rio/ | ❓ 시간 초과 |
| buenosaires | Linda BA 아젠다 (시 공식) | https://linda.buenosaires.gob.ar/agenda | ✅ 200 (`buenosaires.gob.ar/agenda`가 여기로 리다이렉트) |
| buenosaires | Turismo Buenos Aires | https://turismo.buenosaires.gob.ar/es | ✅ 200 (`/es/agenda`는 404) |
| buenosaires | Teatro Colón | https://teatrocolon.org.ar/ | ✅ 200 |
| santiago | ChileCultura 카르텔레라 (문화부) | https://chilecultura.gob.cl/events/ | ✅ 200 |
| santiago | Santiago Cultura (시) | https://www.santiagocultura.cl/ | ✅ 200 |
| santiago | Teatro Municipal / GAM | https://municipal.cl/ · https://gam.cl/es/ | ✅ 200 |
| bogota | Agenda cultural de Bogotá | https://bogota.gov.co/que-hacer/agenda-cultural | ✅ 200 |
| bogota | IDARTES 아젠다 | https://www.idartes.gov.co/es/agenda | ✅ 200 |
| medellin | Medellín Travel (공식) | https://www.medellin.travel/ | ✅ 200 |
| lima | 페루 문화부 | https://www.gob.pe/cultura | ✅ 200 |
| havana | Time Out Havana | https://www.timeout.com/havana | ✅ 200 |
| capetown | Cape Town Tourism Events | https://www.capetown.travel/events/ | ⚠️ 열림(봇 차단) |
| johannesburg | City of Johannesburg | https://joburg.org.za/ | ✅ 200 (행사 달력 전용 페이지는 아님) |
| cairo | Experience Egypt (관광청) | https://www.experienceegypt.eg/en | ✅ 200 |
| cairo | Cairo Opera House | https://www.cairoopera.org/ | ✅ 200 (아랍어) |
| cairo | Cairo 360 (현지 가이드) | https://www.cairo360.com/ | ✅ 200 |
| marrakech, casablanca | Visit Morocco | https://www.visitmorocco.com/en | ✅ 200 |
| nairobi | Magical Kenya | https://magicalkenya.com/ | ⚠️ 열림(봇 차단) |
| lagos | Lagos State 공식 | https://www.lagosstate.gov.ng/ | ✅ 200 (행사 달력 아님 — 약함) |
| accra | Visit Ghana Events | https://visitghana.com/events/ | ✅ 200 |
| kigali | Visit Rwanda Events | https://visitrwanda.com/events/ | ✅ 200 |
| dakar | Au Sénégal (관광 가이드) | https://www.au-senegal.com/ | ✅ 200 |
| addisababa | — | `visitethiopia.travel`은 **스팸 사이트로 리다이렉트** → 절대 쓰지 말 것 | ❌ |
| zanzibar | Zanzibar Commission for Tourism | https://www.zanzibartourism.go.tz/ | ❓ 시간 초과 |

### 9-3. 나라별 주요 예매처
| 국가 | 이름 | URL | 결과 |
|---|---|---|---|
| CA | Ticketmaster Canada | https://www.ticketmaster.ca/ | ✅ 200 (admission.com → 여기로 리다이렉트) |
| MX | Ticketmaster México | https://www.ticketmaster.com.mx/ | ✅ 200 |
| MX | eticket.mx | https://www.eticket.mx/ | ✅ 200 |
| MX | Boletia | https://boletia.com/ | ⚠️ 열림(봇 차단, CloudFront) |
| BR | Sympla | https://www.sympla.com.br/eventos/sao-paulo-sp · https://www.sympla.com.br/eventos/rio-de-janeiro-rj | ✅ 200 (도시별 경로) |
| BR | Eventim Brasil | https://www.eventim.com.br/ | ✅ 200 |
| BR | Ticketmaster Brasil | https://www.ticketmaster.com.br/ | ✅ 200 |
| AR | Alternativa Teatral | https://www.alternativateatral.com/ | ✅ 200 (BA 연극 전문) |
| AR | Ticketek Argentina | https://www.ticketek.com.ar/ | ⚠️ 열림(봇 차단) |
| CL | PuntoTicket | https://www.puntoticket.com/ | ✅ 200 |
| CL | Ticketmaster Chile | https://www.ticketmaster.cl/ | ✅ 200 |
| CL·AR | Passline | https://www.passline.com/ | ⚠️ 열림(봇 차단) |
| CO | TuBoleta | https://tuboleta.com/ | ✅ 200 |
| PE | Joinnus | https://www.joinnus.com/ | ✅ 200 |
| PE | Teleticket | https://teleticket.com.pe/ | ✅ 200 |
| ZA | Quicket | https://www.quicket.co.za/events/ | ✅ 200 |
| ZA | Webtickets | https://www.webtickets.co.za/ | ✅ 200 |
| ZA | Howler | https://www.howler.co.za/ | ✅ 200 (페스티벌 위주) |
| ZA | Computicket | https://www.computicket.com/ | ⚠️ 열림(봇 차단) |
| EG | Tazkarti | https://www.tazkarti.com/ | ✅ 200 |
| EG | Ticketsmarché | https://www.ticketsmarche.com/ | ✅ 200 |
| MA | Guichet | https://guichet.com/ma-fr | ✅ 200 |
| KE | Ticketsasa | https://www.ticketsasa.com/ | ✅ 200 |
| KE | Mookh | https://mookh.com/ | ✅ 200 |
| NG | Nairabox | https://nairabox.com/ | ✅ 200 |
| NG | Tix Africa | https://tix.africa/ | ⚠️ 열림(봇 차단) |
| GH | Egotickets | https://egotickets.com/ | ⚠️ 열림(봇 차단) |
| TZ·ET·SN·RW | — | 확인된 전국 예매처 없음 → 공통 카드(Google 이벤트·Time Out Africa `https://www.timeout.com/africa` 200)만 | |

---

## 10. 참고 링크
- Toronto Open Data: https://open.toronto.ca/dataset/festivals-events/ · https://open.toronto.ca/dataset/library-branch-programs-and-events-feed/ · 라이선스 https://open.toronto.ca/open-data-license/
- Montréal (Données Québec): https://www.donneesquebec.ca/recherche/dataset/vmtl-evenements-publics
- Ticketmaster 국가코드: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- Mapas Culturais API: https://github.com/mapasculturais/mapasculturais (문서 `documentation/docs/mc_config_api.md`) · SP Cultura: https://spcultura.prefeitura.sp.gov.br/
- 상파울루 CKAN: https://dados.prefeitura.sp.gov.br/ · BA Data: https://data.buenosaires.gob.ar/ · datos.gob.cl · datos.gov.co
- Quicket developer: https://developer.quicket.co.za/
- SFU LiveWhale: https://events.sfu.ca/
- Cartelera CDMX 보도: https://www.unotv.com/estados/ciudad-de-mexico/cartelera-cultural-digital-cdmx-eventos-conciertos-teatro-musica-como-consultar/

---

## 11. 통합 상태 (2026-11-12 구현, 데이터 에이전트)

빌드: `BUILD_COUNTRIES=CA,MX,BR,AR,CL,CO,PE,ZA,EG,MA,KE,NG,GH,TZ,ET,SN,RW node scripts/build-data.mjs` → 23개 도시 추가(총 110곳). 기존 87곳 파일은 그대로, `cities.json`은 병합. 과달라하라·아바나는 보류(미추가).

| 소스 | sourceKey | 모듈 | 상태 | 결과(첫 빌드) | 비고 |
|---|---|---|---|---|---|
| City of Toronto Festivals & Events | `torontoevents` | `ca.mjs` | ✅ 통합 | 415건(상한 `TORONTO_MAX` 450), 소스 이미지 386 | 240MB 파일을 스트리밍(`streamJsonArray` `itemDepth: 3`), 약 12초. 이벤트명+장소로 회차 병합. 이미지 c3api retrieve URL |
| Montréal Événements publics (Données Québec) | `montreal` | `ca.mjs` | ✅ 통합 | 497건(상한 `MONTREAL_MAX` 500, 일상 프로그램 `MTL_ROUTINE_MAX` 60) | og:image(montreal.ca → Cloudinary) 495/497 확보. 원본 donnees.montreal.ca 미사용 |
| Toronto Public Library | `tpl` | `ca.mjs` | ✅ 통합(보조) | 200건(상한 `TPL_MAX`) | `TPLIcon*` 및 여러 프로그램이 같이 쓰는 배너는 버림 → 고유 사진 20건, 나머지는 분관 사진/주변 사진. 좌표는 분관 정보 데이터셋(datastore dump) `Lat/Long`. 행사 페이지 `tpl.bibliocommons.com/events/{id}`는 봇 요청에 **202(빈 응답, 챌린지)** → og:image 요청 안 함(`_noOg`) |
| Quicket | `quicket` | `za.mjs` | ⏸ 코드만(키 없음) | 꺼짐 | `QUICKET_API_KEY` 있을 때만. 응답 형식은 공식 문서(docs.quicket.com, Postman "Get a list of events": `results[]` — `id,name,description,url,imageUrl,startDate,endDate,venue{latitude,longitude},locality,categories,tickets,schedules`)로 확인. **TODO**: 키 발급 후 ① 페이지 메타데이터 필드명(현재는 결과가 `pageSize`보다 적으면 중단, 최대 40쪽) ② 재사용·이미지 약관 ③ 실제 건수 확인. deploy.yml에 선택 secret으로 연결됨 |
| places (Wikidata) | `places` | `places.mjs` | ✅ 국가 QID 17개 추가 | 23개 도시 모두 10~15곳 | 모스크 Q32815·교회 건물 Q16970를 **채움 순위**에 추가(별도 검색·별도 후보 몫 → 기존 검색 상한 500과 후보 몫을 잠식하지 않음, 채움 단계에서 도시당 최대 `PLACES_WORSHIP_MAX`=5). 카사블랑카에 하산 2세 모스크 포함 확인. 채움 순위는 사진 있는 곳 먼저, en·현지어 문서가 없으면 다른 언어 문서+사진 있는 곳, 그래도 10 미만이면 반경 1.6배 재검색, 사진 없는 채움 항목은 넓힌 반경의 사진 있는 후보로 교체 |
| Wikipedia 오디오가이드 | `wikipedia` | `wikipedia-tours.mjs` | ✅ | 23곳 모두 1~2코스 | 현지어 위키에서 코스를 못 만들면 영어 위키로 재시도(카이로 `ar` → `en`) |
| SP Cultura · CDMX(datos/cartelera) · 보고타 포털 | — | — | ⏸ 보류 유지 | — | 2026-11-12 재시도: 세 곳 모두 이 환경에서 `UND_ERR_CONNECT_TIMEOUT`(10초). CI(미국)에서 열리는지는 미확인 |
| Ticketmaster(CA·MX·BR·AR·CL·CO·PE·ZA·MA·GH) | `ticketmaster` | `generic.mjs` | ⏸ 키 없음 | — | `COUNTRIES[*].ticketmaster`에 국가코드 설정. EG·KE·NG·TZ·ET·SN·RW는 `false` |

`places` 변경이 기존 87개 도시에 주는 영향(같은 날 Wikidata로 기존 캐시와 비교, 캐시 만료 후 적용): **유럽·미국·아시아 81곳은 변화 없음**. 한국 채움 도시 6곳(인천·대전·울산·세종·충북·전남)에서 사진 없는 산·산성 터 일부가 사진 있는 향교·사찰·서원으로 바뀜(사진 우선 규칙 때문). 모스크·교회가 들어간 기존 도시는 없음.
- 주의(구현 중 발견·수정): 모스크·교회를 같은 순위표에 넣었더니 로마(15→12)·싱가포르(15→10)·카이로(15→10)에서 사이트링크 많은 성당·모스크가 상위 후보 몫(MAX×3)을 차지해 박물관이 밀려났다 → 별도 검색 + 별도 몫(10)으로 분리해 해결.
