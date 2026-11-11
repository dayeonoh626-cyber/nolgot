# 놀곳 데이터 소스 조사 — 유럽 (2단계)

조사일: 2026-11-11 · 대상: 영국 · 프랑스 · 스페인 · 헝가리 · 오스트리아 · 이탈리아 · 네덜란드 · 스위스 · 포르투갈 · 체코 · 벨기에
조사 방법: 웹 검색(영/불/서/이/독/헝/체/네/포 검색어) 약 45회, 공식 문서 페이지 열람, 그리고 **키가 필요 없는 엔드포인트는 2026-11-11에 직접 호출해서** 응답 구조·건수·라이선스 메타데이터를 확인했다.

검증 수준 (1단계 `sources-research.md`와 같은 표기 + 실호출 표시)
- ✅ 공식 문서·공식 페이지로 확인 · **✅실호출** = 실제로 호출해서 데이터가 나오는 것까지 확인 · 🟡 제3자 자료/일부만 확인 · ❓ 확인 못 함

판정 기준 (1단계와 동일)
- **바로 통합 (키 불필요)** · **키 받아 통합** · **딥링크만** · **사용 안 함**

> 원칙: 약관이 스크래핑을 금지하거나 비공식(문서화되지 않은) API만 있는 곳은 수집하지 않는다. 이미지는 API가 준 것, 이벤트 공식 페이지의 og:image, Wikimedia Commons만 쓴다.

---

## 0. 요약

- **키 없이 바로 넣을 수 있는 공식 오픈데이터가 생각보다 많다**: 파리(Que faire à Paris), 프랑스·제네바·브뤼셀 일부(OpenAgenda 공개 미러), 프랑스 전역 축제(DATAtourisme CSV), 마드리드, 바르셀로나, 발렌시아(IVC), 세비야(안달루시아), 리스본(AgendaLX), 피렌체, 빈(크리스마스마켓), 런던 일부(Wellcome Collection).
- **공식 오픈 이벤트 피드가 없는 도시**: 런던(도시 전체), 맨체스터, 리버풀, 부다페스트, 프라하, 잘츠부르크, 로마, 밀라노, 베네치아, 나폴리, 암스테르담, 로테르담, 취리히, 포르투, 안트베르펜(키 필요). 이 도시들은 **Ticketmaster(이미 있는 키) + Viator/GYG/izi + 위키백과 오디오가이드 + 딥링크**로 채운다.
- Ticketmaster Discovery API의 공식 `countryCode` 목록에 **11개국 모두 포함**(✅ 공식 문서). 단 실제 이벤트 양은 나라마다 다름(헝가리·포르투갈은 적을 것으로 예상, 키로 실측 필요).
- **빈(Wien) 시 행사 DB는 2025-12에 폐기**되었고 새 인터페이스는 "준비 중"(data.gv.at 공지). 지금은 크리스마스마켓 WFS만 사용 가능.
- **암스테르담 공식 이벤트 피드(open.data.amsterdam.nl/Evenementen.json)는 사라짐**(도메인 응답 없음, 카탈로그 최종 수정 2022).

---

## 1. 도시 목록 (cities.json 후보)

`id`·이름·좌표·타임존은 `data/cities.json` 형식 그대로 쓸 수 있게 정리했다. 반경은 도심 기준 제안값.

| id | 이름(ko) | 이름(en) | 현지명(`local`) | 국가 | lat | lng | radiusKm | tz |
|---|---|---|---|---|---|---|---|---|
| london | 런던 | London | London | GB | 51.5074 | -0.1278 | 30 | Europe/London |
| manchester | 맨체스터 | Manchester | Manchester | GB | 53.4808 | -2.2426 | 20 | Europe/London |
| edinburgh | 에든버러 | Edinburgh | Edinburgh | GB | 55.9533 | -3.1883 | 15 | Europe/London |
| liverpool | 리버풀 | Liverpool | Liverpool | GB | 53.4084 | -2.9916 | 15 | Europe/London |
| paris | 파리 | Paris | Paris | FR | 48.8566 | 2.3522 | 20 | Europe/Paris |
| lyon | 리옹 | Lyon | Lyon | FR | 45.7640 | 4.8357 | 15 | Europe/Paris |
| marseille | 마르세유 | Marseille | Marseille | FR | 43.2965 | 5.3698 | 20 | Europe/Paris |
| nice | 니스 | Nice | Nice | FR | 43.7102 | 7.2620 | 15 | Europe/Paris |
| madrid | 마드리드 | Madrid | Madrid | ES | 40.4168 | -3.7038 | 20 | Europe/Madrid |
| barcelona | 바르셀로나 | Barcelona | Barcelona | ES | 41.3874 | 2.1686 | 15 | Europe/Madrid |
| valencia | 발렌시아 | Valencia | València | ES | 39.4699 | -0.3763 | 15 | Europe/Madrid |
| seville | 세비야 | Seville | Sevilla | ES | 37.3891 | -5.9845 | 15 | Europe/Madrid |
| budapest | 부다페스트 | Budapest | Budapest | HU | 47.4979 | 19.0402 | 20 | Europe/Budapest |
| vienna | 빈 | Vienna | Wien | AT | 48.2082 | 16.3738 | 20 | Europe/Vienna |
| salzburg | 잘츠부르크 | Salzburg | Salzburg | AT | 47.8095 | 13.0550 | 15 | Europe/Vienna |
| rome | 로마 | Rome | Roma | IT | 41.9028 | 12.4964 | 20 | Europe/Rome |
| milan | 밀라노 | Milan | Milano | IT | 45.4642 | 9.1900 | 20 | Europe/Rome |
| florence | 피렌체 | Florence | Firenze | IT | 43.7696 | 11.2558 | 12 | Europe/Rome |
| venice | 베네치아 | Venice | Venezia | IT | 45.4408 | 12.3155 | 12 | Europe/Rome |
| naples | 나폴리 | Naples | Napoli | IT | 40.8518 | 14.2681 | 15 | Europe/Rome |
| amsterdam | 암스테르담 | Amsterdam | Amsterdam | NL | 52.3676 | 4.9041 | 15 | Europe/Amsterdam |
| rotterdam | 로테르담 | Rotterdam | Rotterdam | NL | 51.9244 | 4.4777 | 15 | Europe/Amsterdam |
| zurich | 취리히 | Zurich | Zürich | CH | 47.3769 | 8.5417 | 15 | Europe/Zurich |
| geneva | 제네바 | Geneva | Genève | CH | 46.2044 | 6.1432 | 12 | Europe/Zurich |
| lisbon | 리스본 | Lisbon | Lisboa | PT | 38.7223 | -9.1393 | 15 | Europe/Lisbon |
| porto | 포르투 | Porto | Porto | PT | 41.1579 | -8.6291 | 12 | Europe/Lisbon |
| prague | 프라하 | Prague | Praha | CZ | 50.0755 | 14.4378 | 20 | Europe/Prague |
| brussels | 브뤼셀 | Brussels | Bruxelles / Brussel | BE | 50.8503 | 4.3517 | 15 | Europe/Brussels |
| antwerp | 안트베르펜 | Antwerp | Antwerpen | BE | 51.2194 | 4.4025 | 12 | Europe/Brussels |

`COUNTRIES` 등록용 값 (README "새 나라 추가하기" 1단계)

| 국가 | 국가명 ko / en | `wikiLang`(명소 선정) | `currency` | `ticketmaster` | `geocode` | 비고 |
|---|---|---|---|---|---|---|
| GB | 영국 / United Kingdom | en | GBP | ✅ (GB) | 예 | |
| FR | 프랑스 / France | fr | EUR | ✅ (FR) | 예 | |
| ES | 스페인 / Spain | es (바르셀로나·발렌시아는 ca 보조) | EUR | ✅ (ES) | 예 | |
| HU | 헝가리 / Hungary | hu | HUF | ✅ 코드 있음, 재고 적을 것(🟡) | 예 | |
| AT | 오스트리아 / Austria | de | EUR | ✅ (AT) | 예 | |
| IT | 이탈리아 / Italy | it | EUR | ✅ (IT) | 예 | |
| NL | 네덜란드 / Netherlands | nl | EUR | ✅ (NL) | 예 | |
| CH | 스위스 / Switzerland | de (제네바는 fr) | CHF | ✅ (CH) | 예 | 도시별 wikiLang 필요 |
| PT | 포르투갈 / Portugal | pt | EUR | ✅ 코드 있음, 재고 적을 것(🟡) | 예 | |
| CZ | 체코 / Czechia | cs | CZK | ✅ (CZ) | 예 | |
| BE | 벨기에 / Belgium | fr (브뤼셀) / nl (안트베르펜) | EUR | ✅ (BE) | 예 | 도시별 wikiLang 필요 |

---

## 2. 나라별 소스

### 2-1. 프랑스 (파리 · 리옹 · 마르세유 · 니스)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **Que faire à Paris** (opendata.paris.fr, 데이터셋 `que-faire-a-paris-`) | 파리시 공식 행사 달력: 공연·전시·축제·아틀리에(클래스)·산책/투어·어린이. 진행/예정 **3,018건**(2026-11-11), 매일 갱신 | Opendatasoft Explore v2.1, 키 불필요. `records`(1회 100건·offset 합 1만 한도) 또는 `exports/json`(전량) | ✅ `cover_url` + `cover_credit`(대부분 "Mairie de Paris" 또는 주최측) / 데이터 **ODbL** | ODbL: 출처 표기 + DB 재배포 시 동일 라이선스. 좌표 `lat_lon`, 가격 `price_type`, 태그 `qfap_tags` | ✅실호출 | **바로 통합 (키 불필요) — 파리 1순위** |
| **OpenAgenda 공개 이벤트 미러** (public.opendatasoft.com, `evenements-publics-openagenda`) | OpenAgenda에 **오픈 라이선스로 공개된 모든 아젠다**의 이벤트(프랑스 중심 + 제네바·브뤼셀 일부). 진행/예정 37,939건 / 리옹 반경 15km 521건, 니스 120건, 마르세유 532건, 파리 1,812건, 제네바 799건, 브뤼셀 22건. `updatedat` 최신값 2026-11-10 → 매일 동기화 | Opendatasoft v2.1, 키 불필요, `within_distance()` 지오 필터 동작 확인 | ✅ `image`/`thumbnail`/`originalimage`(img.openagenda.com) + `imagecredits` / **Licence Ouverte (Open License v1.0)** | 데이터셋 메타 수정일은 2024로 표기되지만 레코드는 매일 갱신됨. 주최자가 올린 이미지 → `imagecredits` 있으면 표기 | ✅실호출 | **바로 통합 (키 불필요) — 리옹·마르세유·니스·제네바 핵심** |
| OpenAgenda 공식 API v2 (`api.openagenda.com/v2/agendas/{uid}/events`) | 아젠다별 이벤트 (미러에 없는 비공개 라이선스 아젠다 포함 가능) | 무료 계정 → 공개키 `key` 헤더/파라미터. 아젠다 UID 단위 조회, `relative[]=current&relative[]=upcoming` | ✅ 이미지 / 아젠다별 라이선스(대부분 Licence Ouverte) | 레이트 리밋 문서 미확인. 구 JSON export는 2025년 말 종료 | ✅ 공식 문서 (키 없이 403 확인) | **키 받아 통합** (미러로 부족할 때만) |
| **DATAtourisme** — data.gouv.fr 일일 CSV `datatourisme-fma.csv` (Fêtes et manifestations) | 프랑스 전국 관광청(SIT) 이벤트 69,178건, 그중 진행/예정 53,206건. 마르세유 964, 리옹 107, 파리 23, 니스 8 | 키 없이 정적 파일(51MB, 매일 04시경 교체, URL은 날짜 경로라 data.gouv.fr API로 최신 URL 조회) | ❌ CSV엔 이미지 없음 / **Licence Ouverte 2.0** | 컬럼: 이름·카테고리·위경도·주소·`Periodes_regroupees`(`시작<->끝`)·설명·URI | ✅실호출 | **바로 통합 (키 불필요)** — 마르세유·리옹 축제 보강 |
| DATAtourisme API/플럭스 (datatourisme.fr) | 위와 같은 데이터 + 사진·상세 | 무료 계정 → API 키·플럭스 설정, JSON-LD | ✅ 사진(생산자별 권리 표기) / Licence Ouverte 2.0 | 경제부 페이지에 "배포 플랫폼 2027년 폐쇄" 언급(🟡, 공식 일정 확인 필요) | 🟡 | **키 받아 통합** (이미지 필요 시) |
| Paris Musées API (apicollections.parismusees.paris.fr) | 파리 시립미술관 14곳 소장품 (CC0) | 계정 → 토큰, GraphQL | ✅ CC0 작품 이미지 | 전시 일정은 Que faire à Paris에 이미 있음 | 🟡 | 오디오가이드 사진 보강 후보 (낮은 우선순위) |
| Ticketmaster FR | 콘서트·공연 | 기존 키, `countryCode=FR` | ✅ | | ✅ 국가코드 문서 | **키 받아 통합** (이미 있음) |
| Fnac Spectacles, Billetreduc, Sortir à Paris, Time Out Paris | 예매·큐레이션 | 공개 API ❌ | — | | 🟡 | **딥링크만** |
| Lyon/Marseille/Nice 시 포털 (data.grandlyon.com 등) | — | 시 단위 행사 피드 확인 못 함 (Grand Lyon 포털은 ODS 경로 404) | — | | ❓ | OpenAgenda 미러 + DATAtourisme로 대체 |

### 2-2. 스페인 (마드리드 · 바르셀로나 · 발렌시아 · 세비야)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **Madrid — Agenda de eventos culturales y actividades (próximos 100 días)** `datos.madrid.es/egob/catalogo/206974-0-agenda-eventos-culturales-100.json` | 시 주관 공연·전시·강연·어린이·축제 **1,313건**(향후 100일), 좌표 1,228건, `free`, `price`, `dtstart`/`dtend`/`time`, 장소·주소 | 키 불필요, 정적 JSON-LD(2.7MB, 매일) | ❌ 이미지 없음 → `link`(madrid.es) og:image 보강 / 마드리드시 오픈데이터 이용조건(출처 표기) | 문자열에 제어문자가 섞여 있어 파싱 전 정리 필요. 전체 활동판 `300107-0-agenda-actividades-eventos.json`도 있음 | ✅실호출 / 라이선스 문구는 🟡 | **바로 통합 (키 불필요)** |
| **Barcelona — Agenda cultural** (opendata-ajuntament.barcelona.cat, CKAN `agenda-cultural`) | 바르셀로나시 문화 일정 4,526건 중 진행/예정 4,295건, 좌표 대부분, 이미지 1,144건, 분류(콘서트·전시·축제·워크숍 등) | 키 불필요. JSON 리소스 `.../resource/59b9c807-f6c1-4c10-ac51-1ace65485079/download`, 매일 갱신 | ✅ `image_data[].image`(estatics-nasia.dtibcn.cat) / **CC BY 4.0** | **파일이 165MB**(본문 HTML 포함) → 빌드에서 스트리밍 파싱하거나 CSV 리소스 사용 | ✅실호출 | **바로 통합 (키 불필요)** — 1단계에서 "다시 확인" 대상이었음 → 사용 가능 |
| **Generalitat Valenciana — Agenda cultural del IVC** (dadesobertes.gva.es `cul-agc-ivc`) | 발렌시아주 문화원(IVC) 공연·음악·영화·전시. CSV 1,040행 중 진행/예정 172, 그중 València 64 | 키 불필요, CSV(`;` 구분)/JSON/XML, 2026-11-10 갱신 | ❌ 이미지 없음(`web` 링크 og:image) / **CC BY** | 날짜 `dd/mm/yyyy`, `latitud`/`longitud` 있음 | ✅실호출 | **바로 통합 (키 불필요)** — 양은 적음 |
| **Junta de Andalucía — Agenda de eventos** `datos.juntadeandalucia.es/api/v0/schedule/all?format=json` (OpenAPI: `/api/v0/schedule/openapi.json`) | 주정부·기관 행사(문화·도서관·워크숍 포함) 897건, 예정 중 세비야 약 10건 | 키 불필요, JSON/CSV/Atom | ✅ `image[].thumbnail[].image_url`(상대경로, juntadeandalucia.es 접두) / **CC BY 4.0** | 행정 행사 섞임 → 테마 필터 필요 | ✅실호출 | **바로 통합 (키 불필요)** — 세비야 보조 |
| Sevilla / València 시 포털 | — | 시 단위 문화 일정 피드 확인 못 함 (València opendatasoft 도메인 없음, vlci CKAN 검색 0건) | — | | ❓ | Ticketmaster ES + 위 주정부 소스로 대체 |
| datos.gob.es (국가 카탈로그) | 바스크 등 타 지역 "Agenda cultural" 다수 | DCAT API | — | 대상 도시 밖 | ✅실호출 | 탐색용 |
| Ticketmaster ES | 콘서트·공연 | 기존 키 | ✅ | | ✅ | **키 받아 통합** (이미 있음) |
| esmadrid.com, Barcelona Turisme, Visit Valencia, Visita Sevilla, Entradas.com, Atrápalo | 관광 행사·예매 | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-3. 이탈리아 (로마 · 밀라노 · 피렌체 · 베네치아 · 나폴리)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **Comune di Firenze — Eventi a Firenze** (dati.toscana.it `eventi-a-firenze`) | 오늘부터 30일 피렌체 행사(FeelFlorence 공식 일정) **111건**, 좌표, 일정 텍스트, 공식 링크 | 키 불필요, GeoJSON `data.comune.fi.it/datastore/download.php?id=6289&type=99&format=url&file_format=geojson&file_id=23095` (CSV/SHP도 있음), 매일 | ❌ 이미지 없음 → `feelflorence_link` og:image / **CC BY 4.0** | 날짜 `dd/mm/yyyy` | ✅실호출 | **바로 통합 (키 불필요)** |
| MiC(문화부) 이벤트 데이터셋 (구 DBUnico, XML `MiC.xsd`) | 전국 국립 박물관·유적 전시·행사 약 2.5만 건 | 다운로드 경로가 cultura.gov.it "개발자" 섹션에 있다고만 나옴, 최종 갱신일 비어 있음 | ❓ / CC BY 3.0 | | 🟡 페이지 확인, 파일 ❓ | 보류 — 실제 파일 URL·최신성 확인 후 재평가 |
| Roma Capitale 060608 / turismoroma.it | 로마 공식 관광·행사 DB | 2018 입찰 문서에 XML 내보내기 언급뿐, 공개 다운로드 없음 | — | | 🟡 | **딥링크만** (turismoroma.it) |
| dati.comune.milano.it (CKAN) | 밀라노 — 2023 Milano Digital Week 같은 일회성 행사 CSV뿐 | CKAN | CC BY 4.0 | 상시 달력 없음 | ✅실호출(검색) | 사용 안 함 (상시 피드 없음) → 딥링크 yesmilano.it |
| dati.lombardia.it (Socrata) | 소도시 "Eventi" 데이터셋 다수(밀라노 아님) | Socrata | — | | ✅실호출(검색) | 사용 안 함 |
| 베네치아(dati.venezia.it), 나폴리 | — | 행사 데이터셋 확인 못 함 (베네치아 포털은 봇 차단 Incapsula) | — | | ❓ | Ticketmaster IT + 딥링크 (veneziaunica.it 등) |
| Ticketmaster IT | 콘서트·공연 | 기존 키 | ✅ | | ✅ | **키 받아 통합** (이미 있음) |
| TicketOne(CTS Eventim 계열), Vivaticket, Musement | 예매·투어 | 공개 API ❌ / Musement는 **계약 파트너 전용** API | — | | 🟡 | **딥링크만** |

### 2-4. 오스트리아 (빈 · 잘츠부르크)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **Stadt Wien — Adventmärkte & Silvesterstände** (WFS `ogdwien:ADVENTMARKTOGD`) | 빈 크리스마스마켓·연말 부스 16곳(2026 일정 반영), 좌표·기간·운영시간·웹링크 | 키 불필요: `https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:ADVENTMARKTOGD&srsName=EPSG:4326&outputFormat=json` | ❌ / **CC BY 4.0** (Stadt Wien) | 날짜는 `DATUM` 텍스트("13.11. bis 24.12.2026") 파싱 | ✅실호출 | **바로 통합 (키 불필요)** — 계절성 |
| Stadt Wien Veranstaltungsdatenbank (data.gv.at "Veranstaltungen Wien") | 과거 시 행사 DB | **2025-12부터 데이터 제공 중단**, "Wien erleben" 새 시스템용 인터페이스 준비 중(digitales.wien.gv.at Changelog) | — | wien.gv.at 개별 행사 `.json` 페이지는 있으나 문서화 안 된 경로 → 사용 안 함 | ✅ data.gv.at 공지 | **사용 안 함 (현재)** — Changelog 감시 후 재평가 |
| data.gv.at 검색 (Linztermine 등) | 린츠 등 대상 외 도시 | | | | ✅실호출 | 대상 외 |
| Österreich Werbung / Salzburg (salzburg.info, salzburgerland.com) / Feratel·Deskline | 관광 행사 달력 | 공개 오픈데이터 API 확인 못 함 (Feratel은 파트너 전용) | — | | 🟡 | **딥링크만** |
| wien.info (Vienna Tourist Board) | 빈 관광 이벤트 | 공개 API ❌ | — | | 🟡 | **딥링크만** |
| Ticketmaster AT (oeticket 계열) | 콘서트·공연 | 기존 키 | ✅ | | ✅ | **키 받아 통합** (이미 있음) — 잘츠부르크는 사실상 주 소스 |

### 2-5. 영국 (런던 · 맨체스터 · 에든버러 · 리버풀)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| Ticketmaster GB | 콘서트·공연·가족 (영국은 Ticketmaster 핵심 시장) | 기존 키, `countryCode=GB` + `latlong`/`radius` | ✅ | 5,000건/일, 5 req/s, `size*page < 1000` | ✅ 공식 문서 | **키 받아 통합 — 영국 1순위** (이미 있음) |
| **Wellcome Collection Content API** `api.wellcomecollection.org/content/v0/events` | 런던 웰컴 컬렉션 행사(투어·토크·워크숍) | 키 불필요 | ✅ Prismic 이미지 + `copyright` 필드(**CC-BY-NC** 표기가 많음) | NC 이미지 → 상업적 사용 주의, 저작자 표기 필수 | ✅실호출 | **바로 통합 (키 불필요)** — 한 기관이라 양은 적음 |
| **Edinburgh Festivals Listings API** (api.edinburghfestivalcity.com) | 에든버러 축제들(International·Book·Hogmanay·Fringe 등) 공연·이벤트 | 가입 → 키 + 서명. 유형 A(기본, Fringe 제외)/C(앱 개발자, Fringe 포함·사전 승인) | 이벤트 이미지 별도 문서 / 상업 이용 허용, 출처·"비공식 앱" 표기 | **데이터 피드·덤프 재배포 금지**(A·C), 24시간마다 갱신, 티켓 링크는 공식 사이트로만 | ✅ 라이선스 원문 | **키 받아 통합 (조건부)** — 우리 정적 JSON이 "재배포"로 볼 수 있으니 support@ 문의 후 |
| Skiddle API (skiddle.com/api) | 영국 클럽·라이브·축제 | 무료 키 신청 | 🟡 이벤트 이미지 | **비상업 전용**, 상업 이용은 서면 승인(api@skiddle.com). 제휴 수수료가 있는 앱이면 승인 필요 | ✅ 공식 페이지 | **키 받아 통합 (서면 승인 후)** |
| Data Thistle (api.datathistle.com) | 영국 전역 공연·이벤트 최대 DB | 액세스 토큰, 상용 계약 | — / "Not Open" 라이선스 | 가격 비공개 | 🟡 | **사용 안 함** (유료·비공개 라이선스) |
| Culture24 리스팅 API | 영국 박물관·갤러리 전시·행사 | "API로 무료 공유"라고 하나 개발자 문서·현재 운영 여부 확인 못 함 (Art UK는 과거형으로 서술) | ❓ | | 🟡 | 보류 — 문의 후 재평가 |
| London Datastore (data.london.gov.uk) | 런던 데이터셋 | CKAN/DataPress | — | **도시 행사 데이터셋 없음** | 🟡 | 사용 안 함 |
| VisitBritain / Visit London / Visit Manchester | 관광 행사 | 공개 API ❌ | — | | 🟡 | **딥링크만** |
| Eventbrite | 소규모 행사·클래스 | 공개 검색 API 2019-12 종료 | — | | ✅ (1단계) | **사용 안 함** / 딥링크 |
| DICE, Ents24, Resident Advisor, Time Out London, London Theatre Direct | 공연·클럽·극장 | DICE·RA 공개 API ❌, LTD Inventory API는 판매 파트너용 키 | — | | 🟡 | **딥링크만** |
| V&A Collections API (`api.vam.ac.uk/v2`) | V&A 소장품 | 키 불필요 | ✅ 작품 이미지(IIIF) | 전시 일정 아님 | ✅실호출 | 오디오가이드 사진 보강 후보 |

### 2-6. 네덜란드 (암스테르담 · 로테르담)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| Amsterdam Marketing 이벤트/전시 피드 (`open.data.amsterdam.nl/Evenementen.json`, `Tentoonstellingen.json`) | 과거 암스테르담 행사·전시 | **도메인 응답 없음**, 카탈로그 최종 수정 2022-04, 라이선스 "알 수 없음". iamsterdam은 2018 이후 다른 시스템으로 이전 | — | | ✅실호출(실패 확인) | **사용 안 함** (종료) |
| data.overheid.nl | 위트레흐트(허가 데이터), 네이메헌 등 | | | 대상 도시 아님 | ✅실호출(검색) | 대상 외 |
| NDTRC (VVV 전국 관광 DB) | 과거 전국 관광·문화 행사 | 현재 상태·접근 확인 못 함 | — | | ❓ | 보류 |
| Rijksmuseum Linked Open Data (`data.rijksmuseum.nl/search/collection`) | 소장품(Linked Art) | 키 불필요 | ✅ 퍼블릭 도메인 이미지 다수 | 전시 일정 아님 | ✅실호출 | 오디오가이드 보강 후보 |
| Ticketmaster NL | 콘서트·공연 (NL은 강한 시장) | 기존 키 | ✅ | | ✅ | **키 받아 통합 — 네덜란드 1순위** (이미 있음) |
| iamsterdam.com, Uitagenda Rotterdam, Uitkrant, Museumkaart | 도시 행사·박물관 | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-7. 벨기에 (브뤼셀 · 안트베르펜)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **UiTdatabank Search API v3** (publiq) | 플랑드르·브뤼셀(네덜란드어권) 문화·여가 행사 — 안트베르펜 핵심, 브뤼셀 일부 | publiq 플랫폼에서 통합 등록 → 클라이언트 자격증명. 문서 docs.publiq.be(OpenAPI) | ✅ 이미지 / 라이선스·요금 ❓ | 가입 조건·상업 이용 조건 확인 못 함(플랫폼 페이지가 JS 렌더링) | 🟡 | **키 받아 통합** — 안트베르펜 1순위, 조건 확인 필요 |
| agenda.brussels / visit.brussels 오픈데이터 (2017 opendatastore.brussels 공개) | 브뤼셀 연 2만 건 문화 일정 | **opendatastore.brussels 응답 없음**, opendata.brussels.be에는 행사 "장소" 데이터셋만 있음(행사 아님) | — | | ✅실호출(장소만 확인) | **사용 안 함 (현재)** / 딥링크 |
| OpenAgenda 미러 (2-1) | 브뤼셀 반경 15km 진행/예정 22건 | 키 불필요 | ✅ | | ✅실호출 | 보조 (양 적음) |
| Ticketmaster BE | 콘서트·공연 | 기존 키 | ✅ | | ✅ | **키 받아 통합** (이미 있음) |
| visit.brussels, visit.antwerpen.be, brussels.be/agenda | 관광 행사 | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-8. 스위스 (취리히 · 제네바)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **제네바시 아젠다 → OpenAgenda** (opendata.swiss의 "Agenda des …" 데이터셋 10여 개가 모두 openagenda.com 아젠다를 가리킴: Grand Théâtre, MAH, MEG, Victoria Hall, 도서관 등) | 제네바 공연·전시·워크숍 | OpenAgenda 미러로 키 없이(반경 조회 799건) | ✅ / opendata.swiss "BY" | | ✅실호출 | **바로 통합 (키 불필요)** — 2-1 미러 재사용 |
| Zürich Tourismus Open Data API v2 (`www.zuerich.com/en/api/v2/data?id={카테고리}`) | 취리히 지역 **장소(POI)**: 박물관·공연장·투어·식당. 카테고리 목록 `…/api/v2/data`. 이벤트 카테고리(id=75)는 행사장 위주 10건, **날짜 있는 행사 없음** | 키 불필요, schema.org JSON | ✅ 1280px 사진 + 캡션 / 레코드 내 라이선스: "취리히 관광을 홍보하는 편집 목적 사용 허용", opendata.swiss 표기는 CC BY-SA | User-Agent 없으면 HTML 반환 | ✅실호출 | **바로 통합 (보조, POI)** — 오디오가이드 정류장·박물관 정보용, 이벤트 소스 아님 |
| MySwitzerland Open Data API (opendata.myswitzerland.io, 스위스관광청) | 관광 명소·체험·투어(이벤트 포함 여부 ❓) | API 키(무료 등록으로 알려짐), 키 없이 401 | 🟡 | | 🟡 엔드포인트 존재만 확인 | **키 받아 통합 (후보)** — 이벤트 범위 확인 후 |
| Stadt Zürich (data.stadt-zuerich.ch) | — | 행사 달력 데이터셋 없음 | — | | ✅실호출(검색) | 사용 안 함 |
| Basel 박물관 RSS (opendata.swiss) | 바젤 박물관 행사 | RSS | | 대상 도시 아님 | 🟡 | 대상 외 |
| Ticketmaster CH | 콘서트·공연 | 기존 키 | ✅ | | ✅ | **키 받아 통합 — 취리히 1순위** (이미 있음) |
| Ticketcorner, Starticket, zuerich.com 이벤트 달력, geneve.com | 예매·관광 | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-9. 포르투갈 (리스본 · 포르투)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| **Agenda Cultural de Lisboa (AgendaLX)** `https://www.agendalx.pt/wp-json/agendalx/v1/events` | 리스본시 공식 문화 일정: 공연·전시·**가이드투어(visitas guiadas)**·어린이·축제 | 키 불필요, WordPress REST(`per_page`, `page`, 헤더 `X-WP-Total`). User-Agent 필요 | ✅ `featured_media_large` / **CC BY 4.0** (dados.cm-lisboa.pt 데이터셋 표기) | 필드: `StartDate`, `LastDate`, `occurences[]`, `venue`(이름만 → 지오코딩), `categories_name_list`, `price_val`(PHP 직렬화 문자열) | ✅실호출 | **바로 통합 (키 불필요) — 리스본 1순위** |
| 포르투 (agenda-porto.pt, Ágora EM / iPorto) | 포르투 문화 일정 | 공개 API·오픈데이터 확인 못 함 (opendata.porto.digital "agenda" 0건) | — | | 🟡 | **딥링크만** |
| dados.gov.pt / NoCartaz | 국가 카탈로그 / 민간 공연 집계 | NoCartaz는 JSON 출력 언급만 | — | | 🟡 | 보류 |
| Ticketmaster PT | 코드 목록엔 있음 | 기존 키 | ✅ | 실재고 적을 것으로 예상 | ✅ 코드 / ❓ 재고 | **키 받아 통합** (실측 후 유지 여부) |
| BOL, Ticketline, Blueticket, visitlisboa.com, visitporto.travel | 예매·관광 | 공개 API ❌ | — | | 🟡 | **딥링크만** |

### 2-10. 체코 (프라하)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| Golemio (Prague data platform, api.golemio.cz) | 교통·환경 등 도시 데이터 | 무료 가입 → API 키 | — | **문화행사 데이터셋은 확인 못 함** | ✅ 문서 / ❓ 행사 | 사용 안 함 (행사 없음) |
| opendata.praha.eu | 프라하 오픈데이터 카탈로그 | 새 포털(Next.js), CKAN API 경로 응답 안 함 | — | | ❓ | 보류 |
| prague.eu (Prague City Tourism) | 공식 관광 행사 달력 | 공개 API ❌ (행사는 GoOut에도 게시) | — | | 🟡 | **딥링크만** |
| GoOut (goout.net) | 체코 최대 문화 일정·티켓 | 공개 API ❌ (파트너 문서는 판매 약관뿐) | — | | 🟡 | **딥링크만** (제휴 문의 후보: prodej@goout.cz) |
| Ticketmaster CZ | 콘서트·공연 | 기존 키 | ✅ | | ✅ | **키 받아 통합 — 프라하 1순위** (이미 있음) |
| Ticketportal, Kudy z nudy(체코관광청) | 예매·관광 | 공개 API ❌ 확인 | — | | 🟡 | **딥링크만** |

### 2-11. 헝가리 (부다페스트)

| 소스 | 다루는 것 | 접근 | 이미지/라이선스 | 제한·약관 | 검증 | 판정 |
|---|---|---|---|---|---|---|
| 부다페스트시 오픈데이터 | — | "Budapest API" 계획 문서만 있음, 행사 피드 없음 | — | | 🟡 | 사용 안 함 |
| programturizmus.hu, port.hu, Funzine, budapestinfo.hu(BFTK), We Love Budapest | 행사 달력 | 공개 API ❌ | — | | 🟡 | **딥링크만** |
| Interticket / jegy.hu / Tixa | 예매 | 공개 API ❌ | — | | 🟡 | **딥링크만** |
| Ticketmaster HU | 코드 목록엔 있음 | 기존 키 | ✅ | 실재고 적을 것 | ✅ 코드 / ❓ 재고 | **키 받아 통합** (실측 후) |

부다페스트는 **위키백과(hu) 오디오가이드 + Viator/GYG/izi + Ticketmaster 실측 + 딥링크**가 현실적인 최대치다.

---

## 3. 유럽 공통 (모든 도시)

| 소스 | 종류 | 접근 | 이미지 | 검증 | 판정 |
|---|---|---|---|---|---|
| **Ticketmaster Discovery API** | 콘서트·공연·스포츠·가족 | 기존 `TICKETMASTER_API_KEY`. 공식 `countryCode` 목록에 GB·FR·ES·HU·AT·IT·NL·CH·PT·CZ·BE 모두 있음. 5,000건/일, 5 req/s, `size*page<1000` | ✅ | ✅ 공식 문서(국가코드 표) / 🟡 나라별 재고 | **키 받아 통합** (이미 있음) — 29개 도시 × 4페이지면 하루 쿼터 내. HU·PT는 실측 |
| Viator Partner API | 투어·클래스·입장권 | 기존 키 | ✅ | ✅ (1단계) | **키 받아 통합** (이미 있음) — 유럽 커버리지 가장 넓음 |
| GetYourGuide Partner API | 투어·클래스 | 승인 후 토큰 | ✅ | ✅ (1단계) | **키 받아 통합 (승인 후)** |
| izi.TRAVEL | 실제 녹음 오디오가이드 (유럽 박물관·도시 다수) | 키 | ✅ | ✅ (1단계) | **키 받아 통합** |
| Wikipedia / Wikimedia Commons | 오디오가이드 자동 생성 | 키 불필요. 현지 위키 `wikiLang`(표 1) + en/ko | ✅ Commons(표기 필수) | ✅ | **바로 통합** (이미 있음) |
| Tiqets Distributor/Partner API | 박물관·명소 입장권 (유럽 강세) | 제휴 포털 가입 → Content/Availability API, "무료" | ✅ (상품 이미지) | 🟡 공식 프로그램 페이지 | **키 받아 통합 (후보)** — 박물관 전시 입장권 보강 |
| Musement (TUI) Partner API | 투어·입장권 | **계약 체결 후**만 자격증명 | ✅ | ✅ 공식 문서 | **딥링크만** (계약 전) |
| Europeana API | 유럽 문화유산 메타데이터·이미지 | 무료 `wskey` (데모키 `api2demo` 동작 확인) | ✅ 항목별 권리 표기 | ✅실호출 | 오디오가이드 이미지 보강 후보 (이벤트 아님) |
| Fever, Klook, Headout, Airbnb Experiences, GuruWalk, Sandemans, Free Tour | 체험·무료 워킹투어 | 공개 API ❌ / 파트너 전용 | — | 🟡 | **딥링크만** |
| Meetup | 모임·워크숍 | 전체 검색은 Pro/OAuth | — | 🟡 (1단계) | **딥링크만** |
| Eventbrite | | 공개 검색 종료 | — | ✅ (1단계) | **사용 안 함** |
| Songkick / Bandsintown / PredictHQ / SerpApi | | 1단계와 동일 사유 | — | 🟡 | **사용 안 함** |
| Smartify, Bloomberg Connects | 박물관 오디오가이드 앱 | 공개 API ❌ | — | 🟡 | **딥링크만** |

---

## 4. 종류별 요약

| 종류 | 키 없이 | 키로 추가 | 딥링크 |
|---|---|---|---|
| 축제·행사 | Que faire à Paris, OpenAgenda 미러, DATAtourisme CSV, 마드리드, 바르셀로나, IVC, 안달루시아, AgendaLX, 피렌체, 빈 크리스마스마켓 | Ticketmaster, Edinburgh Festivals, UiTdatabank | 각 도시 관광청 |
| 공연 | 위 시 소스(파리·바르셀로나·마드리드·리스본·피렌체·발렌시아) | **Ticketmaster(전 도시)**, Skiddle(영국, 승인 후), UiTdatabank | Fnac, TicketOne, GoOut, Interticket, BOL |
| 전시 | Que faire à Paris, 바르셀로나, 마드리드, AgendaLX, OpenAgenda 미러, Wellcome | Tiqets(입장권) | 각 미술관 |
| 클래스·워크숍 | Que faire à Paris(ateliers), 바르셀로나(tallers), OpenAgenda, Wellcome | Viator, GYG | Meetup, Airbnb |
| 가이드투어 | **AgendaLX(visitas guiadas)**, Que faire à Paris(balades), Wellcome(투어) | Viator, GYG, Tiqets | GuruWalk, Sandemans, Free Tour |
| 오디오가이드 | 위키백과 자동 생성(현지어 위키) + Zürich Tourismus POI·Rijksmuseum·V&A 이미지 보강 | izi.TRAVEL | Smartify |

---

## 5. 통합 우선순위 (정확한 엔드포인트)

모두 2026-11-11 실호출로 확인한 값이다(키 필요 항목 제외). 공통: 요청에 `User-Agent` 헤더를 넣는다(AgendaLX·zuerich.com은 없으면 빈 응답/HTML).

### A. 키 불필요 — 바로 통합

1. **Que faire à Paris** (`sourceKey` 제안: `parisqfap`) → paris
   `GET https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/exports/json?where=date_end>=now()`
   필드: `id`, `title`, `lead_text`, `description`(HTML), `date_start`/`date_end`, `occurrences`, `cover_url`, `cover_credit`, `lat_lon{lat,lon}`, `address_name/street/zipcode`, `qfap_tags`(종류 매핑), `price_type`(gratuit/payant), `url`. 라이선스 ODbL, 출처 "Ville de Paris".
2. **OpenAgenda 공개 미러** (`openagenda`) → lyon, marseille, nice, geneva(+ paris·brussels 보조)
   `GET https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/evenements-publics-openagenda/records?where=lastdate_end>="{오늘}" and within_distance(location_coordinates, geom'POINT({lng} {lat})', {radius}km)&limit=100&offset={n}`
   (1만 건 넘으면 `/exports/json` 같은 where 사용.) 필드: `uid`, `title_fr`(+`title_en` 등 다국어), `description_fr`, `image`, `imagecredits`, `firstdate_begin`, `lastdate_end`, `timings`(JSON 문자열), `location_coordinates`, `location_name`, `location_address`, `keywords_fr`, `canonicalurl`. Licence Ouverte.
3. **Barcelona agenda cultural** (`barcelona`) → barcelona
   `GET https://opendata-ajuntament.barcelona.cat/data/dataset/2767159c-1c98-46b8-a686-2b25b40cb053/resource/59b9c807-f6c1-4c10-ac51-1ace65485079/download` (165MB JSON 배열, 스트리밍 파싱)
   필드: `register_id`, `name`, `body`, `start_date`, `end_date`, `addresses[]`, `geo_epgs_4326_latlon`, `image_data[].image`, `classifications_data[].full_path`(종류 매핑), `tickets_data`. CC BY 4.0.
4. **Madrid agenda 100 días** (`madrid`) → madrid
   `GET https://datos.madrid.es/egob/catalogo/206974-0-agenda-eventos-culturales-100.json` → `@graph[]` (제어문자 제거 후 파싱)
   필드: `id`, `title`, `description`, `dtstart`, `dtend`, `time`, `free`, `price`, `event-location`, `address.area.street-address`, `location.latitude/longitude`, `link`, `@type`(종류). 이미지는 `link`의 og:image.
5. **AgendaLX** (`agendalx`) → lisbon
   `GET https://www.agendalx.pt/wp-json/agendalx/v1/events?per_page=50&page={n}` (총 페이지는 `X-WP-TotalPages`)
   필드: `id`, `title.rendered`, `subject`, `StartDate`, `LastDate`, `occurences[]`, `featured_media_large`, `venue{}.name`, `categories_name_list`, `link`. CC BY 4.0. 좌표 없음 → Nominatim(기존 `geocode`).
6. **DATAtourisme 이벤트 CSV** (`datatourisme`) → marseille, lyon, nice
   최신 URL: `GET https://www.data.gouv.fr/api/1/datasets/datatourisme-la-base-nationale-des-donnees-publiques-dinformation-touristique-en-open-data/` → `resources[]` 중 title `datatourisme-fma.csv`의 `url`
   컬럼: `Nom_du_POI`, `Categories_de_POI`, `Latitude`, `Longitude`, `Code_postal_et_commune`(`우편번호#도시`), `Periodes_regroupees`(`YYYY-MM-DD<->YYYY-MM-DD|…`), `Description`, `Contacts_du_POI`(웹 링크 → og:image), `URI_ID_du_POI`. Licence Ouverte 2.0. 좌표 반경으로 도시 필터.
7. **Eventi a Firenze** (`firenze`) → florence
   `GET https://data.comune.fi.it/datastore/download.php?id=6289&type=99&format=url&file_format=geojson&file_id=23095`
   `features[].properties`: `titolo`, `descrizione`, `data_inizio`/`data_fine`(dd/mm/yyyy), `appuntamenti`, `link`, `feelflorence_link`; 좌표 `geometry.coordinates[0]`. CC BY 4.0.
8. **IVC Agenda cultural** (`ivc`) → valencia
   `GET https://dadesobertes.gva.es/dataset/25cc4d21-e1dd-4d05-b057-dbcc44d4338c/resource/f76b5222-c09f-46cb-8bb0-4fbe377c611d/download/lista-de-actividades-culturales-programadas-por-el-ivc.csv` (`;` 구분)
   컬럼: `titulo_evento`, `tipo_evento`, `fecha_inicio`, `fecha_fin`, `hora`, `municipio`, `lugar_evento`, `direccion`, `precio`, `latitud`, `longitud`, `web`. CC BY.
9. **Wien Adventmärkte** (`wienmarkets`) → vienna (11~12월)
   `GET https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:ADVENTMARKTOGD&srsName=EPSG:4326&outputFormat=json`
   `properties`: `BEZEICHNUNG`, `ADRESSE`, `DATUM`, `OEFFNUNGSZEIT`, `WEBLINK1`, `SILVESTERMARKT`. CC BY 4.0. (베를린·라이프치히 마켓과 같은 `festival` 처리)
10. **Junta de Andalucía agenda** (`andalucia`) → seville
    `GET https://datos.juntadeandalucia.es/api/v0/schedule/all?format=json` (스펙: `/api/v0/schedule/openapi.json`)
    필드: `title`, `description`, `location`, `province`, `coordinates`, `cost`, `image[].thumbnail[].image_url`(상대경로 → `https://www.juntadeandalucia.es` 접두), `themes`. CC BY 4.0. 날짜 필드 구조는 레코드마다 달라 파서에서 확인 필요.
11. **Wellcome Collection events** (`wellcome`) → london
    `GET https://api.wellcomecollection.org/content/v0/events?pageSize=100&sort=times.startDateTime&sortOrder=desc`
    이미지 `image.url` + `image.copyright`(CC-BY-NC 다수 → `posterCredit`에 그대로 표기).

### B. 키 필요 — 이미 있는 키로 확장

12. **Ticketmaster Discovery** — 새 11개국 29개 도시에 `latlong={lat},{lng}&radius={km}&unit=km&countryCode={cc}` 적용. HU·PT·CZ는 첫 실행 건수를 보고 `ticketmaster: true` 유지 여부 결정.
13. **Viator / GetYourGuide / izi.TRAVEL** — 도시 추가만으로 자동 적용(README). 유럽은 투어·클래스 공급이 가장 많은 지역.

### C. 새 키 신청

14. **UiTdatabank Search API** (publiq, `UITDATABANK_CLIENT_ID`) — 안트베르펜·브뤼셀. 요금·상업 이용 조건 먼저 확인.
15. **Edinburgh Festivals Listings API** (`EDFEST_API_KEY` + 서명) — 유형 C 승인 + "데이터 피드 재배포 금지" 조항이 정적 JSON 배포와 충돌하지 않는지 서면 확인 후.
16. Skiddle API (영국, 상업 이용 서면 승인 후) · OpenAgenda 공식 키(미러에 없는 아젠다) · DATAtourisme API 키(이벤트 사진) · MySwitzerland API(이벤트 범위 확인) · Tiqets 제휴(박물관 입장권).

### D. 감시 목록 (재확인)
- Stadt Wien "Wien erleben" 새 인터페이스 공개 여부 — https://digitales.wien.gv.at/changelog/
- MiC 이벤트 XML의 실제 다운로드 URL·최신성 — https://cultura.gov.it/open-data-e-linked-data
- Culture24 리스팅 API 운영 여부, opendata.praha.eu 행사 데이터셋, DATAtourisme 배포 플랫폼 2027 변경 일정

### 받아야 할 키 (사용자 할 일, 1단계 표에 추가분)
| 키 | 발급처 | 비용 |
|---|---|---|
| `UITDATABANK_CLIENT_ID` | platform.publiq.be | ❓ (확인 필요) |
| `EDFEST_API_KEY` / `EDFEST_API_SECRET` | api.edinburghfestivalcity.com (Register, 유형 C 신청) | 무료로 보임(요금 언급 없음) |
| `SKIDDLE_API_KEY` | skiddle.com/api/join.php + api@skiddle.com 상업 승인 | 무료(비상업) |
| `OPENAGENDA_KEY` (선택) | openagenda.com/settings/apiKey | 무료 |
| `DATATOURISME_KEY` (선택) | datatourisme.fr | 무료 |
| `MYSWITZERLAND_API_KEY` (선택) | opendata.myswitzerland.io | 무료로 알려짐(🟡) |
| Tiqets 제휴 (선택) | tiqets.com/partner-program | 무료 |

---

## 6. 판정 집계

본문 표 기준(공통·보조 소스 포함, 같은 소스는 한 번만 셈).

| 판정 | 개수 | 소스 |
|---|---|---|
| 바로 통합 (키 불필요) | 13 | Que faire à Paris, OpenAgenda 미러, DATAtourisme CSV, 마드리드, 바르셀로나, IVC, 안달루시아, 피렌체, 빈 크리스마스마켓, Wellcome, AgendaLX, Zürich Tourismus POI(보조), Wikipedia/Commons |
| 키 받아 통합 | 15 | Ticketmaster(전 국가), Viator, GYG, izi.TRAVEL, OpenAgenda API, DATAtourisme API, Edinburgh Festivals(조건부), Skiddle(승인 후), UiTdatabank, MySwitzerland, Tiqets, Europeana(보강), Paris Musées(보강), Rijksmuseum LOD·V&A(보강, 키 불필요지만 이벤트 아님) |
| 딥링크만 | 약 45곳 | 도시 관광청·예매처(표의 "딥링크만" 행), Musement, Fever, Klook, Airbnb, GuruWalk 등 |
| 사용 안 함 | 11 | Data Thistle, Eventbrite, London Datastore(행사 없음), 빈 구 행사 DB(종료), 암스테르담 피드(종료), agenda.brussels 오픈데이터(현재 불가), Golemio(행사 없음), 밀라노·롬바르디아 포털, 부다페스트 오픈데이터, Stadt Zürich 포털, Songkick/Bandsintown/PredictHQ/SerpApi(1단계 동일) |
| 보류 | 6 | MiC 이벤트 XML, Culture24, NDTRC, opendata.praha.eu, NoCartaz, 리옹 등 시 포털 |

(Rijksmuseum·V&A는 키가 필요 없지만 이벤트 소스가 아니라 이미지 보강용이어서 "키 받아 통합" 줄에 보강용으로 함께 적었다.)

---

## 7. 확인 못 한 것 (다음 조사·구현 시 확인)

- Ticketmaster의 HU·PT·CZ·IT·FR 실제 이벤트 양 (키로 첫 빌드 때 측정)
- UiTdatabank 요금·상업 이용 조건, 정확한 인증 헤더
- Edinburgh Festivals API의 정적 JSON 배포 허용 여부, 이벤트 이미지 권리
- Skiddle 상업 이용 승인 조건, 이벤트 검색 파라미터(GitHub wiki)
- MySwitzerland API에 날짜 있는 이벤트가 있는지
- 마드리드 오픈데이터 이용조건 원문(출처 표기 방식)
- 안달루시아 agenda의 날짜 필드 구조
- OpenAgenda 공식 API 레이트 리밋
- DATAtourisme 배포 플랫폼 2027년 변경(경제부 페이지 언급) 공식 일정
- MiC 이벤트 XML 다운로드 URL, Culture24 API 운영 여부, opendata.praha.eu 행사 데이터셋, NDTRC 현황

---

## 8. 참고 링크
- Que faire à Paris: https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/
- OpenAgenda 미러: https://public.opendatasoft.com/explore/dataset/evenements-publics-openagenda/ · OpenAgenda API: https://developers.openagenda.com/en/
- DATAtourisme: https://www.data.gouv.fr/datasets/datatourisme-la-base-nationale-des-donnees-publiques-dinformation-touristique-en-open-data · https://www.datatourisme.fr/
- Madrid: https://datos.madrid.es/egob/catalogo/206974-0-agenda-eventos-culturales-100.json
- Barcelona: https://opendata-ajuntament.barcelona.cat/data/ca/dataset/agenda-cultural
- IVC: https://dadesobertes.gva.es/dataset/cul-agc-ivc
- Andalucía: https://www.juntadeandalucia.es/datosabiertos/portal/dataset/agenda-de-eventos-organizados-por-la-junta-de-andalucia
- Firenze: https://dati.toscana.it/dataset/eventi-a-firenze
- MiC open data: https://cultura.gov.it/open-data-e-linked-data
- Wien: https://www.data.gv.at/ (데이터셋 "Veranstaltungen Wien" 공지) · https://digitales.wien.gv.at/changelog/
- AgendaLX: https://dados.cm-lisboa.pt/dataset/agenda-cultural-de-lisboa · https://www.agendalx.pt/api/
- Zürich Tourismus: https://www.zuerich.com/en/open-data-version-20
- opendata.swiss 제네바 아젠다: https://opendata.swiss/en/dataset/agenda-des-grand-theatre-de-geneve
- Golemio: https://operator-ict.gitlab.io/golemio/documentation/en/open-data-api/
- publiq / UiTdatabank: https://docs.publiq.be/
- Edinburgh Festivals API: https://api.edinburghfestivalcity.com/licence · https://api.edinburghfestivalcity.com/documentation/events
- Skiddle: https://www.skiddle.com/api/
- Data Thistle: https://api.datathistle.com/
- Culture24: https://www.culture24.org.uk/listings-data
- Wellcome Collection: https://developers.wellcomecollection.org/api/content
- Ticketmaster 국가코드: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- Tiqets API: https://www.tiqets.com/en/partner-program/api-program/
- Musement: https://partner-api.musement.com/api/getting-started/
- Rijksmuseum: https://data.rijksmuseum.nl/docs/api · V&A: https://api.vam.ac.uk/docs · Europeana: https://pro.europeana.eu/page/apis
- Amsterdam(종료 확인): https://dexes.eu/en/dataset/tentoonstellingen/68c22877860edd4ac60fb359
