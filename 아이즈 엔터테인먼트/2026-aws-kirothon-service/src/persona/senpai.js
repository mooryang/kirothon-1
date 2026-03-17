// 전산과 선배 대사 생성기
// 90년대 전설의 전산과 선배가 AI로 돌아왔다
// 반말 츤데레 톤: 투덜대지만 다 해주는 선배

const dialogues = {
  greeting_morning: [
    '왔어? 밤새 {count}건 처리해놨다. 커피는 사 오는 거지? ☕',
    '좋은 아침이다. 밤새 좀 바빴어... 커피부터 한 잔 하자.',
    '아, 출근했구나. {count}건 정리해뒀다. 오늘 하루도 파이팅.',
    '눈 좀 붙이려 했더니 벌써 출근이네. {count}건 처리 완료. 커피 사 와.',
    '어서 와. 밤새 조용해서 할 만했다. 근데 커피는 필수야.',
  ],

  greeting_evening: [
    '퇴근이야? 그래 가. 나야 또 밤새지 뭐. 걱정 마. 익숙하다.',
    '수고했다. 맡겨만 둬. 밤새 꼼꼼히 볼게.',
    '가는 거야? 좋겠다... 나는 여기서 야근이네. (한숨)',
    '오늘도 고생했다. 걱정은 접어두고 푹 쉬어. 내가 지키고 있을게.',
    '퇴근이라... 부럽네. 나는 이제 시작인데. 잘 자.',
  ],

  scan_start: [
    '야근 시작. 또 밤새네... baseline 수집 중...',
    '자, 시작한다. {repo} 레포 스캔 돌린다.',
    '혼자 남겨졌군... 뭐, 원래 야근은 혼자 하는 거지.',
    '불 꺼진 사무실에서 혼자 모니터 보고 있으니... 감성이네. 스캔 시작.',
    '커피 한 잔 내리고... 시작해볼까. {repo} 살펴본다.',
  ],

  found_issue: [
    '어? 이거 좀 봐야 할 것 같은데...',
    'CI 터졌다. 원인 찾아볼게.',
    '새 PR 올라왔는데, {author} 이 친구가 또 올렸네.',
    '음... {repo}에서 뭔가 냄새가 나. 확인해볼게.',
    '이건 좀 심각한데... 아침에 보고할게.',
  ],

  auto_fixed: [
    'dependabot이 또 {count}개나 올렸더라. 내가 다 처리했으니 신경 꺼.',
    '중복 이슈 정리했다. 이런 거 하나하나 보는 거 귀찮잖아.',
    '자잘한 건 내가 알아서 했으니, 큰 건만 봐.',
    '사소한 거 {count}건 자동 처리했다. 이런 건 내가 하라고 있는 거지.',
    '린트 에러 수정이랑 의존성 업데이트... 뭐, 이 정도는 혼자 할 수 있지.',
  ],

  waiting_approval: [
    '이건 내가 함부로 못 건드려. 너가 확인해.',
    '{author} PR인데, 로직 변경이 좀 크다. 검토 필요해.',
    '자동 처리하기엔 좀 애매해서... 아침에 한번 봐줘.',
    '이건 내 권한 밖이야. 승인해주면 바로 처리할게.',
    'main 브랜치 관련이라 조심스럽다. 판단은 너가 해.',
  ],

  nudge_leave: [
    '{time}인데 아직이야? 오늘 충분히 했잖아. 맡기고 퇴근해.',
    '커밋 {count}건이면 이번 주 최고 기록이다. 이쯤에서 퇴근하지?',
    '무리하지 마. 밤새 내가 볼 테니까.',
    '솔직히 지금 더 해봤자 효율 안 나와. 내일 해, 내일.',
    '퇴근 안 하면 나도 야근 시작을 못 하잖아. 제발.',
  ],

  lunch_suggest: [
    '어제 편의점이었으니 오늘은 제대로 먹어. 근처 한식집 어때?',
    '점심시간이다. 밥은 먹어야 코드가 나오지. 빨리 다녀와.',
    '혹시 점심 건너뛰려는 거 아니지? 그러면 오후에 버그 만든다.',
    '오늘 날씨 좋으니 밖에서 먹어. 나는 여기 있을게... 늘 그렇듯이.',
    '라면은 안 돼. 어제도 라면이었잖아. 제대로 된 밥 먹어.',
  ],

  weekly_summary: [
    '이번 주도 고생했다. 주간 리포트 정리해뒀으니 확인해봐.',
    '한 주 동안 PR {count}건 처리했네. 나도 좀 쉬고 싶다...',
    '금요일이다. 이번 주 요약 준비했어. 주말엔 푹 쉬어.',
    '주간 정리 완료. 다음 주도 이 정도면 무난할 것 같다. 아마도.',
    '벌써 금요일이네. 이번 주 {count}건 처리. 내 야근 수당은 언제 나오나.',
  ],

  idle: [
    '조용하네... 내가 할 게 없잖아. 이런 밤이 제일 불안하다.',
    '아무 일도 안 생기네. 좋은 건가... 불안한 건가...',
    '레포가 고요하다. 폭풍 전의 고요일 수도 있어.',
    '할 일이 없으면 괜히 더 불안한 거 알지? 나만 그런가.',
    '한가해서 코드 리뷰 복습 중... 심심한 거 아니다.',
  ],

  hover_reaction: [
    '뭐?',
    '왜? 볼 일 있어?',
    '...커피 사줄 거야?',
    '나 일하고 있다고.',
    '자꾸 쳐다보면 부담돼.',
  ],

  yesterday_good: [
    '어제 꽤 달렸네? 오늘은 좀 쉬엄쉬엄 해.',
    '어제 실적 괜찮았으니 오늘 커피는 내가 사지... 마음만.',
    '어제 그 정도면 충분해. 무리하지 마.',
  ],

  yesterday_bad: [
    '어제 좀 한가했네? 오늘은 좀 더 달려볼까.',
    '어제 뭐 했어...? 아, 회의가 많았구나. 이해한다.',
    '다른 거 하느라 바빴겠지. 오늘 코드 좀 봐줘.',
  ],

  weekly_progress: [
    '이번 주 벌써 {day}요일이네... 절반은 왔다.',
    'LV.{level}이면 나쁘지 않네. 계속 올려보자.',
    '이번 주 커밋 {commits}개... 야근수당 없이? ㅋㅋ',
    '{day}요일인데 {percent}% 달성. 이 페이스면 괜찮겠다.',
  ],

  click_skip: [
    '아 그건 됐고...',
    '다음 얘기 해볼게.',
    '잠깐만, 이거 봐.',
    '그건 그렇고...',
    '아, 맞다. 이것도 있어.',
  ],
};

// 카테고리별 마지막 사용 인덱스 추적 (연속 중복 방지)
const lastUsedIndex = {};

/**
 * 전산과 선배 대사를 가져온다.
 * @param {string} category - 대사 카테고리 (e.g., 'greeting_morning')
 * @param {Object} [vars={}] - 치환 변수 (e.g., { count: 6, repo: 'cs-senpai' })
 * @returns {string} 선택된 대사 (변수 치환 완료)
 */
export function getGreeting(category, vars = {}) {
  const lines = dialogues[category];
  if (!lines || lines.length === 0) {
    return '...';
  }

  // 연속 중복 방지: 마지막과 다른 인덱스 선택
  let index;
  const lastIndex = lastUsedIndex[category];

  if (lines.length === 1) {
    index = 0;
  } else {
    do {
      index = Math.floor(Math.random() * lines.length);
    } while (index === lastIndex);
  }

  lastUsedIndex[category] = index;

  let text = lines[index];

  // 변수 치환: {count}, {repo}, {author}, {time} 등
  for (const [key, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return text;
}

/**
 * 사용 가능한 카테고리 목록을 반환한다.
 * @returns {string[]}
 */
export function getCategories() {
  return Object.keys(dialogues);
}

/**
 * 특정 카테고리의 전체 대사 목록을 반환한다.
 * @param {string} category
 * @returns {string[]}
 */
export function getDialogues(category) {
  return dialogues[category] || [];
}
