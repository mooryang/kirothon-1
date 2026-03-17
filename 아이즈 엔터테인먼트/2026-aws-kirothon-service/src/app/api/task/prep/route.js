// POST /api/task/prep — 내일 예정 일괄 저장
const { updateTomorrowPrep } = require('../../../../data/db');

export async function POST(request) {
  try {
    const { items } = await request.json();
    if (!items || !Array.isArray(items)) {
      return Response.json({ status: 'error', message: 'items 배열 필요' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const result = updateTomorrowPrep({ date: today, items });

    if (!result) {
      return Response.json({ status: 'error', message: '오늘 데이터 없음' }, { status: 404 });
    }

    return Response.json({ status: 'ok' });
  } catch (e) {
    console.error('task prep save error:', e);
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
