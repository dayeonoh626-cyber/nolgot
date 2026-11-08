// 다국어 사전. 값은 문자열({var} 치환) 또는 함수(vars => string).
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const REGION_EN = {
  서울: 'Seoul', 경기: 'Gyeonggi', 인천: 'Incheon', 부산: 'Busan', 대구: 'Daegu', 광주: 'Gwangju', 대전: 'Daejeon',
  울산: 'Ulsan', 세종: 'Sejong', 강원: 'Gangwon', 충북: 'Chungbuk', 충남: 'Chungnam', 전북: 'Jeonbuk', 전남: 'Jeonnam',
  경북: 'Gyeongbuk', 경남: 'Gyeongnam', 제주: 'Jeju',
};

export const DICT = {
  ko: {
    'app.name': '놀곳',
    'app.desc': '내 주변에서 이번 주 열리는 축제·공연·전시를 한눈에',
    'lang.switch': 'EN',
    'lang.switchAria': 'Switch to English',
    'sample.badge': '샘플 데이터',

    'tab.browse': '둘러보기', 'tab.calendar': '캘린더', 'tab.saved': '관심', 'tab.settings': '설정',
    'nav.kinds': '카테고리', 'nav.menu': '메뉴',
    'region.aria': '지역 선택',

    'kind.all': '전체', 'kind.festival': '축제·행사', 'kind.performance': '공연', 'kind.exhibition': '전시',
    'kind.workshop': '클래스·워크샵', 'kind.tour': '가이드투어', 'kind.audioguide': '오디오가이드',
    'kind.soon': '준비중',

    'filter.all': '전체 일정', 'filter.weekend': '이번 주말', 'filter.week': '이번 주', 'filter.month': '이번 달', 'filter.free': '무료',
    'sort.aria': '정렬', 'sort.date': '날짜순', 'sort.closing': '마감 임박순', 'sort.distance': '가까운 순',
    'search.placeholder': '이벤트, 장소, 장르 검색',
    'search.aria': '이벤트 검색', 'search.clear': '검색어 지우기',

    'dow': ['일', '월', '화', '수', '목', '금', '토'],
    'cal.month': '{y}년 {m}월',

    'st.ended': '종료', 'st.tomorrow': '내일 시작', 'st.dday': 'D-{n}', 'st.todayEnd': '오늘 마감', 'st.todayStart': '오늘 시작',
    'st.closing': '마감 D-{n}', 'st.live': '진행중',

    'free': '무료',
    'count': v => `${v.n}개`,
    'region.near': '내 주변 {km}km',

    'soon.title': '{label} 준비 중이에요',
    'soon.desc': '곧 원데이 클래스, 가이드투어, 오디오가이드 같은 체험도 예약할 수 있게 확장할 예정이에요.',
    'weekend.title': '이번 주말 어디 갈까?',
    'list.title': '{region} 이벤트',
    'empty.locTitle': '위치 권한이 필요해요', 'empty.locDesc': '상단 지역 버튼에서 ‘내 주변’을 다시 선택해 주세요.',
    'empty.noneTitle': '조건에 맞는 이벤트가 없어요', 'empty.noneDesc': '다른 지역이나 기간을 선택해 보세요.',
    'empty.searchTitle': '‘{q}’ 검색 결과가 없어요', 'empty.searchDesc': '다른 검색어나 지역으로 찾아보세요.',
    'banner.saved': '관심 이벤트', 'banner.more': ' 외 {n}개',
    'save.aria': '관심 저장', 'unsave.aria': '관심 해제',

    'cal.today': '오늘', 'cal.prev': '이전 달', 'cal.next': '다음 달',
    'cal.allIn': '{region} 전체', 'cal.savedOnly': '♥ 관심만',
    'cal.legendEvent': '이벤트', 'cal.legendSaved': '관심 저장',
    'cal.dayAria': '{date} 이벤트 {n}개',
    'cal.emptyTitle': '이 날은 일정이 없어요', 'cal.emptyDesc': '다른 날짜를 눌러보세요.',

    'saved.emptyTitle': '관심 이벤트가 없어요',
    'saved.emptyDesc': '마음에 드는 이벤트의 ♡를 눌러 저장하면 여기에 모이고, 시작 전에 알려드려요.',
    'saved.upcoming': '다가오는 관심 이벤트', 'saved.noUpcoming': '다가오는 일정이 없어요',
    'saved.exportAll': '📅 관심 이벤트 전체를 캘린더로 내보내기', 'saved.past': '지난 이벤트',

    'set.language': '언어', 'set.languageRow': '앱 언어',
    'set.notif': '알림', 'set.notifRow': '관심 이벤트 알림',
    'set.notifNote': '관심 이벤트가 다가오면 앱을 열 때 알림을 보내드려요.',
    'set.notifIos': '아이폰은 Safari에서 ‘홈 화면에 추가’로 설치한 뒤에 알림을 켤 수 있어요 (iOS 16.4 이상).',
    'set.notifUnsupported': '이 브라우저는 알림을 지원하지 않아요. 캘린더에 추가하면 캘린더 알림을 받을 수 있어요.',
    'set.notifDenied': '알림 권한이 차단되어 있어요. 기기 설정에서 허용해 주세요.',
    'set.when': '언제 알려드릴까요?',
    'set.d0': '시작 당일', 'set.d1': '하루 전', 'set.d3': '3일 전', 'set.d7': '일주일 전',
    'set.calNote': '더 확실한 알림이 필요하면 이벤트를 <b>캘린더에 추가</b>하세요. 아래 시간에 맞춰 폰 캘린더가 알려줍니다.',
    'set.alarm': '캘린더 일정 알림',
    'set.aNone': '없음', 'set.a1h': '1시간 전', 'set.a3h': '3시간 전', 'set.a1d': '하루 전', 'set.a2d': '이틀 전',
    'set.app': '앱', 'set.install': '설치 상태',
    'set.installed': '홈 화면 앱으로 실행 중이에요 ✓',
    'set.installIos': 'Safari 공유 버튼 → ‘홈 화면에 추가’로 설치하세요',
    'set.installOther': '브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’',
    'set.data': '데이터', 'set.dataSample': '샘플 데이터 (API 키 연결 전)',
    'set.updated': '업데이트: {at} · {n}',
    'set.reset': '관심 목록 초기화', 'set.resetConfirm': '관심 목록을 모두 지울까요?',

    'detail.close': '닫기', 'detail.days': ' · {n}일간',
    'detail.naver': '네이버지도', 'detail.kakao': '카카오맵', 'detail.away': '여기서 {km}km',
    'detail.feeUnknown': '정보 없음', 'detail.homepage': '홈페이지 / 예매',
    'detail.save': '♡ 관심 저장', 'detail.saved': '♥ 저장됨', 'detail.addCal': '📅 캘린더에 추가',
    'detail.oneDay': '방문할 날 하루만', 'detail.date': '날짜', 'detail.wholePeriod': '전체 기간 ({n}일)',
    'detail.icsIos': ' 아이폰 캘린더', 'detail.icsOther': '기본 캘린더 (.ics)', 'detail.gcal': 'Google 캘린더',
    'detail.share': '공유하기', 'detail.directions': '길찾기', 'detail.source': '출처', 'detail.original': '원문',

    'toast.unsaved': '관심 이벤트에서 뺐어요',
    'toast.savedNotify': '저장했어요 · 시작 전에 알려드릴게요',
    'toast.saved': '저장했어요 · 설정에서 알림을 켤 수 있어요',
    'toast.copied': '링크를 복사했어요',
    'toast.notifUnsupported': '이 브라우저는 알림을 지원하지 않아요',
    'toast.installFirst': '먼저 홈 화면에 앱을 설치해 주세요',
    'toast.notifDenied': '알림 권한이 허용되지 않았어요',
    'toast.notifOn': '알림을 켰어요',
    'toast.noGeo': '위치 기능을 쓸 수 없어요', 'toast.locating': '현재 위치를 확인하는 중…', 'toast.allowGeo': '위치 권한을 허용해 주세요',
    'toast.loadFail': '이벤트를 불러오지 못했어요',

    'notif.todayStart': '오늘 시작 · {title}', 'notif.dday': 'D-{n} · {title}',
    'notif.todayEnd': '오늘 마감 · {title}', 'notif.tomorrowEnd': '내일 마감 · {title}',

    'ics.time': '시간', 'ics.fee': '참가비', 'ics.homepage': '홈페이지', 'ics.view': '놀곳에서 보기',
    'ics.exportName': '놀곳-관심이벤트.ics',

    'region.sheet': '어디에서 놀까요?', 'region.nearBtn': '📍 내 위치 주변', 'region.radius': '반경',

    'install.title': '홈 화면에 앱 설치하기',
    'install.body': 'Safari 하단의 <b>공유 버튼 {share}</b>을 누르고 <b>‘홈 화면에 추가’</b>를 선택하세요. 설치하면 알림도 받을 수 있어요.',
    'install.close': '닫기',
  },

  en: {
    'app.name': 'Nolgot',
    'app.desc': 'Festivals, shows and exhibitions near you this week',
    'lang.switch': '한',
    'lang.switchAria': '한국어로 보기',
    'sample.badge': 'Sample data',

    'tab.browse': 'Explore', 'tab.calendar': 'Calendar', 'tab.saved': 'Saved', 'tab.settings': 'Settings',
    'nav.kinds': 'Categories', 'nav.menu': 'Menu',
    'region.aria': 'Choose region',

    'kind.all': 'All', 'kind.festival': 'Festivals', 'kind.performance': 'Shows', 'kind.exhibition': 'Exhibitions',
    'kind.workshop': 'Classes', 'kind.tour': 'Guided tours', 'kind.audioguide': 'Audio guides',
    'kind.soon': 'Soon',

    'filter.all': 'All dates', 'filter.weekend': 'This weekend', 'filter.week': 'This week', 'filter.month': 'This month', 'filter.free': 'Free',
    'sort.aria': 'Sort', 'sort.date': 'By date', 'sort.closing': 'Ending soon', 'sort.distance': 'Nearest',
    'search.placeholder': 'Search events, places, genres',
    'search.aria': 'Search events', 'search.clear': 'Clear search',

    'dow': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    'cal.month': v => `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][v.m - 1]} ${v.y}`,

    'st.ended': 'Ended', 'st.tomorrow': 'Starts tomorrow', 'st.dday': 'In {n} days', 'st.todayEnd': 'Ends today', 'st.todayStart': 'Starts today',
    'st.closing': v => `Ends in ${plural(v.n, 'day', 'days')}`, 'st.live': 'On now',

    'free': 'Free',
    'count': v => plural(v.n, 'event', 'events'),
    'region.near': 'Near me · {km} km',

    'soon.title': '{label} — coming soon',
    'soon.desc': 'We’re expanding to bookable experiences like one-day classes, guided tours and audio guides.',
    'weekend.title': 'What to do this weekend?',
    'list.title': 'Events in {region}',
    'empty.locTitle': 'Location access needed', 'empty.locDesc': 'Tap the region button at the top and choose “Near me” again.',
    'empty.noneTitle': 'No events match', 'empty.noneDesc': 'Try another region or date range.',
    'empty.searchTitle': 'No results for “{q}”', 'empty.searchDesc': 'Try a different keyword or region.',
    'banner.saved': 'Saved:', 'banner.more': ' +{n} more',
    'save.aria': 'Save', 'unsave.aria': 'Remove from saved',

    'cal.today': 'Today', 'cal.prev': 'Previous month', 'cal.next': 'Next month',
    'cal.allIn': 'All in {region}', 'cal.savedOnly': '♥ Saved only',
    'cal.legendEvent': 'Event', 'cal.legendSaved': 'Saved',
    'cal.dayAria': v => `${v.date}, ${plural(v.n, 'event', 'events')}`,
    'cal.emptyTitle': 'Nothing on this day', 'cal.emptyDesc': 'Tap another date.',

    'saved.emptyTitle': 'No saved events yet',
    'saved.emptyDesc': 'Tap ♡ on an event to save it here — we’ll remind you before it starts.',
    'saved.upcoming': 'Upcoming saved events', 'saved.noUpcoming': 'Nothing coming up',
    'saved.exportAll': '📅 Export all saved events to calendar', 'saved.past': 'Past events',

    'set.language': 'Language', 'set.languageRow': 'App language',
    'set.notif': 'Notifications', 'set.notifRow': 'Saved event reminders',
    'set.notifNote': 'We’ll notify you when you open the app as a saved event gets close.',
    'set.notifIos': 'On iPhone, add the app to your Home Screen from Safari first to enable notifications (iOS 16.4+).',
    'set.notifUnsupported': 'This browser doesn’t support notifications. Add events to your calendar to get calendar alerts.',
    'set.notifDenied': 'Notifications are blocked. Allow them in your device settings.',
    'set.when': 'Remind me',
    'set.d0': 'On the day', 'set.d1': '1 day before', 'set.d3': '3 days before', 'set.d7': '1 week before',
    'set.calNote': 'For reliable reminders, <b>add events to your calendar</b> — your phone will alert you at the time below.',
    'set.alarm': 'Calendar alert',
    'set.aNone': 'None', 'set.a1h': '1 hour before', 'set.a3h': '3 hours before', 'set.a1d': '1 day before', 'set.a2d': '2 days before',
    'set.app': 'App', 'set.install': 'Install',
    'set.installed': 'Running as a Home Screen app ✓',
    'set.installIos': 'In Safari, tap Share → “Add to Home Screen”',
    'set.installOther': 'Use your browser menu → “Install app” or “Add to Home Screen”',
    'set.data': 'Data', 'set.dataSample': 'Sample data (no API key connected yet)',
    'set.updated': 'Updated {at} · {n}',
    'set.reset': 'Clear saved events', 'set.resetConfirm': 'Remove all saved events?',

    'detail.close': 'Close', 'detail.days': v => ` · ${plural(v.n, 'day', 'days')}`,
    'detail.naver': 'Naver Map', 'detail.kakao': 'Kakao Map', 'detail.away': '{km} km away',
    'detail.feeUnknown': 'Not listed', 'detail.homepage': 'Website / tickets',
    'detail.save': '♡ Save', 'detail.saved': '♥ Saved', 'detail.addCal': '📅 Add to calendar',
    'detail.oneDay': 'Just the day I’ll go', 'detail.date': 'Date', 'detail.wholePeriod': v => `Whole run (${plural(v.n, 'day', 'days')})`,
    'detail.icsIos': ' iPhone Calendar', 'detail.icsOther': 'Calendar (.ics)', 'detail.gcal': 'Google Calendar',
    'detail.share': 'Share', 'detail.directions': 'Directions', 'detail.source': 'Source', 'detail.original': 'Original',

    'toast.unsaved': 'Removed from saved',
    'toast.savedNotify': 'Saved · we’ll remind you before it starts',
    'toast.saved': 'Saved · turn on reminders in Settings',
    'toast.copied': 'Link copied',
    'toast.notifUnsupported': 'This browser doesn’t support notifications',
    'toast.installFirst': 'Add the app to your Home Screen first',
    'toast.notifDenied': 'Notification permission wasn’t granted',
    'toast.notifOn': 'Reminders on',
    'toast.noGeo': 'Location isn’t available', 'toast.locating': 'Finding your location…', 'toast.allowGeo': 'Please allow location access',
    'toast.loadFail': 'Couldn’t load events',

    'notif.todayStart': 'Starts today · {title}', 'notif.dday': v => `In ${plural(v.n, 'day', 'days')} · ${v.title}`,
    'notif.todayEnd': 'Ends today · {title}', 'notif.tomorrowEnd': 'Ends tomorrow · {title}',

    'ics.time': 'Time', 'ics.fee': 'Price', 'ics.homepage': 'Website', 'ics.view': 'View in Nolgot',
    'ics.exportName': 'nolgot-saved-events.ics',

    'region.sheet': 'Where to?', 'region.nearBtn': '📍 Near me', 'region.radius': 'Radius',

    'install.title': 'Install the app',
    'install.body': 'Tap the <b>Share button {share}</b> at the bottom of Safari, then <b>“Add to Home Screen”</b>. Installing also lets you get reminders.',
    'install.close': 'Close',
  },
};

let lang = 'ko';
export const getLang = () => lang;
export const setLang = l => { lang = DICT[l] ? l : 'ko'; };

export function t(key, vars = {}) {
  const v = DICT[lang][key] ?? DICT.ko[key];
  if (v == null) { console.warn('i18n missing', key); return key; }
  if (typeof v === 'function') return v(vars);
  if (typeof v !== 'string') return v;
  return v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export const regionLabel = r => (lang === 'en' ? REGION_EN[r] || r : r);
