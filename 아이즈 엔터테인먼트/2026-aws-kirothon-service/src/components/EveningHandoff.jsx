'use client';

import { useState, useEffect } from 'react';
import Panel from './Panel';
import AsciiTitle from './AsciiTitle';
import CommandBar from './CommandBar';
import { getGreeting } from '../persona/senpai';

const DEFAULT_TODAY = `커밋 7건 (feature/payment-v2)
PR #87 리뷰 완료 → 머지
Issue #150, #151, #153 클로즈
스프린트 진행률 68% (13/19)`;

const DEFAULT_TOMORROW = [
  { id: 1, text: '10:00 스프린트 리뷰 — 진행상황 자료 준비', checked: true },
  { id: 2, text: '14:00 v2.3.1 배포 — 배포 체크리스트 점검', checked: true },
  { id: 3, text: 'PR #89 리뷰 (24시간 경과, 김개발 대기 중)', checked: false },
  { id: 4, text: 'Issue #156 방향 결정 (블로커 가능성)', checked: false },
];

// 퇴근 전용 선배 ASCII 아트 — 커피 들고 손 흔들며 보내주는 포즈
const EVENING_SENPAI = [
  '  (◕‿◕)/  ',
  '  c[_]っ   ',
  '   /|\\    ',
  '   / \\    ',
];

// 퇴근 전환 타이핑 효과
function ClockOutOverlay({ onDone }) {
  const lines = [
    '주간 시스템 종료 중...',
    '야간 근무 이관 완료. 맡겨둬.',
  ];
  const [lineIdx, setLineIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState('fadein'); // fadein → typing → done

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase('typing'), 300);
    return () => clearTimeout(fadeTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'typing') return;
    const currentLine = lines[lineIdx];
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(currentLine.slice(0, i));
      if (i >= currentLine.length) {
        clearInterval(id);
        if (lineIdx < lines.length - 1) {
          // 다음 줄로 진행
          setTimeout(() => {
            setLineIdx(prev => prev + 1);
            setDisplayed('');
          }, 400);
        } else {
          setTimeout(() => onDone(), 500);
        }
      }
    }, 30);
    return () => clearInterval(id);
  }, [phase, lineIdx, onDone]);

  return (
    <div
      className="clockout-overlay"
      style={{
        opacity: phase === 'fadein' ? 0 : 1,
        transition: 'opacity 0.3s ease-in',
      }}
    >
      <div className="text-center">
        {/* 이전 줄들 */}
        {lines.slice(0, lineIdx).map((line, i) => (
          <div key={i} className="text-term-amber glow-text-amber text-lg font-mono mb-2 opacity-60">
            {line}
          </div>
        ))}
        {/* 현재 타이핑 중인 줄 */}
        <div className="text-term-amber glow-text-amber text-lg font-mono">
          {displayed}
          {phase === 'typing' && <span className="animate-pulse">▌</span>}
        </div>
      </div>
    </div>
  );
}

// 선배 대사 타이핑 효과
function useTypingEffect(text, speed = 35) {
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!text) { setDisplayed(''); return; }
    setIsTyping(true);
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setIsTyping(false);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return { displayed, isTyping };
}

export default function EveningHandoff({ todaySummary, tomorrowItems, onClockOut, onBack }) {
  const [instruction, setInstruction] = useState('');
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [greeting] = useState(() => getGreeting('greeting_evening'));

  const { displayed: typedGreeting, isTyping } = useTypingEffect(greeting, 35);

  const today = todaySummary || DEFAULT_TODAY;

  // 제어형 체크박스 상태
  const [tomorrowState, setTomorrowState] = useState(() => {
    const items = tomorrowItems || DEFAULT_TOMORROW;
    return items.map((item, idx) => ({
      ...item,
      id: item.id ?? idx + 1,
      checked: item.checked ?? (item.status === '✓'),
    }));
  });

  const handleToggleTomorrow = (id) => {
    setTomorrowState(prev =>
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  const handleClockOut = async () => {
    setIsClockingOut(true);
    try {
      // 내일 예정 저장
      await fetch('/api/task/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: tomorrowState.map(item => ({
            ...item,
            status: item.checked ? '✓' : (item.status === '⚠' ? '⚠' : '◯'),
          })),
        }),
      });
      // 퇴근 처리
      await fetch('/api/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      });
    } catch (e) {
      console.error('clock-out failed:', e);
    }
  };

  const handleOverlayDone = () => {
    onClockOut?.(instruction);
  };

  return (
    <div className="h-full flex flex-col evening-scene">
      <div className="flex-1 flex p-6 overflow-auto relative">
        {isClockingOut && <ClockOutOverlay onDone={handleOverlayDone} />}

        {/* 좌측: 선배 캐릭터 영역 */}
        <div className="w-5/12 flex flex-col items-center justify-center senpai-evening-glow pr-4">
          <AsciiTitle color="var(--color-term-amber)" />

          {/* 선배 ASCII 캐릭터 */}
          <div className="mt-6 senpai-float">
            <pre className="text-base leading-[1.2] font-mono text-term-amber glow-text-amber text-center">
              {EVENING_SENPAI.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </pre>
          </div>

          {/* 선배 대사 */}
          <div className="mt-4 text-term-amber glow-text-amber text-sm text-center leading-relaxed max-w-xs">
            &ldquo;{typedGreeting}{isTyping ? '▌' : ''}&rdquo;
          </div>

          {/* 분위기 서브텍스트 */}
          <div className="mt-3 text-term-amber/40 text-xs">
            ☕ 커피 한 잔 내리는 중...
          </div>
        </div>

        {/* 우측: 인수인계 폼 영역 */}
        <div className="w-7/12 flex flex-col justify-center pl-4 border-l border-term-border/30">
          <Panel label="📊 오늘 한 일" className="w-full">
            <pre className="text-sm text-term-green whitespace-pre-wrap">{today}</pre>
          </Panel>

          <Panel label="🔮 내일 예정" className="w-full mt-3">
            <div className="space-y-1">
              {tomorrowState.map((item) => {
                const label = item.text || item.item || '';
                return (
                  <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggleTomorrow(item.id)}
                      className="accent-term-amber"
                    />
                    <span className={`text-term-amber ${item.checked ? 'line-through opacity-60' : ''}`}>{label}</span>
                  </label>
                );
              })}
            </div>
          </Panel>

          <Panel label="✏️ 밤새 특별히 봐줄 것" className="w-full mt-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                className="flex-1 bg-transparent border-b border-term-amber text-term-amber outline-none py-1 glow-text-amber placeholder:text-term-amber/30"
                placeholder="예: 결제 모듈 에러핸들링 봐줘"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
              <button
                onClick={handleClockOut}
                disabled={isClockingOut}
                className="shrink-0 flex items-center gap-2 px-3 py-1 border-2 border-term-amber/50 text-term-amber text-xs font-bold clock-pulse-amber cursor-pointer hover:bg-term-amber hover:text-black disabled:opacity-50"
              >
                퇴근합니다 👋
              </button>
            </div>
          </Panel>

        </div>
      </div>

      <CommandBar
        location="퇴근 준비"
        shift="day"
        actions={[
          { key: 'Esc', label: '돌아가기', onClick: onBack },
        ]}
      />
    </div>
  );
}
