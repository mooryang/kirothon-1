'use client';

const DEFAULT_LOG = [
  { time: '18:30', message: '퇴근 확인. 야간 근무 시작한다.', type: 'system' },
  { time: '18:31', message: 'baseline 수집 완료 — PR 3건, Issue 6건, CI 2건', type: 'scan' },
  { time: '20:30', message: '새 PR 감지: #93 세션 만료 로직 수정 (김개발)', type: 'detect', senpaiComment: '김개발이 또 금요일 밤에 PR을 올렸네...' },
  { time: '20:32', message: 'PR #93 분석 완료 — 리스크: LOW, 승인 필요', type: 'analyze' },
  { time: '22:00', message: 'CI 실패 감지: PR #91 auth.spec.ts 타임아웃', type: 'alert', senpaiComment: '타임아웃 5초는 좀 짧지. 10초로 올려보자.' },
  { time: '22:05', message: 'CI 실패 원인 분석: 타임아웃 5s→10s 변경 제안', type: 'analyze' },
  { time: '01:00', message: 'dependabot PR #94 감지 — 테스트 통과, 자동 머지', type: 'auto', senpaiComment: 'lodash 또야? 매달 나오는 것 같은데...' },
  { time: '01:01', message: 'Issue #155 중복 확인 (#142) — 자동 클로즈', type: 'auto' },
  { time: '03:00', message: 'Issue #160 새 코멘트 (@carlos-dev) — 방향 결정 필요', type: 'detect', senpaiComment: 'API Gateway vs Kong... 이건 내가 대신 결정할 수 없지.' },
  { time: '06:00', message: '특별 지시 분석 완료: 결제 모듈 12파일 847줄 검토', type: 'analyze' },
  { time: '06:30', message: '야간 리포트 생성 완료. 좋은 아침이다!', type: 'system' },
];

const TYPE_COLORS = {
  system: 'text-term-cyan',
  scan: 'text-term-green/70',
  detect: 'text-term-amber',
  analyze: 'text-term-green',
  alert: 'text-term-red',
  auto: 'text-term-green',
};

const TYPE_BADGES = {
  system: 'SYSTEM',
  scan: 'SCAN',
  detect: 'DETECT',
  analyze: 'ANALYZE',
  alert: 'ALERT',
  auto: 'AUTO',
};

// 시간 문자열을 분 단위로 변환 (자정 넘어가면 +24h)
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  // 18시 이전이면 다음날로 취급
  return h < 12 ? (h + 24) * 60 + m : h * 60 + m;
}

// 시간대 그룹 라벨
function getTimeGroup(timeStr) {
  const [h] = timeStr.split(':').map(Number);
  if (h >= 18 && h < 20) return '저녁';
  if (h >= 20 || (h === 0)) return '야간';
  if (h >= 1 && h < 5) return '심야';
  if (h >= 5 && h < 8) return '새벽';
  return '오전';
}

// 엔트리들을 시간 그룹으로 분류
function groupEntries(logs) {
  const groups = [];
  let currentGroup = null;

  logs.forEach((entry, i) => {
    const group = getTimeGroup(entry.time);

    if (group !== currentGroup) {
      groups.push({ type: 'header', label: group, time: entry.time });
      currentGroup = group;
    }

    // 이전 엔트리와의 시간 차이 확인 (같은 그룹 내)
    if (i > 0) {
      const prevMin = timeToMinutes(logs[i - 1].time);
      const currMin = timeToMinutes(entry.time);
      const gap = currMin - prevMin;
      if (gap >= 60) {
        const hours = Math.floor(gap / 60);
        const mins = gap % 60;
        const gapText = mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
        groups.push({ type: 'gap', text: `··· ${gapText} 경과 ···` });
      }
    }

    groups.push({ type: 'entry', ...entry });
  });

  return groups;
}

// 타입별 카운트 요약
function buildSummary(logs) {
  const counts = {};
  logs.forEach(entry => {
    const badge = TYPE_BADGES[entry.type] || 'LOG';
    counts[badge] = (counts[badge] || 0) + 1;
  });
  const parts = Object.entries(counts).map(([k, v]) => `${k} ${v}`);
  return `${logs.length}건 │ ${parts.join(' │ ')}`;
}

export default function NightLog({ entries }) {
  const logs = entries || DEFAULT_LOG;
  const grouped = groupEntries(logs);
  const summary = buildSummary(logs);

  return (
    <div className="text-xs font-mono flex flex-col h-full">
      <div className="flex-1 space-y-0.5 overflow-y-auto">
        {grouped.map((item, i) => {
          if (item.type === 'header') {
            return (
              <div key={`h-${i}`} className="text-term-cyan/40 pt-1 first:pt-0">
                ─── {item.label} ({item.time}) ─────────────────
              </div>
            );
          }

          if (item.type === 'gap') {
            return (
              <div key={`g-${i}`} className="text-term-green/20 text-center py-0.5">
                {item.text}
              </div>
            );
          }

          const isAlert = item.type === 'alert';
          const badge = TYPE_BADGES[item.type] || 'LOG';
          return (
            <div key={`e-${i}`}>
              <div
                className={`log-entry flex gap-2 ${isAlert ? 'bg-term-red/5 rounded px-1 py-0.5' : ''}`}
              >
                <span className="text-term-green/40 flex-shrink-0">[{item.time}]</span>
                <span className={`${TYPE_COLORS[item.type] || 'text-term-green'} flex-shrink-0 opacity-60`}>
                  [{badge.padEnd(7)}]
                </span>
                <span className={TYPE_COLORS[item.type] || 'text-term-green'}>
                  {item.type === 'auto' && '✓ '}
                  {item.type === 'alert' && '⚠ '}
                  {item.message}
                </span>
              </div>
              {item.senpaiComment && (
                <div className="flex gap-2 pl-[4.5rem]">
                  <span className="text-term-amber/60">
                    └─ 💬 &quot;{item.senpaiComment}&quot;
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* 하단 요약 */}
      <div className="text-term-green/30 border-t border-term-border/40 pt-1 mt-1">
        ─── 요약: {summary} ───
      </div>
    </div>
  );
}
