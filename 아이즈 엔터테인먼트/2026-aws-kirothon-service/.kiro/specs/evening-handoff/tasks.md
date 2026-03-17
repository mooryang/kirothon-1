---
description: Evening Handoff 구현 태스크
---

## 태스크

- [ ] TASK-1: AsciiTitle.jsx — figlet 스타일 "NIGHT SHIFT" (lib/ascii.js 활용)
- [ ] TASK-2: EveningHandoff.jsx — 전체 레이아웃 (crt-screen, 중앙 정렬)
- [ ] TASK-3: 오늘 업무 요약 패널 — night-summarizer 호출 → 결과 표시
- [ ] TASK-4: 내일 예정 체크리스트 — GitHub 마일스톤 + PR 대기 데이터
- [ ] TASK-5: 특별 지시 입력 — 터미널 스타일 input (border-bottom, glow)
- [ ] TASK-6: [퇴근합니다] 버튼 — /api/clock-out 호출 + 로딩 상태
- [ ] TASK-7: /api/clock-out 라우트 — session 생성 + baseline 수집 + cron 등록
- [ ] TASK-8: 야간 전환 브릿지 애니메이션 — 선배 대사 + 로그 효과
- [ ] TASK-9: 전산과 선배 퇴근 대사 — persona/senpai.js greeting_evening 연동
- [ ] TASK-10: page.js 상태 라우팅 — idle→EveningHandoff, night→모니터링, morning→MorningBrief

## 의존성

TASK-1 → TASK-2 → TASK-3~5 (병렬) → TASK-6 → TASK-7 → TASK-8 → TASK-9,10
