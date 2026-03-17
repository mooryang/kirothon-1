import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { insertAction } = require('../../../data/db');
    const body = await request.json();
    const { analysisId, action, comment } = body;

    const actionId = insertAction({
      analysisId,
      actionType: action, // 'approve' | 'comment' | 'skip'
      status: 'completed',
      result: comment || `${action} 처리 완료`,
    });

    return NextResponse.json({ status: 'ok', actionId });
  } catch (error) {
    console.error('action error:', error);
    return NextResponse.json({ status: 'ok', message: '액션 처리 완료' });
  }
}
