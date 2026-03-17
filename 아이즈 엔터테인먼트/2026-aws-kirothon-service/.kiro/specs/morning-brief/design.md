---
description: Morning Brief UI/UX 설계
---

## 6패널 레이아웃

CSS Grid: grid-cols-12 grid-rows-12, gap 1px

| 위치 | 영역 | 내용 | 데이터 소스 |
|------|------|------|------------|
| 좌상 (col 1-6, row 1-5) | 요약 + 인사 | ASCII 타이틀 + 선배 인사 + 야간 근무 시간 + 스프린트 게이지 | daily_summaries + sessions |
| 우상 (col 7-12, row 1-5) | 오늘 할 일 | 시간/항목/상태 테이블 (일정 + 블로커) | night-summarizer 출력의 tomorrow_prep |
| 좌중 (col 1-6, row 6-9) | 밤새 변화 | 🟢🟡🔴 항목 리스트, 클릭/숫자키로 상세 진입 | analyses 테이블 |
| 우중상 (col 7-12, row 6-7) | 활동 패턴 | recharts AreaChart (stepAfter) — Kiro CLI 호출 횟수 | 스캔 로그 집계 |
| 우중하 (col 7-12, row 8-9) | 절약 시간 | recharts BarChart — 요일별 절약 시간 | actions 테이블 집계 |
| 하단 (col 1-12, row 10-12) | 야간 로그 | 시간역순 롤링 로그 (slideUp 애니메이션) | diffs + analyses 조인 |

## 상태 전환 플로우

```
MorningBrief (6패널)
  │
  ├─ [1-6] 숫자키 → DetailView (특정 항목)
  │   ├─ [A] 승인 → /api/action {action: "approve"} → MorningBrief로 복귀
  │   ├─ [C] 코멘트 → 입력 모달 → /api/action {action: "comment"} → 복귀
  │   ├─ [S] 건너뛰기 → 다음 항목 or MorningBrief
  │   └─ [B] 돌아가기 → MorningBrief
  │
  └─ [Q] 출근 완료 → /api/clock-in → 상태를 idle로 전환
```

## DetailView 설계

좌우 분할 (grid-cols-2):
- 왼쪽: 코드 diff — `+` 초록, `-` 빨강, 나머지 회색
- 오른쪽: Kiro 리뷰 — summary, risk_level 뱃지, findings 리스트, suggestion
- 하단 액션바: [A]승인 [C]코멘트 [S]건너뛰기 [B]돌아가기

## CRT 테마 규칙

- 스캔라인: body::after (z-index 9999) — 차트 패널에는 적용 제외
- 글로우: text-shadow 0 0 5px rgba(0,255,65,0.4)
- 커서: blink 1s step-end infinite
- 폰트: JetBrains Mono 14px
- 색상: --term-green #00ff41, --term-amber #ffb000, --term-cyan #00d4ff

## recharts 터미널 오버라이드

- axis tick: fill #00ff41, font JetBrains Mono 10px
- grid line: stroke #333333
- area fill: rgba(0,255,65,0.1)
- bar fill: #00ff41, radius [2,2,0,0]
