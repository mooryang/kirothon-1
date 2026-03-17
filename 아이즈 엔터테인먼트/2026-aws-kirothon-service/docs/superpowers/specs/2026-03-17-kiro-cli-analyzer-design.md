# Kiro CLI Analyzer 전환 설계

> analyzer.js의 Bedrock 직접 호출을 kiro-cli subagent 호출로 교체

## 배경

현재 `src/core/analyzer.js`가 AWS Bedrock(`InvokeModelCommand`)을 직접 호출하여 PR/CI/Issue를 분석한다. 이를 kiro-cli의 커스텀 에이전트(`.kiro/agents/`)를 활용하는 방식으로 전환하여, steering 규칙과 output-format이 자동 적용되는 3레이어 구조의 이점을 얻는다.

## 변경 범위

### 변경하는 파일 (5개)

| 파일 | 변경 내용 |
|------|----------|
| `src/core/analyzer.js` | Bedrock `invokeModel()` → kiro-cli `runKiroSubagent()` 전환 |
| `src/app/api/clock-out/route.js` | 퇴근 시 baseline 수집 + scheduler 시작 + kiro-cli 사전 검증 |
| `src/app/api/clock-in/route.js` | 출근 시 scheduler 중지 |
| `src/app/api/scan/route.js` | nightScan 함수 정의 + diff 감지 후 analyzer 호출 + DB 저장 |
| `.env.local` | Bedrock 환경변수 → kiro-cli 환경변수 교체 |

### 변경하지 않는 파일

- `scanner.js` — GitHub API 수집 그대로
- `differ.js` — diff 추출 그대로
- `executor.js` — 자동 처리 그대로
- `scheduler.js` — cron 관리 그대로
- `summarizer.js` — 기존 로직 유지
- 모든 UI 컴포넌트, DB 스키마 — 변경 없음

### A 단계 스코프 아웃 (B 단계에서 다룰 것)

- `security-scanner` 에이전트 — PR 분석 시 pr-reviewer와 병렬 실행 (B 단계)
- `night-summarizer` 에이전트 — 출근 시 전체 브리핑 생성 (B 단계)
- `summarizer.js` kiro-cli 전환 (B 단계)
- `@aws-sdk/client-bedrock-runtime` 의존성 제거 (B 단계)

## 상세 설계

### 1. analyzer.js — kiro-cli 실행기

#### checkKiroCli()

kiro-cli 사용 가능 여부를 검증하는 함수. clock-out 시점에 호출하여 야간 내내 fallback만 쌓이는 상황 방지.

```
const cliPath = process.env.KIRO_CLI_PATH || 'kiro-cli';
execFileAsync(cliPath, ['--version'], { timeout: 5000 });
→ 성공: true
→ 실패: throw Error('kiro-cli를 찾을 수 없습니다')
```

#### runKiroSubagent(agentName, prompt)

```
1. prompt를 임시 파일에 저장 (os.tmpdir() + '/kiro-{agent}-{timestamp}.txt')
2. child_process.exec로 실행 (파이프가 필요하므로 exec 사용):
   cat "{tmpFile}" | {KIRO_CLI_PATH} chat --no-interactive --trust-all-tools --agent {agentName}
   - cwd: KIRO_TARGET_REPO_PATH (기본 './')
   - timeout: KIRO_AGENT_TIMEOUT (기본 120000ms)
3. stdout에서 JSON 추출 (extractJSON)
4. 임시 파일 삭제 (finally 블록, 파일 존재 여부 확인 후)
5. 실패 시 fallback 응답 반환
```

#### extractJSON(stdout)

kiro-cli 응답에서 JSON을 추출하는 유틸. 추출 전략:
1. 먼저 ` ```json ... ``` ` 마크다운 코드블록 내 JSON 탐색
2. 없으면 `{` 로 시작하는 줄부터 마지막 `}` 까지 greedy 매칭
3. `JSON.parse()` 시도 → 실패 시 null 반환

#### 함수별 에이전트 매핑

| 함수 | kiro agent | 프롬프트 내용 |
|------|-----------|-------------|
| `analyzePR(prData)` | `pr-reviewer` | PR 제목, 작성자, 변경 파일, additions/deletions |
| `analyzeCI(ciData)` | `ci-analyzer` | 워크플로우명, 브랜치, 상태, conclusion |
| `analyzeIssue(issueData)` | `issue-triager` | 이슈 제목, 작성자, 라벨 |

`commit` 유형의 diff는 분석하지 않고 DB에 저장만 한다 (별도 에이전트 없음).

#### categorize(analysis) — 변경 없음

kiro가 JSON에 category를 포함해도, 서버 측에서 기존 로직으로 재검증. 안전장치 유지.

#### 에러 핸들링

- kiro-cli 타임아웃 → 기존과 동일한 fallback 응답 반환
- JSON 파싱 실패 → fallback
- kiro-cli 바이너리 없음 → 에러 로그 + fallback
- 3회 재시도 없음 (A 단계에서는 단순하게 1회 시도)

### 2. clock-out/route.js — 퇴근 시 야간 엔진 시작

```
POST /api/clock-out { instruction }
  1. checkKiroCli() → 실패 시 { status: 'error', message: 'kiro-cli 미설치' } 반환
  2. sessions INSERT (type: 'clock_out', instruction)
  3. scanner.collectBaseline() → snapshots INSERT (4행: prs, issues, ci, commits 각각)
  4. global._nightBaseline = baseline
  5. global._nightSessionId = sessionId
  6. scheduler.startScheduler({
       onScan: nightScan,
       intervalMinutes: SCAN_INTERVAL_MINUTES
     })
     → scheduler 내부에서 global._cronTask에 cron 참조 저장 (HMR 생존)
  7. 응답: { status: 'ok', sessionId }
```

baseline을 `global._nightBaseline`에 캐시하는 이유: 매 스캔 사이클에서 diff 비교 기준으로 사용. Next.js dev 모드에서 hot reload 시 유실 방지를 위해 global 사용.

snapshots 저장: `insertSnapshot({ sessionId, type: 'prs', data: JSON.stringify(baseline.prs) })` 형태로 4행 개별 INSERT.

### 3. clock-in/route.js — 출근 시 야간 엔진 중지

```
POST /api/clock-in
  1. scheduler.stopScheduler()
  2. sessions INSERT (type: 'clock_in')
  3. global._nightBaseline = null
  4. global._nightSessionId = null
  5. global._cronTask = null
  6. 응답: { status: 'ok', sessionId }
```

### 4. scan/route.js — nightScan 함수 + 수동 트리거

#### nightScan() — scheduler의 onScan 콜백

clock-out/route.js에서 정의하여 scheduler에 전달. scan/route.js에서도 import 가능하도록 별도 모듈(`src/core/night-scan.js`)로 분리.

```
nightScan():
  0. if (global._scanInProgress) return; // 중복 스캔 방지
     global._scanInProgress = true;
  try {
  1. scanner.collectCurrent(repo)
  2. differ.extractDiff(global._nightBaseline, current)
  3. 각 diff에 대해:
     a. insertDiff({ sessionId, type, refId, title, data }) → diff_id
     b. 유형별 analyzer 호출:
        - new_pr → analyzePR(diff.data)
        - ci_fail → analyzeCI(diff.data)
        - new_issue/comment → analyzeIssue(diff.data)
        - commit → 분석 건너뜀 (DB 저장만)
     c. categorize(analysisResult)
     d. insertAnalysis({ diff_id, category, summary, detail, risk_level, suggestion })
     e. 🟢 auto → executor 처리 (mergePR / closeIssue)
        → result = await executor.mergePR() or closeIssue()
        → insertAction({
             analysis_id,
             action_type: 'merge' | 'close',
             status: result.success ? 'completed' : 'failed',
             result: result.message
           })
  4. baseline 업데이트: global._nightBaseline = current
  } finally {
     global._scanInProgress = false;
  }
```

#### POST /api/scan — 수동 트리거

nightScan()을 직접 호출. 단, 야간 모드가 아니면(global._nightBaseline이 없으면) 임시 baseline을 수집해서 1회성 스캔 수행.

```
POST /api/scan
  if (global._nightBaseline) {
    await nightScan();  // 야간 모드 — 기존 baseline 사용
  } else {
    // 수동 스캔 — 1회성
    baseline = await collectBaseline();
    current = await collectCurrent();
    diffs = extractDiff(baseline, current);
    // ... 분석 + 저장 (nightScan과 동일 로직)
  }
  응답: { status: 'ok', diffsFound }
```

### 5. scheduler.js 수정 (HMR 생존)

기존 module-level `let task`를 `global._cronTask`로 변경:

```javascript
export function startScheduler(config) {
  if (global._cronTask) stopScheduler();
  global._cronTask = cron.schedule(cronExpr, onScan);
}
export function stopScheduler() {
  if (global._cronTask) { global._cronTask.stop(); global._cronTask = null; }
}
export function isRunning() { return global._cronTask !== null; }
```

### 6. 환경변수 (.env.local)

```env
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_REPO=owner/repo-name

# Kiro CLI
KIRO_CLI_PATH=kiro-cli
KIRO_AGENT_TIMEOUT=120000
KIRO_TARGET_REPO_PATH=./

# 설정
SCAN_INTERVAL_MINUTES=30
TIMEZONE=Asia/Seoul
```

## 데이터 플로우

```
퇴근 클릭
  → clock-out API
    → kiro-cli 사전 검증
    → session 생성
    → baseline 수집 (GitHub API) → snapshots 4행 INSERT
    → global에 baseline 캐시
    → scheduler 시작 (global._cronTask)

  [30분 간격 반복]
  → nightScan (중복 실행 방지: _scanInProgress)
    → current 수집 (GitHub API)
    → diff 추출 (differ.js)
    → 유형별 kiro-cli 분석 (analyzer.js)
      → kiro-cli chat --agent pr-reviewer < tmpfile
      → kiro-cli chat --agent ci-analyzer < tmpfile
      → kiro-cli chat --agent issue-triager < tmpfile
      → commit → 분석 skip
    → 결과 DB 저장 (analyses)
    → 🟢 auto 자동 처리 (executor.js) → actions DB 저장
    → baseline 갱신

출근 클릭
  → clock-in API
    → scheduler 중지
    → global 상태 초기화
    → session 생성
```

## 알려진 제한사항

- **단일 사용자 전용**: global 상태로 baseline을 관리하므로 동시 다중 사용자 미지원
- **로컬 전용**: node-cron은 서버리스 환경에서 동작하지 않음 (Vercel/Lambda 불가)
- **재시도 없음**: kiro-cli 호출 실패 시 1회 시도 후 fallback (B 단계에서 개선)
