# 놀곳 데이터 계약 (v2 — 전 세계)

빌드(GitHub Actions, 매일)가 정적 JSON을 만들고, 앱은 그것만 읽는다. 키는 Secrets에만.

## 파일
- `data/cities.json` — 커버하는 도시 목록
- `data/cities/{cityId}.json` — 도시별 이벤트/체험/오디오투어
- (선택) `data/config.json` — 앱이 라이브 조회에 쓰는 공개 설정 `{ "ticketmasterKey": "..." | null }`

## cities.json
```json
{ "updatedAt": "ISO", "cities": [
  { "id": "seoul", "name": { "ko": "서울", "en": "Seoul" }, "country": "KR",
    "countryName": { "ko": "대한민국", "en": "South Korea" },
    "lat": 37.5665, "lng": 126.978, "radiusKm": 30, "tz": "Asia/Seoul",
    "count": 412, "counts": { "festival": 50, "performance": 200 } }
]}
```
`id`는 소문자 영문 슬러그. 한국 광역도(경기·강원 등)도 하나의 "city" 항목으로 둔다.

## 이벤트 (data/cities/{id}.json → `{ meta, events: [...] }`)
| 필드 | 필수 | 설명 |
|---|---|---|
| id | ✓ | `{source}-{원본id}` 전역 유일 |
| kind | ✓ | `festival` `performance` `exhibition` `workshop` `tour` `audioguide` |
| cityId | ✓ | cities.json id |
| title | ✓ | 원어 제목 |
| titleKo / titleEn | | 번역/영문 제목. 앱: `e[field + Lang] ?? e[field]` |
| genre, place, address, overview, fee, time (+ Ko/En 변형) | | 텍스트 |
| lat, lng | | 숫자 |
| startDate, endDate | ✓ (audioguide·상시 체험은 오늘~+365일) | `YYYY-MM-DD` 현지 날짜 |
| startTime | | `HH:MM` 현지 시각 (있으면) |
| tz | ✓ | IANA 타임존 (도시 tz) |
| poster | | **실제 이미지 URL만** (https). 생성/그라데이션 금지 |
| posterCredit | | 이미지 출처/저작자 표기 문자열 |
| free | | boolean |
| price | | `{ "amount": 35000, "currency": "KRW" }` |
| rating, reviewCount | | 체험 평점 |
| durationMin | | 체험·투어 소요시간 |
| provider | | `Viator` `GetYourGuide` `Ticketmaster` `KOPIS` … |
| bookingUrl | | 예매/예약 링크 (제휴 링크 가능) |
| homepage, tel | | |
| source, sourceUrl | ✓ source | 출처 표기 |
| enOnly | | 한국어 모드에서 숨김 |
| stops | audioguide | 아래 |

### audioguide `stops`
```json
{ "title": "Gyeongbokgung", "titleKo": "경복궁", "lat": 37.5796, "lng": 126.977,
  "text": "...", "textKo": "...", "image": "https://upload.wikimedia.org/...",
  "imageCredit": "Wikimedia Commons / 저작자 / CC BY-SA 4.0",
  "sourceUrl": "https://en.wikipedia.org/wiki/...", "minutes": 4 }
```
앱은 `speechSynthesis`로 언어에 맞는 text를 읽는다(ko-KR / en-US). 텍스트 출처는 위키백과(CC BY-SA 4.0) — 출처·라이선스 표기 필수.

## v2.1 추가 필드 (데이터 에이전트, 하위 호환 — 앱은 무시해도 됨)
| 위치 | 필드 | 설명 |
|---|---|---|
| 이벤트 | `sourceKey` | 소스 식별자 (`tourapi` `kopis` `cultureinfo` `seoul` `destinationone` `koeln` `kulturdaten` `berlinmarkets` `leipzigmarkets` `museumdigital` `hamburgtourismus` `bayerncloud` `visitfrankfurt` `stuttgart` `muenchenxmas` `wikidata`(독일 행사 회차) `openagenda` · 유럽: `parisqfap` `openagenda` `datatourisme` `madrid` `barcelona` `ivc` `andalucia` `firenze` `wienmarkets` `agendalx` `wellcome` · 3단계: `smithsonian` `our415` `nycparks` `chipublib` `chiparks` `nps`(키 필요) `brisbane` `iculture` `twtourism` `lcsd` `urbtix` `doorkeeper` `minato` · 4단계: `torontoevents` `montreal` `tpl` `quicket`(키 필요) · 공통: `ticketmaster` `viator` `getyourguide` `izi` `wikipedia` `places`). 소스 실패 시 이전 데이터 이월에 사용 |
| 이벤트 | `alsoFrom` | 중복 병합된 다른 소스 이름 배열 |
| 이벤트 | `geocoded` | 좌표를 주소 지오코딩(Nominatim)으로 얻었으면 `true` (정확도 낮을 수 있음) |
| 이벤트 | `detail`, `enDetail`, `enSourceId` | 빌드 캐시용 내부 플래그 |
| audioguide | `builtAt`, `distanceKm` | 생성일(30일마다 재생성), 코스 길이 |
| stops | `titleDe`, `textDe`, `sourceUrlKo` | 독일어권 도시(독일·오스트리아, `wikiLang: de`)의 독일어 원문, 한국어 위키 링크 |
| cities.json 각 도시 | `coordCoverage`, `posterCoverage` | 좌표/포스터 보유 비율(%) |
| 도시 파일 `meta` | `cityId` `updatedAt` `tz` `total` `counts` `coordCoverage` `posterCoverage` `source` `sources[]` `warnings[]` | `sources[]` 각 항목: `{key,name,enabled,ok,count,carriedOver,reason,error,licence,url}` |

### v2.2 (유럽 2단계) — 형식 변경 없음
- 새 나라 코드: `GB` `FR` `ES` `HU` `AT` `IT` `NL` `CH` `PT` `CZ` `BE` (cities.json `country`, `countryName` ko/en 포함). 도시 29곳 추가 → 총 56곳.
- `tz`는 도시별 IANA 타임존(`Europe/London` `Europe/Paris` `Europe/Madrid` `Europe/Budapest` `Europe/Vienna` `Europe/Rome` `Europe/Amsterdam` `Europe/Zurich` `Europe/Lisbon` `Europe/Prague` `Europe/Brussels`). `startDate`·`startTime`은 그 타임존의 현지 값.
- `price.currency`는 `EUR` 외에 `GBP` `CHF` `HUF` `CZK`가 올 수 있다(Ticketmaster·Viator).
- `posterCredit`는 소스가 준 저작자·라이선스 문자열 그대로. **Wellcome Collection 이미지는 대부분 `CC-BY-NC`이며 문자열 끝에 `(non-commercial licence)`를 붙인다** — 상업적 화면(광고·유료 기능)에 쓰면 안 됨.
- `title`은 원어(프랑스어·스페인어·카탈루냐어·이탈리아어·포르투갈어 등). 이 소스들은 영문 제목을 주지 않아 `titleEn`은 대부분 없음.
- `meta.sources[]`에는 그 도시에 해당하는 소스만 들어간다(예: 바르셀로나 파일에 마드리드 소스 없음).

빌드 캐시 파일(앱은 읽지 않음): `data/geocache.json`, `data/imagecache.json`, `data/venuecache.json`(장소 사진·장소 사이트 og:image·Commons 저작자), `data/placescache.json`(상설 명소, 도시별 14~18일). `data/events.json`(v1)은 삭제됨.
`data/config.json`은 만들지 않는다(Ticketmaster 키를 클라이언트에 노출하지 않음).

### v2.3 — 상설 명소 · 대표 이미지 종류 (하위 호환)
| 위치 | 필드 | 설명 |
|---|---|---|
| 이벤트 | `permanent` | `true`면 **날짜 있는 행사가 아니라 늘 열려 있는 장소**(박물관·미술관·과학관·수족관·동물원·식물원·관람 가능한 궁전·성, 부족할 때만 대성당·사찰·유적). `startDate`=빌드일(도시 tz), `endDate`=+364일은 형식상 값일 뿐 기간이 아니다. 앱은 상시 항목으로 취급: 종류 탭(`kind: exhibition`)·지도·추천 레일에는 보이고, 날짜 기반 목록("이번 주말", "오늘", 마감 임박 등)에는 넣지 않는다. id `place-{Wikidata QID}`, `sourceKey: places`, `genre` `상설 전시`/`명소` (`genreEn` `Permanent collection`/`Landmark`), `popularity` = Wikidata 사이트링크 수(정렬용), `time`/`timeEn` 상시 운영 문구, `sourceUrl`(위키백과 문서), `sourceUrlKo`(한국어 문서), `placeEn`. 출처 `Wikidata / Wikipedia (CC0 / CC BY-SA)` — overview 텍스트는 위키백과 CC BY-SA 4.0이므로 출처 링크(`sourceUrl`)를 함께 보여 줄 것. 도시당 10~15곳. |
| 이벤트 | `posterKind` | `poster`가 무엇의 사진인지: `event` = 이벤트 자체 이미지(소스 API 이미지·이벤트 페이지 og:image) · `venue` = 행사 장소(또는 상설 명소 자체)의 사진(Wikimedia Commons, 또는 장소 공식 사이트 첫 화면 og:image) · `area` = 장소 사진을 못 찾아 쓴 **근처 명소·동네의 실제 사진**(반경 1km, 없으면 5km; 좌표 없는 행사는 도시 중심). `venue`/`area`는 이벤트 포스터가 아니므로 앱은 "장소 사진"/"주변 사진"처럼 구분해 표시하는 것을 권장. audioguide는 `venue`. |
| 이벤트 | `posterCredit` | `venue`/`area`의 Commons 사진은 `"{문서 제목} — {저작자} / {라이선스} (Wikimedia Commons)"`, 사이트 이미지는 `"{도메인} (og:image)"`. 비자유·NC·ND 파일은 쓰지 않는다. |

대표 이미지 순서(빌드 `venueImages`, 모두 캐시): 소스 이미지 → 이벤트 페이지 og:image → 장소 사진(위키백과 geosearch 300m 안 장소명 일치 문서의 자유 라이선스 사진) → 장소 전용 도메인 첫 화면 og:image → 근처 명소 사진. 그려낸 이미지·플레이스홀더는 쓰지 않는다.

### v2.4 (3단계: 미국 · 호주 · 아시아) — 형식 변경 없음
- 새 나라 코드: `US` `AU` `JP` `TW` `HK` `SG` `TH` `VN` `MY` `PH` `ID` `CN`. 도시 31곳 추가(조사 문서 표 30곳 + 가오슝 `kaohsiung`) → 총 87곳.
- 새 `tz`: `America/New_York` `America/Chicago` `America/Los_Angeles` `Australia/Sydney` `Australia/Melbourne` `Australia/Brisbane` `Australia/Perth` `Australia/Adelaide` `Asia/Tokyo` `Asia/Taipei` `Asia/Hong_Kong` `Asia/Singapore` `Asia/Bangkok` `Asia/Ho_Chi_Minh`(호찌민·하노이) `Asia/Kuala_Lumpur` `Asia/Manila` `Asia/Jakarta` `Asia/Makassar`(발리) `Asia/Shanghai`.
- `price.currency`에 `USD` `AUD` `JPY` `TWD` `HKD` `SGD` `THB` `VND` `MYR` `PHP` `IDR` `CNY`가 올 수 있다(키 소스).
- **`title`은 원어**: 일본어·중국어(번체)·태국어 등. 홍콩 `lcsd`·`urbtix`는 `title`=중문, `titleEn`=영문, `place`=중문 장소명, `placeEn`=영문 장소명. `lcsd`는 `overviewEn`(영문 설명)도 준다. 대만·일본 소스는 영문 제목이 없다.
- 중국(`shanghai` `beijing`)·동남아 8곳·LA·시애틀·보스턴·오스틴·마이애미·뉴올리언스·시드니·멜버른·퍼스·애들레이드·교토는 키 없는 이벤트 피드가 없어 `places`(상설 명소)·`wikipedia`(오디오가이드)와 키 소스만 쓴다. 이벤트가 0건일 수 있다.
- `doorkeeper` 항목: Doorkeeper API 약관상 **이벤트를 보여 줄 때 Doorkeeper 이벤트 페이지(`sourceUrl`) 링크를 반드시 함께 표시**해야 하고 `rel="nofollow"`를 붙이면 안 된다.
- `smithsonian` 항목: 스미소니언 웹 이용약관(개방 라이선스 아님). 출처 표기 + `sourceUrl`(si.edu) 링크백 필수, 상업적 이용 전 확인 필요.
- `nps`는 `NPS_API_KEY`가 있을 때만 켜진다(없으면 `meta.sources[]`에 `enabled:false, reason`).

### v2.5 (4단계: 아메리카 나머지 · 아프리카) — 형식 변경 없음
- 새 나라 코드: `CA` `MX` `BR` `AR` `CL` `CO` `PE` `ZA` `EG` `MA` `KE` `NG` `GH` `TZ` `ET` `SN` `RW`. 도시 23곳 추가(조사 문서 표 25곳 중 과달라하라·아바나 보류) → 총 110곳.
- 새 `tz`: `America/Toronto`(토론토·몬트리올) `America/Vancouver` `America/Mexico_City` `America/Sao_Paulo` `America/Argentina/Buenos_Aires` `America/Santiago` `America/Bogota` `America/Lima` `Africa/Johannesburg` `Africa/Cairo` `Africa/Casablanca` `Africa/Nairobi` `Africa/Lagos` `Africa/Accra` `Africa/Dar_es_Salaam` `Africa/Addis_Ababa` `Africa/Dakar` `Africa/Kigali`.
- `price.currency`에 `CAD` `MXN` `BRL` `ARS` `CLP` `COP` `PEN` `ZAR` `MAD` `GHS`가 올 수 있다(키 소스).
- **`title`은 원어**: 몬트리올 `montreal`은 프랑스어. `places`는 도시 `wikiLang`의 이름을 `title`로 쓰므로 카이로는 아랍어(`ar`), 모로코·다카르·몬트리올은 프랑스어, 중남미는 스페인어·포르투갈어 — 영문 이름은 `titleEn`.
- 키 없는 날짜 있는 이벤트는 **토론토·몬트리올뿐**. 나머지 21곳은 `places`(상설 명소)·`wikipedia`(오디오가이드)와 키 소스(Ticketmaster·Viator·GYG·izi, 남아공 Quicket)만 쓴다.
- `places` 보조(채움) 순위에 **모스크·교회 건물**(Wikidata Q32815·Q16970)이 추가됐다. 박물관·명소가 10곳 미만인 도시에서만, 도시당 최대 5곳(`PLACES_WORSHIP_MAX`). `genre`는 `명소`/`Landmark`.
- `torontoevents`: 포스터는 `https://secure.toronto.ca/c3api_upload/retrieve/festivals_events/{id}` (원본 1~2MB → lazy load 권장). 출처 표기 "Contains information licensed under the Open Government Licence – Toronto".
- `tpl`(토론토 공공도서관): 분류 아이콘·공용 배너는 쓰지 않아 대부분 `posterKind: venue`(분관 사진). `sourceUrl`은 `tpl.bibliocommons.com/events/{id}`(봇 요청엔 202 챌린지, 브라우저는 정상).
- `montreal`: 이미지는 행사 페이지(montreal.ca) og:image(Cloudinary). CC BY 4.0, 출처 "Ville de Montréal".
- `quicket`은 `QUICKET_API_KEY`가 있을 때만 켜진다(없으면 `meta.sources[]`에 `enabled:false, reason`).

## 원칙
- 이미지는 **소스가 제공한 것**(API 이미지, 이벤트 공식 페이지의 og:image, Wikimedia Commons)만. 없으면 `poster` 생략 → 앱은 이미지 없는 단색 텍스트 카드.
- Airbnb·GetYourGuide 웹페이지 스크래핑 금지(약관). 공식 파트너 API 또는 검색 딥링크만.
- 중복 제거: 같은 도시 + 날짜 겹침 + 제목 유사도 높음 + 500m 이내 → 하나로 합치고 이미지가 있는 쪽 우선.
