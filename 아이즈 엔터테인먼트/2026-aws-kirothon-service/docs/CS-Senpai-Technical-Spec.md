# 전설의 전산과 선배 — 상세 기술 기획서

> Kiro CLI 본 개발용 기획 문서
> 이 문서를 Kiro CLI에 넘기면 바로 개발 시작 가능하도록 작성
> **Option C: Next.js 웹 터미널 하이브리드** (2026-03-12 확정)

---

## 1. 제품 개요

### 한 줄 요약

**퇴근 버튼을 누르면 AI의 근무가 시작된다.** 밤새 GitHub을 모니터링하고, PR 리뷰하고, CI 분석하고, 내일 일정을 준비해서, 아침에 출근하면 레트로 터미널 스타일 웹 대시보드로 브리핑한다.

### 핵심 컨셉

- 야간근무 교대 모델: 사용자 = 주간, AI = 야간
- Pull 모델: 로컬에서 주기적으로 GitHub API 호출
- **웹 터미널 UI**: Next.js + Tailwind CSS + CRT 효과 (하이텔/BBS 감성)
- 페르소나: "전산과 선배" — 투덜대면서도 빈틈없이 일하는 선배 개발자

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
├── .env.local                    # 환경변수 (GitHub, AWS, 설정)
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
│   │   ├── analyzer.js            # Bedrock AI 분석
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

### 4.2 analyzer.js — Bedrock AI 분석

```
역할: 수집된 diff를 Bedrock(Kiro)에 보내 분석

함수:
- analyzePR(prData) → PR 코드 리뷰 요약 + 리스크 평가 + 제안
- analyzeCI(ciData, relatedPRs) → CI 실패 원인 분석 + 관련 PR 연관성
- analyzeIssue(issueData) → 이슈 내용 파악 + 우선순위 + 대응 제안
- categorize(analysis) → 🟢 auto / 🟡 approve / 🔴 direct 분류
- executeInstruction(instruction, repoData) → 특별 지시사항 처리
- generateDailySummary(commits, prs, issues) → 오늘 업무 정리
- generateTomorrowPrep(calendar, sprint, pending) → 내일 준비

Bedrock 호출:
- Model: Kiro CLI subagent
- Region: us-east-1 (또는 설정값)
- Max tokens: 분석당 2000
- Temperature: 0.3 (정확성 우선)

프롬프트 템플릿 예시 (PR 분석):
  "당신은 시니어 개발자입니다. 다음 PR의 코드 변경을 리뷰해주세요.
   요약, 리스크 레벨(low/medium/high), 주요 발견사항, 제안을 JSON으로 응답해주세요.

   PR 제목: {title}
   변경 파일: {files}
   Diff: {diff}"

분류 기준:
- 🟢 auto: dependabot + 테스트 통과, 중복 이슈, 빌드 정상 확인
- 🟡 approve: 코드 변경 PR, CI 실패, 의존성 업데이트 (breaking change 가능)
- 🔴 direct: 아키텍처 변경 제안, 새 기능 요청, 방향 결정 필요 이슈
```

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
- 선택적으로 Bedrock로 상황에 맞는 대사 생성 (시간 여유 있을 때)
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

# Amazon Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxx
AWS_SECRET_ACCESS_KEY=xxxx
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-20250514

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
    "@octokit/rest": "^21.0.0",
    "@aws-sdk/client-bedrock-runtime": "^3.500.0"
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

### Step 1: 프로젝트 초기화 (5분)

```
"cs-senpai 프로젝트를 Next.js 15 (App Router)로 만들어줘.
Tailwind CSS 4, recharts, framer-motion, figlet,
better-sqlite3, @octokit/rest, @aws-sdk/client-bedrock-runtime,
node-cron을 설치해줘.
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

### Step 6: Bedrock 분석 연동 (20분)

```
"analyzer.js에 Bedrock 연동을 구현해줘.
PR diff → Kiro CLI → 리뷰 요약 + 리스크 평가 + 🟢🟡🔴 분류.
analyses 테이블에 저장.
MorningBrief의 밤새 변화 패널에 분석 결과 표시.
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
| Bedrock | PR 분석 정상 (10초 이내) | 느림 (30초+) → 캐시 활용 | 사전 캐시 결과 |
| 키보드 단축키 | 숫자키+액션키 반응 즉각적 | 포커스 이슈 → tabIndex 조정 | 클릭만 지원 |
| 타이핑 효과 | 전산과 선배 대사 자연스러움 | 타이밍 조정 필요 | 즉시 표시 |
| 프로젝터 가독성 | 큰 폰트 + 밝은 글로우 | 색상 대비 조정 | 앰버 모드 전환 |

---

*이 문서는 Kiro CLI에 "이 기획서대로 만들어줘"라고 넘기면 바로 개발 시작 가능하도록 작성되었습니다.*
*기술 스택: Next.js 15 + Tailwind CSS + CSS CRT 효과 + recharts + framer-motion + SQLite + Octokit + Bedrock*
*검증 후 통과하면 동일 문서를 Kiro CLI의 product.md / tech.md 기반으로 전환합니다.*
