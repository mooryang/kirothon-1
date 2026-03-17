'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Panel from './Panel';
import AsciiTitle from './AsciiTitle';

const TIMELAPSE_EVENTS = [
  { time: '18:30', type: 'system', message: '퇴근 확인. 야간 근무 시작한다.', senpai: '퇴근이야? 그래 가. 나야 또 밤새지 뭐.' },
  { time: '18:31', type: 'scan', message: 'baseline 수집 중... PR 3건, Issue 6건, CI 2건' },
  { time: '18:32', type: 'scan', message: 'baseline 수집 완료. 감시 모드 진입.' },
  { time: '20:30', type: 'detect', message: '새 PR 감지: #93 세션 만료 로직 수정 (김개발)', category: 'approve' },
  { time: '20:32', type: 'analyze', message: 'PR #93 분석 완료 — 리스크: LOW', senpai: '새 PR 올라왔는데, 김개발이 또 올렸네.' },
  { time: '22:00', type: 'alert', message: 'CI 실패 감지: PR #91 auth.spec.ts 타임아웃', category: 'approve' },
  { time: '22:05', type: 'analyze', message: 'CI 실패 원인 분석: 타임아웃 5s→10s 변경 제안', senpai: 'CI 터졌다. 원인 찾아볼게.' },
  { time: '01:00', type: 'detect', message: 'dependabot PR #94 감지 — 보안 패치 lodash', category: 'auto' },
  { time: '01:01', type: 'auto', message: '✓ PR #94 자동 머지 완료 (테스트 통과)', senpai: 'dependabot이 또 올렸더라. 내가 다 처리했으니 신경 꺼.' },
  { time: '01:02', type: 'detect', message: 'Issue #155 중복 감지 — #142와 동일', category: 'auto' },
  { time: '01:03', type: 'auto', message: '✓ Issue #155 자동 클로즈 + duplicate 라벨' },
  { time: '03:00', type: 'detect', message: 'Issue #160 새 코멘트 (@carlos-dev)', category: 'direct' },
  { time: '03:02', type: 'analyze', message: 'Issue #160 분석: 아키텍처 방향 결정 필요', senpai: '이건 네가 직접 봐야 돼. 내가 함부로 결정할 수 없는 거라...' },
  { time: '06:00', type: 'analyze', message: '특별 지시 분석 완료: 결제 모듈 12파일 847줄 검토', senpai: '시킨 거 다 했다. 결제 모듈 꽤 복잡하네...' },
  { time: '06:30', type: 'system', message: '야간 리포트 생성 완료' },
  { time: '07:00', type: 'system', message: '모닝 브리프 준비 완료. 좋은 아침이다!', senpai: '왔어? 밤새 6건 처리해놨다. 커피는 사 오는 거지? ☕' },
];

export default function Timelapse({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logs, setLogs] = useState([]);
  const [currentSenpai, setCurrentSenpai] = useState('');
  const [stats, setStats] = useState({ pr: 0, issue: 0, auto: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (currentIndex >= TIMELAPSE_EVENTS.length) {
      setIsComplete(true);
      const timer = setTimeout(() => onComplete?.(), 3000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      const event = TIMELAPSE_EVENTS[currentIndex];
      setLogs(prev => [...prev, event]);

      if (event.senpai) {
        setCurrentSenpai(event.senpai);
      }

      // 카운터 업데이트
      setStats(prev => {
        const next = { ...prev };
        if (event.category === 'approve' || event.type === 'detect') {
          if (event.message.includes('PR')) next.pr++;
          if (event.message.includes('Issue')) next.issue++;
        }
        if (event.type === 'auto') next.auto++;
        return next;
      });

      setCurrentIndex(prev => prev + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentIndex, onComplete]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const progress = Math.round((currentIndex / TIMELAPSE_EVENTS.length) * 100);
  const currentTime = logs.length > 0 ? logs[logs.length - 1].time : '18:30';

  const TYPE_COLORS = {
    system: 'text-term-cyan',
    scan: 'text-term-green/70',
    detect: 'text-term-amber',
    analyze: 'text-term-green',
    alert: 'text-term-red',
    auto: 'text-term-green',
  };

  return (
    <div className="h-screen flex flex-col p-4">
      {/* 헤더 */}
      <div className="text-center mb-4">
        <AsciiTitle size="small" />
        <p className="text-term-green/60 text-xs mt-1">타임랩스 모드 — 야간 근무 재생 중</p>
      </div>

      {/* 현재 시간 (대형) */}
      <div className="text-center mb-4">
        <span className="text-4xl text-term-amber glow-text-amber font-bold">{currentTime}</span>
      </div>

      {/* 카운터 */}
      <div className="flex justify-center gap-8 mb-4 text-sm">
        <div>
          <span className="text-term-green/60">PR 분석:</span>{' '}
          <span className="text-term-cyan">{stats.pr}</span>
        </div>
        <div>
          <span className="text-term-green/60">이슈 처리:</span>{' '}
          <span className="text-term-cyan">{stats.issue}</span>
        </div>
        <div>
          <span className="text-term-green/60">자동 처리:</span>{' '}
          <span className="text-term-cyan">{stats.auto}</span>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="mb-4 px-8">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-term-green/60">진행:</span>
          <div className="flex-1 border border-term-border h-3">
            <div
              className="h-full bg-term-green transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-term-cyan">{progress}%</span>
        </div>
      </div>

      {/* 전산과 선배 대사 */}
      <AnimatePresence mode="wait">
        {currentSenpai && (
          <motion.div
            key={currentSenpai}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center mb-4 px-8"
          >
            <p className="text-term-amber text-sm glow-text-amber typing-effect">
              💬 {currentSenpai}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 로그 패널 */}
      <Panel label="📜 야간 로그" className="flex-1 min-h-0">
        <div className="text-xs space-y-0.5 font-mono">
          <AnimatePresence>
            {logs.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <span className="text-term-green/40 flex-shrink-0">[{entry.time}]</span>
                <span className={TYPE_COLORS[entry.type] || 'text-term-green'}>
                  {entry.message}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={logEndRef} />
        </div>
      </Panel>

      {/* 상태바 */}
      <div className="bg-term-green text-black px-4 py-1 text-xs font-bold mt-2">
        {isComplete ? '✓ 야간 근무 완료 — 모닝 브리프로 전환 중...' : '▶ 재생 중...'}
      </div>
    </div>
  );
}
