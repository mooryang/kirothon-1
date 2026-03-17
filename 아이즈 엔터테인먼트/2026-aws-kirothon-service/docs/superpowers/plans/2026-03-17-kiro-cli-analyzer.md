# Kiro CLI Analyzer 전환 구현 플랜

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** analyzer.js의 Bedrock 직접 호출을 kiro-cli subagent 호출로 교체하고, clock-out → nightScan → clock-in 플로우를 연결한다.

**Architecture:** clock-out 시 baseline 수집 후 scheduler 시작 → 30분 간격 nightScan이 GitHub diff를 감지하면 kiro-cli agent별로 분석 → 결과 DB 저장 + auto 항목 자동 처리. nightScan을 별도 모듈로 분리하여 scheduler 콜백과 수동 트리거 양쪽에서 사용.

**Tech Stack:** child_process (exec), kiro-cli, node-cron, better-sqlite3, @octokit/rest

**Spec:** `docs/superpowers/specs/2026-03-17-kiro-cli-analyzer-design.md`

---

## File Structure

| 파일 | 작업 | 역할 |
|------|------|------|
| `src/core/analyzer.js` | 전면 교체 | Bedrock → kiro-cli subagent 호출 |
| `src/core/night-scan.js` | 신규 생성 | nightScan 로직 (diff 감지 → 분석 → 저장 → 자동처리) |
| `src/core/scheduler.js` | 수정 | global._cronTask 패턴으로 HMR 생존 |
| `src/app/api/clock-out/route.js` | 수정 | baseline 수집 + scheduler 시작 |
| `src/app/api/clock-in/route.js` | 수정 | scheduler 중지 + global 초기화 |
| `src/app/api/scan/route.js` | 수정 | nightScan 모듈 사용 |
| `.env.local` | 신규 생성 | kiro-cli 환경변수 |

---

## Task 1: analyzer.js — kiro-cli 실행기로 교체

**Files:**
- Modify: `src/core/analyzer.js` (전면 교체)

- [ ] **Step 1: analyzer.js를 kiro-cli 기반으로 교체**

`src/core/analyzer.js`의 전체 내용을 아래로 교체:

```javascript
// Kiro CLI 기반 AI 분석
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const execAsync = promisify(exec);

const KIRO_TIMEOUT = parseInt(process.env.KIRO_AGENT_TIMEOUT || '120000');
const KIRO_CLI = process.env.KIRO_CLI_PATH || 'kiro-cli';
const REPO_PATH = process.env.KIRO_TARGET_REPO_PATH || './';

/**
 * kiro-cli 사용 가능 여부 확인
 * clock-out 시점에 호출하여 야간 내내 fallback만 쌓이는 상황 방지
 */
export async function checkKiroCli() {
  try {
    await execAsync(`${KIRO_CLI} --version`, { timeout: 5000 });
    return true;
  } catch {
    throw new Error('kiro-cli를 찾을 수 없습니다. kiro-cli가 설치되어 있는지 확인해주세요.');
  }
}

/**
 * kiro-cli stdout에서 JSON 추출
 * 1. ```json ... ``` 코드블록 우선 탐색
 * 2. 없으면 { 부터 마지막 } 까지 greedy 매칭
 */
function extractJSON(stdout) {
  // 1. 마크다운 코드블록 내 JSON
  const codeBlockMatch = stdout.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch { /* fall through */ }
  }

  // 2. Greedy { ... } 매칭
  const jsonMatch = stdout.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch { /* fall through */ }
  }

  return null;
}

/**
 * Kiro subagent 호출 (독립 컨텍스트에서 실행)
 * 프롬프트를 tmpfile에 저장 후 stdin 파이핑 (셸 이스케이프 방지)
 */
async function runKiroSubagent(agentName, prompt) {
  const tmpFile = path.join(os.tmpdir(), `kiro-${agentName}-${Date.now()}.txt`);

  try {
    fs.writeFileSync(tmpFile, prompt, 'utf-8');

    const { stdout } = await execAsync(
      `cat "${tmpFile}" | ${KIRO_CLI} chat --no-interactive --trust-all-tools --agent ${agentName}`,
      { timeout: KIRO_TIMEOUT, cwd: REPO_PATH }
    );

    return extractJSON(stdout);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

export async function analyzePR(prData) {
  const prompt = `다음 PR을 리뷰해줘.

PR 제목: ${prData.title}
작성자: ${prData.author}
변경 파일: ${prData.files?.map(f => f.filename || f).join(', ') || 'N/A'}
추가: +${prData.additions || 0}, 삭제: -${prData.deletions || 0}
라벨: ${prData.labels?.join(', ') || '없음'}
dependabot: ${prData.dependabot ? '예' : '아니오'}`;

  try {
    const result = await runKiroSubagent('pr-reviewer', prompt);
    if (!result) throw new Error('JSON 파싱 실패');
    return {
      summary: result.summary || 'PR 분석 완료',
      risk_level: result.risk_level || 'low',
      detail: JSON.stringify(result.detail || result.findings || []),
      suggestion: result.suggestion || '',
    };
  } catch (error) {
    console.error('[analyzer] analyzePR error:', error.message);
    return {
      summary: `PR "${prData.title}" — 자동 분석 실패, 수동 확인 필요`,
      risk_level: 'medium',
      detail: JSON.stringify([error.message]),
      suggestion: '수동 리뷰를 진행해주세요.',
    };
  }
}

export async function analyzeCI(ciData) {
  const prompt = `CI/CD 워크플로우 실패를 분석해줘.

워크플로우: ${ciData.name || 'N/A'}
브랜치: ${ciData.branch || 'N/A'}
상태: ${ciData.conclusion || 'failure'}`;

  try {
    const result = await runKiroSubagent('ci-analyzer', prompt);
    if (!result) throw new Error('JSON 파싱 실패');
    return {
      summary: result.summary || 'CI 실패 분석 완료',
      risk_level: result.risk_level || 'medium',
      detail: result.detail ? JSON.stringify(result.detail) : null,
      suggestion: result.suggestion || '',
    };
  } catch (error) {
    console.error('[analyzer] analyzeCI error:', error.message);
    return {
      summary: `CI 실패 "${ciData.name}" — 수동 확인 필요`,
      risk_level: 'medium',
      detail: null,
      suggestion: '로그를 직접 확인해주세요.',
    };
  }
}

export async function analyzeIssue(issueData) {
  const prompt = `GitHub 이슈를 분석해줘.

제목: ${issueData.title || 'N/A'}
작성자: ${issueData.author || 'N/A'}
라벨: ${issueData.labels?.join(', ') || '없음'}`;

  try {
    const result = await runKiroSubagent('issue-triager', prompt);
    if (!result) throw new Error('JSON 파싱 실패');
    return {
      summary: result.summary || '이슈 분석 완료',
      risk_level: result.risk_level || 'low',
      detail: result.detail ? JSON.stringify(result.detail) : null,
      suggestion: result.suggestion || '',
    };
  } catch (error) {
    console.error('[analyzer] analyzeIssue error:', error.message);
    return {
      summary: `이슈 "${issueData.title}" — 분석 실패`,
      risk_level: 'low',
      detail: null,
      suggestion: '수동 확인 필요',
    };
  }
}

export function categorize(analysis) {
  const { risk_level, summary } = analysis;
  const lower = (summary || '').toLowerCase();

  // 🟢 auto: dependabot + 테스트 통과, 중복 이슈, 빌드 정상
  if (lower.includes('dependabot') || lower.includes('중복') || lower.includes('자동') || lower.includes('빌드 정상')) {
    return 'auto';
  }

  // 🔴 direct: 아키텍처 변경, 새 기능 요청, 방향 결정
  if (risk_level === 'high' || lower.includes('아키텍처') || lower.includes('방향') || lower.includes('설계')) {
    return 'direct';
  }

  // 🟡 approve: 기본값
  return 'approve';
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/core/analyzer.js
git commit -m "feat: analyzer.js를 kiro-cli subagent 호출로 전환

Bedrock InvokeModelCommand 대신 kiro-cli chat --agent 방식으로 변경.
runKiroSubagent() — tmpfile + stdin 파이핑으로 프롬프트 전달.
extractJSON() — 코드블록 우선 → greedy 매칭 fallback.
checkKiroCli() — clock-out 시 사전 검증용."
```

---

## Task 2: scheduler.js — HMR 생존 패턴

**Files:**
- Modify: `src/core/scheduler.js`

- [ ] **Step 1: global._cronTask 패턴으로 수정**

`src/core/scheduler.js` 전체를 아래로 교체:

```javascript
// node-cron 야간 스캔 관리 (global 패턴으로 HMR 생존)
import cron from 'node-cron';

export function startScheduler(config = {}) {
  const intervalMinutes = config.intervalMinutes || parseInt(process.env.SCAN_INTERVAL_MINUTES || '30');

  if (global._cronTask) {
    console.log('[scheduler] 이미 실행 중 — 재시작');
    stopScheduler();
  }

  const cronExpr = `*/${intervalMinutes} * * * *`;

  global._cronTask = cron.schedule(cronExpr, async () => {
    console.log(`[scheduler] 스캔 실행 — ${new Date().toISOString()}`);
    try {
      if (config.onScan) {
        await config.onScan();
      }
    } catch (error) {
      console.error('[scheduler] 스캔 실패:', error.message);
    }
  });

  console.log(`[scheduler] 시작 — ${intervalMinutes}분 간격`);
  return global._cronTask;
}

export function stopScheduler() {
  if (global._cronTask) {
    global._cronTask.stop();
    global._cronTask = null;
    console.log('[scheduler] 중지');
  }
}

export function isRunning() {
  return global._cronTask !== null;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/core/scheduler.js
git commit -m "fix: scheduler를 global._cronTask 패턴으로 변경 (HMR 생존)"
```

---

## Task 3: night-scan.js — 야간 스캔 로직 모듈

**Files:**
- Create: `src/core/night-scan.js`

- [ ] **Step 1: night-scan.js 생성**

```javascript
// 야간 스캔 사이클 — diff 감지 → 분석 → DB 저장 → 자동 처리
import { collectCurrent } from './scanner.js';
import { extractDiff } from './differ.js';
import { analyzePR, analyzeCI, analyzeIssue, categorize } from './analyzer.js';
import { mergePR, closeIssue } from './executor.js';
import { insertDiff, insertAnalysis, insertAction } from '../data/db';

/**
 * 야간 스캔 1사이클 실행
 * scheduler의 onScan 콜백 또는 수동 트리거에서 호출
 */
export async function nightScan() {
  if (global._scanInProgress) {
    console.log('[nightScan] 이전 스캔 진행 중 — skip');
    return { skipped: true };
  }

  global._scanInProgress = true;

  try {
    const repo = process.env.GITHUB_REPO;
    const sessionId = global._nightSessionId;
    const baseline = global._nightBaseline;

    if (!baseline || !sessionId) {
      console.log('[nightScan] baseline 또는 sessionId 없음 — skip');
      return { skipped: true, reason: 'no baseline' };
    }

    // 1. 현재 상태 수집
    console.log('[nightScan] GitHub 데이터 수집 중...');
    const current = await collectCurrent(repo);

    // 2. diff 추출
    const diffs = extractDiff(baseline, current);
    console.log(`[nightScan] ${diffs.length}건 변화 감지`);

    if (diffs.length === 0) {
      return { diffsFound: 0 };
    }

    const results = [];

    // 3. 각 diff 처리
    for (const diff of diffs) {
      // 3a. diff DB 저장
      const diffId = insertDiff({
        sessionId,
        type: diff.type,
        refId: diff.ref_id,
        title: diff.title,
        data: JSON.stringify(diff.data),
      });

      // 3b. commit 유형은 분석 건너뜀
      if (diff.type === 'commit') {
        results.push({ diffId, type: diff.type, skipped: true });
        continue;
      }

      // 3c. 유형별 analyzer 호출
      let analysis;
      switch (diff.type) {
        case 'new_pr':
          analysis = await analyzePR(diff.data);
          break;
        case 'ci_fail':
          analysis = await analyzeCI(diff.data);
          break;
        case 'new_issue':
        case 'comment':
          analysis = await analyzeIssue(diff.data);
          break;
        default:
          analysis = { summary: `알 수 없는 유형: ${diff.type}`, risk_level: 'medium' };
      }

      // 3d. categorize + DB 저장
      const category = categorize(analysis);
      const analysisId = insertAnalysis({
        diffId,
        category,
        summary: analysis.summary,
        detail: analysis.detail,
        riskLevel: analysis.risk_level,
        suggestion: analysis.suggestion,
      });

      console.log(`[nightScan] ${diff.type} ${diff.ref_id} → ${category} (${analysis.risk_level})`);

      // 3e. 🟢 auto → 자동 처리
      if (category === 'auto') {
        let actionResult;
        let actionType;

        if (diff.type === 'new_pr' && diff.data.dependabot) {
          actionType = 'merge';
          actionResult = await mergePR(diff.data.number);
        } else if (diff.type === 'new_issue') {
          actionType = 'close';
          actionResult = await closeIssue(diff.data.number, 'not_planned');
        }

        if (actionType) {
          insertAction({
            analysisId,
            actionType,
            status: actionResult.success ? 'completed' : 'failed',
            result: actionResult.message,
          });
          console.log(`[nightScan] auto ${actionType}: ${actionResult.message}`);
        }
      }

      results.push({ diffId, type: diff.type, category, risk_level: analysis.risk_level });
    }

    // 4. baseline 갱신
    global._nightBaseline = current;

    return { diffsFound: diffs.length, results };
  } finally {
    global._scanInProgress = false;
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/core/night-scan.js
git commit -m "feat: night-scan.js 모듈 생성 — 야간 스캔 사이클 로직"
```

---

## Task 4: clock-out/route.js — 퇴근 시 야간 엔진 시작

**Files:**
- Modify: `src/app/api/clock-out/route.js`

- [ ] **Step 1: clock-out 라우트에 baseline 수집 + scheduler 시작 연결**

`src/app/api/clock-out/route.js` 전체를 아래로 교체:

```javascript
import { NextResponse } from 'next/server';
import { insertSession, insertSnapshot } from '../../../data/db';
import { collectBaseline } from '../../../core/scanner';
import { checkKiroCli } from '../../../core/analyzer';
import { startScheduler } from '../../../core/scheduler';
import { nightScan } from '../../../core/night-scan';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. kiro-cli 사전 검증
    try {
      await checkKiroCli();
    } catch (error) {
      return NextResponse.json(
        { status: 'error', message: error.message },
        { status: 500 }
      );
    }

    // 2. 세션 생성
    const sessionId = insertSession({
      type: 'clock_out',
      timestamp: new Date().toISOString(),
      instruction: body.instruction || null,
    });

    // 3. baseline 수집 + snapshots 저장
    const repo = process.env.GITHUB_REPO;
    let baseline = null;
    try {
      baseline = await collectBaseline(repo);
      for (const type of ['prs', 'issues', 'ci', 'commits']) {
        insertSnapshot({
          sessionId,
          type,
          data: JSON.stringify(baseline[type] || []),
        });
      }
    } catch (error) {
      console.error('[clock-out] baseline 수집 실패:', error.message);
      // baseline 실패해도 세션은 생성됨 — 수동 스캔으로 복구 가능
    }

    // 4. global 상태 설정
    global._nightBaseline = baseline;
    global._nightSessionId = sessionId;

    // 5. scheduler 시작
    const intervalMinutes = parseInt(process.env.SCAN_INTERVAL_MINUTES || '30');
    startScheduler({
      intervalMinutes,
      onScan: nightScan,
    });

    return NextResponse.json({
      status: 'ok',
      sessionId,
      baseline: baseline ? {
        prs: baseline.prs?.length || 0,
        issues: baseline.issues?.length || 0,
        ci: baseline.ci?.length || 0,
        commits: baseline.commits?.length || 0,
      } : null,
      schedulerInterval: `${intervalMinutes}분`,
    });
  } catch (error) {
    console.error('clock-out error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/clock-out/route.js
git commit -m "feat: clock-out에 baseline 수집 + kiro-cli 검증 + scheduler 시작 연결"
```

---

## Task 5: clock-in/route.js — 출근 시 야간 엔진 중지

**Files:**
- Modify: `src/app/api/clock-in/route.js`

- [ ] **Step 1: clock-in 라우트에 scheduler 중지 + global 초기화 추가**

`src/app/api/clock-in/route.js` 전체를 아래로 교체:

```javascript
import { NextResponse } from 'next/server';
import { insertSession } from '../../../data/db';
import { stopScheduler } from '../../../core/scheduler';

export async function POST(request) {
  try {
    // 1. scheduler 중지
    stopScheduler();

    // 2. 세션 생성
    const sessionId = insertSession({
      type: 'clock_in',
      timestamp: new Date().toISOString(),
      instruction: null,
    });

    // 3. global 상태 초기화
    global._nightBaseline = null;
    global._nightSessionId = null;
    global._cronTask = null;

    return NextResponse.json({ status: 'ok', sessionId });
  } catch (error) {
    console.error('clock-in error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/clock-in/route.js
git commit -m "feat: clock-in에 scheduler 중지 + global 상태 초기화 추가"
```

---

## Task 6: scan/route.js — nightScan 모듈 연동

**Files:**
- Modify: `src/app/api/scan/route.js`

- [ ] **Step 1: scan 라우트를 nightScan 모듈 기반으로 교체**

`src/app/api/scan/route.js` 전체를 아래로 교체:

```javascript
import { NextResponse } from 'next/server';
import { nightScan } from '../../../core/night-scan';
import { collectBaseline, collectCurrent } from '../../../core/scanner';
import { extractDiff } from '../../../core/differ';
import { getDb, insertDiff } from '../../../data/db';

export async function POST(request) {
  try {
    // 야간 모드 — 기존 baseline 사용
    if (global._nightBaseline) {
      const result = await nightScan();
      return NextResponse.json({ status: 'ok', ...result });
    }

    // 수동 스캔 — 1회성 (야간 모드 아닐 때)
    const repo = process.env.GITHUB_REPO;
    const baseline = await collectBaseline(repo);
    const current = await collectCurrent(repo);
    const diffs = extractDiff(baseline, current);

    // 최신 세션 ID 가져오기
    const db = getDb();
    const latestSession = db.prepare('SELECT id FROM sessions ORDER BY id DESC LIMIT 1').get();
    const sessionId = latestSession?.id || 1;

    for (const diff of diffs) {
      insertDiff({
        sessionId,
        type: diff.type,
        refId: diff.ref_id,
        title: diff.title,
        data: JSON.stringify(diff.data),
      });
    }

    return NextResponse.json({
      status: 'ok',
      mode: 'manual',
      diffsFound: diffs.length,
      diffs: diffs.map(d => ({ type: d.type, title: d.title })),
    });
  } catch (error) {
    console.error('scan error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/scan/route.js
git commit -m "feat: scan 라우트를 nightScan 모듈 기반으로 전환"
```

---

## Task 7: .env.local 생성

**Files:**
- Create: `.env.local`

- [ ] **Step 1: 환경변수 파일 생성**

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

- [ ] **Step 2: .gitignore에 .env.local 확인**

`.gitignore`에 `.env.local`이 이미 있는지 확인. 없으면 추가.

- [ ] **Step 3: 커밋 (gitignore 변경 시만)**

```bash
git add .gitignore
git commit -m "chore: .env.local을 gitignore에 추가"
```
