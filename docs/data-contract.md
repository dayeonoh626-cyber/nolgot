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

## 원칙
- 이미지는 **소스가 제공한 것**(API 이미지, 이벤트 공식 페이지의 og:image, Wikimedia Commons)만. 없으면 `poster` 생략 → 앱은 이미지 없는 단색 텍스트 카드.
- Airbnb·GetYourGuide 웹페이지 스크래핑 금지(약관). 공식 파트너 API 또는 검색 딥링크만.
- 중복 제거: 같은 도시 + 날짜 겹침 + 제목 유사도 높음 + 500m 이내 → 하나로 합치고 이미지가 있는 쪽 우선.
