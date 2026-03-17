'use client';

const DEFAULT_CHANGES = [
  { category: 'approve' },
  { category: 'approve' },
  { category: 'auto' },
  { category: 'auto' },
  { category: 'direct' },
  { category: 'auto' },
];

export default function KpiStrip({ data, onSwitchEvening }) {
  const changes = data?.nightChanges?.length > 0 ? data.nightChanges : DEFAULT_CHANGES;

  const approveCount = changes.filter(c => c.category === 'approve').length;
  const autoCount = changes.filter(c => c.category === 'auto').length;
  const directCount = changes.filter(c => c.category === 'direct').length;
  const pendingCount = approveCount + directCount;

  const duration = data?.nightDuration || '19h 10m';

  const unresolvedRisks = data?.riskAlerts?.filter(r => !r.resolved)?.length ?? 0;
  const riskColor = unresolvedRisks === 0 ? 'text-term-green' : 'text-term-amber';

  return (
    <div className="flex-shrink-0 flex items-center gap-4 px-4 py-1.5 text-xs border-b border-term-border/60 bg-[rgba(0,20,0,0.3)]">
      <div className="flex items-center gap-1.5 glow-text">
        {pendingCount > 0 && <span className="pulse-dot !w-[6px] !h-[6px] !bg-term-red" />}
        <span className="text-term-red">승인필요</span>
        <span className="text-term-red font-bold">{pendingCount}</span>
      </div>
      <span className="text-term-border">│</span>
      <div className="flex items-center gap-1.5 glow-text">
        <span className="text-term-green">자동처리</span>
        <span className="text-term-green font-bold">{autoCount}</span>
      </div>
      <span className="text-term-border">│</span>
      <div className="flex items-center gap-1.5">
        <span className="text-term-cyan">야간</span>
        <span className="text-term-cyan font-bold">{duration}</span>
      </div>
      <span className="text-term-border">│</span>
      <div className="flex items-center gap-1.5">
        <span className={riskColor}>리스크</span>
        <span className={`${riskColor} font-bold`}>{unresolvedRisks === 0 ? '안전' : unresolvedRisks}</span>
      </div>

      {/* 퇴근 버튼 — 우측 끝 */}
      {onSwitchEvening && (
        <button
          onClick={onSwitchEvening}
          className="ml-auto flex items-center gap-2 px-3 py-0.5 border-2 border-term-amber/50 text-term-amber text-xs font-bold clock-pulse-amber cursor-pointer hover:bg-term-amber hover:text-black"
        >
          <kbd className="px-1 py-0.5 bg-term-amber/10 border border-term-amber/30 text-[10px] rounded">Q</kbd>
          <span>🌙 퇴근하기</span>
        </button>
      )}
    </div>
  );
}
