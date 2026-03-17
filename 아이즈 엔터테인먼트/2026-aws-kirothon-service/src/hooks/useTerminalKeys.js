'use client';

import { useEffect, useCallback } from 'react';

export default function useTerminalKeys(handlers) {
  const handleKeyDown = useCallback((e) => {
    // INPUT/TEXTAREA 포커스 시 키 무시
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const key = e.key;

    // 숫자키 1-6: 항목 선택
    if (key >= '1' && key <= '6' && handlers.onSelect) {
      e.preventDefault();
      handlers.onSelect(parseInt(key));
      return;
    }

    switch (key.toLowerCase()) {
      case 'q':
        e.preventDefault();
        handlers.onClockIn?.();
        break;
      case 'a':
        e.preventDefault();
        handlers.onApprove?.();
        break;
      case 'c':
        e.preventDefault();
        handlers.onComment?.();
        break;
      case 's':
        e.preventDefault();
        handlers.onSkip?.();
        break;
      case 'b':
        e.preventDefault();
        handlers.onBack?.();
        break;
      case 'd':
        e.preventDefault();
        handlers.onDetail?.();
        break;
      case 'p':
        e.preventDefault();
        handlers.onCopyPrompt?.();
        break;
      case 'e':
        e.preventDefault();
        handlers.onClockInFromNight?.();
        break;
      case 'escape':
        e.preventDefault();
        handlers.onEscape?.();
        break;
      case '?':
        e.preventDefault();
        handlers.onHelp?.();
        break;
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
