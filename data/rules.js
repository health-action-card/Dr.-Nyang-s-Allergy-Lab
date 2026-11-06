/* 예방 수칙 데이터 (S41~S43)
   - 문구를 고치려면 text만 바꾸세요. id는 기록과 연결되므로 바꾸지 마세요.
   - placeholder: 나만의 수칙 입력칸 예시 문구 */
window.RULES_DATA = {
  home: {
    name: '집에서', icon: '🏠',
    placeholder: '예) 이불을 자주 털어서 햇볕에 말리기',
    rules: [
      { id: 'home-1', text: '이불을 깨끗하게 관리하고, 바닥과 가구의 먼지는 물걸레로 닦기', type: 'daily' },
      { id: 'home-2', text: '청결 유지를 위해 창문을 열어 10분 이상 환기하기', type: 'daily' },
      { id: 'home-3', text: '집에 있는 샴푸, 로션, 세제 중 한 가지를 골라 성분 확인하기', type: 'daily' },
      { id: 'home-4', text: '외출 후에는 손과 얼굴을 씻고 깨끗한 옷으로 갈아입기', type: 'daily' },
      { id: 'home-5', text: '하루 15분 이상 규칙적으로 운동하며 건강한 생활 습관 기르기', type: 'daily' }
    ]
  },
  school: {
    name: '학교에서', icon: '🏫',
    placeholder: '예) 알레르기가 있는 친구의 음식을 함부로 만지거나 바꾸지 않기',
    rules: [
      { id: 'school-1', text: '급식을 먹기 전 식단표에 있는 식품 알레르기 표시를 확인하기', type: 'daily' },
      { id: 'school-2', text: '친구가 먹지 못하는 음식은 억지로 권하거나 장난치지 않기', type: 'daily' },
      { id: 'school-3', text: '알레르기로 힘들어하는 친구가 있다면 괜찮은지 물어보고 다정하게 도와주기', type: 'situ' },
      { id: 'school-4', text: '심한 알레르기가 있다면 선생님과 친구에게 내 상태와 비상약 위치를 미리 알리기', type: 'situ' },
      { id: 'school-5', text: '친구에게 심한 알레르기 반응이 나타나면 즉시 선생님께 알리고 119에 신고하기', type: 'situ' }
    ]
  },
  outside: {
    name: '밖에서', icon: '🌳',
    placeholder: '예) 꽃가루가 많이 날리는 날에는 야외활동을 줄이기',
    rules: [
      { id: 'outside-1', text: '꽃가루와 미세먼지 등을 피하기 위해 마스크 착용하기', type: 'daily' },
      { id: 'outside-2', text: '놀이터나 공원에서 놀고 집에 돌아오면 비누로 손 깨끗이 씻기', type: 'daily' },
      { id: 'outside-3', text: '풀밭에 함부로 눕지 않고, 곤충에 물리지 않도록 긴 옷 입기', type: 'situ' },
      { id: 'outside-4', text: '아나필락시스 비상약(에피네프린 자가 주사기)이 있다면 외출할 때 꼭 챙기기', type: 'situ' },
      { id: 'outside-5', text: '밖에서 두드러기가 나거나 눈이 가려우면 비비지 말고 보호자에게 알리기', type: 'situ' }
    ]
  }
};
