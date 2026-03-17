import { NextResponse } from 'next/server';
import { nightScan } from '../../../core/night-scan';
import { collectBaseline, collectCurrent } from '../../../core/scanner';
import { extractDiff } from '../../../core/differ';
import { getLatestSession, insertDiff, insertAnalysis, insertAction } from '../../../data/db';
import { analyzePR, analyzeCI, analyzeIssue, categorize } from '../../../core/analyzer';
import { mergePR, closeIssue } from '../../../core/executor';

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

    const latestSession = getLatestSession();
    const sessionId = latestSession?.id || 1;

    const results = [];

    for (const diff of diffs) {
      const diffId = insertDiff({
        sessionId,
        type: diff.type,
        refId: diff.ref_id,
        title: diff.title,
        data: JSON.stringify(diff.data),
      });

      // commit 유형은 분석 건너뜀
      if (diff.type === 'commit') {
        results.push({ diffId, type: diff.type, skipped: true });
        continue;
      }

      // 유형별 analyzer 호출
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

      const category = categorize(analysis);
      const analysisId = insertAnalysis({
        diffId,
        category,
        summary: analysis.summary,
        detail: analysis.detail,
        riskLevel: analysis.risk_level,
        suggestion: analysis.suggestion,
      });

      // 🟢 auto → 자동 처리
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
        }
      }

      results.push({ diffId, type: diff.type, category, risk_level: analysis.risk_level });
    }

    return NextResponse.json({
      status: 'ok',
      mode: 'manual',
      diffsFound: diffs.length,
      results,
    });
  } catch (error) {
    console.error('scan error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
