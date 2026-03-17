// Kiro CLI 기반 AI 분석
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const KIRO_TIMEOUT = parseInt(process.env.KIRO_AGENT_TIMEOUT || '120000');
const KIRO_CLI = process.env.KIRO_CLI_PATH || 'kiro-cli';
const REPO_PATH = process.env.KIRO_TARGET_REPO_PATH || './';

/**
 * kiro-cli 사용 가능 여부 확인
 * clock-out 시점에 호출하여 야간 내내 fallback만 쌓이는 상황 방지
 */
export async function checkKiroCli() {
  try {
    await execFileAsync(KIRO_CLI, ['--version'], { timeout: 5000 });
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
