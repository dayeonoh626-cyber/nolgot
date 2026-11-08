// API 키를 연결하기 전 화면 확인용 샘플 데이터 (가상의 이벤트).
// 날짜는 실행일 기준 상대값이라 언제 돌려도 '이번 주' 데이터가 생긴다.
// [제목, kind, 장르, 지역, 장소, 주소, lat, lng, 시작(오늘+n일), 기간(일), 시간, 참가비, 소개]
const T = [
  ['한강 야간 책시장', 'festival', '마켓', '서울', '반포한강공원', '서울특별시 서초구 신반포로11길 40', 37.5103, 126.9957, -2, 10, '18:00~22:00', '무료', '강변에서 열리는 헌책·독립출판 야시장. 작가 사인회와 버스킹이 함께해요.'],
  ['성수 크래프트 맥주 페스타', 'festival', '푸드', '서울', '성수동 문화공터', '서울특별시 성동구 성수이로 20', 37.5446, 127.0557, 3, 3, '14:00~21:00', '입장 무료 · 시음권 15,000원', '국내 소규모 브루어리 30곳이 참여하는 맥주 축제.'],
  ['겨울빛 정원 일루미네이션', 'festival', '빛축제', '서울', '서울식물원', '서울특별시 강서구 마곡동로 161', 37.5694, 126.8350, -10, 60, '17:30~22:00', '5,000원', '정원 곳곳을 수놓은 조명 산책길.'],
  ['재즈 인 더 가든', 'performance', '재즈', '서울', '올림픽공원 88잔디마당', '서울특별시 송파구 올림픽로 424', 37.5207, 127.1215, 5, 2, '16:00~20:30', 'R석 99,000원 · S석 77,000원', '야외 잔디밭에서 즐기는 재즈 페스티벌.'],
  ['연극 〈오래된 편지〉', 'performance', '연극', '서울', '대학로 소극장 별빛', '서울특별시 종로구 대학로12길 31', 37.5822, 127.0021, -5, 40, '평일 19:30 / 주말 15:00, 18:00', '35,000원', '30년 만에 도착한 편지를 둘러싼 가족 이야기.'],
  ['뮤지컬 갈라 콘서트 〈한여름 밤〉', 'performance', '뮤지컬', '서울', '세종문화회관 대극장', '서울특별시 종로구 세종대로 175', 37.5725, 126.9759, 9, 1, '19:30', 'VIP 130,000원 · R 110,000원', '인기 뮤지컬 넘버를 한 무대에서.'],
  ['빛과 그림자: 미디어아트전', 'exhibition', '미디어아트', '서울', '동대문디자인플라자 전시1관', '서울특별시 중구 을지로 281', 37.5665, 127.0092, -20, 80, '10:00~20:00 (월 휴관)', '성인 18,000원', '몰입형 미디어아트 12개 작품.'],
  ['젊은 사진가 7인전', 'exhibition', '사진', '서울', '서촌 갤러리 온', '서울특별시 종로구 자하문로 50', 37.5800, 126.9706, 0, 21, '11:00~19:00', '무료', '도시의 일상을 기록한 신진 작가 7인의 사진전.'],
  ['도자기 물레 원데이 클래스', 'workshop', '공예', '서울', '연남 공방 흙', '서울특별시 마포구 동교로 240', 37.5617, 126.9246, 2, 1, '14:00~16:30', '65,000원 (재료비 포함)', '물레로 나만의 머그컵 만들기. 2주 후 소성 완료 작품 수령.'],
  ['수원 화성 달빛 걷기', 'festival', '야행', '경기', '수원화성 장안문 일대', '경기도 수원시 장안구 정조로 910', 37.2895, 127.0136, 4, 3, '19:00~22:00', '무료', '성곽길을 따라 걷는 야간 문화 행사.'],
  ['판교 테크 & 아트 위크', 'exhibition', '전시', '경기', '판교 현대어린이책미술관', '경기도 성남시 분당구 판교역로 146번길 20', 37.3925, 127.1110, 1, 14, '10:30~19:00', '무료', '기술과 예술이 만나는 체험형 전시.'],
  ['양평 두물머리 김장 체험 축제', 'festival', '체험', '경기', '두물머리 생태학습장', '경기도 양평군 양서면 양수리', 37.5348, 127.3175, 6, 2, '10:00~16:00', '체험비 20,000원', '직접 담근 김치를 가져가는 가족 체험 축제.'],
  ['인천 개항장 문화 야행', 'festival', '야행', '인천', '인천 개항장 거리', '인천광역시 중구 신포로27번길 일대', 37.4741, 126.6198, 3, 3, '18:00~23:00', '무료', '근대 건축물 야간 개방과 거리 공연.'],
  ['부산 불꽃 & 라이트쇼', 'festival', '불꽃축제', '부산', '광안리해수욕장', '부산광역시 수영구 광안해변로 219', 35.1532, 129.1186, 5, 1, '20:00~21:00', '무료 (유료좌석 별도)', '광안대교를 배경으로 펼쳐지는 불꽃쇼.'],
  ['해운대 겨울 버스킹 페스티벌', 'performance', '버스킹', '부산', '해운대해수욕장 이벤트광장', '부산광역시 해운대구 해운대해변로 264', 35.1587, 129.1604, -1, 14, '15:00~20:00', '무료', '바다 앞 무대에서 매일 열리는 버스킹 공연.'],
  ['영도 커피 페스티벌', 'festival', '푸드', '부산', '영도 봉래나루로', '부산광역시 영도구 봉래나루로 33', 35.0918, 129.0373, 10, 3, '11:00~19:00', '입장권 10,000원', '부산 로스터리 40곳이 모이는 커피 축제.'],
  ['대구 근대골목 가이드 투어', 'tour', '가이드투어', '대구', '청라언덕 일대', '대구광역시 중구 달구벌대로 2029', 35.8670, 128.5826, 2, 30, '매주 토·일 10:00 / 14:00', '무료 (사전예약)', '문화해설사와 함께 걷는 2시간 골목 투어.'],
  ['광주 비엔날레 특별전', 'exhibition', '현대미술', '광주', '광주비엔날레 전시관', '광주광역시 북구 비엔날레로 111', 35.1830, 126.8888, -30, 70, '09:00~18:00', '성인 14,000원', '아시아 현대미술 작가 50인의 특별전.'],
  ['대전 사이언스 나이트', 'festival', '과학', '대전', '국립중앙과학관', '대전광역시 유성구 대덕대로 481', 36.3765, 127.3757, 7, 2, '17:00~22:00', '무료', '천체관측과 야간 과학 체험.'],
  ['강릉 커피 & 바다 축제', 'festival', '푸드', '강원', '안목해변 커피거리', '강원특별자치도 강릉시 창해로14번길', 37.7726, 128.9470, 4, 4, '10:00~20:00', '무료', '바다 앞 커피거리에서 열리는 핸드드립 대회와 마켓.'],
  ['전주 한옥마을 국악 콘서트', 'performance', '국악', '전북', '전주한옥마을 경기전 앞', '전북특별자치도 전주시 완산구 태조로 44', 35.8151, 127.1499, 3, 2, '19:00', '무료', '한옥 지붕 아래에서 듣는 퓨전 국악.'],
  ['경주 신라 달빛 오디오 산책', 'audioguide', '오디오가이드', '경북', '동궁과 월지', '경상북도 경주시 원화로 102', 35.8347, 129.2266, 0, 60, '18:00~22:00', '3,000원 (입장료 별도)', '스마트폰으로 듣는 40분 야경 오디오 가이드.'],
  ['제주 감귤 따기 축제', 'festival', '체험', '제주', '서귀포 감귤박물관', '제주특별자치도 서귀포시 효돈순환로 441', 33.2758, 126.6074, -3, 20, '09:00~17:00', '체험비 10,000원', '직접 딴 감귤을 담아가는 겨울 체험 축제.'],
  ['제주 오름 트레킹 투어', 'tour', '가이드투어', '제주', '새별오름 주차장 집결', '제주특별자치도 제주시 애월읍 봉성리', 33.3660, 126.3578, 5, 1, '08:30~12:00', '25,000원', '현지 가이드와 함께 오르는 일출 오름 트레킹.'],
];

// 위 T와 같은 순서의 영문 번역: [titleEn, genreEn, placeEn, addressEn, timeEn, feeEn, overviewEn]
const EN = [
  ['Han River Night Book Market', 'Market', 'Banpo Hangang Park', '40 Sinbanpo-ro 11-gil, Seocho-gu, Seoul', '18:00–22:00', 'Free', 'A riverside night market of used books and indie zines, with author signings and street music.'],
  ['Seongsu Craft Beer Festa', 'Food & drink', 'Seongsu-dong Culture Lot', '20 Seongsui-ro, Seongdong-gu, Seoul', '14:00–21:00', 'Free entry · Tasting pass ₩15,000', 'A beer festival with 30 small Korean breweries.'],
  ['Winter Light Garden Illumination', 'Light festival', 'Seoul Botanic Park', '161 Magokdong-ro, Gangseo-gu, Seoul', '17:30–22:00', '₩5,000', 'A walking trail of lights winding through the gardens.'],
  ['Jazz in the Garden', 'Jazz', 'Olympic Park 88 Lawn', '424 Olympic-ro, Songpa-gu, Seoul', '16:00–20:30', 'R ₩99,000 · S ₩77,000', 'An outdoor jazz festival on the lawn.'],
  ['Play: "The Old Letter"', 'Theater', 'Daehangno Byeolbit Theater', '31 Daehak-ro 12-gil, Jongno-gu, Seoul', 'Weekdays 19:30 / Weekends 15:00, 18:00', '₩35,000', 'A family story about a letter that arrives 30 years late.'],
  ['Musical Gala Concert "Midsummer Night"', 'Musical', 'Sejong Center Grand Theater', '175 Sejong-daero, Jongno-gu, Seoul', '19:30', 'VIP ₩130,000 · R ₩110,000', 'Favorite musical numbers on a single stage.'],
  ['Light & Shadow: Media Art', 'Media art', 'DDP Exhibition Hall 1', '281 Eulji-ro, Jung-gu, Seoul', '10:00–20:00 (closed Mon)', 'Adults ₩18,000', 'Twelve immersive media art installations.'],
  ['Seven Young Photographers', 'Photography', 'Gallery On, Seochon', '50 Jahamun-ro, Jongno-gu, Seoul', '11:00–19:00', 'Free', 'Seven emerging photographers capture everyday city life.'],
  ['Pottery Wheel One-Day Class', 'Craft', 'Yeonnam Studio Heuk', '240 Donggyo-ro, Mapo-gu, Seoul', '14:00–16:30', '₩65,000 (materials included)', 'Throw your own mug on the wheel. Pick up the fired piece two weeks later.'],
  ['Suwon Hwaseong Moonlight Walk', 'Night tour', 'Janganmun Gate, Suwon Hwaseong', '910 Jeongjo-ro, Jangan-gu, Suwon, Gyeonggi-do', '19:00–22:00', 'Free', 'A night culture walk along the fortress wall.'],
  ['Pangyo Tech & Art Week', 'Exhibition', 'Hyundai Children\'s Book Art Museum, Pangyo', '20 Pangyoyeok-ro 146beon-gil, Bundang-gu, Seongnam, Gyeonggi-do', '10:30–19:00', 'Free', 'A hands-on exhibition where technology meets art.'],
  ['Dumulmeori Kimchi-Making Festival', 'Hands-on', 'Dumulmeori Eco Learning Center', 'Yangsu-ri, Yangseo-myeon, Yangpyeong-gun, Gyeonggi-do', '10:00–16:00', 'Activity ₩20,000', 'A family festival where you make kimchi and take it home.'],
  ['Incheon Open Port Night Culture Walk', 'Night tour', 'Incheon Open Port Street', 'Sinpo-ro 27beon-gil, Jung-gu, Incheon', '18:00–23:00', 'Free', 'Modern-era buildings open at night, with street performances.'],
  ['Busan Fireworks & Light Show', 'Fireworks', 'Gwangalli Beach', '219 Gwanganhaebyeon-ro, Suyeong-gu, Busan', '20:00–21:00', 'Free (paid seats available)', 'Fireworks over Gwangan Bridge.'],
  ['Haeundae Winter Busking Festival', 'Busking', 'Haeundae Beach Event Plaza', '264 Haeundaehaebyeon-ro, Haeundae-gu, Busan', '15:00–20:00', 'Free', 'Daily busking on a stage by the sea.'],
  ['Yeongdo Coffee Festival', 'Food & drink', 'Bongnaenaru-ro, Yeongdo', '33 Bongnaenaru-ro, Yeongdo-gu, Busan', '11:00–19:00', 'Ticket ₩10,000', 'Forty Busan roasteries in one place.'],
  ['Daegu Modern Alleys Guided Tour', 'Guided tour', 'Cheongna Hill area', '2029 Dalgubeol-daero, Jung-gu, Daegu', 'Sat & Sun 10:00 / 14:00', 'Free (booking required)', 'A two-hour alley walk with a local culture guide.'],
  ['Gwangju Biennale Special Exhibition', 'Contemporary art', 'Gwangju Biennale Exhibition Hall', '111 Biennale-ro, Buk-gu, Gwangju', '09:00–18:00', 'Adults ₩14,000', 'A special show of 50 contemporary Asian artists.'],
  ['Daejeon Science Night', 'Science', 'National Science Museum', '481 Daedeok-daero, Yuseong-gu, Daejeon', '17:00–22:00', 'Free', 'Stargazing and after-dark science activities.'],
  ['Gangneung Coffee & Sea Festival', 'Food & drink', 'Anmok Beach Coffee Street', 'Changhae-ro 14beon-gil, Gangneung, Gangwon', '10:00–20:00', 'Free', 'A hand-drip contest and market on the seaside coffee street.'],
  ['Jeonju Hanok Village Gugak Concert', 'Korean traditional music', 'In front of Gyeonggijeon Shrine', '44 Taejo-ro, Wansan-gu, Jeonju, Jeonbuk', '19:00', 'Free', 'Fusion Korean traditional music under hanok rooftops.'],
  ['Gyeongju Silla Moonlight Audio Walk', 'Audio guide', 'Donggung Palace and Wolji Pond', '102 Wonhwa-ro, Gyeongju, Gyeongsangbuk-do', '18:00–22:00', '₩3,000 (admission separate)', 'A 40-minute night audio guide on your phone.'],
  ['Jeju Tangerine Picking Festival', 'Hands-on', 'Seogwipo Citrus Museum', '441 Hyodonsunhwan-ro, Seogwipo, Jeju', '09:00–17:00', 'Activity ₩10,000', 'Pick your own tangerines and take them home.'],
  ['Jeju Oreum Trekking Tour', 'Guided tour', 'Saebyeol Oreum parking lot', 'Bongseong-ri, Aewol-eup, Jeju', '08:30–12:00', '₩25,000', 'A sunrise oreum (volcanic cone) hike with a local guide.'],
];

export function sampleEvents(today = new Date()) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const add = n => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
  return T.map(([title, kind, genre, region, place, address, lat, lng, off, days, time, fee, overview], i) => ({
    id: `sample-${i + 1}`, kind, title, genre, region, place, address, lat, lng,
    startDate: ymd(add(off)), endDate: ymd(add(off + days - 1)),
    time, fee, free: /^무료/.test(fee) && !/원/.test(fee.replace(/입장료 별도/, '')),
    poster: '', overview, homepage: '', tel: '', source: '샘플 데이터',
    ...Object.fromEntries(['titleEn', 'genreEn', 'placeEn', 'addressEn', 'timeEn', 'feeEn', 'overviewEn'].map((k, j) => [k, EN[i][j]])),
  }));
}
