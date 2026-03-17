'use client';

import { useState } from 'react';
import { getGreeting } from '../../persona/senpai';

const DOW_LABELS = ['월', '화', '수', '목', '금'];

function StatBar({ label, icon, current, max }) {
  const ratio = max > 0 ? Math.min(current / max, 1) : 0;
  const filled = Math.round(ratio * 14);
  const bar = '█'.repeat(filled) + '░'.repeat(14 - filled);
  return (
    <div className="flex items-center gap-1">
      <span className="w-[90px] text-term-green/60">{icon} {label}</span>
      <span className="text-term-green tracking-wider">{bar}</span>
      <span className="text-term-cyan ml-1">{current}/{max}</span>
    </div>
  );
}

function YesterdayTab({ data }) {
  if (!data) {
    return <div className="text-term-green/40 text-center py-4">어제 데이터 없음</div>;
  }

  const total = data.commitsCount + data.prsReviewed + data.issuesClosed;
  const isGood = total >= 5;
  const comment = getGreeting(isGood ? 'yesterday_good' : 'yesterday_bad');

  return (
    <div className="space-y-1.5">
      <div className="text-term-green/40">── 어제 실적 ──</div>
      <StatBar label="커밋" icon="⚡" current={data.commitsCount} max={10} />
      <StatBar label="PR리뷰" icon="🔍" current={data.prsReviewed} max={5} />
      <StatBar label="이슈" icon="🔧" current={data.issuesClosed} max={5} />

      {data.summary && (
        <>
          <div className="text-term-green/40 mt-2">── 요약 ──</div>
          <div className="text-term-green/80 text-[11px] leading-relaxed">{data.summary}</div>
        </>
      )}

      <div className="text-term-amber mt-2 text-[11px]">
        💬 &ldquo;{comment}&rdquo;
      </div>
    </div>
  );
}

function WeeklyTab({ data }) {
  if (!data) {
    return <div className="text-term-green/40 text-center py-4">주간 데이터 없음</div>;
  }

  const { days, weekNumber, todayDow, targetCommits, targetPrs, targetIssues } = data;

  // 주간 합계
  const totalCommits = days.reduce((s, d) => s + d.commits, 0);
  const totalPrs = days.reduce((s, d) => s + d.prs, 0);
  const totalIssues = days.reduce((s, d) => s + d.issues, 0);

  // EXP 계산
  const xp = totalCommits * 3 + totalPrs * 5 + totalIssues * 4;
  const xpPerLevel = 50;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const xpInLevel = xp % xpPerLevel;
  const xpPercent = Math.round((xpInLevel / xpPerLevel) * 100);
  const xpBarFilled = Math.round((xpInLevel / xpPerLevel) * 20);
  const xpBar = '█'.repeat(xpBarFilled) + '░'.repeat(20 - xpBarFilled);

  // 달성률
  const commitPercent = targetCommits > 0 ? Math.round((totalCommits / targetCommits) * 100) : 0;

  const dayLabel = DOW_LABELS[todayDow] || '수';
  const comment = getGreeting('weekly_progress', {
    day: dayLabel,
    level: String(level),
    commits: String(totalCommits),
    percent: String(commitPercent),
  });

  return (
    <div className="space-y-1.5">
      {/* 주간 여정맵 */}
      <div className="text-term-green/40 text-center">══════ SPRINT WEEK {weekNumber} ══════</div>
      <div className="flex justify-center gap-0 text-center">
        {days.map((day, i) => {
          const isPast = i < todayDow;
          const isToday = i === todayDow;
          const isFuture = i > todayDow;
          const hasData = day.commits > 0 || day.prs > 0 || day.issues > 0;

          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center w-[42px]">
                <span className={`text-[10px] ${isToday ? 'text-term-amber font-bold' : 'text-term-green/50'}`}>
                  [{DOW_LABELS[i]}]
                </span>
                <span className={
                  isToday ? 'text-term-amber text-lg today-cursor-pulse' :
                  isPast && hasData ? 'text-term-green' :
                  'text-term-green/20'
                }>
                  {isToday ? '▶' : isPast && hasData ? '✓' : '░'}
                </span>
                {(isPast && hasData) && (
                  <div className="text-[9px] text-term-green/50 leading-tight">
                    <div>{day.commits}c</div>
                    <div>{day.issues}i</div>
                  </div>
                )}
                {isToday && hasData && (
                  <div className="text-[9px] text-term-amber/70 leading-tight">
                    <div>{day.commits}c*</div>
                    <div>{day.issues}i</div>
                  </div>
                )}
                {isFuture && <div className="text-[9px] text-term-green/15">─</div>}
              </div>
              {i < 4 && <span className="text-term-green/20 text-[10px] mb-2">──</span>}
            </div>
          );
        })}
      </div>

      {/* RPG 주간 스탯바 */}
      <div className="text-term-green/40 mt-1">── 주간 스탯 ──</div>
      <StatBar label="공격력(커밋)" icon="⚔" current={totalCommits} max={targetCommits} />
      <StatBar label="방어력(리뷰)" icon="🛡" current={totalPrs} max={targetPrs} />
      <StatBar label="체력(이슈)" icon="❤" current={totalIssues} max={targetIssues} />

      {/* EXP 바 + 레벨 */}
      <div className="mt-1">
        <span className="text-term-green/60">EXP </span>
        <span className="text-term-cyan tracking-wider">[{xpBar}]</span>
        <span className="text-term-amber ml-1">{xpPercent}%</span>
        <span className="text-term-green ml-2 font-bold">LV.{level}</span>
      </div>

      {/* 선배 주간 코멘트 */}
      <div className="text-term-amber mt-1 text-[11px]">
        💬 &ldquo;{comment}&rdquo;
      </div>
    </div>
  );
}

export default function WorkLogPanel({ yesterdayData, weeklyData }) {
  const [tab, setTab] = useState('weekly');

  return (
    <div className="flex flex-col h-full text-xs overflow-y-auto scrollbar-terminal">
      {/* 탭 전환 */}
      <div className="flex gap-2 mb-2 flex-shrink-0">
        <button
          onClick={() => setTab('yesterday')}
          className={`px-2 py-0.5 border text-[11px] transition-colors ${
            tab === 'yesterday'
              ? 'border-term-amber text-term-amber bg-term-amber/10'
              : 'border-term-border text-term-green/50 hover:text-term-green'
          }`}
        >
          [어제]
        </button>
        <button
          onClick={() => setTab('weekly')}
          className={`px-2 py-0.5 border text-[11px] transition-colors ${
            tab === 'weekly'
              ? 'border-term-amber text-term-amber bg-term-amber/10'
              : 'border-term-border text-term-green/50 hover:text-term-green'
          }`}
        >
          [위클리]
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'yesterday' ? (
        <YesterdayTab data={yesterdayData} />
      ) : (
        <WeeklyTab data={weeklyData} />
      )}
    </div>
  );
}
