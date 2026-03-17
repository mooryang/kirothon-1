import { NextResponse } from 'next/server';
import { insertSession } from '../../../data/db';
import { stopScheduler } from '../../../core/scheduler';
import { resetEvents } from '../../../core/night-events';

export async function POST(request) {
  try {
    // 1. scheduler 중지
    stopScheduler();
    resetEvents();

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
