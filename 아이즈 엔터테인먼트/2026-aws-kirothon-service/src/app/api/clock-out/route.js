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

    // 5. scheduler 시작 (baseline이 있을 때만)
    const intervalMinutes = parseInt(process.env.SCAN_INTERVAL_MINUTES || '30');
    let schedulerStarted = false;
    if (baseline) {
      startScheduler({
        intervalMinutes,
        onScan: nightScan,
      });
      schedulerStarted = true;
    } else {
      console.warn('[clock-out] baseline 없음 — scheduler 미시작');
    }

    return NextResponse.json({
      status: 'ok',
      sessionId,
      baseline: baseline ? {
        prs: baseline.prs?.length || 0,
        issues: baseline.issues?.length || 0,
        ci: baseline.ci?.length || 0,
        commits: baseline.commits?.length || 0,
      } : null,
      schedulerStarted,
      schedulerInterval: schedulerStarted ? `${intervalMinutes}분` : null,
    });
  } catch (error) {
    console.error('clock-out error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
