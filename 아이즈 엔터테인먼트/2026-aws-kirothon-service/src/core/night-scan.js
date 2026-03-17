// 야간 스캔 사이클 — diff 감지 → 분석 → DB 저장 → 자동 처리
import { collectCurrent } from './scanner.js';
import { extractDiff } from './differ.js';
import { analyzePR, analyzeCI, analyzeIssue, categorize } from './analyzer.js';
import { mergePR, closeIssue } from './executor.js';
import { insertDiff, insertAnalysis, insertAction } from '../data/db';
import { emit } from './night-events.js';

// agent 이름 매핑
const AGENT_MAP = {
  new_pr: 'pr-reviewer',
  ci_fail: 'ci-analyzer',
  new_issue: 'issue-triager',
  comment: 'issue-triager',
};

/**
 * 야간 스캔 1사이클 실행
 * scheduler의 onScan 콜백 또는 수동 트리거에서 호출
 */
export async function nightScan() {
  if (global._scanInProgress) {
    emit('log', { msg: '이전 스캔 진행 중 — skip', level: 'warn' });
    return { skipped: true };
  }

  global._scanInProgress = true;

  try {
    const repo = process.env.GITHUB_REPO;
    const sessionId = global._nightSessionId;
    const baseline = global._nightBaseline;

    if (!baseline || !sessionId) {
      emit('log', { msg: 'baseline 없음 — skip', level: 'warn' });
      return { skipped: true, reason: 'no baseline' };
    }

    // 0. Hook: inject-repo-context 실행
    emit('hook_fire', { hook: 'inject-repo-context', trigger: 'prompt_submit' });
    emit('log', { msg: '[hook] inject-repo-context → 레포 컨텍스트 주입', level: 'info' });

    // 1. 현재 상태 수집 — night-ops Power 활성화
    emit('power_load', { power: 'night-ops', tools_count: 8 });
    emit('log', { msg: '[power] night-ops 활성화 (GitHub MCP 8개 도구)', level: 'info' });
    emit('scan_stage', { stage: 'collect', progress: 10 });
    emit('log', { msg: `GitHub 데이터 수집 중... (${repo})`, level: 'info' });
    const current = await collectCurrent(repo);

    // 2. diff 추출
    emit('scan_stage', { stage: 'diff', progress: 30 });
    const diffs = extractDiff(baseline, current);
    emit('log', { msg: `${diffs.length}건 변화 감지`, level: diffs.length > 0 ? 'info' : 'info' });

    if (diffs.length === 0) {
      emit('scan_stage', { stage: 'idle', progress: 100 });
      emit('log', { msg: '변화 없음. 대기 중...', level: 'info' });
      return { diffsFound: 0 };
    }

    const results = [];
    let statsAuto = 0, statsApprove = 0, statsDirect = 0;

    // 3. 각 diff 처리
    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      const analyzeProgress = 30 + ((i / diffs.length) * 50);
      emit('scan_stage', { stage: 'analyze', progress: Math.round(analyzeProgress) });

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
        emit('log', { msg: `커밋 ${diff.ref_id} — 저장 (분석 skip)`, level: 'info' });
        results.push({ diffId, type: diff.type, skipped: true });
        continue;
      }

      // 3c. 유형별 analyzer 호출
      const agentName = AGENT_MAP[diff.type] || 'pr-reviewer';
      const startTime = Date.now();

      // night-summarizer → 하위 agent 위임 이벤트
      emit('agent_delegate', {
        from: 'night-summarizer',
        to: agentName,
        task_preview: diff.title,
      });

      // CI 분석 시 ci-pattern-analysis 스킬 로드
      if (diff.type === 'ci_fail') {
        emit('skill_load', { skill: 'ci-pattern-analysis', agent: agentName });
        emit('log', { msg: `[skill] ci-pattern-analysis 로드 → ${agentName}`, level: 'info' });
      }

      emit('agent_start', {
        agent: agentName,
        prompt_preview: diff.title,
      });
      emit('log', { msg: `${agentName} 시작 → ${diff.title}`, level: 'info' });

      let analysis;
      try {
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

        const duration = Date.now() - startTime;
        const category = categorize(analysis);

        emit('agent_done', {
          agent: agentName,
          duration_ms: duration,
          category,
          risk_level: analysis.risk_level,
        });
        emit('log', {
          msg: `${agentName} 완료 (${(duration / 1000).toFixed(1)}s) → ${category} / ${analysis.risk_level}`,
          level: 'info',
        });

        // Hook: post-analysis 실행
        emit('hook_fire', { hook: 'post-analysis', trigger: 'agent_turn_complete' });

        // Hook: save-result 실행
        emit('hook_fire', { hook: 'save-result', trigger: 'agent_stop' });

        // 3d. DB 저장
        emit('scan_stage', { stage: 'save', progress: 80 + ((i / diffs.length) * 10) });
        const analysisId = insertAnalysis({
          diffId,
          category,
          summary: analysis.summary,
          detail: analysis.detail,
          riskLevel: analysis.risk_level,
          suggestion: analysis.suggestion,
        });

        // 통계 갱신
        if (category === 'auto') statsAuto++;
        else if (category === 'approve') statsApprove++;
        else if (category === 'direct') statsDirect++;

        emit('stat_update', {
          auto: statsAuto,
          approve: statsApprove,
          direct: statsDirect,
          total: statsAuto + statsApprove + statsDirect,
        });

        // 3e. 🟢 auto → 자동 처리
        if (category === 'auto') {
          emit('scan_stage', { stage: 'execute', progress: 90 });
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
            emit('log', {
              msg: `🟢 auto ${actionType}: ${actionResult.message}`,
              level: actionResult.success ? 'info' : 'warn',
            });
          }
        }

        results.push({ diffId, type: diff.type, category, risk_level: analysis.risk_level });
      } catch (error) {
        emit('agent_error', { agent: agentName, error: error.message });
        emit('log', { msg: `${agentName} 에러: ${error.message}`, level: 'error' });
        results.push({ diffId, type: diff.type, error: error.message });
      }
    }

    // 4. baseline 갱신
    global._nightBaseline = current;

    // Power 비활성화
    emit('power_unload', { power: 'night-ops' });
    emit('scan_stage', { stage: 'idle', progress: 100 });
    emit('scan_complete', {
      diffs_found: diffs.length,
      results_summary: { auto: statsAuto, approve: statsApprove, direct: statsDirect },
    });
    emit('log', {
      msg: `스캔 완료: ${diffs.length}건 (🟢${statsAuto} 🟡${statsApprove} 🔴${statsDirect})`,
      level: 'info',
    });

    return { diffsFound: diffs.length, results };
  } finally {
    global._scanInProgress = false;
  }
}
