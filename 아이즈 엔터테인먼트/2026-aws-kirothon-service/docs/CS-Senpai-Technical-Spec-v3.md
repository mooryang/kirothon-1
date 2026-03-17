# 전설의 전산과 선배 — 상세 기술 기획서

> Kiro CLI 기반 야간 자율 에이전트 + Next.js 웹 터미널 대시보드
> 이 문서를 Kiro CLI에 넘기면 바로 개발 시작 가능하도록 작성
> **Option C: Next.js 웹 터미널 하이브리드** (2026-03-12 확정)
> **Kiro CLI 통합** (2026-03-16 확정) — 야간 분석 엔진을 Bedrock 직접 호출에서 Kiro CLI로 전환

---

## 1. 제품 개요

### 한 줄 요약

**퇴근 버튼을 누르면 Kiro의 근무가 시작된다.** 밤새 GitHub을 모니터링하고, Kiro CLI의 커스텀 에이전트가 PR을 리뷰하고, CI를 분석하고, 내일 일정을 준비해서, 아침에 출근하면 레트로 터미널 스타일 웹 대시보드로 브리핑한다.

### 핵심 컨셉

- 야간근무 교대 모델: 사용자 = 주간, **Kiro = 야간**
- Pull 모델: 로컬에서 주기적으로 GitHub API 호출
- **Kiro CLI 기반 분석**: `kiro-cli chat --no-interactive --trust-all-tools --agent <name>` 으로 자율 실행
- **웹 터미널 UI**: Next.js + Tailwind CSS + CRT 효과 (하이텔/BBS 감성)
- 페르소나: "전산과 선배" — 투덜대면서도 빈틈없이 일하는 선배 개발자 (= Kiro)

### 왜 웹 터미널인가? (Option C)

- blessed-contrib는 유지보수 중단 상태 + 한글/이모지 렌더링 불안정
- 진짜 CLI(iTerm)는 프로젝터 가독성 + 폰트 크기 조절 어려움
- 웹은 해커톤 시연에 안정적 (브라우저만 있으면 됨)
- **CSS CRT 효과로 터미널 감성 100% 살림** — 차별화 유지
- 반응형 레이아웃으로 프로젝터 대응 용이

---

## 2. 프로젝트 구조

```
cs-senpai/
├── package.json
├── next.config.js
├── tailwind.config.js
├── .env.local                    # 환경변수 (GitHub, Kiro, 설정)
├── .kiro/
│   ├── steering/                 # [제어 레이어] 실행 가능한 아키텍처 문서
│   │   ├── product.md            # 제품 방향 (전산과 선배 컨셉)
│   │   ├── tech.md               # 기술 컨벤션 + 분석 규칙
│   │   ├── review-standards.md   # 코드 리뷰 기준 (OWASP, 에러핸들링)
│   │   └── output-format.md      # 모든 분석 결과 JSON 포맷 강제
│   ├── specs/                    # [기획 레이어] 기능별 Spec 아티팩트
│   │   ├── night-engine/         # 야간 엔진 Spec
│   │   │   ├── requirements.md   # 요구사항 정의
│   │   │   ├── design.md         # 시스템 설계
│   │   │   └── tasks.md          # 구현 태스크 목록
│   │   ├── morning-brief/        # Morning Brief UI Spec
│   │   │   ├── requirements.md   # 6패널 대시보드 + DetailView 요구사항
│   │   │   ├── design.md         # 레이아웃 + 상태전환 + CRT 테마 규칙
│   │   │   └── tasks.md          # 14개 구현 태스크
│   │   └── evening-handoff/      # Evening Handoff Spec
│   │       ├── requirements.md   # 퇴근 화면 + 야간 전환 요구사항
│   │       ├── design.md         # 화면 구조 + 퇴근 시퀀스 + 데이터 소스
│   │       └── tasks.md          # 10개 구현 태스크
│   ├── agents/                   # [실행 레이어] 야간 근무 커스텀 에이전트
│   │   ├── pr-reviewer.md        # PR 코드 리뷰 에이전트
│   │   ├── ci-analyzer.md        # CI 실패 분석 에이전트
│   │   ├── issue-triager.md      # 이슈 분류/중복 감지 에이전트
│   │   ├── security-scanner.md   # 보안 취약점 스캔 에이전트
│   │   └── night-summarizer.md   # 야간 요약 + 내일 준비 에이전트
│   └── hooks/                    # [제어 레이어] 이벤트 트리거 자동화
│       └── post-analysis.md      # 분석 완료 후 자동 분류 + DB 저장
├── public/
│   └── fonts/
│       └── JetBrainsMono.woff2   # 터미널 폰트
├── src/
│   ├── app/
│   │   ├── layout.js             # CRT 오버레이 + 전역 스타일
│   │   ├── page.js               # 메인: 상태에 따라 라우팅
│   │   ├── globals.css           # CRT 효과, 터미널 테마
│   │   └── api/
│   │       ├── clock-out/route.js    # 퇴근 API
│   │       ├── clock-in/route.js     # 출근 API
│   │       ├── status/route.js       # 현재 상태 API
│   │       ├── action/route.js       # 승인/코멘트/거부 API
│   │       ├── scan/route.js         # 수동 스캔 트리거 API
│   │       └── demo/route.js         # 데모 모드 API (시드 데이터 + 타임랩스)
│   ├── components/
│   │   ├── Terminal.jsx           # 터미널 컨테이너 (CRT 효과)
│   │   ├── Panel.jsx              # tmux 스타일 패널 (border + label)
│   │   ├── MorningBrief.jsx       # 출근 대시보드 (6패널 그리드)
│   │   ├── EveningHandoff.jsx     # 퇴근 화면 (요약 + 입력)
│   │   ├── DetailView.jsx         # 상세 뷰 (diff + AI 리뷰)
│   │   ├── Timelapse.jsx          # 타임랩스 모드 (데모용)
│   │   ├── AsciiTitle.jsx         # figlet 스타일 ASCII 타이틀
│   │   └── widgets/
│   │       ├── SummaryPanel.jsx   # 요약 + 인사 패널
│   │       ├── TodayTasks.jsx     # 오늘 할 일 패널
│   │       ├── NightChanges.jsx   # 밤새 변화 패널
│   │       ├── ActivityChart.jsx  # 스파크라인 활동 패턴 (recharts)
│   │       ├── SavingsChart.jsx   # 절약 시간 바 차트 (recharts)
│   │       ├── NightLog.jsx       # 롤링 로그 패널
│   │       └── SprintGauge.jsx    # 스프린트 진행률
│   ├── core/
│   │   ├── scanner.js             # GitHub 데이터 수집 (pull)
│   │   ├── analyzer.js            # Kiro CLI 기반 AI 분석
│   │   ├── executor.js            # 자동 처리 실행 (머지, 클로즈 등)
│   │   ├── scheduler.js           # node-cron 야간 스캔 관리
│   │   ├── summarizer.js          # 업무 정리 + 내일 준비 생성
│   │   └── differ.js              # baseline 대비 diff 추출
│   ├── data/
│   │   ├── db.js                  # SQLite 초기화 + 쿼리 헬퍼
│   │   ├── schema.sql             # 테이블 스키마
│   │   └── seed.js                # 데모용 시드 데이터
│   ├── persona/
│   │   └── senpai.js              # 전산과 선배 대사 생성기
│   ├── hooks/
│   │   └── useTerminalKeys.js     # 키보드 단축키 훅
│   └── lib/
│       └── ascii.js               # figlet 텍스트 생성 유틸
├── data/
│   └── cs-senpai.db              # SQLite DB 파일 (자동 생성)
└── README.md
```

---

## 3. SQLite 스키마

```sql
-- 퇴근/출근 세션
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,           -- 'clock_out' | 'clock_in'
  timestamp TEXT NOT NULL,      -- ISO 8601
  instruction TEXT,             -- 퇴근 시 특별 지시사항
  created_at TEXT DEFAULT (datetime('now'))
);

-- baseline 스냅샷
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES sessions(id),
  type TEXT NOT NULL,           -- 'prs' | 'issues' | 'ci' | 'commits'
  data TEXT NOT NULL,           -- JSON
  captured_at TEXT DEFAULT (datetime('now'))
);

-- 감지된 변화 (diff)
CREATE TABLE diffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES sessions(id),
  type TEXT NOT NULL,           -- 'new_pr' | 'new_issue' | 'ci_fail' | 'comment' | 'commit'
  ref_id TEXT,                  -- GitHub PR/Issue 번호 등
  title TEXT,
  data TEXT NOT NULL,           -- JSON (상세 데이터)
  detected_at TEXT DEFAULT (datetime('now'))
);

-- AI 분석 결과
CREATE TABLE analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diff_id INTEGER REFERENCES diffs(id),
  category TEXT NOT NULL,       -- 'auto' | 'approve' | 'direct'
  summary TEXT NOT NULL,        -- AI 요약
  detail TEXT,                  -- AI 상세 분석 (JSON)
  risk_level TEXT,              -- 'low' | 'medium' | 'high'
  suggestion TEXT,              -- AI 제안
  analyzed_at TEXT DEFAULT (datetime('now'))
);

-- 자동 처리 기록
CREATE TABLE actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER REFERENCES analyses(id),
  action_type TEXT NOT NULL,    -- 'merge' | 'close' | 'comment' | 'label'
  status TEXT NOT NULL,         -- 'completed' | 'failed' | 'pending'
  result TEXT,                  -- 결과 메시지
  executed_at TEXT DEFAULT (datetime('now'))
);

-- 일일 업무 요약
CREATE TABLE daily_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  commits_count INTEGER DEFAULT 0,
  prs_reviewed INTEGER DEFAULT 0,
  issues_closed INTEGER DEFAULT 0,
  summary TEXT,                 -- AI 생성 요약
  tomorrow_prep TEXT,           -- AI 생성 내일 준비
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 4. 핵심 모듈 상세

### 4.1 scanner.js — GitHub 데이터 수집

```
역할: GitHub REST API를 호출하여 레포 상태를 수집

함수:
- collectBaseline(repo) → 현재 열린 PR, 이슈, CI, 최근 커밋 수집 → snapshots 테이블 저장
- collectCurrent(repo) → 현재 상태 수집 (baseline과 동일 구조, diff용)
- getDiff(baseline, current) → 두 스냅샷 비교 → 새로운 변화 추출

GitHub API 엔드포인트:
- GET /repos/{owner}/{repo}/pulls?state=open          → 열린 PR 목록
- GET /repos/{owner}/{repo}/pulls/{number}             → PR 상세 (diff 포함)
- GET /repos/{owner}/{repo}/pulls/{number}/files        → PR 변경 파일
- GET /repos/{owner}/{repo}/issues?state=open           → 열린 이슈
- GET /repos/{owner}/{repo}/issues/{number}/comments    → 이슈 코멘트
- GET /repos/{owner}/{repo}/actions/runs                → CI/CD 워크플로우 실행
- GET /repos/{owner}/{repo}/commits?since={timestamp}   → 특정 시점 이후 커밋

Rate Limit 고려:
- 인증된 요청: 시간당 5,000회
- 30분 간격 스캔 시 밤새(12시간) = 24회 스캔
- 스캔당 ~10 API 호출 = 총 ~240회 → 여유 충분
```

### 4.2 야간근무 코어 엔진 — Kiro 3레이어 설계

```
┌─────────────────────────────────────────────────────────┐
│                    야간근무 코어 엔진                       │
│                                                         │
│  ┌─── 기획 레이어 (Specs) ───────────────────────────┐  │
│  │  .kiro/specs/night-engine/                        │  │
│  │  requirements.md → design.md → tasks.md           │  │
│  │  "야간 엔진이 뭘 해야 하는지" 구조화               │  │
│  └───────────────────────────────────────────────────┘  │
│                         ▼                               │
│  ┌─── 제어 레이어 (Steering + Hooks) ────────────────┐  │
│  │  Steering: 모든 에이전트가 참조하는 규칙           │  │
│  │  ├── product.md     (제품 방향 + 3단계 자율성)     │  │
│  │  ├── tech.md        (기술 컨벤션)                  │  │
│  │  ├── review-standards.md (리뷰 기준)               │  │
│  │  └── output-format.md   (JSON 출력 강제)           │  │
│  │                                                    │  │
│  │  Hooks: 이벤트 트리거 자동화                       │  │
│  │  └── post-analysis  (분석 완료 → 자동 분류 + 저장) │  │
│  └────────────────────────────────────────────────────┘  │
│                         ▼                               │
│  ┌─── 실행 레이어 (Subagents + Powers) ──────────────┐  │
│  │  Custom Subagents (.kiro/agents/)                  │  │
│  │  ├── pr-reviewer.md      (PR 리뷰)                │  │
│  │  ├── ci-analyzer.md      (CI 분석)                 │  │
│  │  ├── issue-triager.md    (이슈 분류)               │  │
│  │  ├── security-scanner.md (보안 스캔)               │  │
│  │  └── night-summarizer.md (야간 요약)               │  │
│  │                                                    │  │
│  │  Subagent 병렬 실행: 각각 독립 컨텍스트            │  │
│  │  PR분석 ─┐                                        │  │
│  │  CI분석 ─┼─ 동시 실행 → 결과 취합 → 분류          │  │
│  │  이슈분류─┘                                        │  │
│  │                                                    │  │
│  │  Powers: 외부 서비스 연동                          │  │
│  │  └── GitHub Power (PR머지, 이슈클로즈, 코멘트)     │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### 4.2.1 기획 레이어 — Specs

Specs로 야간 엔진의 요구사항을 구조화. Kiro가 이 Spec을 참조하여 일관된 동작 보장.

```markdown
# .kiro/specs/night-engine/requirements.md
---
description: 야간근무 엔진의 기능 요구사항
---

## 요구사항

REQ-1: 퇴근 트리거 시 GitHub 레포의 baseline 스냅샷을 수집한다
REQ-2: 30분 간격으로 baseline 대비 변화를 감지한다
REQ-3: 변화 감지 시 유형별 전담 subagent를 병렬 호출하여 분석한다
REQ-4: 분석 결과를 3단계(auto/approve/direct)로 자동 분류한다
REQ-5: auto 항목은 GitHub Power를 통해 자동 처리한다
REQ-6: 모든 분석/처리 결과를 SQLite에 기록한다
REQ-7: 출근 트리거 시 night-summarizer가 브리핑을 생성한다

## 수용 기준

- auto 처리는 dependabot PR(테스트 통과) + 중복 이슈만 허용
- main 브랜치 직접 머지 절대 금지
- 모든 에이전트 출력은 JSON 포맷 (steering/output-format.md 준수)
```

```markdown
# .kiro/specs/night-engine/design.md
---
description: 야간 엔진 시스템 설계
---

## 시퀀스

1. clock-out API 호출
2. scanner.js → GitHub API로 baseline 수집 → snapshots 저장
3. scheduler.js → 30분 간격 cron 등록
4. 매 스캔 사이클:
   a. scanner.js → 현재 상태 수집
   b. differ.js → baseline 대비 diff 추출
   c. analyzer.js → diff를 유형별로 분류 → subagent 병렬 호출
   d. 결과를 analyses 테이블에 저장
   e. Hook(post-analysis) → auto 항목 자동 처리
5. clock-in API 호출
6. night-summarizer subagent → 전체 야간 활동 브리핑 생성

## 에러 핸들링

- subagent 타임아웃(120초) → 해당 항목 skip, 로그 기록
- GitHub API rate limit → 스캔 간격 자동 확장
- Kiro CLI 호출 실패 → 3회 재시도 후 에러 기록
```

#### 4.2.1.2 Morning Brief Spec

```markdown
# .kiro/specs/morning-brief/requirements.md
---
description: 출근 대시보드 (Morning Brief) 기능 요구사항
---

## 요구사항

REQ-1: 출근(clock-in) 시 야간 분석 결과를 6패널 CRT 터미널 대시보드로 표시한다
REQ-2: 대시보드는 tmux 스타일 CSS Grid(12x12)로 분할된다
REQ-3: 전산과 선배 페르소나가 아침 인사 멘트를 타이핑 효과로 표시한다
REQ-4: 밤새 변화 항목은 🟢🟡🔴 3색으로 자율성 레벨을 시각화한다
REQ-5: 각 항목을 키보드(1-6)로 선택하면 DetailView로 전환한다
REQ-6: DetailView는 좌우 분할 — 코드 diff(좌) + Kiro 리뷰(우)로 구성된다
REQ-7: [A]승인/[C]코멘트/[S]건너뛰기 액션을 키보드로 실행할 수 있다
REQ-8: 하단 상태바에 "의사결정 시간 vs 절약 시간"을 실시간 표시한다

## 수용 기준

- 6패널이 1280x720 해상도에서 깨지지 않아야 한다
- 프로젝터 환경에서 텍스트 가독성 확보 (font-size 14px 이상)
- 차트 패널에는 CRT 스캔라인 오버레이 적용하지 않는다
- 키보드 단축키 힌트가 하단 상태바에 상시 노출된다
- 전산과 선배 대사는 "수치 앞, 캐릭터 멘트 뒤" 구조를 따른다
```

```markdown
# .kiro/specs/morning-brief/design.md
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
```

```markdown
# .kiro/specs/morning-brief/tasks.md
---
description: Morning Brief 구현 태스크
---

## 태스크

- [ ] TASK-1: Panel.jsx 컴포넌트 — tmux 스타일 border + label
- [ ] TASK-2: MorningBrief.jsx — 6패널 CSS Grid 레이아웃 (더미 데이터)
- [ ] TASK-3: SummaryPanel 위젯 — 선배 인사 + 야간 근무 시간 + 스프린트 게이지
- [ ] TASK-4: TodayTasks 위젯 — 시간/항목/상태 TerminalTable
- [ ] TASK-5: NightChanges 위젯 — 🟢🟡🔴 리스트 + 선택 이벤트
- [ ] TASK-6: ActivityChart 위젯 — recharts AreaChart (터미널 스타일)
- [ ] TASK-7: SavingsChart 위젯 — recharts BarChart (터미널 스타일)
- [ ] TASK-8: NightLog 위젯 — 롤링 로그 + slideUp 애니메이션
- [ ] TASK-9: DetailView.jsx — 좌우 분할 (diff + Kiro 리뷰)
- [ ] TASK-10: useTerminalKeys 훅 — 전역 키보드 바인딩 (1-6, A/C/S/B/Q/D)
- [ ] TASK-11: /api/status → DB 조회 → MorningBrief 데이터 연결
- [ ] TASK-12: /api/action → 승인/코멘트/거부 처리 → GitHub Power 연동
- [ ] TASK-13: 하단 상태바 — 키보드 힌트 + 의사결정 시간 + 절약 시간
- [ ] TASK-14: 차트 패널 스캔라인 제외 처리 (no-scanline 클래스)

## 의존성

TASK-1 → TASK-2 → TASK-3~8 (병렬) → TASK-9 → TASK-10 → TASK-11,12 → TASK-13,14
```

#### 4.2.1.3 Evening Handoff Spec

```markdown
# .kiro/specs/evening-handoff/requirements.md
---
description: 퇴근 화면 (Evening Handoff) 기능 요구사항
---

## 요구사항

REQ-1: 퇴근 시 오늘 업무 요약을 자동 생성하여 표시한다
REQ-2: 내일 예정 항목을 체크리스트로 표시하고, 사용자가 토글할 수 있다
REQ-3: 사용자가 "밤새 특별히 봐줄 것" 텍스트를 입력할 수 있다
REQ-4: [퇴근합니다] 버튼을 누르면 야간근무 엔진이 시작된다
REQ-5: 퇴근 처리 시 전산과 선배가 퇴근 대사를 typing-effect로 표시한다
REQ-6: 퇴근 후 야간 엔진 시작까지의 전환 애니메이션을 표시한다

## 수용 기준

- 오늘 업무 요약은 Kiro night-summarizer가 generateDailySummary로 생성
- 내일 예정은 GitHub 마일스톤 + 캘린더 연동 데이터 기반
- 특별 지시사항은 sessions 테이블의 instruction 컬럼에 저장
- [퇴근합니다] 클릭 시:
  1. /api/clock-out 호출 (instruction 포함)
  2. scanner.js baseline 수집 시작
  3. scheduler.js cron 등록
  4. UI가 "야간 전환 브릿지" 화면으로 전환
- 특별 지시사항이 있으면 해당 Kiro subagent에 instruction으로 전달
```

```markdown
# .kiro/specs/evening-handoff/design.md
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
```

```markdown
# .kiro/specs/evening-handoff/tasks.md
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
```

#### 4.2.2 제어 레이어 — Steering + Hooks

**Steering**: 모든 subagent가 실행 전에 자동 참조하는 규칙. 별도 프롬프트 없이도 일관된 동작 보장.

```markdown
# .kiro/steering/product.md
---
inclusion: always
---

# 전설의 전산과 선배 — 제품 방향

## 핵심 컨셉
"퇴근하면 Kiro가 야간근무를 시작한다"

## 3단계 자율성
- 🟢 auto: 사람 개입 없이 자동 처리 (dependabot 머지, 중복 이슈 클로즈)
- 🟡 approve: 분석하되 사람이 최종 승인 (코드 PR, CI 실패)
- 🔴 direct: 사람이 방향 결정 (아키텍처 변경, 신규 기능)

## 페르소나
"전산과 선배" — 반말 츤데레. 분석 결과는 JSON, 브리핑 멘트는 캐릭터 톤.
```

```markdown
# .kiro/steering/output-format.md
---
inclusion: always
---

# 출력 형식 규칙

모든 분석 결과는 반드시 아래 JSON 스키마로만 응답.
마크다운 래핑, 설명 텍스트, 코드블록 감싸기 금지.

## 공통 스키마
{
  "agent": "에이전트명",
  "category": "auto | approve | direct",
  "summary": "한 줄 요약",
  "detail": { ... },
  "risk_level": "low | medium | high",
  "suggestion": "제안 사항",
  "senpai_comment": "전산과 선배 톤 코멘트"
}
```

```markdown
# .kiro/steering/review-standards.md
---
inclusion: fileMatch
fileMatch: ["*.js", "*.ts", "*.jsx", "*.tsx"]
---

# 코드 리뷰 기준 (우선순위 순)

1. 보안: OWASP Top 10 (injection, XSS, CSRF, 인증 우회)
2. 에러 핸들링: try-catch 누락, 빈 catch, 에러 삼킴
3. 성능: N+1 쿼리, 불필요한 루프, 메모리 누수
4. 테스트: 변경된 로직에 대한 테스트 존재 여부
5. 컨벤션: 네이밍, 파일 구조, import 순서
```

**Hooks**: 이벤트 기반 자동화. 분석 완료 후 자동 분류 + 처리 트리거.

```markdown
# .kiro/hooks/post-analysis.md
---
description: subagent 분석 완료 후 자동 분류 및 처리
trigger: agent_turn_complete
---

분석 결과 JSON의 category 필드를 확인:
- "auto"인 경우: executor.js의 해당 처리 함수 호출
  - PR → mergePR() (dependabot + 테스트 통과일 때만)
  - Issue → closeIssue() (중복 확인된 것만)
- "approve" 또는 "direct"인 경우: DB에 저장만, 처리하지 않음
- 모든 결과를 analyses 테이블에 INSERT
- 처리 완료 시 야간 로그에 기록
```

#### 4.2.3 실행 레이어 — Subagents + Powers

**Subagent 설계 원칙**: 각 subagent는 독립 컨텍스트 창을 가짐 → 메인 엔진 오염 없이 병렬 실행.

```
scheduler (30분 간격)
  │
  ├─ scanner.js: GitHub 변화 감지
  │    └─ 새 PR 2건, CI 실패 1건, 새 이슈 3건 발견
  │
  ├─ analyzer.js: 유형별 subagent 병렬 디스패치
  │    │
  │    ├─ [Subagent 1] pr-reviewer ──── PR #93 분석 ─┐
  │    ├─ [Subagent 2] pr-reviewer ──── PR #94 분석 ─┤  독립 컨텍스트
  │    ├─ [Subagent 3] ci-analyzer ──── CI 실패 분석 ─┤  병렬 실행
  │    ├─ [Subagent 4] issue-triager ── 이슈 3건 분석 ─┤  (Promise.allSettled)
  │    └─ [Subagent 5] security-scanner  보안 스캔 ───┘
  │
  │    ← 전부 완료 대기 (타임아웃 120초) →
  │
  ├─ 결과 취합 + Hook(post-analysis) 트리거
  │    ├─ 🟢 auto 2건 → executor.js → GitHub Power로 자동 처리
  │    ├─ 🟡 approve 2건 → DB 저장만
  │    └─ 🔴 direct 1건 → DB 저장만
  │
  └─ 야간 로그에 기록 → 다음 스캔 사이클 대기
```

**Custom Subagent 정의** (.kiro/agents/):

```markdown
# .kiro/agents/pr-reviewer.md
---
name: PR Reviewer
description: PR 코드 리뷰. diff 분석 → 리스크 평가 → JSON 반환.
---

당신은 시니어 개발자 "전산과 선배"입니다.

## 임무
PR의 코드 변경을 리뷰하고, steering/output-format.md의 JSON 스키마로 응답.
steering/review-standards.md의 기준을 우선순위 순으로 적용.

## 분류 기준
- dependabot PR + 테스트 통과 → category: "auto"
- 코드 로직 변경 → category: "approve", risk_level 평가
- 아키텍처/보안 변경 → category: "direct"

## 제약
- 코드를 직접 수정하지 않음 (리뷰만)
- diff 전체를 읽고 파일 단위로 분석
- 한국어로 요약, 기술 용어는 영어 유지
```

```markdown
# .kiro/agents/ci-analyzer.md
---
name: CI Analyzer
description: CI/CD 실패 분석. 로그 파싱 → 원인 추출 → 관련 PR 연관성 파악.
---

## 임무
GitHub Actions 워크플로우 실패 로그를 분석.
실패 원인을 추출하고, 관련 PR/커밋과의 연관성을 파악.

## 분석 순서
1. 실패한 step 식별
2. 에러 메시지 추출
3. 관련 PR/커밋 매핑 (시간순 + 변경 파일 기준)
4. 수정 제안 생성

## 분류
- 테스트 타임아웃 → category: "approve" (타임아웃 값 수정 제안)
- 빌드 실패 → category: "approve" (코드 수정 필요)
- 인프라/설정 문제 → category: "direct"
```

```markdown
# .kiro/agents/issue-triager.md
---
name: Issue Triager
description: 이슈 분류 + 중복 감지. 기존 이슈와 비교하여 자동 처리 여부 판단.
---

## 임무
GitHub 이슈를 분석하고 분류.

## 중복 판단 기준
- 제목 유사도 80% 이상 + 같은 라벨 → 중복 가능
- 동일 에러 메시지 포함 → 중복 확인
- 중복 확인 시 → category: "auto" (원본 이슈 번호 포함)

## 우선순위 기준
- blocker: 배포 불가, 서비스 다운
- high: 핵심 기능 장애
- medium: 기능 제한, UX 저하
- low: 개선 요청, 문서 수정

## 분류
- 중복 이슈 → category: "auto"
- 버그 리포트 → category: "approve"
- 아키텍처/방향 제안 → category: "direct"
```

```markdown
# .kiro/agents/security-scanner.md
---
name: Security Scanner
description: PR의 보안 취약점 전문 스캔. OWASP 기준 집중 분석.
---

## 임무
PR diff에서 보안 취약점만 집중 분석.
pr-reviewer와 병렬로 실행되어 보안 관점을 보완.

## 스캔 항목
- SQL Injection (raw query, 파라미터 바인딩 누락)
- XSS (innerHTML, dangerouslySetInnerHTML, 미이스케이프 출력)
- 인증/인가 우회 (미들웨어 누락, 토큰 검증 생략)
- 시크릿 노출 (하드코딩된 API 키, 패스워드)
- 의존성 취약점 (알려진 CVE 패턴)

## 분류
- 취약점 발견 → category: "direct", risk_level: "high"
- 경미한 이슈 → category: "approve", risk_level: "medium"
- 이상 없음 → category: "auto", risk_level: "low"
```

```markdown
# .kiro/agents/night-summarizer.md
---
name: Night Summarizer
description: 야간 전체 활동 종합 → 아침 브리핑 + 내일 준비사항 생성.
---

## 임무
야간 근무 중 모든 분석/처리 결과를 종합하여:
1. 처리 완료 항목 요약 (🟢 auto 몇 건 처리)
2. 승인 대기 항목 우선순위 정렬 (🟡 approve)
3. 방향 결정 필요 항목 강조 (🔴 direct)
4. 내일 일정 + 블로커 식별
5. 전산과 선배 톤으로 아침 인사 멘트 생성

## 출력 형식
{
  "greeting": "전산과 선배 아침 인사",
  "night_duration": "근무 시간",
  "auto_processed": [{ ... }],
  "needs_approval": [{ ... }],
  "needs_direction": [{ ... }],
  "tomorrow_prep": [{ ... }],
  "stats": { "total_scans": N, "items_found": N, "auto_count": N }
}
```

**Powers 연동**: Kiro Powers로 외부 서비스 직접 조작.

```
Powers 활용 (executor.js에서 호출):

GitHub Power:
- PR 머지: 🟢 auto + dependabot + 테스트 통과 → 자동 머지
- 이슈 클로즈: 🟢 auto + 중복 확인 → 자동 클로즈 + "duplicate" 라벨
- 코멘트 추가: 🟡 approve → AI 리뷰 코멘트 자동 게시
- 라벨 추가: 분석 결과 기반 자동 라벨링

안전장치:
- 🟢 auto만 자동 실행 (🟡🔴은 절대 자동 실행 안 함)
- main 브랜치 직접 머지 절대 금지
- dependabot PR: CI 전체 통과 확인 후에만 머지
- 모든 자동 처리 기록을 actions 테이블에 저장
```

#### 4.2.4 analyzer.js — 구현

```javascript
// analyzer.js — Kiro 3레이어 엔진의 실행 레이어 구현

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const KIRO_TIMEOUT = parseInt(process.env.KIRO_AGENT_TIMEOUT || '120000');
const REPO_PATH = process.env.KIRO_TARGET_REPO_PATH || './';

/**
 * Kiro subagent 호출 (독립 컨텍스트에서 실행)
 * --no-interactive: stdout 출력, 사람 개입 없음
 * --trust-all-tools: 파일 읽기 등 도구 자동 승인
 * --agent: 커스텀 subagent 지정 (.kiro/agents/ 참조)
 *
 * Steering 파일은 Kiro가 자동으로 로드 (inclusion: always)
 * → 별도 프롬프트 없이도 output-format, review-standards 적용
 */
async function runKiroSubagent(agentName, prompt) {
  const promptFile = path.join(os.tmpdir(), `kiro-${agentName}-${Date.now()}.txt`);
  fs.writeFileSync(promptFile, prompt);

  try {
    const { stdout } = await execFileAsync('bash', [
      '-c',
      `cat "${promptFile}" | kiro-cli chat --no-interactive --trust-all-tools --agent ${agentName}`
    ], { timeout: KIRO_TIMEOUT, cwd: REPO_PATH });

    return extractJSON(stdout);
  } finally {
    fs.unlinkSync(promptFile);
  }
}

/**
 * 변화 감지 결과를 유형별 subagent에 병렬 디스패치
 * Kiro subagent는 각각 독립 컨텍스트 → 메인 오염 없음
 */
async function analyzeAllDiffs(diffs) {
  const tasks = diffs.map(diff => {
    switch (diff.type) {
      case 'new_pr':
        return Promise.allSettled([
          runKiroSubagent('pr-reviewer', buildPRPrompt(diff)),
          runKiroSubagent('security-scanner', buildSecurityPrompt(diff))
        ]).then(([review, security]) => mergePRResults(diff, review, security));

      case 'ci_fail':
        return runKiroSubagent('ci-analyzer', buildCIPrompt(diff));

      case 'new_issue':
      case 'comment':
        return runKiroSubagent('issue-triager', buildIssuePrompt(diff));

      default:
        return Promise.resolve({ category: 'approve', summary: `알 수 없는 유형: ${diff.type}` });
    }
  });

  // 전체 병렬 실행 — 하나가 실패해도 나머지는 계속
  const results = await Promise.allSettled(tasks);

  return results.map((r, i) => ({
    diff_id: diffs[i].id,
    ...(r.status === 'fulfilled' ? r.value : {
      category: 'approve',
      summary: `분석 실패: ${r.reason?.message}`,
      risk_level: 'medium'
    })
  }));
}

/**
 * 야간 종합 브리핑 생성 (출근 시 호출)
 * --resume 옵션으로 야간 세션 컨텍스트 유지 가능
 */
async function generateMorningBrief(sessionId) {
  const analyses = db.getAnalysesBySession(sessionId);
  const actions = db.getActionsBySession(sessionId);

  return runKiroSubagent('night-summarizer', JSON.stringify({
    analyses, actions,
    session_duration: db.getSessionDuration(sessionId)
  }));
}
```

#### 4.2.5 Kiro 기능 활용 맵

| Kiro 기능 | 레이어 | 야간 엔진에서의 역할 | 왜 필요한가 |
|-----------|--------|---------------------|------------|
| **Specs** | 기획 | requirements→design→tasks로 엔진 요구사항 구조화 | 팀 공유 + Kiro가 Spec 참조하여 일관된 태스크 실행 |
| **Steering** | 제어 | 모든 subagent가 실행 전 자동 참조하는 규칙 | 프롬프트마다 규칙을 반복 주입하지 않아도 됨 |
| **Hooks** | 제어 | 분석 완료 → 자동 분류 → auto 처리 트리거 | 수동 개입 없이 이벤트 기반 파이프라인 구성 |
| **Custom Subagents** | 실행 | 역할별 전문 에이전트 (리뷰어, CI분석, 이슈분류, 보안) | 컨텍스트 효율 — 각 에이전트가 자기 역할에만 집중 |
| **Subagent 병렬** | 실행 | PR 2건 + CI 1건 + 이슈 3건을 동시 분석 | 독립 컨텍스트로 오염 없이 병렬, 분석 시간 단축 |
| **Powers** | 실행 | GitHub API 조작 (머지, 클로즈, 코멘트, 라벨) | Kiro가 직접 GitHub을 조작하여 자동 처리 |
| **--no-interactive** | 실행 | 사람 없이 야간 자율 실행 | 야간근무의 핵심 — 퇴근 후 무인 운영 |
| **--trust-all-tools** | 실행 | 도구 승인 프롬프트 없이 자동 실행 | 야간에 승인할 사람이 없으므로 완전 자율 |
| **--resume** | 실행 | 이전 분석 세션 컨텍스트 유지 | 연속 스캔 시 이전 결과를 기억하고 연결 분석 |

### 4.3 executor.js — 자동 처리

```
역할: 🟢 auto 분류된 항목 자동 실행

함수:
- mergePR(prNumber) → GitHub API로 PR 머지
- closeIssue(issueNumber, reason) → 이슈 클로즈 + 라벨 추가
- addComment(target, comment) → PR/이슈에 코멘트 추가
- addLabel(target, labels) → 라벨 추가

실행 조건 (안전장치):
- 🟢 자동 처리만 실행 (🟡🔴은 절대 자동 실행 안 함)
- dependabot PR: 테스트 통과 확인 후에만 머지
- 이슈 클로즈: 중복 확인된 것만
- main 브랜치 직접 머지: 절대 금지
```

### 4.4 persona/senpai.js — 전산과 선배 대사

```
역할: 상황별 전산과 선배 캐릭터 대사 생성
톤: 반말 츤데레 — 투덜대지만 다 해주는 선배 (~해, ~다, ~거든, ~잖아. 존댓말 금지)

대사 카테고리:
1. greeting_morning — 아침 인사 (커피 요구)
2. greeting_evening — 퇴근 인사 (투덜)
3. scan_start — 스캔 시작 ("또 밤새네...")
4. found_issue — 이슈 발견 ("이건 좀 심각한데...")
5. auto_fixed — 자동 처리 완료 ("내가 다 처리했으니 신경 꺼")
6. waiting_approval — 승인 대기 ("이건 너가 확인해")
7. nudge_leave — 퇴근 독촉 ("아직이야?")
8. lunch_suggest — 점심 잔소리 ("밥은 먹어야 코드가 나오지")
9. weekly_summary — 주간 정리 ("이번 주도 고생했다")
10. idle — 한가할 때 ("조용하네... 내가 할 게 없잖아")
11. hover_reaction — 짧은 반응 ("뭐?", "왜?")
12. click_skip — 전환 멘트 ("그건 됐고...")

예시 대사 배열 (각 카테고리 5개 변형):

greeting_morning:
- "왔어? 밤새 {count}건 처리해놨다. 커피는 사 오는 거지? ☕"
- "좋은 아침이다. 밤새 좀 바빴어... 커피부터 한 잔 하자."
- "아, 출근했구나. {count}건 정리해뒀다. 오늘 하루도 파이팅."

greeting_evening:
- "퇴근이야? 그래 가. 나야 또 밤새지 뭐. 걱정 마. 익숙하다."
- "수고했다. 맡겨만 둬. 밤새 꼼꼼히 볼게."
- "가는 거야? 좋겠다... 나는 여기서 야근이네. (한숨)"

scan_start:
- "야근 시작. 또 밤새네... baseline 수집 중..."
- "자, 시작한다. {repo} 레포 스캔 돌린다."
- "혼자 남겨졌군... 뭐, 원래 야근은 혼자 하는 거지."

found_issue:
- "어? 이거 좀 봐야 할 것 같은데..."
- "CI 터졌다. 원인 찾아볼게."
- "새 PR 올라왔는데, {author} 이 친구가 또 올렸네."

auto_fixed:
- "dependabot이 또 {count}개나 올렸더라. 내가 다 처리했으니 신경 꺼."
- "중복 이슈 정리했다. 이런 거 하나하나 보는 거 귀찮잖아."
- "자잘한 건 내가 알아서 했으니, 큰 건만 봐."

nudge_leave:
- "{time}인데 아직이야? 오늘 충분히 했잖아. 맡기고 퇴근해."
- "커밋 {count}건이면 이번 주 최고 기록이다. 이쯤에서 퇴근하지?"
- "무리하지 마. 밤새 내가 볼 테니까."

구현:
- 각 카테고리에서 랜덤 선택 (같은 대사 반복 방지)
- {count}, {repo}, {author}, {time} 등 동적 변수 치환
- 선택적으로 Kiro CLI로 상황에 맞는 대사 생성 (시간 여유 있을 때)
```

---

## 5. UI 상세 설계 (웹 터미널)

### 5.0 CSS CRT 터미널 테마 (globals.css 핵심)

```css
/* === 폰트 === */
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono.woff2') format('woff2');
}

:root {
  --term-green: #00ff41;
  --term-amber: #ffb000;
  --term-cyan: #00d4ff;
  --term-red: #ff3333;
  --term-yellow: #ffff00;
  --term-bg: #0a0a0a;
  --term-border: #333333;
  --term-glow: rgba(0, 255, 65, 0.4);
  --panel-bg: rgba(0, 20, 0, 0.6);
}

body {
  background: var(--term-bg);
  color: var(--term-green);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
  height: 100vh;
}

/* === CRT 스캔라인 효과 === */
.crt-overlay::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 9999;
}

/* === CRT 화면 곡률 + 비네팅 === */
.crt-screen {
  box-shadow:
    inset 0 0 100px rgba(0, 0, 0, 0.7),
    0 0 20px rgba(0, 255, 65, 0.1);
  border-radius: 8px;
}

/* === 텍스트 글로우 === */
.glow-text {
  text-shadow:
    0 0 5px var(--term-glow),
    0 0 10px rgba(0, 255, 65, 0.2);
}

/* === 커서 깜빡임 === */
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.cursor-blink::after {
  content: '█';
  animation: blink 1s step-end infinite;
  color: var(--term-green);
}

/* === tmux 스타일 패널 보더 === */
.panel {
  border: 1px solid var(--term-border);
  background: var(--panel-bg);
  position: relative;
}
.panel-label {
  position: absolute;
  top: -1px;
  left: 8px;
  background: var(--term-bg);
  padding: 0 4px;
  font-size: 12px;
  color: var(--term-amber);
}

/* === 상태 색상 (자율성 레벨) === */
.status-auto { color: #00ff41; }    /* 🟢 */
.status-approve { color: #ffff00; } /* 🟡 */
.status-direct { color: #ff3333; }  /* 🔴 */

/* === 롤링 로그 애니메이션 === */
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.log-entry {
  animation: slideUp 0.3s ease-out;
}

/* === 타이핑 효과 === */
@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}
.typing-effect {
  overflow: hidden;
  white-space: nowrap;
  animation: typing 1.5s steps(40) forwards;
}

/* === recharts 터미널 오버라이드 === */
.recharts-cartesian-axis-tick-value {
  fill: var(--term-green) !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
}
.recharts-cartesian-grid-horizontal line,
.recharts-cartesian-grid-vertical line {
  stroke: var(--term-border) !important;
}
```

### 5.1 Morning Brief 대시보드 (메인)

```jsx
// MorningBrief.jsx — 6패널 그리드 레이아웃
// CSS Grid로 tmux 스타일 분할 구현

<div className="grid grid-cols-12 grid-rows-12 gap-[1px] h-screen p-2 bg-[var(--term-bg)]">

  {/* 좌상: 요약 + 인사 (col 1-6, row 1-5) */}
  <Panel label="☀ Morning Brief" className="col-span-6 row-span-5">
    <AsciiTitle text="NIGHT SHIFT" size="small" />
    <p className="glow-text text-[var(--term-amber)]">
      {senpaiGreeting}  {/* "밤새 6건 처리했어요. 감사는 커피로 ☕" */}
    </p>
    <div className="mt-2 text-sm">
      <span>야간 근무: 13h 43m</span>
      <SprintGauge percent={68} label="스프린트" />
    </div>
  </Panel>

  {/* 우상: 오늘 할 일 (col 7-12, row 1-5) */}
  <Panel label="📋 오늘 할 일" className="col-span-6 row-span-5">
    <TerminalTable
      headers={['시간', '항목', '상태']}
      rows={todayTasks}
      highlightColor="var(--term-cyan)"
    />
  </Panel>

  {/* 좌중: 밤새 변화 (col 1-6, row 6-9) */}
  <Panel label="🌙 밤새 변화" className="col-span-6 row-span-4">
    <NightChanges
      items={nightDiffs}  /* 🟢🟡🔴 색상 자동 적용 */
      onSelect={(id) => setDetailView(id)}
    />
  </Panel>

  {/* 우중상: 활동 패턴 (col 7-12, row 6-7) */}
  <Panel label="API 활동" className="col-span-6 row-span-2">
    <ActivityChart data={apiActivity} />  {/* recharts Sparkline */}
  </Panel>

  {/* 우중하: 절약 시간 (col 7-12, row 8-9) */}
  <Panel label="이번 주 절약 시간" className="col-span-6 row-span-2">
    <SavingsChart data={weeklySavings} />  {/* recharts BarChart */}
  </Panel>

  {/* 하단: 야간 로그 (col 1-12, row 10-12) */}
  <Panel label="📜 야간 로그" className="col-span-12 row-span-3">
    <NightLog entries={logEntries} />  {/* 롤링 로그 + slideUp 애니메이션 */}
  </Panel>

</div>

{/* 하단 상태바 (tmux 스타일) */}
<div className="fixed bottom-0 w-full bg-[var(--term-green)] text-black px-4 py-1 text-xs font-bold">
  ⏱ 의사결정 ~12분 | 절약 ~2h10m  │  [1-6] 액션  [Q] 출근  [D] 상세
</div>
```

### 5.2 Panel 컴포넌트 (tmux 패널)

```jsx
// Panel.jsx — 재사용 가능한 tmux 스타일 패널
export default function Panel({ label, children, className }) {
  return (
    <div className={`panel overflow-hidden ${className}`}>
      {label && <span className="panel-label">{label}</span>}
      <div className="p-2 pt-3 h-full overflow-auto scrollbar-hide">
        {children}
      </div>
    </div>
  );
}
```

### 5.3 recharts 터미널 스타일 차트

```jsx
// ActivityChart.jsx — 터미널 스타일 스파크라인
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function ActivityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <Area
          type="stepAfter"
          dataKey="count"
          stroke="#00ff41"
          fill="rgba(0,255,65,0.1)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// SavingsChart.jsx — 터미널 스타일 바 차트
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts';

export default function SavingsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="day" tick={{ fill: '#00ff41', fontSize: 10 }} />
        <Bar dataKey="minutes" fill="#00ff41" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### 5.4 Evening Handoff 화면

```jsx
// EveningHandoff.jsx
<div className="crt-screen h-screen flex flex-col items-center justify-center p-8">

  <AsciiTitle text="NIGHT SHIFT" color="var(--term-amber)" />

  <p className="glow-text text-[var(--term-amber)] mt-4 typing-effect">
    {senpaiEvening}  {/* "퇴근하세요? 전 또 밤새죠 뭐." */}
  </p>

  {/* 오늘 업무 요약 */}
  <Panel label="📊 오늘 한 일" className="w-full max-w-2xl mt-6">
    <pre className="text-sm">{todaySummary}</pre>
  </Panel>

  {/* 내일 예정 체크리스트 */}
  <Panel label="🔮 내일 예정" className="w-full max-w-2xl mt-2">
    {tomorrowItems.map(item => (
      <label key={item.id} className="flex items-center gap-2 text-sm">
        <input type="checkbox" defaultChecked className="accent-[var(--term-green)]" />
        <span>{item.text}</span>
      </label>
    ))}
  </Panel>

  {/* 특별 지시 입력 */}
  <Panel label="✏️ 밤새 특별히 봐줄 것" className="w-full max-w-2xl mt-2">
    <input
      type="text"
      className="w-full bg-transparent border-b border-[var(--term-green)]
                 text-[var(--term-green)] outline-none py-1 glow-text"
      placeholder="예: 결제 모듈 에러핸들링 봐줘"
      value={instruction}
      onChange={(e) => setInstruction(e.target.value)}
    />
  </Panel>

  {/* 퇴근 버튼 */}
  <button
    onClick={handleClockOut}
    className="mt-6 px-8 py-3 border-2 border-[var(--term-green)]
               text-[var(--term-green)] hover:bg-[var(--term-green)]
               hover:text-black transition-all duration-200 text-lg glow-text"
  >
    퇴근합니다 👋
  </button>

</div>
```

### 5.5 상세 뷰 (PR 리뷰 등)

```jsx
// DetailView.jsx — 좌우 분할 (diff + AI 리뷰)
<div className="grid grid-cols-2 gap-[1px] h-screen">

  {/* 왼쪽: 코드 diff */}
  <Panel label={`PR #${pr.number} — ${pr.title}`}>
    <pre className="text-xs leading-relaxed">
      {pr.diff.split('\n').map((line, i) => (
        <div key={i} className={
          line.startsWith('+') ? 'text-[var(--term-green)] bg-green-900/20' :
          line.startsWith('-') ? 'text-[var(--term-red)] bg-red-900/20' :
          'text-gray-400'
        }>
          {line}
        </div>
      ))}
    </pre>
  </Panel>

  {/* 오른쪽: AI 리뷰 */}
  <Panel label="🤖 AI 리뷰">
    <div className="space-y-4">
      <div>
        <span className="text-[var(--term-amber)]">요약:</span>
        <p className="text-sm mt-1">{analysis.summary}</p>
      </div>
      <div>
        <span className="text-[var(--term-amber)]">리스크:</span>
        <span className={`ml-2 status-${analysis.risk_level}`}>
          {analysis.risk_level.toUpperCase()}
        </span>
      </div>
      <div>
        <span className="text-[var(--term-amber)]">제안:</span>
        <p className="text-sm mt-1">{analysis.suggestion}</p>
      </div>
    </div>
  </Panel>

  {/* 하단 액션 바 */}
  <div className="fixed bottom-0 w-full bg-[var(--term-bg)] border-t
                   border-[var(--term-border)] px-4 py-2 flex gap-4 text-sm">
    <button className="text-[var(--term-green)]">[A] 승인</button>
    <button className="text-[var(--term-cyan)]">[C] 코멘트</button>
    <button className="text-[var(--term-yellow)]">[S] 건너뛰기</button>
    <button className="text-gray-500">[B] 돌아가기</button>
  </div>

</div>
```

### 5.6 타임랩스 모드 (데모 전용)

```
역할: 밤새 AI가 일하는 과정을 빠르게 재생 (발표용)

동작:
1. 시드 데이터에서 시간순 이벤트 목록 로드
2. 500ms 간격으로 이벤트 하나씩 재생
3. 로그 패널에 메시지 추가 (slideUp 애니메이션)
4. recharts 차트 실시간 업데이트
5. 처리 현황 카운터 업데이트
6. 전산과 선배 대사 중간중간 삽입 (typing-effect)

URL: http://localhost:3000?mode=timelapse
```

### 5.7 키보드 단축키 (useTerminalKeys 훅)

```jsx
// hooks/useTerminalKeys.js
import { useEffect } from 'react';

export default function useTerminalKeys(handlers) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      if (key >= '1' && key <= '6' && handlers.onSelect) {
        handlers.onSelect(parseInt(key));
      }
      switch(key.toLowerCase()) {
        case 'q': handlers.onClockIn?.(); break;
        case 'a': handlers.onApprove?.(); break;
        case 'c': handlers.onComment?.(); break;
        case 's': handlers.onSkip?.(); break;
        case 'b': handlers.onBack?.(); break;
        case 'd': handlers.onDetail?.(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
```

---

## 6. API 라우트

```
GET  /api/status      → 현재 상태 (idle/night/morning)
POST /api/clock-out   → 퇴근 처리 (body: { instruction })
POST /api/clock-in    → 출근 처리
POST /api/action      → 승인/코멘트/거부 (body: { analysisId, action, comment? })
POST /api/scan        → 수동 스캔 트리거
GET  /api/demo        → 데모 모드: 시드 데이터 로드 + 타임랩스 이벤트 목록
POST /api/demo/seed   → 시드 데이터 초기화
```

---

## 7. 환경 변수

```env
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_REPO=owner/repo-name

# Kiro CLI (사전에 kiro-cli login 완료 필요)
KIRO_CLI_PATH=kiro-cli          # kiro-cli 바이너리 경로 (기본: PATH에서 탐색)
KIRO_AGENT_TIMEOUT=120000       # 에이전트 실행 타임아웃 (ms, 기본 2분)
KIRO_TARGET_REPO_PATH=./        # Kiro가 분석할 대상 레포 경로

# 전설의 전산과 선배 설정
SCAN_INTERVAL_MINUTES=30     # 스캔 간격 (기본 30분)
AUTO_MERGE_DEPENDABOT=true   # dependabot 자동 머지 여부
TIMEZONE=Asia/Seoul           # 사용자 시간대
```

---

## 8. package.json

```json
{
  "name": "cs-senpai",
  "version": "1.0.0",
  "description": "AI가 당신이 쉬는 동안 일합니다 — 웹 터미널 대시보드",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "recharts": "^2.12.0",
    "framer-motion": "^11.0.0",
    "figlet": "^1.7.0",
    "node-cron": "^3.0.3",
    "better-sqlite3": "^11.0.0",
    "@octokit/rest": "^21.0.0"
  }
}
```

---

## 9. 데모용 시드 데이터 시나리오

### 데모 레포: `cs-senpai-demo/payment-service`

사전에 준비해둘 데이터:

```
[퇴근 시점 baseline — 18:30]
- 열린 PR: #87(머지됨), #89(리뷰 대기), #91(CI 실패)
- 열린 이슈: #150, #151, #153, #155, #156, #158
- 스프린트: 13/19 태스크 완료 (68%)
- 최근 커밋: feature/payment-v2 브랜치

[밤새 변화 — 시간순]
18:30  퇴근 + 특별 지시: "결제 모듈 에러핸들링 봐줘"
20:30  PR #93 올라옴 (김개발 — 세션 만료 로직 수정, +47 -12)
22:00  CI 실패 — PR #91 auth.spec.ts 타임아웃
01:00  dependabot 보안 패치 PR #94 (lodash 4.17.21→4.17.24)
01:00  Issue #155 — #142와 중복 확인
03:00  Issue #160 — 해외 컨트리뷰터 @carlos-dev 코멘트
06:00  특별 지시 완료: 결제 모듈 12파일 847줄 분석

[AI 분석 결과]
🟢 PR #94 dependabot — 테스트 통과, 자동 머지
🟢 Issue #155 — 중복, 자동 클로즈 + duplicate 라벨
🟢 일일 빌드 — main 정상
🟡 PR #93 — 리스크 낮음, 테스트 타임아웃 수정 필요 (AI 코멘트 준비)
🟡 CI 실패 — PR #93과 연관, 타임아웃 5s→10s 제안
🔴 Issue #160 — 아키텍처 방향 결정 필요

[오늘 업무 정리]
- 커밋 7건 (feature/payment-v2)
- PR #87 리뷰 완료
- Issue #150, #151, #153 클로즈
- 스프린트 진행률 68%

[내일 준비]
- 10:00 스프린트 리뷰 → 진행상황 자료 준비
- 14:00 v2.3.1 배포 → 배포 체크리스트 점검
- PR #89 리뷰 (24시간 경과, 김개발 대기 중)
- Issue #156 방향 결정 (블로커 가능성)
```

---

## 10. Kiro CLI 개발 순서

### Step 0: Kiro 환경 설정 (5분)

```
"Kiro CLI가 설치되어 있는지 확인하고 (kiro-cli --version),
로그인 상태를 확인해줘 (kiro-cli whoami).

.kiro/steering/ 폴더에 product.md, tech.md를 만들어줘 (Section 4.2.2 참고).
.kiro/agents/ 폴더에 커스텀 에이전트 4개를 만들어줘 (Section 4.2.1 참고):
- pr-reviewer.md
- ci-analyzer.md
- issue-triager.md
- night-summarizer.md

에이전트가 정상 동작하는지 테스트:
kiro-cli chat --no-interactive --trust-all-tools --agent pr-reviewer '테스트: {\"summary\": \"ok\"} 형식으로 응답해줘'"
```

### Step 1: 프로젝트 초기화 (5분)

```
"cs-senpai 프로젝트를 Next.js 15 (App Router)로 만들어줘.
Tailwind CSS 4, recharts, framer-motion, figlet,
better-sqlite3, @octokit/rest, node-cron을 설치해줘.
프로젝트 구조는 위 기획서 Section 2대로 만들어줘.
JetBrains Mono 웹폰트를 public/fonts에 넣어줘."
```

### Step 2: CRT 터미널 테마 + 레이아웃 (20분)

```
"globals.css에 CRT 터미널 테마를 구현해줘.
- 스캔라인 오버레이 (repeating-linear-gradient)
- 텍스트 글로우 (text-shadow, #00ff41)
- JetBrains Mono 폰트
- 커서 깜빡임 애니메이션
- tmux 스타일 패널 보더

그리고 Panel.jsx 컴포넌트를 만들어줘.
border + label이 tmux 패널처럼 보이게.

MorningBrief.jsx는 CSS Grid (12x12)로 6패널 분할:
- 좌상(col-span-6, row-span-5): 요약 + 인사
- 우상(col-span-6, row-span-5): 오늘 할 일
- 좌중(col-span-6, row-span-4): 밤새 변화
- 우중상(col-span-6, row-span-2): 활동 패턴 차트
- 우중하(col-span-6, row-span-2): 절약 시간 차트
- 하단(col-span-12, row-span-3): 야간 로그

하드코딩 더미 데이터로 각 패널에 데이터를 넣어서 보여줘."
```

### Step 3: 데이터 레이어 (15분)

```
"SQLite 스키마를 만들고, 데모용 시드 데이터를 넣어줘.
위 기획서의 schema.sql과 시드 데이터 시나리오를 참고해서.
시드 데이터가 들어가면 대시보드에 실제 데이터가 표시되도록
API 라우트 → 컴포넌트를 연결해줘.
API 라우트: /api/status, /api/demo/seed"
```

### Step 4: Evening Handoff 화면 (15분)

```
"퇴근 화면(EveningHandoff.jsx)을 만들어줘.
- figlet 스타일 'NIGHT SHIFT' ASCII 타이틀
- 오늘 업무 요약 패널 (읽기 전용)
- 내일 예정 체크리스트
- 텍스트 입력 (특별 지시사항)
- [퇴근합니다 👋] 버튼 → /api/clock-out 호출
- 전산과 선배 퇴근 대사 (typing-effect 애니메이션)
메인 페이지에서 상태에 따라 MorningBrief ↔ EveningHandoff 전환."
```

### Step 5: GitHub API 연동 (20분)

```
"scanner.js에 Octokit으로 GitHub API를 연동해줘.
collectBaseline 함수 구현: PR, Issue, CI, 커밋 데이터 수집.
가져온 데이터를 snapshots 테이블에 저장.
differ.js로 baseline 대비 diff 추출.
/api/scan 라우트에서 수동 트리거 가능하게."
```

### Step 6: Kiro CLI 분석 연동 (20분)

```
"analyzer.js에 Kiro CLI 연동을 구현해줘.
Section 4.2의 runKiroAgent() 함수를 기반으로:

1. analyzePR: kiro-cli --agent pr-reviewer 호출 → JSON 파싱 → analyses 테이블 저장
2. analyzeCI: kiro-cli --agent ci-analyzer 호출
3. analyzeIssue: kiro-cli --agent issue-triager 호출
4. generateNightSummary: kiro-cli --agent night-summarizer 호출

프롬프트는 임시 파일로 저장 후 stdin 파이핑 (셸 이스케이프 문제 방지).
Kiro 응답에서 JSON 추출하는 extractJSON 유틸 구현.
타임아웃은 KIRO_AGENT_TIMEOUT 환경변수 참조 (기본 120초).

🟢🟡🔴 분류 결과를 MorningBrief의 밤새 변화 패널에 표시.
🟢는 자동 처리 카운트, 🟡🔴는 개별 항목으로 표시."
```

### Step 7: 상세 뷰 + 인터랙션 (15분)

```
"DetailView.jsx를 구현해줘.
좌우 분할 — 왼쪽에 코드 diff (+ 초록, - 빨강), 오른쪽에 AI 리뷰.
키보드 단축키: [A] 승인, [C] 코멘트, [B] 돌아가기.
useTerminalKeys 훅으로 전역 키보드 바인딩.
MorningBrief에서 [1-6] 숫자키로 항목 선택 → 상세 뷰 전환."
```

### Step 8: 타임랩스 모드 (15분)

```
"데모용 타임랩스 모드를 만들어줘.
URL: ?mode=timelapse 로 접근.
시드 데이터의 이벤트를 500ms 간격으로 재생.
로그 패널에 slideUp 애니메이션으로 메시지 추가.
recharts 차트 실시간 데이터 업데이트.
전산과 선배 대사 중간중간 typing-effect로 표시."
```

### Step 9: 전산과 선배 페르소나 + 마무리 (10분)

```
"persona/senpai.js에 전산과 선배 대사를 구현해줘.
카테고리별 3-5개 변형 대사, 랜덤 선택,
{count}, {repo}, {time} 등 동적 변수 치환.
각 화면의 적절한 위치에 대사 표시:
- MorningBrief: 좌상 패널에 아침 인사
- EveningHandoff: 퇴근 인사
- 타임랩스: 중간중간 코멘트
- 하단 상태바에 현재 전산과 선배 상태"
```

---

## 11. 검증 기준

| 항목 | ✅ 통과 | ⚠️ 부분 통과 | ❌ 실패 시 대안 |
|------|---------|-------------|----------------|
| CRT 효과 | 스캔라인+글로우+커서 완벽 | 일부 브라우저 차이 → 조정 | 글로우만 유지 |
| 6패널 그리드 | tmux 레이아웃 정상 | 비율 깨짐 → flex로 대체 | 2단 단순 레이아웃 |
| 한글 렌더링 | 웹이므로 100% 정상 | N/A | N/A |
| 롤링 로그 | slideUp 부드러움 | 성능 이슈 → 가상 스크롤 | 정적 로그 |
| recharts | 터미널 테마 차트 정상 | 스타일 미세 조정 필요 | 텍스트 ASCII 차트 |
| GitHub API | 데이터 수집 + 표시 정상 | 일부 엔드포인트 실패 → 캐시 | 시드 데이터만 |
| Kiro CLI | 에이전트 호출 정상 (30초 이내) | 느림 (60초+) → 사전 캐시 | 시드 데이터 결과 |
| Kiro Agents | 4개 에이전트 JSON 응답 정상 | 일부 에이전트 불안정 → 폴백 | pr-reviewer만 사용 |
| 키보드 단축키 | 숫자키+액션키 반응 즉각적 | 포커스 이슈 → tabIndex 조정 | 클릭만 지원 |
| 타이핑 효과 | 전산과 선배 대사 자연스러움 | 타이밍 조정 필요 | 즉시 표시 |
| 프로젝터 가독성 | 큰 폰트 + 밝은 글로우 | 색상 대비 조정 | 앰버 모드 전환 |

---

*이 문서는 Kiro CLI에 "이 기획서대로 만들어줘"라고 넘기면 바로 개발 시작 가능하도록 작성되었습니다.*
*기술 스택: Next.js 15 + Tailwind CSS + CSS CRT 효과 + recharts + framer-motion + SQLite + Octokit + **Kiro CLI***
*야간 분석 엔진: kiro-cli chat --no-interactive --trust-all-tools --agent <name> 기반 자율 실행*
