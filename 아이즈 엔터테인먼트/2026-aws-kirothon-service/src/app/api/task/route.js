// POST /api/task — task 완료/복귀 토글
const { getDailySummary, updateTaskStatus } = require('../../../data/db');

export async function POST(request) {
  try {
    const { taskId } = await request.json();
    if (!taskId) {
      return Response.json({ status: 'error', message: 'taskId 필요' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const summary = getDailySummary(today);
    if (!summary?.tomorrow_prep) {
      return Response.json({ status: 'error', message: '오늘 데이터 없음' }, { status: 404 });
    }

    const prep = JSON.parse(summary.tomorrow_prep);
    const item = prep.items?.find(t => t.id === taskId);
    if (!item) {
      return Response.json({ status: 'error', message: 'task를 찾을 수 없음' }, { status: 404 });
    }

    // ⚠ 블로커는 토글 불가
    if (item.status === '⚠') {
      return Response.json({ status: 'blocked', message: '블로커 항목은 완료 처리할 수 없습니다', items: prep.items });
    }

    // 토글: ✓ ↔ ◯
    const newStatus = item.status === '✓' ? '◯' : '✓';
    const items = updateTaskStatus({ date: today, taskId, status: newStatus });

    return Response.json({ status: 'ok', taskId, newStatus, items });
  } catch (e) {
    console.error('task toggle error:', e);
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
