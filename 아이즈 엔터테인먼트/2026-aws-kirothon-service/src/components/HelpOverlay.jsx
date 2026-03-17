'use client';

import { useEffect, useCallback } from 'react';

const SECTIONS = [
  {
    id: 'brief',
    title: 'Morning Brief (메인 화면)',
    keys: [
      { key: '1-6', desc: '항목 선택 → 상세 보기' },
      { key: 'Q', desc: '퇴근 화면으로 이동' },
    ],
  },
  {
    id: 'detail',
    title: '상세 보기',
    keys: [
      { key: 'A', desc: '승인' },
      { key: 'C', desc: '코멘트' },
      { key: 'S', desc: '건너뛰기' },
    ],
  },
  {
    id: 'handoff',
    title: '퇴근 준비',
    keys: [
      { key: 'Esc', desc: '메인으로 돌아가기' },
    ],
  },
  {
    id: 'global',
    title: '어디서든',
    keys: [
      { key: 'Esc', desc: '뒤로 가기' },
      { key: '?', desc: '이 도움말 토글' },
    ],
  },
];

const VIEW_TIPS = {
  brief: '숫자키로 항목 선택, Q로 퇴근, ?로 이 도움말',
  detail: 'A 승인, C 코멘트, S 건너뛰기, Esc 돌아가기',
  handoff: 'Esc로 메인 화면 복귀',
  active: '야간 근무 중... 출근 버튼으로 교대',
};

const VIEW_NAMES = {
  brief: 'Morning Brief',
  detail: '상세 보기',
  handoff: '퇴근 준비',
  active: '야간 근무',
};

export default function HelpOverlay({ onClose, view }) {
  const handleKey = useCallback((e) => {
    e.preventDefault();
    onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const currentView = view || 'brief';

  return (
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="border border-term-green bg-term-bg p-6 max-w-lg w-full mx-4 font-mono text-sm glow-text"
        style={{ boxShadow: '0 0 30px rgba(0,255,65,0.15), 0 0 60px rgba(0,255,65,0.05)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="text-term-amber text-center mb-2 text-base font-bold">
          전설의 전산과 선배 v1.0 — 키보드 단축키
        </div>
        <div className="text-term-green/40 text-center text-xs mb-3">
          ════════════════════════════════════
        </div>

        {/* 섹션들 */}
        <div className="space-y-3">
          {SECTIONS.map((section) => {
            const isActive = section.id === currentView || section.id === 'global';
            return (
              <div
                key={section.id}
                className={`${isActive ? 'border-l-2 border-term-green pl-3' : 'pl-4 opacity-60'} transition-opacity`}
              >
                <div className="text-term-amber mb-1 text-xs">■ {section.title}</div>
                <div className="space-y-0.5 text-term-green/80">
                  {section.keys.map((k, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <kbd className="inline-block min-w-[2em] text-center px-1.5 py-0.5 rounded bg-term-green/10 border border-term-green/30 text-[10px] font-bold text-term-green">
                        {k.key}
                      </kbd>
                      <span>{k.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 구분선 + 현재 화면 팁 */}
        <div className="text-term-green/30 text-xs mt-4 mb-2">
          ─── 현재 화면: {VIEW_NAMES[currentView] || currentView} ───
        </div>
        <div className="text-term-cyan text-xs">
          → {VIEW_TIPS[currentView] || '아무 키나 눌러 닫기'}
        </div>

        {/* 하단 */}
        <div className="mt-4 border-t border-term-green/20 pt-3 text-term-green/40 text-xs text-center">
          모든 키보드 동작은 클릭으로도 가능합니다
        </div>

        <div className="mt-2 text-center text-term-amber/50 text-xs animate-pulse">
          아무 키나 눌러 닫기
        </div>
      </div>
    </div>
  );
}
