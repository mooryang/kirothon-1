import { NextResponse } from 'next/server';

/**
 * GET /api/status — 현재 상태 + 야간 이벤트 조회
 * 쿼리: ?sinceId=123 — 해당 ID 이후 이벤트만 반환 (폴링용)
 */
export async function GET(request) {
  try {
    const { getDb, getLatestSession } = require('../../../data/db');
    const { getEvents } = require('../../../core/night-events');
    const { isRunning } = require('../../../core/scheduler');

    const db = getDb();
    const session = getLatestSession();

    // 쿼리 파라미터에서 sinceId 추출
    const { searchParams } = new URL(request.url);
    const sinceId = parseFloat(searchParams.get('sinceId') || '0');

    if (!session) {
      return NextResponse.json({
        status: 'idle',
        message: '세션 없음 — 퇴근 버튼을 눌러주세요',
      });
    }

    if (session.type === 'clock_out') {
      const nightData = getEvents(sinceId);
      return NextResponse.json({
        status: 'night',
        message: '야간 근무 중',
        clockOutAt: session.timestamp,
        instruction: session.instruction,
        schedulerRunning: isRunning(),
        night: nightData,
      });
    }

    if (session.type === 'clock_in') {
      return NextResponse.json({
        status: 'morning',
        message: '출근 완료 — 모닝 브리프 확인',
        clockInAt: session.timestamp,
      });
    }

    return NextResponse.json({
      status: 'unknown',
      message: `알 수 없는 세션 타입: ${session.type}`,
    });
  } catch (error) {
    console.error('GET /api/status error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
