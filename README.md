# 놀곳 — 이번 주 어디 놀러 갈까?

도시를 고르면 그 주변의 **축제·공연·전시·클래스·가이드투어·오디오가이드**를 모아 보여주는 웹앱(PWA)입니다.
지금은 **6개 대륙 42개 나라 110개 도시**를 지원해요. 한국 17개 시·도, 독일 10개 도시, 유럽 11개국, 미국·호주·일본·대만·홍콩·동남아·중국 31개 도시, 캐나다·중남미·아프리카 23개 도시가 들어 있고, 모든 도시에 항목 10개 이상과 대표 이미지가 있어요.
아이폰 Safari에서 **홈 화면에 추가**하면 일반 앱처럼 설치해서 쓸 수 있어요.

**앱 주소:** https://dayeonoh626-cyber.github.io/nolgot/

## 주요 기능

- **도시 선택·검색:** 전 세계 110개 도시 목록, 지역 검색, 지도에서 고르기, 현재 위치 주변
- **현지 사이트에서 더 찾아보기:** 도시별 공식 행사 달력·도시 매거진·예매처 카드, 다른 곳에서 찾은 행사를 직접 담기
- **이벤트 정보:** 실제 포스터·사진(출처·라이선스 표기), 장르, 장소·주소, 시간, 기간, 참가비, 소개, 예매/예약 링크
- **리스트 · 캘린더 · 지도** 보기, 이번 주말 추천, 기간·무료 필터
- **오디오가이드:** 위키백과 기반으로 도시별 걷기 코스를 자동 생성. 앱이 한국어/영어로 읽어줍니다
- **관심 저장 + 알림**, 폰 캘린더(.ics / Google 캘린더)에 추가
- **한국어 / English**, 오프라인 캐시, 다크 모드

## 아이폰에 설치하기

1. Safari로 앱 주소를 엽니다. (크롬이나 인앱 브라우저에서는 설치가 안 될 수 있어요.)
2. 하단의 **공유 버튼**(네모 위에 화살표) → **‘홈 화면에 추가’** → **추가**.
3. 홈 화면의 ‘놀곳’ 아이콘으로 실행합니다.

안드로이드는 Chrome 메뉴의 **‘앱 설치’** 또는 **‘홈 화면에 추가’**로 설치합니다.

## 알림은 어떻게 오나요? (아이폰 기준)

| 방법 | 조건 | 확실성 |
|---|---|---|
| **캘린더 알림** (이벤트 상세 → 캘린더에 추가) | 없음 | ✅ 가장 확실. 폰 캘린더가 지정한 시간에 알려줌 |
| **앱 알림** (설정 → 관심 이벤트 알림) | 홈 화면에 설치 + iOS 16.4 이상 + 권한 허용 | ⚠️ **앱을 열 때** 다가오는 관심 이벤트를 확인해서 알림 |

앱이 꺼져 있을 때 오는 서버 푸시는 아직 없습니다(로드맵 참고).

## 데이터는 어디서 오나요?

모든 데이터는 **공식 API·공공 오픈데이터**에서 가져옵니다. 이미지는 소스가 제공한 것(API 이미지, 이벤트 공식 페이지의 대표 이미지 `og:image`, Wikimedia Commons)만 쓰고, 생성하거나 다른 사이트에서 무단으로 가져오지 않습니다. 각 이벤트 상세 화면에 출처와 이미지 저작자·라이선스를 표시합니다.

### 키 없이 바로 동작하는 소스

| 지역 | 소스 | 내용 | 라이선스 |
|---|---|---|---|
| 모든 도시 | [Wikipedia / Wikidata / Wikimedia Commons API](https://www.mediawiki.org/wiki/API:Main_page) | 오디오가이드 자동 생성 (명소 선정, 소개문 ko/en/de, 사진) | 텍스트 CC BY-SA 4.0, 사진은 파일별(저작자 표기) |
| 쾰른·뒤셀도르프·라이프치히·드레스덴 | [destination.one Open Data](https://help.destination.one/portal/de/kb/articles/meta-service-features) (NRW·작센 관광청) | 이벤트·가이드투어·크리스마스마켓, 사진·좌표 포함 | 항목별 CC0 / CC BY / CC BY-SA / PD |
| 쾰른 | [Stadt Köln Veranstaltungen](https://www.offenedaten-koeln.de/) | 시 주최 이벤트, 사진·좌표 | Stadt Köln Open Data |
| 베를린 | [kulturdaten.berlin API](https://api-v2.kulturdaten.berlin/api/docs/) | 공연·전시·워크숍·도보투어 (사진은 공식 페이지 og:image로 보강, 주소는 지오코딩) | CC BY 4.0 |
| 베를린 | [berlin.de 거리축제·크리스마스마켓](https://daten.berlin.de/) | 축제 일정 | CC BY 3.0 DE |
| 라이프치히 | [Leipzig Weihnachtsmärkte](https://opendata.leipzig.de/dataset/weihnachtsmarkte-im-stadtgebiet-leipzig-und-umland) | 크리스마스마켓 (데이터가 갱신될 때만) | dl-de/by-2-0 |
| 독일 전역 | [museum-digital](https://global.museum-digital.org/) | 현재·예정 전시 | museum-digital |
| 서울 | 서울 열린데이터광장 (공개 `sample` 키) | 최신 5건만 — **키를 넣으면 전체** | 공공누리 1유형 |
| 파리 | [Que faire à Paris](https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/) (파리시) | 공연·전시·아틀리에·산책투어·축제, 사진·좌표·가격 | ODbL (사진은 행사별 저작자 표기) |
| 파리·리옹·마르세유·니스·제네바·브뤼셀 | [OpenAgenda 공개 미러](https://public.opendatasoft.com/explore/dataset/evenements-publics-openagenda/) | 오픈 라이선스 아젠다의 이벤트, 사진 (파리는 Que faire à Paris와 중복 제거) | Licence Ouverte 1.0 |
| 파리·리옹·마르세유·니스 | [DATAtourisme](https://www.data.gouv.fr/datasets/datatourisme-la-base-nationale-des-donnees-publiques-dinformation-touristique-en-open-data) 일일 CSV | 관광청 축제·공연·투어 (사진은 og:image 보강, 상설 장터 제외) | Licence Ouverte 2.0 |
| 마드리드 | [Madrid Agenda (100일)](https://datos.madrid.es/egob/catalogo/206974-0-agenda-eventos-culturales-100.json) | 시 주관 공연·전시·강좌·투어, 좌표·무료여부 (사진 없음) | 마드리드시 오픈데이터 이용조건 (출처 표기) |
| 바르셀로나 | [Agenda cultural](https://opendata-ajuntament.barcelona.cat/data/ca/dataset/agenda-cultural) | 공연·전시·강좌·투어, 사진·좌표 (165MB 파일을 스트리밍 처리) | CC BY 4.0 |
| 발렌시아 | [IVC Agenda cultural](https://dadesobertes.gva.es/dataset/cul-agc-ivc) | 발렌시아주 문화원 공연·음악·영화 | CC BY 4.0 |
| 세비야 | [Junta de Andalucía Agenda](https://www.juntadeandalucia.es/datosabiertos/portal/dataset/agenda-de-eventos-organizados-por-la-junta-de-andalucia) | 주정부 행사 (양 적음), 사진 | CC BY 4.0 |
| 피렌체 | [Eventi a Firenze](https://dati.toscana.it/dataset/eventi-a-firenze) | 30일 이내 행사(FeelFlorence), 좌표 | CC BY 4.0 |
| 빈 | [Adventmärkte & Silvesterstände](https://www.data.gv.at/) (Stadt Wien WFS) | 크리스마스마켓·연말 부스 (11~12월) | CC BY 4.0 |
| 리스본 | [AgendaLX](https://dados.cm-lisboa.pt/dataset/agenda-cultural-de-lisboa) | 공연·전시·가이드투어, 사진 (장소는 지오코딩) | CC BY 4.0 |
| 런던 | [Wellcome Collection Content API](https://developers.wellcomecollection.org/api/content) | 웰컴 컬렉션 투어·토크·워크숍·전시, 사진 | 사진은 항목별 표기 — **대부분 CC BY-NC(비상업)**, `posterCredit`에 그대로 표기 |

유럽에서 **공식 오픈 이벤트 피드가 없는 도시**(맨체스터·에든버러·리버풀·부다페스트·잘츠부르크·로마·밀라노·베네치아·나폴리·암스테르담·로테르담·취리히·포르투·프라하·안트베르펜, 그리고 런던 전체)는 `TICKETMASTER_API_KEY` + Viator/GYG/izi + 위키백과 오디오가이드로 채웁니다. 키가 없으면 이 도시들은 **오디오가이드만** 나옵니다. 자세한 조사는 [docs/sources-research-europe.md](docs/sources-research-europe.md).

### API 키를 넣으면 늘어나는 소스 (모두 무료 또는 제휴)

| Secret 이름 | 소스 | 늘어나는 것 | 발급 방법 |
|---|---|---|---|
| `TOUR_API_KEY` | 한국관광공사 TourAPI (KorService2 + EngService2) | 전국 축제·행사 (국문+영문), 사진·좌표 | [공공데이터포털](https://www.data.go.kr)에서 ‘한국관광공사_국문 관광정보 서비스_GW’, ‘영문 관광정보 서비스_GW’ 활용신청 → 마이페이지의 **일반 인증키(Decoding)** |
| (같은 키) | 한국문화정보원 한눈에보는문화정보 (`cultureinfo/period2`) | **전국 전시·공연** (썸네일·좌표) | 공공데이터포털에서 ‘한국문화정보원_한눈에보는문화정보조회서비스’도 활용신청 (키가 다르면 `CULTURE_API_KEY`) |
| `KOPIS_API_KEY` | KOPIS 공연예술통합전산망 | 전국 공연 (포스터, 공연장 좌표) | [kopis.or.kr](https://www.kopis.or.kr) → 오픈API → 인증키 신청 |
| `SEOUL_API_KEY` | 서울 열린데이터광장 culturalEventInfo | 서울 공연·전시·축제·교육 전체 (포스터·좌표) | [data.seoul.go.kr](https://data.seoul.go.kr) 회원가입 → 인증키 신청 |
| `TICKETMASTER_API_KEY` | Ticketmaster Discovery API | **독일·유럽 전 도시** 콘서트·공연·가족 이벤트 (이미지) — 뮌헨·함부르크·프랑크푸르트·슈투트가르트·뉘른베르크, 그리고 위 '피드 없는 유럽 도시'는 이 키가 있어야 이벤트가 충분해요. 유럽은 나라 코드(`countryCode`)로도 걸러 국경 너머 이벤트를 뺍니다 | [developer.ticketmaster.com](https://developer.ticketmaster.com) 가입 → 앱 생성 → Consumer Key |
| `VIATOR_API_KEY` | Viator Partner API (Basic Access) | **클래스·가이드투어** (사진·평점·가격·예약링크, 제휴 수수료) | [Viator Partner](https://partnerresources.viator.com/) 제휴 가입 → 대시보드의 API key |
| `GYG_API_KEY` | GetYourGuide Partner API | 클래스·가이드투어 | [partner.getyourguide.com](https://partner.getyourguide.com/) 파트너 승인 필요 |
| `IZI_API_KEY` | izi.TRAVEL | 무료 오디오가이드 | [api-docs.izi.travel](https://api-docs.izi.travel) 에서 키 요청 |

키는 GitHub Actions 서버에서만 쓰이고 앱 코드에는 들어가지 않습니다. 등록: 저장소 **Settings → Secrets and variables → Actions → New repository secret**.

### 유럽: 나중에 키를 받으면 추가할 소스 (아직 통합 안 함)

아래 소스는 키 발급과 **이용 조건 확인**이 먼저라서 코드에 넣지 않았습니다. 키를 받으면 순서대로:
1. 저장소 Secret에 키를 등록하고 `.github/workflows/deploy.yml`의 `Build event data` 단계 `env:`에 `이름: ${{ secrets.이름 }}` 한 줄을 추가합니다.
2. 해당 나라 모듈(`scripts/sources/be.mjs`, `gb.mjs`)에 함수를 하나 만들고 `SOURCES` 배열에 `{ key, name, fn, cities: [...], licence, url }`로 등록합니다. 함수 안에서 `process.env.이름`이 없으면 `return []`로 끝내면 키 없는 빌드도 그대로 동작합니다. 이벤트 형식은 `fr.mjs`의 `qfap()`을 참고하세요.

| Secret 이름 | 소스 | 도시 | 발급·확인할 것 |
|---|---|---|---|
| `UITDATABANK_CLIENT_ID` (+ `UITDATABANK_CLIENT_SECRET`) | publiq **UiTdatabank Search API v3** | **안트베르펜**(핵심)·브뤼셀(네덜란드어권) | [platform.publiq.be](https://platform.publiq.be)에서 통합(integration) 등록 → 클라이언트 자격증명. 요금·상업 이용 조건과 인증 헤더는 [docs.publiq.be](https://docs.publiq.be/)에서 확인 |
| `EDFEST_API_KEY` + `EDFEST_API_SECRET` | **Edinburgh Festivals Listings API** | 에든버러 (International·Fringe·Book·Hogmanay 등) | [api.edinburghfestivalcity.com](https://api.edinburghfestivalcity.com) 가입 → 유형 C(앱, Fringe 포함) 신청. 요청마다 서명(signature) 필요. **'데이터 피드 재배포 금지' 조항**이 있어 정적 JSON 배포가 괜찮은지 support@에 서면으로 먼저 확인 |
| `SKIDDLE_API_KEY` | **Skiddle API** | 영국 (클럽·라이브·축제) | [skiddle.com/api](https://www.skiddle.com/api/) 무료 키는 **비상업 전용** — 제휴 수수료가 있는 앱이면 api@skiddle.com 서면 승인 필요 |

그 밖의 선택 키 후보(무료 등록): `OPENAGENDA_KEY`(미러에 없는 아젠다), `DATATOURISME_KEY`(프랑스 이벤트 사진), `MYSWITZERLAND_API_KEY`, Tiqets 제휴(박물관 입장권). 근거와 조건은 [docs/sources-research-europe.md](docs/sources-research-europe.md) 5장.

### 왜 에어비앤비·GetYourGuide 페이지를 긁어오지 않나요?

Airbnb와 GetYourGuide는 이용약관에서 자동 수집(스크래핑)을 금지하고, 상품 사진·설명은 각 호스트와 회사의 저작물입니다. 긁어 쓰면 차단되거나 법적 문제가 생길 수 있어요. 그래서
- **Viator·GetYourGuide**는 공식 **파트너 API**로 받습니다(사진·가격 사용이 허락되고, 예약이 일어나면 수수료도 받습니다).
- **Airbnb**는 공개 API가 없어서, 앱에서 해당 도시의 **Airbnb 체험 검색 페이지로 바로 가는 링크**만 제공합니다.

## 매일 자동 갱신

`.github/workflows/deploy.yml`이 **매일 오전 6시(KST)**에 데이터를 새로 만들어 GitHub Pages에 배포합니다.
- 소스 하나가 실패하면 그 소스의 **이전 데이터를 그대로 이어서** 씁니다(화면이 비지 않음).
- 지오코딩·`og:image` 결과와 오디오가이드는 캐시해서(오디오가이드는 30일) 매일 호출량이 거의 늘지 않습니다.
- 바로 갱신: **Actions → Build data & deploy → Run workflow** (오디오가이드를 새로 만들려면 `rebuild_tours` 체크).
- 일부 나라만 다시 만들기: Run workflow의 `countries`에 `FR,ES`처럼 입력 (= 환경변수 `BUILD_COUNTRIES`). 나머지 도시는 저장소에 커밋된 데이터를 그대로 배포하고, `cities.json`에는 모든 도시가 남습니다.

### 빌드 시간 (목표: 전체 20분 이내)

도시가 56곳으로 늘어도 시간이 일정하게 유지되도록 다음을 지킵니다.
- **나라 모듈과 공통 소스를 동시에** 실행(호스트가 다르므로). 호스트별 요청 간격은 `scripts/lib/util.mjs`의 `hostGap`이 지킵니다.
- **소스별 상한**: 파리 Que faire à Paris 1500건, OpenAgenda 도시당 500건, 바르셀로나 1500건, DATAtourisme 도시당 400건, AgendaLX 30페이지 (환경변수로 조절).
- **큰 파일은 스트리밍**: 바르셀로나(165MB JSON)와 DATAtourisme(50MB CSV)는 메모리에 통째로 올리지 않고 한 건씩 읽습니다(새 의존성 없음, `scripts/lib/stream.mjs`).
- **캐시**: `og:image`(30일)·지오코딩(무기한) 결과는 `data/*cache.json`, 오디오가이드는 30~36일(도시별로 날짜를 흩어 같은 날 몰리지 않게) 재사용.
- **오디오가이드는 점진 생성**: 한 번에 새로 만드는 도시는 `WIKI_BUILD_MAX`(기본 20)곳까지. 나머지는 다음 실행에 만듭니다.

### GitHub Pages 설정 (처음 한 번)

1. `dayeonoh626-cyber` 계정으로 `nolgot` 저장소를 만들고 push합니다.
2. **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로.
3. Actions가 끝나면 https://dayeonoh626-cyber.github.io/nolgot/ 에서 열립니다.

## 로컬에서 실행

```bash
node scripts/build-data.mjs              # 데이터 생성 (키 없으면 키 없는 소스만)
npx http-server -c-1 .                   # http://localhost:8080
ONLY=seoul,berlin node scripts/build-data.mjs   # 일부 도시만 (디버그)
BUILD_COUNTRIES=FR,ES,IT node scripts/build-data.mjs   # 일부 나라만 (다른 도시 파일은 건드리지 않음)
```

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `DAYS_AHEAD` | 120 | 오늘부터 며칠 뒤까지 수집 |
| `BUILD_COUNTRIES` | – | 일부 나라만 빌드 (예: `GB,FR`). `ONLY`와 함께 쓸 수 있음 |
| `OG_MAX` / `OG_CONCURRENCY` | 500 / 8 | 실행당 `og:image` 확인 페이지 수 상한 (도시별로 번갈아 배분) / 동시 요청 수 |
| `GEOCODE_MAX` | 200 | 실행당 Nominatim 지오코딩 상한 (1초에 1건, 결과는 `data/geocache.json`에 캐시) |
| `WIKI_BUILD_MAX` / `WIKI_CONCURRENCY` | 20 / 3 | 한 번에 새로 만드는 오디오가이드 도시 수 / 동시 도시 수 |
| `COUNTRY_CONCURRENCY` | 4 | 동시에 도는 나라 모듈 수 |
| `QFAP_MAX` / `OA_MAX` / `BCN_MAX` / `DT_MAX` | 1500 / 500 / 1500 / 400 | 파리 / OpenAgenda(도시당) / 바르셀로나 / DATAtourisme(도시당) 상한 |
| `LX_MAX_PAGES` / `WC_MAX_PAGES` | 30 / 4 | AgendaLX(50건/페이지) / Wellcome(100건/페이지) 페이지 상한 |
| `PREV_BASE_URL` | – | 이전 배포본 `data/cities/` 주소. 상세정보·오디오가이드 재사용 |
| `REBUILD_TOURS` | 0 | `1`이면 오디오가이드 강제 재생성 |
| `TOUR_REBUILD_DAYS` | 30 | 오디오가이드 재생성 주기 |
| `MAX_TOUR_DETAILS` / `MAX_EN_DETAILS` / `MAX_KOPIS_DETAILS` | 250 / 150 / 400 | 한국 API 상세조회 상한 |
| `KD_DAYS` / `KD_MAX_ATTRACTIONS` | 21 / 500 | kulturdaten.berlin 수집 기간·건수 |
| `TM_MAX_PAGES` / `VIATOR_MAX` / `GYG_MAX` | 4 / 40 / 40 | 상용 API 호출 상한 |

## 새 나라 추가하기

1. `scripts/cities.mjs`의 `COUNTRIES`에 나라를 추가합니다 (`wikiLang`: 명소 선정에 쓸 현지 위키백과, `currency`, `ticketmaster`: 지원 시장이면 `true` 또는 나라 코드 문자열(`'FR'` → `countryCode`로도 거름), `geocode`: 주소 지오코딩 여부).
2. 같은 파일의 `CITIES`에 도시를 추가합니다 (id, 이름 ko/en, 좌표, 반경, 타임존, `local` 현지 도시명, 필요하면 도시별 `wikiLang` — 예: 제네바 `fr`, 안트베르펜 `nl`).
3. **여기까지만 해도** 오디오가이드(위키백과)·Ticketmaster·Viator·GetYourGuide·izi.TRAVEL·`og:image` 보강이 자동으로 붙습니다.
4. 그 나라만의 공식 오픈데이터가 있으면 `scripts/sources/{국가코드}.mjs`를 만들고(`fr.mjs`, `es.mjs` 참고: `SOURCES` 배열 + `fetchCountry(cities, ctx)` → `runSources(...)` → `{ events, status }`), `COUNTRIES[cc].module`에 등록합니다. 소스에 `cities: ['paris']`를 주면 그 도시 파일의 `meta.sources`에만 기록됩니다.

도시가 늘어도 실행 시간이 일정하게 유지되도록 소스별 호출 상한, 호스트별 속도 제한, 캐시가 들어 있습니다.

## 파일 구조

```
index.html styles.css app.js i18n.js      앱 (빌드 없이 그대로 배포)
sw.js manifest.webmanifest icons/         PWA 설치·오프라인
data/cities.json                          도시 목록 + 도시별 건수
data/cities/{cityId}.json                 도시별 이벤트 (Actions가 매일 생성)
data/geocache.json data/imagecache.json   지오코딩·og:image 캐시
scripts/build-data.mjs                    데이터 빌드 진입점
scripts/cities.mjs                        나라·도시 등록부
scripts/sources/kr.mjs de.mjs             나라별 소스 모듈 (1단계)
scripts/sources/fr es it at pt gb ch be   유럽 나라별 소스 모듈 (2단계; HU·NL·CZ는 공통 소스만)
scripts/sources/openagenda.mjs            OpenAgenda 공개 미러 (fr·ch·be 공용)
scripts/sources/generic.mjs               Ticketmaster·Viator·GYG·izi (모든 도시)
scripts/sources/wikipedia-tours.mjs       오디오가이드 생성기 (모든 도시)
scripts/lib/                              HTTP·캐시·중복제거·보강·스트리밍 파서·소스 실행기
docs/data-contract.md                     데이터 형식 명세
.github/workflows/deploy.yml              매일 데이터 갱신 + Pages 배포
```

데이터 형식은 [docs/data-contract.md](docs/data-contract.md)에 있습니다.

## 로드맵: 에어비앤비 체험처럼 확장하기

| 단계 | 기능 | 필요한 것 |
|---|---|---|
| 1. 큐레이션 | 공방·투어 직접 등록 | 지금 구조로 가능 (JSON 추가 → Actions) |
| 2. 계정·동기화 | 로그인, 기기 간 관심 목록 동기화, **진짜 푸시 알림** | 인증 + DB + Web Push 서버 (예: Supabase / Firebase) |
| 3. 호스트 | 호스트 프로필, 체험 등록·편집, 회차·정원 관리 | 호스트 대시보드, 이미지 저장소, 승인 절차 |
| 4. 예약·결제 | 회차 선택 → 결제 → 확정 알림, 취소·환불 | 결제대행(토스페이먼츠 / 포트원 / Stripe), 정산, 사업자 신고 |
| 5. 신뢰 | 후기·별점, 신고, 메시지 | 리뷰 DB, 운영 정책 |
| 6. 오디오가이드 | 위치 기반 자동 재생, 오프라인 다운로드, 녹음 음성 | 오디오 호스팅(CDN), 지오펜싱 |

나라 확장: ~~한국·독일~~ → ~~유럽~~ → ~~미국·호주·아시아~~ → ~~미주·아프리카~~ 완료. 이제는 키(Ticketmaster 등)를 받아 이벤트 수를 늘리는 단계예요.

---

## English

**놀곳 (Nolgot)** is an installable web app (PWA) for festivals, performances, exhibitions, classes, guided tours and audio guides in **110 cities in 42 countries on six continents** (Korea, Germany, 11 more European countries, the US, Australia, East and Southeast Asia, Canada, Latin America and Africa), every city with at least 10 items and a representative image for each, with list, calendar and map views, saved events with reminders, calendar export (.ics / Google) and a Korean/English UI.

- **Install on iPhone:** open https://dayeonoh626-cyber.github.io/nolgot/ in Safari → **Share** → **Add to Home Screen**.
- **Data:** a GitHub Actions workflow (daily, 06:00 KST) runs `scripts/build-data.mjs` and deploys to GitHub Pages. Without any keys it uses keyless official open data: Wikipedia-generated audio guides for every city; destination.one open data for Cologne, Düsseldorf, Leipzig and Dresden; the Cologne city events feed; kulturdaten.berlin; berlin.de festival and Christmas-market lists; museum-digital exhibitions; and five Seoul events through the public sample key.
- **Europe (keyless):** Que faire à Paris (ODbL), the OpenAgenda open-licence mirror (Paris, Lyon, Marseille, Nice, Geneva, Brussels), DATAtourisme daily CSV (French cities), Madrid 100-day agenda, Barcelona agenda cultural (165 MB, stream-parsed), IVC València, Junta de Andalucía (Seville), Eventi a Firenze, Vienna Christmas markets (WFS), AgendaLX Lisbon and Wellcome Collection (London; images are mostly CC BY-NC and credited as such). Cities without an open events feed rely on Ticketmaster + Viator/GYG/izi + Wikipedia audio guides.
- **Optional secrets:**
  - Korea: `TOUR_API_KEY` (also unlocks the KCISA exhibition/performance service), `KOPIS_API_KEY`, `SEOUL_API_KEY`.
  - Germany & Europe: `TICKETMASTER_API_KEY` (strongly recommended; the only event source for Manchester, Edinburgh, Liverpool, Budapest, Salzburg, Rome, Milan, Venice, Naples, Amsterdam, Rotterdam, Zurich, Porto, Prague and Antwerp).
  - Not integrated yet (terms to confirm first): `UITDATABANK_CLIENT_ID` (Antwerp/Brussels), `EDFEST_API_KEY`/`EDFEST_API_SECRET` (Edinburgh festivals), `SKIDDLE_API_KEY` (UK). See the Korean section above for how to add them.
  - Experiences: `VIATOR_API_KEY`, `GYG_API_KEY`, `IZI_API_KEY`.
- **Images** are only real images the sources provide: API images, the event page's own `og:image`, and Wikimedia Commons with attribution. Nothing is generated.
- **No scraping of Airbnb or GetYourGuide:** both forbid it in their terms. Experiences come from the official Viator and GetYourGuide partner APIs, and Airbnb is a search deep link in the app.
- **Add a country:** add it to `COUNTRIES` and its cities to `CITIES` in `scripts/cities.mjs`. Generic sources apply automatically. Optionally add `scripts/sources/{cc}.mjs` and register it.
- **Local dev:** `node scripts/build-data.mjs && npx http-server -c-1 .` — rebuild only some countries with `BUILD_COUNTRIES=FR,ES node scripts/build-data.mjs` (other city files are left untouched and `data/cities.json` keeps every city).
