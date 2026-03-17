# 전설의 전산과 선배 — 기능명세서

> 기능별 요구사항, 수용 기준, API 명세, 데이터 스키마, 에러 처리
> 대상 독자: 백엔드/프론트엔드 개발자

---

## 1. 요구사항 문서

### Requirement 1: Evening Handoff (퇴근 화면)

**User Story:** 개발자로서, 퇴근 시 오늘 업무를 정리하고 Kiro에게 야간 지시사항을 전달하고 싶다. 그래서 아침에 출근했을 때 야간 처리 결과를 바로 확인할 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 Evening Handoff 화면에 진입하면, THE System SHALL Kiro night-summarizer를 호출하여 오늘 업무 요약을 생성하고 표시한다.
2. WHEN 오늘 업무 요약 생성이 완료되면, THE System SHALL 커밋 수, PR 리뷰 수, 이슈 처리 수, 스프린트 진행률을 표시한다.
3. THE System SHALL GitHub 마일스톤 due_date와 대기 중인 PR 데이터를 기반으로 내일 예정 항목을 생성한다.
4. WHEN 내일 예정 항목이 표시되면, THE System SHALL 각 항목을 체크박스로 렌더링하고 사용자가 토글할 수 있게 한다.
5. THE System SHALL 특별 지시사항 텍스트 입력 필드를 제공한다.
6. WHEN 사용자가 [퇴근합니다] 버튼을 클릭하면, THE System SHALL /api/clock-out을 호출하고 sessions 테이블에 퇴근 기록을 저장한다.
7. WHEN 퇴근 API 호출이 완료되면, THE System SHALL GitHub baseline 스냅샷을 수집하고 snapshots 테이블에 저장한다.
8. WHEN baseline 수집이 완료되면, THE System SHALL 30분 간격 cron을 등록한다.
9. WHEN 퇴근 처리가 완료되면, THE System SHALL 전산과 선배 퇴근 대사를 typing-effect 애니메이션으로 표시한다.
10. IF 오늘 업무 요약 생성이 실패하면, THEN THE System SHALL 빈 요약 패널을 표시하고 수동 새로고침 버튼을 제공한다.
11. IF GitHub API 호출이 실패하면, THEN THE System SHALL 에러 메시지를 표시하고 퇴근 처리를 중단한다.

---

### Requirement 2: 야간 자율 엔진

**User Story:** 개발자로서, 퇴근 후 자는 동안 Kiro가 GitHub을 모니터링하고 자잘한 작업을 자동 처리해주길 원한다. 그래서 아침에 출근했을 때 처리 결과만 확인하면 된다.

#### Acceptance Criteria

1. WHILE 야간 모드가 활성화되어 있으면, THE System SHALL 30분 간격으로 GitHub 레포 상태를 수집한다.
2. WHEN 스캔 사이클이 시작되면, THE System SHALL baseline 스냅샷과 현재 상태를 비교하여 변화를 감지한다.
3. WHEN 변화가 감지되면, THE System SHALL night-summarizer 에이전트를 호출하여 분석을 시작한다.
4. THE night-summarizer SHALL 변화 유형에 따라 하위 에이전트(pr-reviewer, ci-analyzer, issue-triager, security-scanner)에 분석을 위임한다.
5. THE System SHALL 모든 분석 결과를 🟢 auto / 🟡 approve / 🔴 direct 세 가지 카테고리로 분류한다.
6. WHEN 분석 결과가 🟢 auto이고 dependabot PR이며 모든 CI 체크가 통과 상태이면, THE System SHALL PR을 자동 머지한다.
7. WHEN 분석 결과가 🟢 auto이고 중복 이슈로 확인되면, THE System SHALL 이슈를 자동 클로즈하고 duplicate 라벨을 추가한다.
8. THE System SHALL main 브랜치에 직접 머지를 절대 실행하지 않는다.
9. WHEN 분석 결과가 🟡 approve 또는 🔴 direct이면, THE System SHALL DB에 저장만 하고 자동 처리를 실행하지 않는다.
10. THE System SHALL 모든 분석 결과와 자동 처리 기록을 SQLite DB에 저장한다.
11. IF Kiro CLI 호출이 실패하면, THEN THE System SHALL 3회 재시도 후 해당 항목을 🟡 approve로 분류하고 에러를 기록한다.
12. IF GitHub API rate limit에 도달하면, THEN THE System SHALL 스캔 간격을 자동으로 확장한다.
13. IF 에이전트 실행이 120초를 초과하면, THEN THE System SHALL 해당 항목을 skip하고 타임아웃 로그를 기록한다.

---

### Requirement 3: Morning Brief (출근 대시보드)

**User Story:** 개발자로서, 출근 후 야간 처리 결과를 한눈에 파악하고 키보드로 빠르게 승인/거부하고 싶다. 그래서 아침 루틴을 10분 안에 끝낼 수 있다.

#### Acceptance Criteria

1. WHEN 사용자가 출근(clock-in) 상태로 전환되면, THE System SHALL 6패널 CRT 터미널 대시보드를 표시한다.
2. THE System SHALL 대시보드를 CSS Grid 12×12 레이아웃으로 구성한다.
3. THE System SHALL 전산과 선배 아침 인사를 typing-effect 애니메이션으로 표시한다.
4. THE System SHALL 밤새 변화 항목을 🟢🟡🔴 색상으로 자율성 레벨을 시각화하여 표시한다.
5. WHEN 사용자가 숫자키 [1-6]을 누르면, THE System SHALL 해당 항목의 Detail View로 전환한다.
6. THE Detail View SHALL 좌측에 코드 diff, 우측에 AI 리뷰를 표시한다.
7. WHEN 사용자가 [A]키를 누르면, THE System SHALL /api/action {action: "approve"}를 호출하고 Morning Brief로 복귀한다.
8. WHEN 사용자가 [C]키를 누르면, THE System SHALL 코멘트 입력 모달을 표시하고 입력 완료 시 /api/action {action: "comment"}를 호출한다.
9. WHEN 사용자가 [S]키를 누르면, THE System SHALL 다음 항목으로 이동하거나 Morning Brief로 복귀한다.
10. THE System SHALL 하단 상태바에 의사결정 소요 시간과 절약 시간을 실시간으로 표시한다.
11. THE System SHALL 하단 상태바에 키보드 단축키 힌트를 상시 노출한다.
12. WHERE 1280×720 해상도 환경이면, THE System SHALL 6패널 레이아웃이 깨지지 않고 표시되어야 한다.
13. THE System SHALL 차트 패널(활동 패턴, 절약 시간)에 CRT 스캔라인 오버레이를 적용하지 않는다.

---

### Requirement 4: 전산과 선배 페르소나

**User Story:** 개발자로서, AI 도구가 딱딱하지 않고 친근한 캐릭터로 말해주길 원한다. 그래서 야간 근무를 맡기는 느낌이 자연스럽다.

#### Acceptance Criteria

1. THE Persona System SHALL 상황별 카테고리(아침 인사, 퇴근 인사, 자동 처리 완료, 승인 대기, 방향 결정 필요)에 맞는 대사를 생성한다.
2. THE Persona System SHALL 각 카테고리에서 최소 3개 변형 대사 중 랜덤으로 선택한다.
3. THE Persona System SHALL 동일한 대사가 연속으로 반복되지 않도록 한다.
4. THE Persona System SHALL {count}, {repo}, {author}, {time} 등 동적 변수를 실제 값으로 치환한다.
5. THE Persona System SHALL 반말 톤을 유지하고 존댓말을 사용하지 않는다.
6. THE Persona System SHALL 이모지를 ☕ 외에는 사용하지 않는다.
7. THE Persona System SHALL "수치 앞, 캐릭터 멘트 뒤" 구조를 따른다.

---

### Requirement 5: 데모 모드 (타임랩스)

**User Story:** 발표자로서, 밤새 AI가 일하는 과정을 빠르게 시연하고 싶다. 그래서 실제 야간 운영 없이도 제품을 시연할 수 있다.

#### Acceptance Criteria

1. WHERE URL에 `?mode=timelapse` 파라미터가 있으면, THE System SHALL 타임랩스 모드로 진입한다.
2. THE System SHALL 시드 데이터의 이벤트를 500ms 간격으로 순차 재생한다.
3. WHEN 이벤트가 재생되면, THE System SHALL 야간 로그 패널에 slideUp 애니메이션으로 메시지를 추가한다.
4. THE System SHALL recharts 차트 데이터를 이벤트 재생에 맞춰 실시간으로 업데이트한다.
5. THE System SHALL 타임랩스 중간중간 전산과 선배 대사를 typing-effect로 표시한다.
6. THE System SHALL POST /api/demo/seed 호출로 시드 데이터를 초기화할 수 있어야 한다.

---

## 2. API 명세

### 2.1 GET /api/status

현재 시스템 상태를 반환한다.

**Response**

```json
{
  "status": "idle | night | morning",
  "session_id": 42,
  "started_at": "2025-01-15T18:30:00.000Z",
  "last_scan_at": "2025-01-16T06:00:00.000Z",
  "scan_count": 24,
  "auto_processed": 3,
  "pending_approval": 2
}
```

**상태 코드**

- `200 OK`: 정상
- `500 Internal Server Error`: DB 조회 실패

---

### 2.2 POST /api/clock-out

퇴근 처리. baseline 수집 + cron 등록.

**Request Body**

```json
{
  "instruction": "결제 모듈 에러핸들링 봐줘"
}
```

**Response**

```json
{
  "session_id": 42,
  "baseline_captured": true,
  "cron_started": true,
  "message": "야간 근무 시작. 수고했다."
}
```

**상태 코드**

- `200 OK`: 퇴근 처리 완료
- `409 Conflict`: 이미 야간 모드 활성화 중
- `500 Internal Server Error`: baseline 수집 실패

---

### 2.3 POST /api/clock-in

출근 처리. 야간 브리핑 생성.

**Request Body**

```json
{}
```

**Response**

```json
{
  "session_id": 43,
  "summary_id": 15,
  "message": "왔어? 밤새 6건 처리해놨다. 커피는 사 오는 거지? ☕"
}
```

**상태 코드**

- `200 OK`: 출근 처리 완료
- `409 Conflict`: 야간 모드가 아닌 상태
- `500 Internal Server Error`: 브리핑 생성 실패

---

### 2.4 POST /api/action

항목에 대한 승인/코멘트/거부 처리.

**Request Body**

```json
{
  "analysis_id": 7,
  "action": "approve | comment | reject",
  "comment": "LGTM. 타임아웃 수정 후 머지해줘."
}
```

**Response**

```json
{
  "action_id": 23,
  "status": "completed",
  "github_result": {
    "type": "pr_approved",
    "pr_number": 93,
    "url": "https://github.com/owner/repo/pull/93"
  }
}
```

**상태 코드**

- `200 OK`: 처리 완료
- `400 Bad Request`: 유효하지 않은 action 값
- `404 Not Found`: analysis_id 없음
- `500 Internal Server Error`: GitHub API 호출 실패

---

### 2.5 POST /api/scan

수동 스캔 트리거.

**Request Body**

```json
{}
```

**Response**

```json
{
  "scan_id": 25,
  "diffs_found": 3,
  "analyses_created": 3,
  "auto_processed": 1
}
```

**상태 코드**

- `200 OK`: 스캔 완료
- `409 Conflict`: 야간 모드가 아닌 상태
- `500 Internal Server Error`: 스캔 실패

---

### 2.6 GET /api/demo

데모 모드용 시드 데이터 + 타임랩스 이벤트 목록 반환.

**Response**

```json
{
  "events": [
    {
      "timestamp": "2025-01-15T20:30:00.000Z",
      "type": "new_pr",
      "message": "PR #93 올라옴 — 세션 만료 로직 수정",
      "category": "approve"
    }
  ],
  "summary": { ... }
}
```

---

### 2.7 POST /api/demo/seed

시드 데이터 초기화.

**Response**

```json
{
  "seeded": true,
  "records_created": 47
}
```

---

## 3. 데이터 스키마

### 3.1 sessions

퇴근/출근 세션 기록.

```sql
CREATE TABLE sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,    -- 'clock_out' | 'clock_in'
  timestamp   TEXT NOT NULL,    -- ISO 8601
  instruction TEXT,             -- 퇴근 시 특별 지시사항 (nullable)
  created_at  TEXT DEFAULT (datetime('now'))
);
```

---

### 3.2 snapshots

퇴근 시 수집한 GitHub baseline 스냅샷.

```sql
CREATE TABLE snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER REFERENCES sessions(id),
  type        TEXT NOT NULL,    -- 'prs' | 'issues' | 'ci' | 'commits'
  data        TEXT NOT NULL,    -- JSON (GitHub API 응답)
  captured_at TEXT DEFAULT (datetime('now'))
);
```

---

### 3.3 diffs

스캔 사이클에서 감지된 변화.

```sql
CREATE TABLE diffs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER REFERENCES sessions(id),
  type        TEXT NOT NULL,    -- 'new_pr' | 'new_issue' | 'ci_fail' | 'comment' | 'commit'
  ref_id      TEXT,             -- GitHub PR/Issue 번호
  title       TEXT,
  data        TEXT NOT NULL,    -- JSON (상세 데이터)
  detected_at TEXT DEFAULT (datetime('now'))
);
```

---

### 3.4 analyses

Kiro 에이전트 분석 결과.

```sql
CREATE TABLE analyses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  diff_id     INTEGER REFERENCES diffs(id),
  category    TEXT NOT NULL,    -- 'auto' | 'approve' | 'direct'
  summary     TEXT NOT NULL,    -- AI 한 줄 요약
  detail      TEXT,             -- AI 상세 분석 (JSON)
  risk_level  TEXT,             -- 'low' | 'medium' | 'high'
  suggestion  TEXT,             -- AI 제안 사항
  analyzed_at TEXT DEFAULT (datetime('now'))
);
```

---

### 3.5 actions

자동 처리 및 사용자 액션 기록.

```sql
CREATE TABLE actions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER REFERENCES analyses(id),
  action_type TEXT NOT NULL,    -- 'merge' | 'close' | 'comment' | 'label' | 'approve' | 'reject'
  status      TEXT NOT NULL,    -- 'completed' | 'failed' | 'pending'
  result      TEXT,             -- 결과 메시지 또는 에러
  executed_at TEXT DEFAULT (datetime('now'))
);
```

---

### 3.6 daily_summaries

일일 업무 요약 (Kiro 생성).

```sql
CREATE TABLE daily_summaries (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  date           TEXT NOT NULL,           -- YYYY-MM-DD
  commits_count  INTEGER DEFAULT 0,
  prs_reviewed   INTEGER DEFAULT 0,
  issues_closed  INTEGER DEFAULT 0,
  summary        TEXT,                    -- AI 생성 오늘 업무 요약
  tomorrow_prep  TEXT,                    -- AI 생성 내일 준비 목록 (JSON)
  created_at     TEXT DEFAULT (datetime('now'))
);
```

---

## 4. Kiro 에이전트 출력 스키마

모든 에이전트는 아래 JSON 스키마로만 응답한다. 마크다운 래핑, 설명 텍스트, 코드블록 감싸기 금지.

```json
{
  "agent": "pr-reviewer",
  "category": "auto | approve | direct",
  "summary": "한 줄 요약 (한국어, 50자 이내)",
  "detail": {
    "findings": ["발견 사항 1", "발견 사항 2"],
    "related_files": ["auth.js", "auth.spec.ts"]
  },
  "risk_level": "low | medium | high",
  "suggestion": "구체적인 수정 제안",
  "senpai_comment": "전산과 선배 톤 코멘트 (반말, 1-2문장)"
}
```

night-summarizer의 출력 스키마 (출근 브리핑용):

```json
{
  "greeting": "전산과 선배 아침 인사",
  "night_duration": "13h 43m",
  "auto_processed": [
    {
      "type": "pr_merged",
      "ref": "PR #94",
      "summary": "dependabot lodash 패치 자동 머지"
    }
  ],
  "needs_approval": [
    {
      "analysis_id": 7,
      "type": "pr_review",
      "ref": "PR #93",
      "summary": "세션 만료 로직 수정",
      "risk_level": "medium"
    }
  ],
  "needs_direction": [
    {
      "analysis_id": 9,
      "type": "issue",
      "ref": "Issue #160",
      "summary": "아키텍처 방향 결정 필요",
      "risk_level": "high"
    }
  ],
  "tomorrow_prep": [
    { "time": "10:00", "item": "스프린트 리뷰", "priority": "high" }
  ],
  "stats": {
    "total_scans": 24,
    "items_found": 6,
    "auto_count": 3,
    "approve_count": 2,
    "direct_count": 1
  }
}
```

---

## 5. 에러 처리

### 5.1 GitHub API 에러

| 에러             | 처리 방법                                                                 |
| ---------------- | ------------------------------------------------------------------------- |
| 401 Unauthorized | GITHUB_TOKEN 만료. 에러 메시지 표시 + 토큰 재설정 안내.                   |
| 403 Forbidden    | rate limit 초과. 스캔 간격 자동 2배 확장. 로그 기록.                      |
| 404 Not Found    | 레포 없음 또는 권한 없음. 에러 메시지 표시 + 설정 확인 안내.              |
| 5xx Server Error | GitHub 서버 오류. 3회 재시도 (1s, 2s, 4s 지수 백오프). 실패 시 스캔 skip. |
| Network Timeout  | 10초 타임아웃. 재시도 없이 스캔 skip. 로그 기록.                          |

### 5.2 Kiro CLI 에러

| 에러             | 처리 방법                                             |
| ---------------- | ----------------------------------------------------- |
| CLI 실행 실패    | 3회 재시도. 실패 시 해당 diff를 🟡 approve로 분류.    |
| 타임아웃 (120초) | 해당 항목 skip. 타임아웃 로그 기록.                   |
| JSON 파싱 실패   | 응답에서 JSON 추출 재시도. 실패 시 🟡 approve로 분류. |
| 에이전트 없음    | 에러 로그 기록. 해당 유형 분석 skip.                  |

### 5.3 자동 처리 안전장치

아래 조건 중 하나라도 불만족 시 자동 처리를 중단하고 🟡 approve로 격상:

**PR 자동 머지 중단 조건**

- dependabot이 생성한 PR이 아닌 경우
- CI 체크 중 하나라도 실패 상태인 경우
- 대상 브랜치가 main인 경우
- PR이 이미 클로즈된 경우

**이슈 자동 클로즈 중단 조건**

- 중복 이슈 원본 번호가 명시되지 않은 경우
- 원본 이슈가 이미 클로즈된 경우

### 5.4 DB 에러

| 에러         | 처리 방법                                         |
| ------------ | ------------------------------------------------- |
| DB 파일 없음 | 자동 생성 (schema.sql 실행).                      |
| 쓰기 실패    | 에러 로그 기록. 해당 작업 skip. 서비스 중단 없음. |
| 읽기 실패    | API 500 응답. 에러 메시지 표시.                   |

---

## 6. 환경 변수

| 변수                    | 필수 | 기본값       | 설명                         |
| ----------------------- | ---- | ------------ | ---------------------------- |
| `GITHUB_TOKEN`          | ✅   | -            | GitHub Personal Access Token |
| `GITHUB_REPO`           | ✅   | -            | 대상 레포 (owner/repo 형식)  |
| `KIRO_CLI_PATH`         | -    | `kiro-cli`   | kiro-cli 바이너리 경로       |
| `KIRO_AGENT_TIMEOUT`    | -    | `120000`     | 에이전트 타임아웃 (ms)       |
| `KIRO_TARGET_REPO_PATH` | -    | `./`         | Kiro가 분석할 레포 경로      |
| `SCAN_INTERVAL_MINUTES` | -    | `30`         | 스캔 간격 (분)               |
| `AUTO_MERGE_DEPENDABOT` | -    | `true`       | dependabot 자동 머지 여부    |
| `TIMEZONE`              | -    | `Asia/Seoul` | 사용자 시간대                |

---

## 7. 의존성 및 기술 스택

| 패키지           | 버전    | 용도                        |
| ---------------- | ------- | --------------------------- |
| `next`           | ^15.0.0 | 웹 프레임워크 + API Routes  |
| `react`          | ^19.0.0 | UI 컴포넌트                 |
| `tailwindcss`    | ^4.0.0  | 스타일링                    |
| `recharts`       | ^2.12.0 | 차트 (활동 패턴, 절약 시간) |
| `framer-motion`  | ^11.0.0 | 애니메이션                  |
| `figlet`         | ^1.7.0  | ASCII 타이틀 생성           |
| `node-cron`      | ^3.0.3  | 야간 스캔 스케줄러          |
| `better-sqlite3` | ^11.0.0 | SQLite DB                   |
| `@octokit/rest`  | ^21.0.0 | GitHub REST API 클라이언트  |

**런타임 의존성 (별도 설치)**

- `kiro-cli`: Kiro CLI (PATH에 등록 필요, `kiro-cli login` 완료 필요)
- Node.js 20+
