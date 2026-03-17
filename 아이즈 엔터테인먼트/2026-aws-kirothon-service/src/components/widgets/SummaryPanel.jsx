'use client';

import { useState } from 'react';
import SprintGauge from './SprintGauge';
import { getGreeting } from '../../persona/senpai';
import { toSparkline } from '../../lib/sparkline';

const TREND_ICONS = { up: '↑', down: '↓', stable: '─' };
const GRADE_COLORS = {
  Elite: 'text-term-green',
  High: 'text-term-cyan',
  Medium: 'text-term-amber',
  Low: 'text-term-red',
};

function HealthBar({ score, max = 10 }) {
  const filled = Math.round((score / max) * 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  return <span className="tracking-wider">{bar}</span>;
}

export default function SummaryPanel({ greeting, nightDuration = '13h 43m', sprintPercent = 68, data, activityData }) {
  const [senpaiGreeting] = useState(
    () => greeting || getGreeting('greeting_morning', { count: 6 })
  );

  const sprint = data?.sprintPercent ?? sprintPercent;

  const activity = activityData || data?.activityData;
  const sparkline = activity ? toSparkline(activity) : '';

  const dora = data?.doraMetrics;
  const health = data?.codeHealth;
  const aiStats = data?.aiWorkStats;

  return (
    <div className="flex flex-col h-full text-xs overflow-y-auto">
      {/* 인사말 */}
      <p className="glow-text text-term-amber text-sm leading-snug mb-1.5">
        {senpaiGreeting}
      </p>

      <div className="space-y-1 mt-2">
        {/* DORA 지표 — 2행 인라인 */}
        {dora && (
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-term-green/60">배포</span>
              <span>
                <span className="text-term-cyan">{dora.deployFrequency.value}/wk</span>
                {' '}
                <span className={GRADE_COLORS[dora.deployFrequency.grade]}>{dora.deployFrequency.grade}</span>
                <span className="text-term-green/50">{TREND_ICONS[dora.deployFrequency.trend]}</span>
                <span className="text-term-border mx-1">│</span>
                <span className="text-term-green/60">리드 </span>
                <span className="text-term-cyan">{dora.leadTime.value}h</span>
                {' '}
                <span className={GRADE_COLORS[dora.leadTime.grade]}>{dora.leadTime.grade}</span>
                <span className="text-term-green/50">{TREND_ICONS[dora.leadTime.trend]}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-term-green/60">실패율</span>
              <span>
                <span className="text-term-cyan">{dora.changeFailureRate.value}%</span>
                {' '}
                <span className={GRADE_COLORS[dora.changeFailureRate.grade]}>{dora.changeFailureRate.grade}</span>
                <span className="text-term-green/50">{TREND_ICONS[dora.changeFailureRate.trend]}</span>
                <span className="text-term-border mx-1">│</span>
                <span className="text-term-green/60">MTTR </span>
                <span className="text-term-cyan">{dora.mttr.value}m</span>
                {' '}
                <span className={GRADE_COLORS[dora.mttr.grade]}>{dora.mttr.grade}</span>
                <span className="text-term-green/50">{TREND_ICONS[dora.mttr.trend]}</span>
              </span>
            </div>
          </div>
        )}

        {/* 코드 건강도 — 바 + 커버리지 인라인 */}
        {health && (
          <div>
            <div className="flex items-center gap-1">
              <span className="text-term-green/60">건강도</span>
              <span className={health.score >= 7 ? 'text-term-green' : health.score >= 5 ? 'text-term-amber' : 'text-term-red'}>
                <HealthBar score={health.score} />
              </span>
              <span className="text-term-cyan">{health.score}/10</span>
              <span className="text-term-green/50">
                ({health.trend === 'up' ? '+' : ''}{(health.score - health.prevScore).toFixed(1)})
              </span>
              <span className="text-term-border mx-1">│</span>
              <span className="text-term-green/60">커버리지</span>
              <span className="text-term-cyan">{health.testCoverage}%</span>
              <span className="text-term-green/50">{TREND_ICONS[health.testCoverageTrend]}</span>
            </div>
            {health.hotspots?.[0] && (
              <div className="text-term-amber/70 mt-0.5">
                ⚠ {health.hotspots[0].file} ({health.hotspots[0].score})
              </div>
            )}
          </div>
        )}

        {/* AI 야근 통계 — 핵심만 */}
        {aiStats && (
          <div className="space-y-0.5">
            <div className="text-term-amber">
              AI {aiStats.avgReviewTime} vs 인간 {aiStats.humanAvgReviewTime}
            </div>
            <div className="text-term-green/60">
              분석 <span className="text-term-cyan">{aiStats.linesAnalyzed.toLocaleString()}줄</span>
              {' · 리뷰 '}
              <span className="text-term-cyan">{aiStats.reviewsGenerated}건</span>
              {' · 발견 '}
              <span className="text-term-cyan">{aiStats.issuesFound}건</span>
              {' · 자동수정 '}
              <span className="text-term-cyan">{aiStats.autoFixed}건</span>
            </div>
          </div>
        )}

        {/* 야간 활동 스파크라인 */}
        <div>
          <SprintGauge percent={sprint} />
          {sparkline && (
            <div className="text-term-green/50 mt-1">
              <span className="text-term-green/40">야간 활동</span>{' '}
              <span className="text-term-cyan tracking-wider">{sparkline}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
