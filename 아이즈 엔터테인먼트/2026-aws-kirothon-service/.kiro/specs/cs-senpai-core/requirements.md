# 요구사항 문서: cs-senpai-core

## 소개

cs-senpai-core는 "전설의 전산과 선배 (CS-Senpai)" 프로젝트의 공유 기반 레이어다.
퇴근 화면(evening-handoff), 야간 엔진(night-engine), 출근 대시보드(morning-brief) 3개 스펙이 공통으로 의존하는
프로젝트 초기화, 데이터 레이어, CRT 터미널 테마, 공유 컴포넌트, 유틸리티, 상태 라우팅, 데모 모드를 정의한다.

## 용어 사전

- **App**: Next.js 15 App Router 기반 웹 애플리케이션
- **DB_Module**: better-sqlite3 기반 SQLite 데이터베이스 초기화 및 쿼리 헬퍼 모듈 (db.js)
- **Seed_Module**: 데모용 시드 데이터를 생성하는 모듈 (seed.js)
- **CRT_Theme**: CRT 모니터를 모방한 CSS 테마 (스캔라인, 글로우, 비네팅, 커서 깜빡임 등)
- **Panel_Component**: tmux 스타일 보더와 라벨을 가진 재사용 가능한 패널 컴포넌트
- **AsciiTitle_Component**: figlet 라이브러리를 사용하여 ASCII 아트 타이틀을 렌더링하는 컴포넌트
- **Terminal_Component**: CRT 효과를 래핑하는 터미널 컨테이너 컴포넌트
- **Ascii_Util**: figlet 라이브러리를 래핑하여 ASCII 텍스트를 생성하는 유틸리티 (lib/ascii.js)
- **TerminalKeys_Hook**: 전역 키보드 바인딩을 관리하는 React 훅 (useTerminalKeys.js)
- **Senpai_Module**: 전산과 선배 페르소나의 대사를 생성하는 모듈 (persona/senpai.js)
- **Status_API**: 현재 시스템 상태(idle/night/morning)를 조회하는 API 라우트 (/api/status)
- **Demo_API**: 데모 모드용 시드 데이터 및 타임랩스 이벤트를 제공하는 API 라우트 (/api/demo)
- **Timelapse_Component**: 시드 데이터 이벤트를 시간순으로 재생하는 데모 컴포넌트
- **Router_Page**: 시스템 상태에 따라 적절한 화면을 렌더링하는 메인 페이지 (page.js)

## 요구사항

### 요구사항 1: 프로젝트 초기화

**사용자 스토리:** 개발자로서, Next.js 15 App Router 프로젝트가 올바르게 셋업되어 있기를 원한다. 그래야 evening-handoff, night-engine, morning-brief 스펙을 구현할 수 있다.

#### 수용 기준

1. THE App SHALL Next.js 15 App Router 구조로 초기화되고, pnpm을 패키지 매니저로 사용한다
2. THE App SHALL tailwindcss v4, recharts, framer-motion, figlet, better-sqlite3, @octokit/rest, node-cron을 프로덕션 의존성으로 포함한다
3. THE App SHALL JetBrains Mono 웹폰트 파일을 public/fonts/ 디렉토리에 포함한다
4. THE App SHALL .env.local 파일에 GITHUB_TOKEN, GITHUB_REPO, KIRO_CLI_PATH, KIRO_AGENT_TIMEOUT, KIRO_TARGET_REPO_PATH, SCAN_INTERVAL_MINUTES, AUTO_MERGE_DEPENDABOT, TIMEZONE 환경변수를 정의한다
5. THE App SHALL package.json에 dev, build, start 스크립트를 포함한다
6. THE App SHALL .env.example 파일을 제공하여 필수 환경변수 목록과 기본값을 문서화한다

### 요구사항 2: SQLite 데이터베이스 스키마

**사용자 스토리:** 개발자로서, 야간 근무 세션의 모든 데이터를 구조화하여 저장할 수 있기를 원한다. 그래야 evening-handoff, night-engine, morning-brief가 동일한 데이터 소스를 공유할 수 있다.

#### 수용 기준

1. THE DB_Module SHALL sessions 테이블을 생성한다 (컬럼: id INTEGER PRIMARY KEY, type TEXT, timestamp TEXT, instruction TEXT, created_at TEXT)
2. THE DB_Module SHALL snapshots 테이블을 생성한다 (컬럼: id INTEGER PRIMARY KEY, session_id INTEGER FK→sessions, type TEXT, data TEXT JSON, captured_at TEXT)
3. THE DB_Module SHALL diffs 테이블을 생성한다 (컬럼: id INTEGER PRIMARY KEY, session_id INTEGER FK→sessions, type TEXT, ref_id TEXT, title TEXT, data TEXT JSON, detected_at TEXT)
4. THE DB_Module SHALL analyses 테이블을 생성한다 (컬럼: id INTEGER PRIMARY KEY, diff_id INTEGER FK→diffs, category TEXT, summary TEXT, detail TEXT JSON, risk_level TEXT, suggestion TEXT, analyzed_at TEXT)
5. THE DB_Module SHALL actions 테이블을 생성한다 (컬럼: id INTEGER PRIMARY KEY, analysis_id INTEGER FK→analyses, action_type TEXT, status TEXT, result TEXT, executed_at TEXT)
6. THE DB_Module SHALL daily_summaries 테이블을 생성한다 (컬럼: id INTEGER PRIMARY KEY, date TEXT, commits_count INTEGER, prs_reviewed INTEGER, issues_closed INTEGER, summary TEXT, tomorrow_prep TEXT, created_at TEXT)
7. THE DB_Module SHALL 모든 외래 키 제약 조건에 대해 FOREIGN KEY 참조 무결성을 활성화한다

### 요구사항 3: 데이터베이스 초기화 및 쿼리 헬퍼

**사용자 스토리:** 개발자로서, SQLite 데이터베이스를 간편하게 초기화하고 쿼리할 수 있기를 원한다. 그래야 각 스펙에서 반복적인 DB 코드를 작성하지 않아도 된다.

#### 수용 기준

1. THE DB_Module SHALL better-sqlite3를 사용하여 SQLite 데이터베이스 연결을 초기화한다
2. THE DB_Module SHALL WAL 모드를 활성화하여 읽기/쓰기 동시성을 지원한다
3. THE DB_Module SHALL 데이터베이스 파일이 존재하지 않으면 자동으로 생성한다
4. THE DB_Module SHALL 테이블이 존재하지 않으면 자동으로 스키마를 생성한다 (CREATE TABLE IF NOT EXISTS)
5. THE DB_Module SHALL 단일 행 조회(get), 다중 행 조회(all), 삽입(insert), 실행(run) 쿼리 헬퍼 함수를 제공한다
6. IF 데이터베이스 연결에 실패하면, THEN THE DB_Module SHALL 에러를 로깅하고 명확한 에러 메시지를 반환한다

### 요구사항 4: 시드 데이터

**사용자 스토리:** 개발자로서, 데모 시연용 시드 데이터를 한 번에 생성할 수 있기를 원한다. 그래야 GitHub 연동 없이도 대시보드를 시연할 수 있다.

#### 수용 기준

1. THE Seed_Module SHALL sessions 테이블에 clock_out 세션 1건과 clock_in 세션 1건을 삽입한다
2. THE Seed_Module SHALL snapshots 테이블에 baseline 스냅샷 데이터를 삽입한다 (PR, 이슈, CI 상태 포함)
3. THE Seed_Module SHALL diffs 테이블에 new_pr, ci_fail, new_issue 유형의 diff 데이터를 각각 삽입한다
4. THE Seed_Module SHALL analyses 테이블에 auto, approve, direct 카테고리의 분석 결과를 각각 삽입한다
5. THE Seed_Module SHALL actions 테이블에 자동 처리 완료된 액션 데이터를 삽입한다
6. THE Seed_Module SHALL daily_summaries 테이블에 야간 근무 요약 데이터를 삽입한다
7. THE Seed_Module SHALL 기존 데이터를 삭제한 후 시드 데이터를 삽입한다 (멱등성 보장)
8. WHEN Seed_Module이 실행되면, THE Seed_Module SHALL 삽입된 레코드 수를 콘솔에 출력한다

### 요구사항 5: CRT 터미널 테마 CSS

**사용자 스토리:** 개발자로서, 레트로 CRT 모니터 감성의 터미널 테마를 전역으로 적용할 수 있기를 원한다. 그래야 모든 화면에서 일관된 시각적 경험을 제공할 수 있다.

#### 수용 기준

1. THE CRT_Theme SHALL CSS 변수를 정의한다: --term-green (#00ff41), --term-amber (#ffb000), --term-cyan (#00d4ff), --term-red (#ff3333), --term-yellow (#ffff00), --term-bg (#0a0a0a), --term-border (#333333)
2. THE CRT_Theme SHALL JetBrains Mono @font-face를 선언하고 기본 폰트로 적용한다
3. THE CRT_Theme SHALL body::after 의사 요소로 CRT 스캔라인 오버레이를 렌더링한다 (repeating-linear-gradient, pointer-events: none, z-index: 9999)
4. THE CRT_Theme SHALL CRT 화면 곡률 효과를 box-shadow 비네팅으로 구현한다
5. THE CRT_Theme SHALL 텍스트에 text-shadow 글로우 효과를 적용한다
6. THE CRT_Theme SHALL @keyframes blink 애니메이션으로 커서 깜빡임을 구현한다
7. THE CRT_Theme SHALL tmux 스타일 패널 보더 스타일을 정의한다 (1px solid var(--term-border))
8. THE CRT_Theme SHALL 상태 색상 클래스를 정의한다: .status-auto (green), .status-approve (yellow), .status-direct (red)
9. THE CRT_Theme SHALL @keyframes slideUp 애니메이션으로 롤링 로그 효과를 구현한다
10. THE CRT_Theme SHALL @keyframes typing 애니메이션으로 타이핑 효과를 구현한다
11. THE CRT_Theme SHALL recharts 차트 컴포넌트에 터미널 스타일 오버라이드를 적용한다 (축 틱: #00ff41, 그리드: #333333)
12. THE CRT_Theme SHALL 최소 폰트 크기 14px를 보장하여 1280x720 프로젝터 환경에서 가독성을 확보한다
13. THE CRT_Theme SHALL .no-scanline 클래스가 적용된 요소에는 스캔라인 오버레이를 표시하지 않는다

### 요구사항 6: 전역 레이아웃

**사용자 스토리:** 개발자로서, CRT 오버레이와 전역 스타일이 모든 페이지에 자동 적용되기를 원한다. 그래야 각 화면에서 개별적으로 테마를 설정하지 않아도 된다.

#### 수용 기준

1. THE App SHALL layout.js에서 CRT 스캔라인 오버레이를 전역으로 렌더링한다
2. THE App SHALL layout.js에서 globals.css를 임포트하여 CRT_Theme를 전역 적용한다
3. THE App SHALL layout.js에서 HTML 메타데이터(title, description)를 설정한다
4. THE App SHALL layout.js에서 JetBrains Mono 폰트를 body에 적용한다
5. THE App SHALL layout.js에서 배경색을 var(--term-bg)로 설정한다
