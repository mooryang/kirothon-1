---
description: Evening Handoff UI/UX 설계
---

## 화면 구조

전체 화면 중앙 정렬 (max-width 2xl), CRT 스크린 효과 적용

```
┌─────────────────────────────────────────┐
│                                         │
│       ███ NIGHT SHIFT ███               │  ← figlet ASCII 타이틀 (amber)
│                                         │
│   "퇴근이야? 그래 가. 나야 밤새지 뭐."   │  ← typing-effect 애니메이션
│                                         │
│   ┌─ 📊 오늘 한 일 ──────────────────┐  │
│   │ 커밋 7건 | PR 리뷰 2건 | 이슈 3건 │  │  ← 읽기 전용, pre 태그
│   │ 스프린트: ████████░░░ 68%        │  │
│   └──────────────────────────────────┘  │
│                                         │
│   ┌─ 🔮 내일 예정 ──────────────────┐  │
│   │ ☑ 10:00 스프린트 리뷰            │  │  ← 체크박스 토글 가능
│   │ ☑ 14:00 v2.3.1 배포              │  │
│   │ ☑ PR #89 리뷰 (24h 경과)        │  │
│   │ ☐ Issue #156 방향 결정           │  │
│   └──────────────────────────────────┘  │
│                                         │
│   ┌─ ✏️ 밤새 특별히 봐줄 것 ────────┐  │
│   │ > 결제 모듈 에러핸들링 봐줘_      │  │  ← 텍스트 입력, 터미널 스타일
│   └──────────────────────────────────┘  │
│                                         │
│          [ 퇴근합니다 👋 ]              │  ← hover 시 bg-green + text-black
│                                         │
└─────────────────────────────────────────┘
```

## 퇴근 처리 시퀀스

```
[퇴근합니다] 클릭
  │
  ├─ 1. POST /api/clock-out { instruction: "결제 모듈 에러핸들링 봐줘" }
  │     └─ sessions 테이블 INSERT (type: clock_out, instruction)
  │
  ├─ 2. scanner.js → collectBaseline(repo)
  │     └─ snapshots 테이블 INSERT (prs, issues, ci, commits)
  │
  ├─ 3. scheduler.js → cron.schedule('*/30 * * * *', nightScan)
  │     └─ global._cronStarted = true (hot reload guard)
  │
  ├─ 4. UI 전환: "야간 전환 브릿지"
  │     ├─ 선배 대사: "수고했다. 맡겨만 둬. 밤새 꼼꼼히 볼게."
  │     ├─ 터미널 로그 애니메이션: "baseline 수집 중..."
  │     └─ 2초 후 → 야간 모니터링 상태 화면 or 브라우저 닫기 유도
  │
  └─ 5. 특별 지시사항이 있으면:
        └─ 다음 스캔 사이클에서 instruction을 subagent에 전달
           kiro-cli --agent pr-reviewer "특별 지시: {instruction}\n{diff}"
```

## 오늘 업무 요약 생성

clock-out 시점에 Kiro night-summarizer를 호출하여 당일 요약 생성:

```
kiro-cli chat --no-interactive --trust-all-tools --agent night-summarizer \
  "오늘 업무를 요약해줘: 커밋 {commits}, PR {prs}, 이슈 {issues}, 스프린트 {sprint}"
```

결과를 daily_summaries 테이블에 저장 → EveningHandoff UI에 표시.

## 내일 예정 데이터 소스

1. GitHub 마일스톤 due_date가 내일인 이슈
2. 24시간 이상 리뷰 대기 중인 PR (긴급도 표시)
3. 스프린트 보드에서 "In Progress" 상태 태스크
4. 특별 지시사항 이력 (이전 night-summarizer가 제안한 후속 작업)
