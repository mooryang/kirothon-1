// node-cron 야간 스캔 관리 (global 패턴으로 HMR 생존)
import cron from 'node-cron';

export function startScheduler(config = {}) {
  const intervalMinutes = config.intervalMinutes || parseInt(process.env.SCAN_INTERVAL_MINUTES || '30');

  if (global._cronTask) {
    console.log('[scheduler] 이미 실행 중 — 재시작');
    stopScheduler();
  }

  const cronExpr = `*/${intervalMinutes} * * * *`;

  global._cronTask = cron.schedule(cronExpr, async () => {
    console.log(`[scheduler] 스캔 실행 — ${new Date().toISOString()}`);
    try {
      if (config.onScan) {
        await config.onScan();
      }
    } catch (error) {
      console.error('[scheduler] 스캔 실패:', error.message);
    }
  });

  console.log(`[scheduler] 시작 — ${intervalMinutes}분 간격`);
  return global._cronTask;
}

export function stopScheduler() {
  if (global._cronTask) {
    global._cronTask.stop();
    global._cronTask = null;
    console.log('[scheduler] 중지');
  }
}

export function isRunning() {
  return !!global._cronTask;
}
