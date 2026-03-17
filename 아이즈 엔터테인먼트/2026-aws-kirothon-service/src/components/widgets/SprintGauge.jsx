'use client';

export default function SprintGauge({ percent = 0, label = '스프린트' }) {
  const filled = Math.round(percent / 5);
  const empty = 20 - filled;
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);

  return (
    <div className="text-sm mt-1">
      <span className="text-term-amber">{label}</span>{' '}
      <span className="progress-bar text-term-green">{bar}</span>{' '}
      <span className="text-term-cyan">{percent}%</span>
    </div>
  );
}
