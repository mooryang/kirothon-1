'use client';

import { useState, useEffect, useCallback } from 'react';

const DEFAULT_TASKS = [
  { id: 1, time: '10:00', item: '스프린트 리뷰 — 진행상황 자료 준비됨', status: '✓', est: '30m', priority: 'normal' },
  { id: 2, time: '14:00', item: 'v2.3.1 배포 — 체크리스트 점검 완료', status: '✓', est: '1h', priority: 'normal' },
  { id: 3, time: 'ASAP', item: 'PR #89 리뷰 (24h 경과, 김개발 대기)', status: '◯', est: '20m', priority: 'high' },
  { id: 4, time: 'ASAP', item: 'PR #93 리뷰 — AI 분석 완료', status: '◯', est: '15m', priority: 'high' },
  { id: 5, time: '~', item: 'Issue #160 방향 결정 (블로커)', status: '⚠', est: '?', priority: 'critical' },
];

const PRIORITY_LABELS = {
  high: { text: 'HIGH', color: 'text-term-amber' },
  critical: { text: 'CRITICAL', color: 'text-term-red' },
};

function parseItem(item) {
  if (!item) return { main: '', desc: '' };
  const dashIndex = item.indexOf(' — ');
  if (dashIndex === -1) return { main: item, desc: '' };
  return { main: item.slice(0, dashIndex), desc: item.slice(dashIndex + 3) };
}

// 예상 시간 합산 (숫자가 있는 것만)
function calcTotalEst(tasks) {
  let totalMin = 0;
  let hasUnknown = false;
  for (const t of tasks) {
    if (!t.est || t.est === '?') { hasUnknown = true; continue; }
    const match = t.est.match(/(?:(\d+)h)?(?:(\d+)m)?/);
    if (match) {
      totalMin += (parseInt(match[1] || '0', 10) * 60) + parseInt(match[2] || '0', 10);
    }
  }
  if (totalMin === 0) return null;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  let str = '';
  if (h > 0) str += `${h}h`;
  if (m > 0) str += `${m > 0 ? ' ' : ''}${m}m`;
  if (hasUnknown) str += '+';
  return `~${str.trim()}`;
}

export default function TodayTasks({ tasks, onToggle }) {
  const items = tasks || DEFAULT_TASKS;
  const [recentToggle, setRecentToggle] = useState(null); // { id, direction }

  // 글로우 효과 600ms 후 초기화
  useEffect(() => {
    if (!recentToggle) return;
    const timer = setTimeout(() => setRecentToggle(null), 600);
    return () => clearTimeout(timer);
  }, [recentToggle]);

  const handleClick = useCallback((task) => {
    if (task.status === '⚠') return; // 블로커 토글 불가
    const direction = task.status === '✓' ? 'uncomplete' : 'complete';
    setRecentToggle({ id: task.id, direction });
    onToggle?.(task.id);
  }, [onToggle]);

  const handleKeyDown = useCallback((e, task) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(task);
    }
  }, [handleClick]);

  const completed = items.filter(t => t.status === '✓');
  const pending = items.filter(t => t.status !== '✓');
  const totalEst = calcTotalEst(pending);

  return (
    <div className="text-xs flex flex-col h-full">
      {/* 완료 섹션 */}
      {completed.length > 0 && (
        <div className="mb-2">
          <div className="text-term-green/40 border-b border-term-border/40 pb-0.5 mb-1">
            ── 완료 ({completed.length}) ──
          </div>
          {completed.map((task) => {
            const { main } = parseItem(task.item);
            const glowClass = recentToggle?.id === task.id && recentToggle.direction === 'complete'
              ? 'task-complete-glow' : recentToggle?.id === task.id && recentToggle.direction === 'uncomplete'
              ? 'task-uncomplete-glow' : '';
            return (
              <div
                key={`done-${task.id}`}
                role="button"
                tabIndex={0}
                onClick={() => handleClick(task)}
                onKeyDown={(e) => handleKeyDown(e, task)}
                className={`pl-2 py-1 border-l-2 border-l-term-green/30 cursor-pointer hover:bg-term-green/5 ${glowClass}`}
              >
                <div className="flex items-center">
                  <span className="w-11 text-term-cyan/50 flex-shrink-0">{task.time}</span>
                  <span className="flex-1 text-term-green/60 truncate line-through">{main}</span>
                  <span className="w-6 text-center text-term-green flex-shrink-0">✓</span>
                </div>
                {task.est && (
                  <div className="pl-11 text-term-green/30">~{task.est}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 대기 섹션 */}
      {pending.length > 0 && (
        <div>
          <div className="text-term-amber/60 border-b border-term-border/40 pb-0.5 mb-1">
            ── 대기 ({pending.length}) ──
          </div>
          {pending.map((task) => {
            const { main } = parseItem(task.item);
            const isUrgent = task.time === 'ASAP';
            const isBlocker = task.status === '⚠';
            const borderClass = isBlocker ? 'border-l-term-red' : 'border-l-term-amber';
            const priorityInfo = PRIORITY_LABELS[task.priority];
            const glowClass = recentToggle?.id === task.id && recentToggle.direction === 'uncomplete'
              ? 'task-uncomplete-glow' : '';
            return (
              <div
                key={`pending-${task.id}`}
                role={isBlocker ? undefined : 'button'}
                tabIndex={isBlocker ? -1 : 0}
                onClick={() => handleClick(task)}
                onKeyDown={(e) => handleKeyDown(e, task)}
                className={`pl-2 py-1.5 border-l-2 ${borderClass} hover:bg-term-green/5 ${isBlocker ? 'bg-red-900/10 cursor-not-allowed' : isUrgent ? 'bg-term-amber/5 cursor-pointer' : 'cursor-pointer'} ${glowClass}`}
              >
                <div className="flex items-center">
                  <span className={`w-11 flex-shrink-0 ${isUrgent ? 'text-term-amber font-bold' : 'text-term-cyan'}`}>
                    {task.time}
                  </span>
                  <span className="flex-1 text-term-green truncate">{main}</span>
                  <span className={`w-6 text-center flex-shrink-0 ${
                    task.status === '⚠' ? 'text-term-red' : 'text-term-amber'
                  }`}>{task.status}</span>
                </div>
                <div className="flex items-center pl-11 gap-2">
                  {task.est && (
                    <span className="text-term-green/30">~{task.est}</span>
                  )}
                  {priorityInfo && (
                    <span className={`${priorityInfo.color} text-[10px] font-bold`}>
                      {priorityInfo.text}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {/* 총 예상 소요시간 */}
          {totalEst && (
            <div className="text-right text-term-green/40 border-t border-term-border/40 pt-1 mt-1">
              총 예상: <span className="text-term-cyan">{totalEst}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
