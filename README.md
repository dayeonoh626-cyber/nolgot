# 놀곳 — 이번 주 어디 놀러 갈까?

지역을 고르면 그 주변에서 열리는 **축제·공연·전시** 정보를 모아 보여주는 웹앱(PWA)입니다.
아이폰 Safari에서 **홈 화면에 추가**하면 일반 앱처럼 설치해서 쓸 수 있어요.

**앱 주소:** https://dayeonoh626-cyber.github.io/nolgot/

## 주요 기능

- **지역 선택:** 시·도 17곳, 또는 현재 위치 반경 5/10/20/50km
- **이벤트 정보:** 이름, 장르, 장소·주소(네이버지도/카카오맵 연결), 시간, 기간, 참가비, 포스터, 소개, 홈페이지
- **이번 주말 추천**, 이번 주/이번 달/무료 필터
- **캘린더 보기:** 날짜별 이벤트 수를 표시하고, 날짜를 누르면 그날 열리는 이벤트를 보여줌
- **관심 저장:** ♡를 눌러 저장. 시작 전이나 마감 직전에 알림
- **폰 캘린더에 추가:** 아이폰 기본 캘린더(.ics)나 Google 캘린더에 일정과 알림을 등록
- **한국어 / English 전환**
- 오프라인 캐시, 다크 모드

## 아이폰에 설치하기

1. Safari로 앱 주소를 엽니다. (크롬이나 인앱 브라우저에서는 설치가 안 될 수 있어요.)
2. 하단의 **공유 버튼**(네모 위에 화살표)을 누릅니다.
3. **‘홈 화면에 추가’**를 누르고 **추가**를 누릅니다.
4. 홈 화면의 ‘놀곳’ 아이콘으로 실행합니다.

안드로이드는 Chrome 메뉴의 **‘앱 설치’** 또는 **‘홈 화면에 추가’**로 설치합니다.

## 알림은 어떻게 오나요? (아이폰 기준)

| 방법 | 조건 | 확실성 |
|---|---|---|
| **캘린더 알림** (이벤트 상세 → 캘린더에 추가) | 없음 | ✅ 가장 확실. 폰 캘린더가 지정한 시간(설정에서 1시간 전~이틀 전)에 알려줌 |
| **앱 알림** (설정 → 관심 이벤트 알림) | 홈 화면에 설치 + iOS 16.4 이상 + 권한 허용 | ⚠️ **앱을 열 때** 다가오는 관심 이벤트를 확인해서 알림을 띄움 |

앱이 꺼져 있을 때 서버가 보내는 푸시 알림은 아직 지원하지 않습니다. 푸시 서버가 따로 필요해서 로드맵에 넣어 두었어요.
꼭 놓치면 안 되는 일정은 **캘린더에 추가**해 두세요.

## 실제 이벤트 데이터 연결하기 (API 키)

키가 없으면 **샘플 데이터**(가상의 이벤트)로 동작하고, 화면 상단에 ‘샘플 데이터’ 표시가 나옵니다.

### 1. 키 발급 (무료)

| 데이터 | 발급처 | 비고 |
|---|---|---|
| 축제·행사 (국문 + 영문) | [공공데이터포털](https://www.data.go.kr)에서 **‘한국관광공사_국문 관광정보 서비스_GW’**(KorService2) 활용신청. 영문 데이터도 받으려면 **‘영문 관광정보 서비스_GW’**(EngService2)도 신청 | 마이페이지 → 인증키에서 **일반 인증키(Decoding)**를 사용. 신청한 서비스들은 같은 키를 씁니다 |
| 공연 (연극·뮤지컬·콘서트 등) | [KOPIS 공연예술통합전산망](https://www.kopis.or.kr) → 오픈API → 인증키 신청 | |

### 2. GitHub에 키 등록

저장소의 **Settings → Secrets and variables → Actions → New repository secret**에서 다음 두 개를 만듭니다.

- `TOUR_API_KEY`: 공공데이터포털 Decoding 키
- `KOPIS_API_KEY`: KOPIS 키

키는 GitHub Actions 서버에서만 쓰이고 앱 코드에는 들어가지 않습니다. 그래서 공개 저장소여도 노출되지 않아요.

### 3. 데이터 갱신

`.github/workflows/deploy.yml`이 **매일 오전 6시(KST)**에 데이터를 새로 받아 배포합니다.
바로 갱신하려면 **Actions → Build data & deploy → Run workflow**를 실행하세요.
데이터 받기에 실패해도 사이트는 이전 데이터나 샘플 데이터로 계속 배포됩니다(Actions에 경고 표시).

## GitHub Pages 배포 설정 (처음 한 번)

1. `dayeonoh626-cyber` 계정으로 `nolgot` 저장소를 만들고 코드를 push합니다.
2. **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿉니다.
3. **Actions** 탭에서 워크플로가 끝나면 https://dayeonoh626-cyber.github.io/nolgot/ 에서 앱이 열립니다.

## 로컬에서 실행

빌드 과정이 없는 정적 사이트입니다.

```bash
node scripts/fetch-events.mjs     # 키가 없으면 샘플 데이터 생성
npx http-server -c-1 .            # http://localhost:8080
node scripts/make-icons.mjs       # 아이콘 PNG를 다시 만들 때
```

실제 데이터로 테스트하려면 이렇게 실행합니다.

```bash
TOUR_API_KEY=... KOPIS_API_KEY=... node scripts/fetch-events.mjs
```

옵션 환경변수:

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DAYS_AHEAD` | 90 | 오늘부터 며칠 뒤까지 수집할지 |
| `ENABLE_EN` | 1 | 영문(EngService2) 수집. `0`이면 끔 |
| `MAX_TOUR_DETAILS` / `MAX_EN_DETAILS` / `MAX_KOPIS_DETAILS` | 250 / 150 / 400 | 하루 상세조회 호출 상한 (트래픽 한도 보호) |
| `PREV_URL` | – | 이전 배포본 주소. 이미 받은 상세정보를 재사용해 API 호출을 아낌 |
| `TOUR_API_BASE` | `https://apis.data.go.kr/B551011/KorService2` | 서비스 주소가 바뀌었을 때 변경 |

## 파일 구조

```
index.html  styles.css  app.js  i18n.js   앱 (빌드 없이 그대로 배포)
sw.js  manifest.webmanifest  icons/       PWA 설치·오프라인
data/events.json                          이벤트 데이터 (Actions가 매일 생성)
scripts/fetch-events.mjs                  TourAPI·KOPIS 수집기
scripts/sample-events.mjs                 샘플 데이터 (한/영)
.github/workflows/deploy.yml              데이터 갱신 + Pages 배포
```

## 데이터 형식 (`data/events.json`)

```jsonc
{
  "meta": { "source": "한국관광공사 TourAPI · KOPIS", "updatedAt": "2026-11-08T21:00:00Z", "counts": { "festival": 120 } },
  "events": [{
    "id": "tour-123456",            // 출처-원본ID (고유)
    "kind": "festival",             // festival | performance | exhibition | workshop | tour | audioguide
    "title": "…", "genre": "축제",
    "region": "서울",               // 시·도 17개 중 하나
    "place": "…", "address": "…", "lat": 37.5, "lng": 127.0,
    "startDate": "2026-11-14", "endDate": "2026-11-16",   // KST 기준
    "time": "10:00~18:00", "fee": "무료", "free": true,
    "poster": "https://…", "overview": "…", "homepage": "https://…", "tel": "…",
    "source": "한국관광공사 TourAPI", "sourceUrl": "https://…",

    // 영문 (있을 때만. 없으면 앱이 국문을 보여줌)
    "titleEn": "…", "genreEn": "Festival", "placeEn": "…", "addressEn": "…",
    "timeEn": "…", "feeEn": "…", "overviewEn": "…",
    "enOnly": false                  // true: 영문 서비스에만 있는 항목 (국문 필드도 영문으로 채워짐)
  }]
}
```

`kind`는 확장을 위한 기준입니다. 데이터에 해당 `kind`가 없으면 앱에 ‘준비중’ 탭으로 표시돼요.

## 로드맵: 에어비앤비 체험처럼 확장하기

워크샵·원데이 클래스·가이드투어·오디오가이드를 **예약 가능한 체험**으로 만들려면, 지금 구조(정적 사이트 + 하루 한 번 데이터 수집)에 **백엔드**를 더해야 합니다.

| 단계 | 기능 | 필요한 것 |
|---|---|---|
| 1. 큐레이션 | 공방·투어 정보를 직접 등록 (`kind: workshop/tour/audioguide`) | 지금 구조 그대로 가능: JSON 추가 또는 구글시트 → Actions 동기화 |
| 2. 계정·동기화 | 로그인, 여러 기기에서 관심 목록 동기화, **진짜 푸시 알림** | 인증 + DB + Web Push 서버 (예: Supabase / Firebase + Cloud Functions) |
| 3. 호스트 | 호스트 프로필, 체험 등록·편집, 일정(회차)·정원 관리 | 호스트 대시보드, 이미지 저장소, 관리자 승인 |
| 4. 예약·결제 | 회차 선택 → 결제 → 확정 알림, 취소·환불 정책 | 결제대행(토스페이먼츠 / 포트원 등), 예약 상태 관리, 정산, 사업자·통신판매업 신고 |
| 5. 신뢰 | 후기·별점, 신고, 문의 메시지 | 리뷰 DB, 운영 정책, 메시징 |
| 6. 오디오가이드 | 위치 기반 오디오 재생, 오프라인 다운로드 | 오디오 호스팅(CDN), 지오펜싱, 서비스워커 캐시 |

1단계는 지금 바로 할 수 있고, 2단계부터는 백엔드가 필요합니다. 앱 쪽 데이터 형식(`kind`, 공통 필드)은 미리 맞춰 두었습니다.

---

## English

**놀곳 (Nolgot)** is an installable web app (PWA) that shows festivals, performances and exhibitions near a chosen region in Korea. It has list and calendar views, saved events with reminders, export to the phone calendar (.ics or Google Calendar), and a Korean/English switch.

- **Install on iPhone:** open https://dayeonoh626-cyber.github.io/nolgot/ in Safari, tap **Share**, then **Add to Home Screen**.
- **Reminders:** calendar alarms (via *Add to calendar*) are the reliable path. In-app notifications need the home-screen install and iOS 16.4 or later, and they fire when the app is opened. There is no server push yet.
- **Data:** a GitHub Actions workflow runs daily at 06:00 KST. It pulls from the Korea Tourism Organization TourAPI (KorService2 + EngService2) and KOPIS, then deploys to GitHub Pages. Add `TOUR_API_KEY` (data.go.kr *Decoding* key) and `KOPIS_API_KEY` as repository secrets. Without keys, the app runs on sample data.
- **Local dev:** run `node scripts/fetch-events.mjs`, then `npx http-server -c-1 .`.
- **Roadmap:** booking for workshops, guided tours and audio guides in the style of Airbnb Experiences. That needs a backend: auth, a database, web push, host tools, payments and reviews.
