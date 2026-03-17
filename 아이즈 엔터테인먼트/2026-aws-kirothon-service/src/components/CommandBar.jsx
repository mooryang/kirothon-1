'use client';

export default function CommandBar({ location, actions, shift, leftExtra }) {
  const isNight = shift === 'night';
  const bgClass = isNight
    ? 'bg-term-amber text-black'
    : 'bg-term-green text-black';

  return (
    <div className={`flex-shrink-0 ${bgClass} px-4 py-1 text-xs font-bold flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <span>▌{location}</span>
        {leftExtra && (
          <>
            <span className="opacity-50">│</span>
            <span>{leftExtra}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        {actions.map((action, i) => (
          <span key={i} className="flex items-center">
            {i > 0 && <span className="opacity-30 mx-0.5">│</span>}
            <button
              onClick={action.onClick}
              className="px-2 py-0.5 rounded cursor-pointer transition-all hover:bg-black/25 active:bg-black/35 flex items-center gap-1"
            >
              <kbd className="inline-block min-w-[1.2em] text-center px-1 py-0.5 rounded bg-black/20 border border-current/20 text-[10px] font-bold">
                {action.key}
              </kbd>
              <span>{action.label}</span>
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
