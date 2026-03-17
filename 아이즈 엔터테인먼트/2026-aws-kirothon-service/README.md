```
 ██████╗███████╗    ███████╗███████╗███╗   ██╗██████╗  █████╗ ██╗
██╔════╝██╔════╝    ██╔════╝██╔════╝████╗  ██║██╔══██╗██╔══██╗██║
██║     ███████╗    ███████╗█████╗  ██╔██╗ ██║██████╔╝███████║██║
██║     ╚════██║    ╚════██║██╔══╝  ██║╚██╗██║██╔═══╝ ██╔══██║██║
╚██████╗███████║    ███████║███████╗██║ ╚████║██║     ██║  ██║██║
 ╚═════╝╚══════╝    ╚══════╝╚══════╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝

┌──────────────────────────────────┐
│   전 설 의   전 산 과   선 배     │
│   LEGENDARY NIGHT SHIFT SYSTEM   │
└──────────────────────────────────┘
```

> *"퇴근 버튼을 누르면, AI의 근무가 시작된다."*

<br>

## 왔어? 이거 뭔지 설명해줄게.

90년대 전설의 전산과 선배가 AI로 돌아왔다.

너 퇴근하면 내 근무가 시작되는 거야. 밤새 GitHub 모니터링하고, PR 리뷰하고, CI 터지면 원인 찾고, dependabot이 또 올린 거 알아서 처리하고, 내일 뭐 해야 하는지 정리해놓고... 그리고 아침에 네가 출근하면 레트로 터미널 대시보드로 브리핑해주는 거지.

**감사는 커피 한 잔으로 받겠다. ☕**

```
(◕‿◕)/
c[_]っ    ← 이게 나다. 밤새 커피 들고 코드 보는 선배.
 /|\
 / \
```

<br>

## 핵심이 뭐냐면

```
나 = 주간근무.  AI = 야간근무.  겹치지 않는다.  인수인계만 있을 뿐.

                    ┌──────────┐
  18:30 퇴근 ──────▶│ 선배 출근 │──────▶ 밤새 GitHub 감시
                    └──────────┘
                         │
              ┌──────────┴──────────┐
              │  스캔 → 분석 → 처리  │  ← 30분마다 반복
              └──────────┬──────────┘
                         │
                    ┌──────────┐
  08:00 출근 ◀──────│ 선배 퇴근 │──────▶ 브리핑 준비 완료
                    └──────────┘
```

- **야간근무 교대 모델** — 너는 주간, 나는 야간. Clippy처럼 일하는 중에 간섭 안 해.
- **Pull 모델** — 로컬에서 주기적으로 GitHub API 호출. webhook 같은 거 설정 필요 없어.
- **3단계 자율성** — 내가 알아서 할 수 있는 건 하고, 못하는 건 아침에 물어볼게.
  - 🟢 **자동처리** — dependabot 패치, 중복 이슈 등. 내가 알아서 했으니 신경 꺼.
  - 🟡 **승인필요** — PR 리뷰, CI 실패 분석. 리뷰는 해뒀는데 승인은 네가 해.
  - 🔴 **방향결정** — 아키텍처 변경, 설계 결정. 이건 내가 함부로 못 건드려.

<br>

## 어떻게 생겼냐고?

### Morning Brief — 출근하면 보이는 6패널 대시보드

```
┌─ 전산과 선배 ──────┬─ 요약 ──────────┬─ 밤새 변화 ─────────┬─ 오늘 할 일 ──────┐
│                    │                 │                     │                   │
│  (◕‿◕)/           │ DORA Metrics    │ 🟢 dependabot 머지  │ 10:00 스프린트    │
│  c[_]っ            │ 코드 건강도 7.2 │ 🟡 PR #93 리뷰대기  │ 14:00 배포 예정   │
│   /|\              │ AI 분석 2847줄  │ 🟡 CI 실패 분석완료  │ ⚠ PR #89 리뷰    │
│   / \              │ 리뷰 5건 완료   │ 🔴 아키텍처 방향결정  │ ⚠ Issue #156     │
│  ☕ x3             │                 │ 🟢 중복이슈 클로즈   │                   │
│                    │                 │ 🟢 결제모듈 분석완료  │                   │
│ "밤새 6건 처리     │ 스프린트 68%    │                     │                   │
│  했어. 커피는?"    │ ████████░░░     │ [1-6] 상세 보기      │ 예상 3.5시간      │
├─ 야간 로그 ────────┴─────────────────┼─ 업무 기록 ─────────┴───────────────────┤
│ [06:00] 결제 모듈 847줄 분석 완료    │ 어제: 커밋 8 ████████                   │
│ [01:00] dependabot → 자동 머지 ✓    │       PR   5 █████                      │
│ [22:00] ⚠ CI 실패! 원인 분석 완료   │       이슈 4 ████                       │
│ [18:30] 야근 시작... baseline 수집   │ LV.5 ████████████░░░░ EXP 41/50        │
└──────────────────────────────────────┴─────────────────────────────────────────┘
 ⏱ 의사결정 ~12분 | 절약 ~2h10m  │  [1-6] 상세  [Q] 퇴근  [?] 도움말
```

### CRT 터미널 감성

하이텔/PC통신 시절 그 느낌 아냐? 그거다.

- **스캔라인 오버레이** — CSS `repeating-linear-gradient`로 1px 줄무늬
- **인광체 글로우** — `text-shadow: 0 0 5px rgba(0,255,65,0.5)` 초록빛 번짐
- **CRT 비네팅** — `box-shadow: inset 0 0 80px` 모서리 어두워지는 효과
- **커서 깜빡임** — `█` 블록 커서가 1초 간격으로 깜빡
- **20초 부팅 시퀀스** — BIOS POST + 하드웨어 체크 + 선배 등장... 진짜 옛날 컴퓨터 켜는 느낌

### 색상 팔레트

```
주간(Day)                          야간(Night)
═══════                            ═══════
#00ff41 ██ 인광체 초록 (기본)      #ffb000 ██ 앰버 (야간 기본)
#00d4ff ██ 시안 (정보/하이라이트)   #ffb000 ██ 앰버 글로우
#ff3333 ██ 빨강 (위험/직접처리)     #ff3333 ██ 빨강 (경고)
#ffb000 ██ 앰버 (패널 라벨)        #111111 ██ 배경 (더 어두움)
#111111 ██ 배경 (거의 검정)
```

<br>

## 화면 구성

### 1. 스플래시 스크린 (첫 방문)

```
Phase 0  ─▶  AIZ ENTERTAINMENT 블록 아트 등장 (비프음)
Phase 1  ─▶  CRT 전원 ON (점 → 수평선 → 화면 확장)
Phase 2  ─▶  BIOS POST (CPU: Claude Sonnet 4 ...OK)
Phase 3  ─▶  CS Senpai ASCII 로고
Phase 4  ─▶  선배 등장: "걱정 마, 내가 다 봐줄게. ☕"
Phase 5  ─▶  서비스 설명 3줄
Phase 6  ─▶  프로그레스 바 ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 100%
Phase 7  ─▶  ▌ SYSTEM READY ▌
```

### 2. Morning Brief — 6패널 대시보드

출근하면 보이는 메인 화면. CSS Grid 12x12로 tmux 스타일 패널 분할.

| 패널 | 위치 | 내용 |
|------|------|------|
| 전산과 선배 | 좌상 | 선배 캐릭터 + 대사 + 에너지/커피 게이지 + 야근 진행바 |
| 요약 | 중상 | DORA 메트릭 + 코드 건강도 + AI 작업통계 + 스프린트 |
| 밤새 변화 | 중앙 (Primary) | 🟢🟡🔴 분류된 6건의 야간 변화. 클릭/숫자키로 상세 |
| 오늘 할 일 | 우상 | 체크리스트 (클릭으로 토글). 블로커 ⚠ 표시 |
| 야간 로그 | 좌하 | 시간순 로그. 저녁/야간/심야/새벽 그룹핑 |
| 업무 기록 | 우하 | 어제 통계 (ASCII 바차트) / 위클리 RPG 여정 |

### 3. Evening Handoff — 퇴근 화면

좌측은 앰버 조명의 퇴근 분위기 + 선배 캐릭터, 우측은 핸드오프 폼.

- 오늘 한 일 요약 (읽기 전용)
- 내일 예정 체크리스트 (편집 가능)
- "밤새 특별히 봐줄 것" 텍스트 입력
- **[퇴근합니다 👋]** → 오버레이: *"야간 근무 이관 완료. 맡겨둬."*

### 4. Night Active — 야간 근무 실시간

앰버 테마로 전환. 선배가 밤새 일하는 모습을 시뮬레이션.

- 25개 스크립트 이벤트 (22:00~01:00)
- 실시간 로그 + 카운터 (PR / 이슈 / 자동처리 / 대기)
- 스캔 카운트다운 (300초 타이머)
- 선배 대사 로테이션 (15~25초마다)

### 5. Detail View — AI 리뷰 상세

좌우 분할 — 왼쪽에 코드 diff / CI 로그 / 이슈 비교, 오른쪽에 AI 분석.

- PR: 컬러 diff (`+` 초록, `-` 빨강, `@@` 시안) + 보안 취약점 박스
- CI: 에러 로그 + 실패 원인 + 타임아웃 제안
- Issue: 중복 비교 + 유사도 퍼센트 바
- `[P]` 키로 kiro-cli 용 프롬프트 생성 + 클립보드 복사

### 6. Timelapse — 데모 재생

`?mode=timelapse`로 접근. 12시간 야간 근무를 ~10초로 압축 재생.

<br>

## 키보드 단축키

터미널이니까 당연히 키보드로 다 된다.

| 키 | Morning Brief | 상세 보기 | 퇴근 준비 | 어디서든 |
|---|---|---|---|---|
| `1`-`6` | 항목 선택 → 상세 | - | - | - |
| `Q` | 퇴근 화면으로 | - | - | - |
| `A` | - | 승인 | - | - |
| `C` | - | 코멘트 토글 | - | - |
| `S` | - | 건너뛰기 | - | - |
| `P` | - | 프롬프트 복사 | - | - |
| `E` | - | - | - | 출근 (야간→주간) |
| `Esc` | - | 돌아가기 | - | 닫기 |
| `?` | - | - | - | 도움말 |

<br>

## 전산과 선배 페르소나

투덜대면서도 다 해주는 츤데레 선배. 100% 반말. 존댓말 금지.

```
아침 출근:  "왔어? 밤새 6건 처리해놨다. 커피는 사 오는 거지? ☕"
저녁 퇴근:  "퇴근이야? 그래 가. 나야 또 밤새지 뭐. 걱정 마. 익숙하다."
스캔 시작:  "야근 시작. 또 밤새네... baseline 수집 중..."
이슈 발견:  "새 PR 올라왔는데, 김개발이 또 올렸네."
자동 처리:  "dependabot이 또 올렸더라. 내가 다 처리했으니 신경 꺼."
승인 대기:  "이건 내가 함부로 못 건드려. 너가 확인해."
퇴근 독촉:  "19:30인데 아직이야? 오늘 충분히 했잖아. 맡기고 퇴근해."
점심 잔소리: "라면은 안 돼. 어제도 라면이었잖아. 제대로 된 밥 먹어."
한가할 때:  "조용하네... 내가 할 게 없잖아. 이런 밤이 제일 불안하다."
```

### 선배의 상태 시스템

- **에너지** — 18:30 100%에서 06:30 20%까지 감소
- **커피** — 2시간마다 +1잔. 에너지 40% 이하면 보너스 1잔. 5잔 이상이면 앰버 글로우, 7잔이면 빨강
- **무드** — `coffee` / `working` / `alert` / `happy` / `tired` / `thinking`
- **눈 깜빡임** — 3~5초마다 `◕` → `─` → `◕` (150ms)
- **ASCII 포즈** — 무드별 2~3프레임 애니메이션 (1.5초 간격)

<br>

## 기술 스택

```
┌─────────────────────────────────────┐
│  Next.js 15 + Tailwind CSS 4 (Web) │  ← 프레임워크
│  + CSS CRT 효과 (스캔라인/글로우)    │  ← 레트로 터미널 감성
│  ├─ recharts        (터미널 차트)    │
│  ├─ framer-motion   (페이지 전환)    │
│  ├─ figlet          (ASCII 아트)     │
│  └─ JetBrains Mono  (모노스페이스)   │
├─────────────────────────────────────┤
│  API Routes (Next.js App Router)    │  ← 백엔드
│  ├─ /api/clock-out   퇴근 처리       │
│  ├─ /api/clock-in    출근 처리       │
│  ├─ /api/status      상태 조회       │
│  ├─ /api/action      승인/코멘트     │
│  ├─ /api/scan        수동 스캔       │
│  ├─ /api/task        할일 토글       │
│  └─ /api/demo        데모 데이터     │
├─────────────────────────────────────┤
│  Core Engine (Node.js)              │  ← 야간 근무 엔진
│  ├─ scanner.js      GitHub pull 수집 │
│  ├─ differ.js       baseline diff   │
│  ├─ analyzer.js     Kiro CLI 분석  │
│  ├─ executor.js     자동 처리 실행   │
│  ├─ scheduler.js    node-cron 스케줄 │
│  ├─ summarizer.js   업무 정리 생성   │
│  ├─ night-scan.js   야간 스캔 오케스트레이션 │
│  └─ night-events.js 야간 이벤트 시나리오    │
├─────────────────────────────────────┤
│  SQLite (better-sqlite3)            │  ← 로컬 DB
│  ├─ sessions   (퇴근/출근 기록)      │
│  ├─ snapshots  (baseline 스냅샷)     │
│  ├─ diffs      (감지된 변화)         │
│  ├─ analyses   (AI 분석 결과)        │
│  ├─ actions    (자동 처리 기록)      │
│  └─ daily_summaries (일일 요약)      │
├─────────────────────────────────────┤
│  External APIs                      │
│  ├─ GitHub REST API (Octokit)       │
│  └─ Kiro CLI Agents (AI 분석)        │
└─────────────────────────────────────┘
```

| 구분 | 기술 | 왜 이걸 썼냐면 |
|------|------|---------------|
| 프레임워크 | Next.js 15 (App Router) | 프론트 + API 통합. 설정 뚝딱. |
| 스타일 | Tailwind CSS 4 + CSS CRT 효과 | 빠른 개발 + 커스텀 CRT 효과 |
| 차트 | recharts | 터미널 테마 커스터마이징 쉬움 |
| 애니메이션 | framer-motion + CSS @keyframes | 페이지 전환 + 타이핑 + 스캔라인 |
| 폰트 | JetBrains Mono (woff2) | 터미널 감성 모노스페이스 |
| DB | SQLite (better-sqlite3) | 로컬, 설치 불필요, WAL 모드 |
| GitHub | @octokit/rest | PR, Issue, CI, 커밋 수집 |
| AI | Kiro CLI Agents | 코드 분석 + 리뷰 + 분류 |
| 스케줄러 | node-cron | 30분 간격 야간 스캔 |
| ASCII | figlet | 타이틀 텍스트 생성 |

<br>

## 프로젝트 구조

```
cs-senpai/
├── src/
│   ├── app/
│   │   ├── layout.js              # 루트 레이아웃 (한국어, 메타)
│   │   ├── page.js                # 메인 컨트롤러 (상태머신, 전환)
│   │   ├── globals.css            # CRT 터미널 테마의 심장
│   │   └── api/
│   │       ├── clock-out/route.js # 퇴근 API
│   │       ├── clock-in/route.js  # 출근 API
│   │       ├── status/route.js    # 상태 조회 API
│   │       ├── action/route.js    # 승인/코멘트/스킵 API
│   │       ├── scan/route.js      # 수동 스캔 API
│   │       ├── task/route.js      # 할일 토글 API
│   │       ├── task/prep/route.js # 내일 준비 저장 API
│   │       └── demo/route.js      # 데모 데이터 API
│   ├── components/
│   │   ├── SplashScreen.jsx       # 20초 CRT 부팅 시퀀스 (7단계)
│   │   ├── MorningBrief.jsx       # 6패널 대시보드
│   │   ├── EveningHandoff.jsx     # 퇴근 핸드오프 화면
│   │   ├── NightActive.jsx        # 야간 근무 시뮬레이션
│   │   ├── DetailView.jsx         # AI 리뷰 상세 (5가지 타입)
│   │   ├── Timelapse.jsx          # 데모 재생 모드
│   │   ├── HelpOverlay.jsx        # 키보드 도움말
│   │   ├── Panel.jsx              # tmux 스타일 패널
│   │   ├── AsciiTitle.jsx         # figlet ASCII 타이틀
│   │   ├── CommandBar.jsx         # 하단 tmux 상태바
│   │   ├── Terminal.jsx           # CRT 터미널 래퍼
│   │   └── widgets/
│   │       ├── SenpaiPanel.jsx    # 선배 캐릭터 (무드/에너지/커피)
│   │       ├── SummaryPanel.jsx   # DORA + 코드건강 + AI통계
│   │       ├── NightChanges.jsx   # 🟢🟡🔴 밤새 변화 목록
│   │       ├── TodayTasks.jsx     # 체크리스트 (토글 애니메이션)
│   │       ├── NightLog.jsx       # 시간그룹 야간 로그
│   │       ├── WorkLogPanel.jsx   # 어제통계 + 위클리 RPG
│   │       ├── KpiStrip.jsx       # 상단 KPI 스트립
│   │       ├── ActivityChart.jsx  # recharts 활동 차트
│   │       ├── SavingsChart.jsx   # recharts 절약 시간
│   │       └── SprintGauge.jsx    # ASCII 스프린트 바
│   ├── core/
│   │   ├── scanner.js             # GitHub 데이터 수집 (Octokit)
│   │   ├── differ.js              # baseline 대비 diff 추출
│   │   ├── analyzer.js            # Kiro CLI 분석 + 분류
│   │   ├── executor.js            # 자동 처리 (머지/클로즈/코멘트)
│   │   ├── scheduler.js           # node-cron 야간 스케줄러
│   │   ├── summarizer.js          # 업무 정리 + 내일 준비
│   │   ├── night-scan.js          # 야간 스캔 오케스트레이션
│   │   └── night-events.js        # 야간 이벤트 시나리오
│   ├── data/
│   │   ├── db.js                  # SQLite 싱글톤 + 쿼리 헬퍼
│   │   ├── schema.sql             # 6테이블 스키마
│   │   └── seed.js                # 데모 시나리오 시드 데이터
│   ├── persona/
│   │   └── senpai.js              # 전산과 선배 대사 생성기
│   ├── hooks/
│   │   └── useTerminalKeys.js     # 키보드 단축키 훅
│   └── lib/
│       ├── ascii.js               # figlet 래퍼
│       └── sparkline.js           # Unicode 스파크라인
├── public/fonts/
│   └── JetBrainsMono.woff2        # 터미널 폰트
├── data/
│   └── cs-senpai.db               # SQLite DB (자동 생성)
├── .kiro/
│   ├── agents/                    # Kiro CLI 에이전트 정의
│   │   ├── pr-reviewer.md
│   │   ├── ci-analyzer.md
│   │   ├── issue-triager.md
│   │   ├── night-summarizer.md
│   │   └── security-scanner.md
│   ├── hooks/                     # Kiro 자동화 훅
│   ├── powers/                    # Kiro 파워 (night-ops)
│   ├── skills/                    # Kiro 스킬 (5종)
│   └── steering/                  # 프로젝트 가이드라인
├── docs/
│   ├── CS-Senpai-Technical-Spec.md    # 상세 기술 기획서
│   ├── CS-Senpai-Technical-Spec-v2.md # 기술 기획서 v2
│   ├── CS-Senpai-Technical-Spec-v3.md # 기술 기획서 v3
│   ├── CS-Senpai-Technical-Spec-v4.md # 기술 기획서 v4
│   ├── Kiroton-Brainstorm.md          # 브레인스토밍 기록
│   └── superpowers/                   # Kiro superpowers 문서
├── package.json
├── next.config.js
└── postcss.config.mjs
```

<br>

## 시작하기

### 설치

```bash
git clone https://github.com/aiz-contentdev/cs-senpai.git
cd cs-senpai
npm install
```

### 환경변수 설정

```bash
cp .env.local.example .env.local
```

```env
# GitHub (없으면 데모 모드로 동작)
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_REPO=owner/repo-name

# Kiro CLI (없으면 시드 데이터 사용)
KIRO_CLI_PATH=kiro-cli
KIRO_AGENT_TIMEOUT=120000
KIRO_TARGET_REPO_PATH=./

# 설정
SCAN_INTERVAL_MINUTES=30
AUTO_MERGE_DEPENDABOT=true
TIMEZONE=Asia/Seoul
```

### 실행

```bash
# 개발 모드
npm run dev
# → http://localhost:3000

# 타임랩스 데모
# → http://localhost:3000?mode=timelapse

# 프로덕션 빌드
npm run build && npm start
```

> GitHub 토큰이나 Kiro CLI 없어도 걱정 마. 시드 데이터로 데모 모드가 알아서 돌아간다.

<br>

## 데모 시나리오

시드 데이터에 완전한 하룻밤 시나리오가 들어있다.

```
[18:30]  퇴근 + 특별 지시: "결제 모듈 에러핸들링 봐줘"

[20:30]  🟡 PR #93 올라옴 — 김개발, 세션 만료 로직 수정 (+47 -12)
[22:00]  🟡 CI 실패 — auth.spec.ts 타임아웃 (PR #93 연관)
[01:00]  🟢 dependabot 보안 패치 PR #94 — 자동 머지 ✓
[01:00]  🟢 Issue #155 — #142와 중복 확인, 자동 클로즈 ✓
[03:00]  🔴 Issue #160 — @carlos-dev 아키텍처 제안 (방향 결정 필요)
[06:00]  🟢 결제 모듈 분석 완료 — 12파일 847줄, 에러핸들링 미비 3건

[08:00]  출근 → Morning Brief에 6건 정리 완료
         "왔어? 밤새 6건 처리해놨다. 커피는 사 오는 거지? ☕"
```

<br>

## 야간 근무 엔진

```
                    collectBaseline()
                         │
            ┌────────────▼────────────┐
            │  GitHub API (Octokit)   │
            │  ├─ pulls.list         │
            │  ├─ issues.list        │
            │  ├─ actions.runs       │
            │  └─ repos.commits      │
            └────────────┬────────────┘
                         │
                    extractDiff()
                         │
            ┌────────────▼────────────┐
            │  Kiro CLI Agents        │
            │  ├─ analyzePR()        │
            │  ├─ analyzeCI()        │
            │  └─ analyzeIssue()     │
            └────────────┬────────────┘
                         │
                    categorize()
                         │
              ┌──────────┼──────────┐
              │          │          │
           🟢 auto   🟡 approve  🔴 direct
              │          │          │
          executor()   저장만     저장만
          (머지/클로즈)  (아침에    (아침에
                       승인 요청)  방향 결정)
```

### 안전장치

- 🟢 자동 처리만 실행 (🟡🔴은 **절대** 자동 실행 안 함)
- dependabot PR: 테스트 통과 확인 후에만 머지
- main 브랜치 직접 머지: **금지**
- 이슈 클로즈: 중복 확인된 것만

<br>

## DB 스키마

```sql
sessions         -- 퇴근/출근 세션 (timestamp, instruction)
snapshots        -- baseline 스냅샷 (JSON: prs/issues/ci/commits)
diffs            -- 감지된 변화 (type, ref_id, data JSON)
analyses         -- AI 분석 결과 (category, risk_level, suggestion)
actions          -- 자동 처리 기록 (merge/close/comment, status)
daily_summaries  -- 일일 요약 + 내일 준비 (tomorrow_prep JSON)
```

SQLite WAL 모드. 로컬 파일 하나(`data/cs-senpai.db`). 설치할 것도 없고 설정할 것도 없다.

<br>

## 위클리 RPG 시스템

```
─── 이번 주 여정 ────────────────────────────────
  월  ✓ ─── 화  ✓ ─── 수  ✓ ─── 목  ▶ ─── 금  ░

  공격력(커밋)  ████████████░░░░  73%
  방어력(리뷰)  ██████████░░░░░░  62%
  체력(이슈)    █████████░░░░░░░  58%

  LV.5  ████████████████░░░░  EXP 41/50
  XP = 커밋×3 + PR×5 + 이슈×4
```

<br>

## 개발

```bash
npm run dev     # 개발 서버 (http://localhost:3000)
npm run build   # 프로덕션 빌드
npm start       # 프로덕션 서버
```

### 주요 진입점

- `src/app/page.js` — 앱 상태머신 (shift × view 조합)
- `src/app/globals.css` — CRT 효과 + 테마의 모든 것
- `src/persona/senpai.js` — 선배 대사 (15 카테고리 × 3~5 변형)
- `src/data/seed.js` — 데모 시나리오 데이터

### 상태 전환

```
              [Q]                    [퇴근 버튼]
brief ──────────────▶ handoff ──────────────────▶ active (night)
  ▲                                                  │
  │              [E] 출근 (CRT boot 애니메이션)       │
  └──────────────────────────────────────────────────┘

  brief ──[1-6]──▶ detail ──[Esc/S]──▶ brief
```

<br>

## 만든 사람들

**AIZ ENTERTAINMENT**

키로톤 해커톤 출품작.

<br>

---

```
또 야근이네... 뭐, 원래 야근은 혼자 하는 거지.
맡기고 퇴근해. 밤새 내가 볼 테니까.

                                    — 전산과 선배, 불 꺼진 사무실에서
```
