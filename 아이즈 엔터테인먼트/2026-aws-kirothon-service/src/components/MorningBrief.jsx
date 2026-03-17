'use client';

import { motion } from 'framer-motion';
import Panel from './Panel';
import KpiStrip from './widgets/KpiStrip';
import SummaryPanel from './widgets/SummaryPanel';
import TodayTasks from './widgets/TodayTasks';
import NightChanges from './widgets/NightChanges';
import NightLog from './widgets/NightLog';
import WorkLogPanel from './widgets/WorkLogPanel';
import SenpaiPanel from './widgets/SenpaiPanel';
import CommandBar from './CommandBar';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const panelVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

const DEFAULT_CHANGES = [
  { id: 1, category: 'approve', title: 'PR #93' },
  { id: 2, category: 'approve', title: 'CI' },
  { id: 3, category: 'auto', title: 'PR #94' },
  { id: 4, category: 'auto', title: 'Issue #155' },
  { id: 5, category: 'direct', title: 'Issue #160' },
  { id: 6, category: 'auto', title: '빌드' },
];

const DEFAULT_TASKS = [
  { status: '✓' }, { status: '✓' }, { status: '◯' }, { status: '◯' }, { status: '⚠' },
];

export default function MorningBrief({ data, onSelect, onTaskToggle, onSwitchEvening, onHelp }) {
  const changes = data?.nightChanges?.length > 0 ? data.nightChanges : DEFAULT_CHANGES;
  const approveCount = changes.filter(c => c.category === 'approve').length;
  const directCount = changes.filter(c => c.category === 'direct').length;
  const pendingCount = approveCount + directCount;

  const tasks = data?.todayTasks?.length > 0 ? data.todayTasks : DEFAULT_TASKS;
  const pendingTasks = tasks.filter(t => t.status !== '✓').length;

  return (
    <div className="h-full flex flex-col">
      {/* KPI 스트립 */}
      <KpiStrip data={data} onSwitchEvening={onSwitchEvening} />

      <div className="flex-1 min-h-0 overflow-auto scrollbar-terminal">
      <motion.div
        className="grid grid-cols-12 grid-rows-12 gap-[2px] min-h-[500px] h-full p-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        {/* 상단 좌: 전산과 선배 (col 1-2, row 1-7) */}
        <motion.div className="col-span-2 row-span-7" variants={panelVariants}>
          <Panel
            label="전산과 선배"
            icon="👤"
            tier="info"
            accent="green"
            className="h-full"
          >
            <SenpaiPanel data={data} />
          </Panel>
        </motion.div>

        {/* 상단: 요약 (col 3-5, row 1-7) */}
        <motion.div className="col-span-3 row-span-7" variants={panelVariants}>
          <Panel
            label="Morning Brief"
            icon="☀"
            tier="secondary"
            accent="amber"
            className="h-full"
          >
            <SummaryPanel
              greeting={data?.greeting}
              data={data}
              activityData={data?.activityData}
            />
          </Panel>
        </motion.div>

        {/* 상단 중: 밤새 변화 — PRIMARY (col 6-10, row 1-7) */}
        <motion.div className="col-span-5 row-span-7" variants={panelVariants}>
          <Panel
            label="밤새 변화"
            icon="🌙"
            badge={pendingCount > 0 ? `${pendingCount} pending` : `${changes.length}건 처리`}
            badgeType={pendingCount > 0 ? 'warn' : undefined}
            tier="primary"
            className="h-full"
          >
            <NightChanges items={data?.nightChanges} onSelect={onSelect} />
          </Panel>
        </motion.div>

        {/* 상단 우: 오늘 할 일 (col 11-12, row 1-7) */}
        <motion.div className="col-span-2 row-span-7" variants={panelVariants}>
          <Panel
            label="오늘 할 일"
            icon="📋"
            badge={pendingTasks > 0 ? `${pendingTasks} 대기` : undefined}
            badgeType={pendingTasks > 0 ? 'warn' : undefined}
            tier="secondary"
            accent="cyan"
            className="h-full"
          >
            <TodayTasks tasks={data?.todayTasks} onToggle={onTaskToggle} />
          </Panel>
        </motion.div>

        {/* 하단 좌: 야간 로그 (col 1-7, row 8-12) */}
        <motion.div className="col-span-7 row-span-5" variants={panelVariants}>
          <Panel
            label="야간 로그"
            icon="📜"
            tier="info"
            className="h-full"
          >
            <NightLog entries={data?.nightLog} />
          </Panel>
        </motion.div>

        {/* 하단 우: 주간 현황 (col 8-12, row 8-12) */}
        <motion.div className="col-span-5 row-span-5" variants={panelVariants}>
          <Panel
            label="주간 현황"
            icon="🗓"
            badge={`Week ${data?.weekNumber || ''}`}
            tier="secondary"
            accent="amber"
            className="h-full"
          >
            <WorkLogPanel yesterdayData={data?.yesterdaySummary} weeklyData={data?.weeklyData} />
          </Panel>
        </motion.div>

      </motion.div>
      </div>

      {/* 하단 커맨드 바 */}
      <CommandBar
        location="Morning Brief"
        shift="day"
        actions={[
          { key: '1-6', label: '상세보기', onClick: () => onSelect?.(1) },
          { key: 'Q', label: '퇴근화면', onClick: onSwitchEvening },
          { key: '?', label: '도움말', onClick: onHelp },
        ]}
      />
    </div>
  );
}
