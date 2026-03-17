import { NextResponse } from 'next/server';

/**
 * GET /api/demo — 모닝 브리프 데이터 조회
 * DB에서 최신 세션의 diffs, analyses, actions, daily_summary를 조합하여
 * UI에 필요한 형태로 변환하여 반환
 */
export async function GET() {
  try {
    const {
      getDb,
      getLatestSession,
      getSessionDiffs,
      getAnalyses,
      getActions,
      getDailySummary,
    } = require('../../../data/db');
    const {
      doraMetrics,
      codeHealth,
      aiWorkStats,
      riskAlerts,
      repoPulse,
    } = require('../../../data/seed');

    const db = getDb();
    const session = getLatestSession();

    if (!session) {
      return NextResponse.json({ status: 'empty', data: null });
    }

    const diffs = getSessionDiffs(session.id);
    const analyses = getAnalyses(session.id);
    const actions = getActions(session.id);

    const today = new Date().toISOString().split('T')[0];
    const dailySummary = getDailySummary(today);

    // diff → analysis 매핑 (diff_id 기준)
    const analysisMap = {};
    for (const a of analyses) {
      analysisMap[a.diff_id] = a;
    }

    // ─── greeting ───────────────────────────────────────────
    const autoCount = analyses.filter(a => a.category === 'auto').length;
    const greeting = `밤새 ${diffs.length}건 처리해놨다. 자동 처리 ${autoCount}건. 커피는 사 오는 거지? ☕`;

    // ─── nightDuration ──────────────────────────────────────
    const clockOutTime = new Date(session.timestamp);
    const now = new Date();
    const diffMs = now - clockOutTime;
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const nightDuration = `${hours}h ${minutes}m`;

    // ─── sprintPercent ──────────────────────────────────────
    const sprintPercent = 68; // baseline 스냅샷에서 가져올 수 있지만 기본값 사용

    // ─── nightChanges ───────────────────────────────────────
    const nightChanges = diffs.map((diff, i) => {
      const analysis = analysisMap[diff.id];
      const data = safeJsonParse(diff.data);
      let detail = '';

      if (diff.type === 'new_pr' && data) {
        detail = `+${data.additions || 0} -${data.deletions || 0}, 리스크: ${analysis?.risk_level || 'unknown'}`;
      } else if (diff.type === 'ci_fail') {
        detail = analysis?.suggestion || 'CI 실패';
      } else if (diff.type === 'new_issue' && data) {
        detail = data.duplicate_of ? `${data.duplicate_of}와 중복 확인` : diff.title;
      } else if (diff.type === 'comment' && data) {
        detail = `@${(data.commenter || '').replace('@', '')} 코멘트`;
      } else if (diff.type === 'commit') {
        detail = analysis?.summary || '빌드 확인';
      }

      return {
        id: diff.id,
        type: diff.type,
        refId: diff.ref_id,
        category: analysis?.category || 'auto',
        title: formatChangeTitle(diff),
        detail,
        diffData: data,
        detectedAt: diff.detected_at || null,
        analysis: analysis ? {
          summary: analysis.summary,
          riskLevel: analysis.risk_level,
          suggestion: analysis.suggestion,
          detail: safeJsonParse(analysis.detail),
        } : null,
      };
    });

    // ─── todayTasks ─────────────────────────────────────────
    let todayTasks = null;
    if (dailySummary?.tomorrow_prep) {
      const prep = safeJsonParse(dailySummary.tomorrow_prep);
      if (prep?.items) {
        todayTasks = prep.items;
      }
    }

    // ─── tomorrowTasks ──────────────────────────────────────
    let tomorrowTasks = null;
    if (dailySummary?.tomorrow_prep) {
      const prep = safeJsonParse(dailySummary.tomorrow_prep);
      if (prep?.items) {
        tomorrowTasks = prep.items;
      }
    }

    // ─── nightLog ───────────────────────────────────────────
    const nightLog = buildNightLog(session, diffs, analysisMap);

    // ─── activityData ───────────────────────────────────────
    const activityData = buildActivityData(diffs);

    // ─── savingsData ────────────────────────────────────────
    const savingsData = [
      { day: '월', minutes: 45 },
      { day: '화', minutes: 30 },
      { day: '수', minutes: 60 },
      { day: '목', minutes: 25 },
      { day: '금', minutes: 90 },
      { day: '토', minutes: 15 },
      { day: '일', minutes: 0 },
    ];

    // ─── yesterdaySummary ───────────────────────────────────
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yesterdayData = getDailySummary(yesterday);

    // ─── weeklyData ──────────────────────────────────────────
    const { getWeeklySummaries } = require('../../../data/db');
    const jsDay = new Date().getDay();
    const todayDow = jsDay === 0 ? 4 : jsDay - 1; // 0=Mon..4=Fri

    const mondayDate = new Date();
    mondayDate.setDate(mondayDate.getDate() - (jsDay === 0 ? 6 : jsDay - 1));
    const mondayStr = mondayDate.toISOString().split('T')[0];
    const fridayDate = new Date(mondayDate);
    fridayDate.setDate(fridayDate.getDate() + 4);
    const fridayStr = fridayDate.toISOString().split('T')[0];

    const weeklySummaries = getWeeklySummaries(mondayStr, fridayStr);
    const weekDays = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(mondayDate);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const found = weeklySummaries.find(s => s.date === dStr);
      weekDays.push(found ? {
        date: dStr,
        commits: found.commits_count,
        prs: found.prs_reviewed,
        issues: found.issues_closed,
        summary: found.summary,
      } : { date: dStr, commits: 0, prs: 0, issues: 0, summary: '' });
    }

    const weekNumber = Math.ceil(((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 86400000) / 7);

    return NextResponse.json({
      status: 'ok',
      data: {
        greeting,
        nightDuration,
        sprintPercent,
        nightChanges,
        todayTasks,
        tomorrowTasks,
        nightLog,
        activityData,
        savingsData,
        summary: dailySummary ? {
          commitsCount: dailySummary.commits_count,
          prsReviewed: dailySummary.prs_reviewed,
          issuesClosed: dailySummary.issues_closed,
          summary: dailySummary.summary,
        } : null,
        yesterdaySummary: yesterdayData ? {
          commitsCount: yesterdayData.commits_count,
          prsReviewed: yesterdayData.prs_reviewed,
          issuesClosed: yesterdayData.issues_closed,
          summary: yesterdayData.summary,
        } : null,
        weeklyData: { days: weekDays, weekNumber, todayDow, targetCommits: 20, targetPrs: 8, targetIssues: 10 },
        todayDow,
        weekNumber,
        doraMetrics,
        codeHealth,
        aiWorkStats,
        riskAlerts,
        repoPulse,
      },
    });
  } catch (error) {
    console.error('GET /api/demo error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/demo — 시드 데이터 초기화
 */
export async function POST() {
  try {
    const { getDb } = require('../../../data/db');
    const { seedDemoData } = require('../../../data/seed');

    const db = getDb();
    const result = seedDemoData(db);

    return NextResponse.json({
      status: 'ok',
      message: '시드 데이터 초기화 완료',
      sessionId: Number(result.sessionId),
      date: result.today,
    });
  } catch (error) {
    console.error('POST /api/demo error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}

// ─── Helper Functions ─────────────────────────────────────────

function safeJsonParse(str) {
  if (!str) return null;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function formatChangeTitle(diff) {
  const type = diff.type;
  const ref = diff.ref_id ? ` ${diff.ref_id}` : '';

  switch (type) {
    case 'new_pr':
      return `PR${ref} — ${diff.title || '새 PR'}`;
    case 'ci_fail':
      return `CI 실패 — PR${ref} ${diff.title || ''}`;
    case 'new_issue':
      return `${diff.title || `Issue${ref}`}`;
    case 'comment':
      return `${diff.title || `코멘트${ref}`}`;
    case 'commit':
      return `${diff.title || '커밋'}`;
    default:
      return diff.title || `변경${ref}`;
  }
}

function buildNightLog(session, diffs, analysisMap) {
  const logs = [];

  // 퇴근 로그
  const clockOutTime = extractTime(session.timestamp);
  logs.push({
    time: clockOutTime,
    message: '퇴근 확인. 야간 근무 시작한다.',
    type: 'system',
  });

  // baseline 수집 (퇴근 1분 후)
  logs.push({
    time: addMinutes(clockOutTime, 1),
    message: 'baseline 수집 완료 — PR 3건, Issue 6건, CI 2건',
    type: 'scan',
  });

  // 선배 코멘트 맵 (ref_id + type → comment)
  const senpaiComments = {
    'new_pr:#93': '김개발이 또 금요일 밤에 PR을 올렸네...',
    'ci_fail:#91': '타임아웃 5초는 좀 짧지. 10초로 올려보자.',
    'new_pr:#94': 'lodash 또야? 매달 나오는 것 같은데...',
    'comment:#160': 'API Gateway vs Kong... 이건 내가 대신 결정할 수 없지.',
  };

  // diff별 로그
  for (const diff of diffs) {
    const time = extractTime(diff.detected_at);
    const analysis = analysisMap[diff.id];
    const data = safeJsonParse(diff.data);
    const commentKey = `${diff.type}:${diff.ref_id}`;
    const senpaiComment = senpaiComments[commentKey] || null;

    // 감지 로그
    if (diff.type === 'new_pr') {
      logs.push({
        time,
        message: `새 PR 감지: ${diff.ref_id} ${diff.title || ''}`,
        type: 'detect',
        senpaiComment,
      });
    } else if (diff.type === 'ci_fail') {
      logs.push({
        time,
        message: `CI 실패 감지: PR ${diff.ref_id} ${data?.failed_test || ''}`,
        type: 'alert',
        senpaiComment,
      });
    } else if (diff.type === 'new_issue') {
      logs.push({
        time,
        message: `이슈 분석: ${diff.title || diff.ref_id}`,
        type: 'detect',
        senpaiComment,
      });
    } else if (diff.type === 'comment') {
      const commenter = data?.commenter || '';
      logs.push({
        time,
        message: `Issue ${diff.ref_id} 새 코멘트 (${commenter}) — ${analysis?.category === 'direct' ? '방향 결정 필요' : '확인'}`,
        type: 'detect',
        senpaiComment,
      });
    } else if (diff.type === 'commit') {
      logs.push({
        time,
        message: `${diff.title || '커밋 확인'}`,
        type: 'analyze',
        senpaiComment,
      });
    }

    // 분석 결과 로그
    if (analysis && diff.type !== 'commit') {
      const riskLabel = analysis.risk_level ? `, 리스크: ${analysis.risk_level.toUpperCase()}` : '';
      const categoryLabel = analysis.category === 'auto' ? '자동 처리' :
        analysis.category === 'approve' ? '승인 필요' : '방향 결정 필요';

      logs.push({
        time: addMinutes(time, 2),
        message: `${diff.ref_id || diff.title} 분석 완료 — ${categoryLabel}${riskLabel}`,
        type: analysis.category === 'auto' ? 'auto' : 'analyze',
      });
    }
  }

  // 마무리 로그
  logs.push({
    time: '06:30',
    message: '야간 리포트 생성 완료. 좋은 아침이다!',
    type: 'system',
  });

  return logs;
}

function buildActivityData(diffs) {
  // 시간대별 활동 카운트 (19:00~06:00)
  const hours = ['19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00'];
  const counts = {};
  hours.forEach(h => { counts[h] = 0; });

  // diff 시간 기반 카운트
  for (const diff of diffs) {
    const time = extractTime(diff.detected_at);
    const hour = time.split(':')[0].padStart(2, '0') + ':00';
    if (counts[hour] !== undefined) {
      counts[hour] += 3; // diff 하나당 API 호출 여러 번 (감지 + 분석 + 조회)
    }
  }

  // 기본 스캔 활동 추가 (시간대별 결정적 기본값)
  const baseActivity = [2, 1, 1, 2, 3, 2, 1, 1, 2, 1, 1, 3];
  return hours.map((time, i) => ({
    time,
    count: counts[time] + baseActivity[i],
  }));
}

function extractTime(isoStr) {
  if (!isoStr) return '00:00';
  try {
    // "2024-01-01T20:30:00+09:00" → "20:30"
    const match = isoStr.match(/T(\d{2}):(\d{2})/);
    if (match) return `${match[1]}:${match[2]}`;
    return '00:00';
  } catch {
    return '00:00';
  }
}

function addMinutes(timeStr, min) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m + min;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
