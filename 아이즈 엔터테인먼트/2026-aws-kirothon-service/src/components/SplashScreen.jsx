'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AsciiTitle from './AsciiTitle';

// ── Phase 0: AIZ ENTERTAINMENT 블록 아트 ──
const AIZ_LINES = [
  ' █████╗ ██╗███████╗  ███████╗███╗   ██╗████████╗███████╗██████╗ ████████╗ █████╗ ██╗███╗   ██╗███╗   ███╗███████╗███╗   ██╗████████╗',
  '██╔══██╗██║╚══███╔╝  ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██║████╗  ██║████╗ ████║██╔════╝████╗  ██║╚══██╔══╝',
  '███████║██║  ███╔╝   █████╗  ██╔██╗ ██║   ██║   █████╗  ██████╔╝   ██║   ███████║██║██╔██╗ ██║██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ',
  '██╔══██║██║ ███╔╝    ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗   ██║   ██╔══██║██║██║╚██╗██║██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   ',
  '██║  ██║██║███████╗  ███████╗██║ ╚████║   ██║   ███████╗██║  ██║   ██║   ██║  ██║██║██║ ╚████║██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   ',
  '╚═╝  ╚═╝╚═╝╚══════╝  ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝',
];

// ── 비프음 유틸 (Web Audio API) ──
function createBeep(audioCtx, freq = 800, duration = 0.04, volume = 0.08) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// ── CRT 타자 사운드 (노이즈 버스트 + 톤) ──
function createTypeSound(audioCtx, volume = 0.06) {
  const t = audioCtx.currentTime;
  const duration = 0.03 + Math.random() * 0.02;

  // 노이즈 버스트 (타건감)
  const bufferSize = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // 감쇠
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  // 밴드패스 필터 (기계식 키보드 느낌)
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000 + Math.random() * 2000;
  filter.Q.value = 1.5;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  noise.connect(filter).connect(gain).connect(audioCtx.destination);
  noise.start(t);
  noise.stop(t + duration);

  // 미세한 클릭 톤 (키캡 바닥 소리)
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 400 + Math.random() * 200;
  oscGain.gain.setValueAtTime(volume * 0.3, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
  osc.connect(oscGain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.015);
}

// ── Phase 2: BIOS POST 라인 ──
const BIOS_HEADER = [
  { text: 'CS SENPAI BIOS v1.0', color: 'text-term-amber glow-text-amber' },
  { text: 'Copyright (C) 1997 전산과 연구실', color: 'text-term-green/60' },
  { text: '', color: '' },
];

const BIOS_CHECKS = [
  { label: 'CPU: Claude Sonnet 4', ok: true },
  { label: 'MEM: 128TB Knowledge Base', ok: true },
  { label: 'GPU: Terminal Rendering Engine', ok: true },
  { label: 'NET: GitHub API v4', ok: true },
  { label: 'DB : SQLite Local Store', ok: true },
  { label: 'AI : Kiro CLI Agents', ok: true },
];

const BIOS_FOOTER = [
  '',
  'Night Shift Module loaded.',
  '야간 근무 시스템 초기화 완료.',
];

// ── Phase 4: 선배 ASCII ──
const SENPAI_ASCII = [
  '(◕‿◕)/',
  'c[_]っ',
  ' /|\\',
  ' / \\',
];

const SENPAI_LINE = '걱정 마, 내가 다 봐줄게. ☕';

// ── Phase 5: 서비스 설명 ──
const FEATURES = [
  { icon: '🌙', text: '밤새 GitHub 모니터링 & PR 리뷰', color: 'text-term-cyan' },
  { icon: '🤖', text: 'AI가 분석하고, 자동 처리까지', color: 'text-term-green' },
  { icon: '☀️', text: '아침에 출근하면 브리핑 준비 완료', color: 'text-term-amber' },
];

const TAGLINE = '퇴근 버튼을 누르면, AI의 근무가 시작된다.';

// ── 한글 서브타이틀 박스 ──
const SUBTITLE_BOX = `┌──────────────────────────────────┐
│   전 설 의   전 산 과   선 배     │
│   LEGENDARY NIGHT SHIFT SYSTEM   │
└──────────────────────────────────┘`;

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  // Phase 0: AIZ ENTERTAINMENT
  const [aizLine, setAizLine] = useState(0);
  const [aizGlow, setAizGlow] = useState(false);
  // Phase 1 substates
  const [crtSubPhase, setCrtSubPhase] = useState(0);
  // Phase 2 state
  const [biosLines, setBiosLines] = useState(0);
  // Phase 4 typing
  const [typedText, setTypedText] = useState('');
  // Phase 6 progress
  const [progress, setProgress] = useState(0);
  // Phase 7 fade
  const [fading, setFading] = useState(false);
  // Audio
  const audioCtxRef = useRef(null);

  // ── 타이밍 컨트롤러 (~20초) ──
  useEffect(() => {
    const timers = [];
    const t = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

    // AudioContext 초기화 (Chrome autoplay 정책 대응)
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current.resume();
    } catch (e) { /* 오디오 미지원 환경 무시 */ }

    // ── Phase 0: AIZ ENTERTAINMENT (0-3000ms) ──
    // 0-200ms: 검은 화면 (인광체 워밍업)
    // 200-1530ms: 블록 아트 줄별 등장 (6줄, ~266ms/줄)
    for (let i = 0; i < AIZ_LINES.length; i++) {
      t(() => setAizLine(prev => prev + 1), 200 + i * 266);
    }
    // 1800ms: 글로우 펄스 시작
    t(() => setAizGlow(true), 1800);

    // ── Phase 1: CRT 전원 ON (3000-4200ms) ──
    t(() => setPhase(1), 3000);
    t(() => setCrtSubPhase(1), 3400);  // 수평선
    t(() => setCrtSubPhase(2), 3800);  // 화면 확장
    t(() => setPhase(2), 4200);

    // ── Phase 2: BIOS POST (4200-8500ms) — 330ms 간격 라인 등장 ──
    const totalBiosLines = BIOS_HEADER.length + BIOS_CHECKS.length + BIOS_FOOTER.length;
    for (let i = 0; i < totalBiosLines; i++) {
      t(() => setBiosLines(prev => prev + 1), 4200 + i * 330);
    }

    // ── Phase 3: ASCII 로고 (8500-11500ms) ──
    t(() => setPhase(3), 8500);

    // ── Phase 4: 선배 등장 + 대사 (11500-15000ms) ──
    t(() => setPhase(4), 11500);

    // ── Phase 5: 서비스 설명 (15000-17500ms) ──
    t(() => setPhase(5), 15000);

    // ── Phase 6: 프로그레스 바 (17500-19500ms) ──
    t(() => setPhase(6), 17500);

    // ── Phase 7: 페이드아웃 (19500-20500ms) ──
    t(() => { setPhase(7); setFading(true); }, 19500);
    t(() => onComplete?.(), 20500);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // ── Phase 0: AIZ 줄 등장 시 타자음 연타 ──
  useEffect(() => {
    if (aizLine > 0 && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      // 줄 하나 등장할 때 빠른 타자음 5연타
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          try { createTypeSound(ctx, 0.07); } catch (e) {}
        }, i * 40);
      }
    }
  }, [aizLine]);

  // ── Phase 2: BIOS 라인 등장 시 타자음 연타 ──
  useEffect(() => {
    if (biosLines > 0 && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      // BIOS 라인마다 타자음 연타 (라인 길이에 비례)
      const count = biosLines <= BIOS_HEADER.length ? 3 : 6;
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          try { createTypeSound(ctx, 0.06); } catch (e) {}
        }, i * 35);
      }
    }
  }, [biosLines]);

  // ── Phase 4: 타이핑 효과 (80ms/글자) + 타자음 ──
  useEffect(() => {
    if (phase !== 4) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(SENPAI_LINE.slice(0, i));
      if (audioCtxRef.current) {
        try { createTypeSound(audioCtxRef.current, 0.05); } catch (e) {}
      }
      if (i >= SENPAI_LINE.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Phase 5: 서비스 설명 등장 시 타자음 ──
  useEffect(() => {
    if (phase !== 5 || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const timers = [];
    // 3개 피처 라인 + 태그라인, 각각 등장 시 타자음 연타
    [0, 500, 1000, 1500].forEach((delay, idx) => {
      const count = idx < 3 ? 4 : 6;
      for (let i = 0; i < count; i++) {
        timers.push(setTimeout(() => {
          try { createTypeSound(ctx, 0.05); } catch (e) {}
        }, delay + i * 45));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // ── Phase 6: 프로그레스 바 (35ms/+5%) + 틱 사운드 ──
  useEffect(() => {
    if (phase !== 6) return;
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(Math.min(p, 100));
      if (audioCtxRef.current && p % 10 === 0) {
        try { createTypeSound(audioCtxRef.current, 0.04); } catch (e) {}
      }
      if (p >= 100) clearInterval(interval);
    }, 35);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Phase 6: SYSTEM READY 비프 ──
  useEffect(() => {
    if (progress >= 100 && audioCtxRef.current) {
      try { createBeep(audioCtxRef.current, 1200, 0.1, 0.08); } catch (e) {}
    }
  }, [progress]);

  // ── BIOS 라인 렌더 ──
  const renderBiosLines = useCallback(() => {
    const lines = [];
    let idx = 0;

    // 헤더
    for (const h of BIOS_HEADER) {
      if (idx < biosLines) {
        lines.push(
          <motion.div
            key={`h-${idx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.05 }}
            className={h.color}
          >
            {h.text || '\u00A0'}
          </motion.div>
        );
      }
      idx++;
    }

    // 체크 라인
    for (const check of BIOS_CHECKS) {
      if (idx < biosLines) {
        const dots = '.'.repeat(Math.max(0, 38 - check.label.length));
        lines.push(
          <motion.div
            key={`c-${idx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.05 }}
            className="text-term-green/80"
          >
            {check.label} {dots} <span className="text-term-green font-bold glow-text">OK</span>
          </motion.div>
        );
      }
      idx++;
    }

    // 푸터
    for (const f of BIOS_FOOTER) {
      if (idx < biosLines) {
        lines.push(
          <motion.div
            key={`f-${idx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.05 }}
            className={f ? 'text-term-green' : ''}
          >
            {f || '\u00A0'}
          </motion.div>
        );
      }
      idx++;
    }

    return lines;
  }, [biosLines]);

  return (
    <div
      className="splash-overlay"
      style={{
        opacity: fading ? 0 : 1,
        transform: fading ? 'scale(1.02)' : 'scale(1)',
        transition: fading ? 'opacity 0.3s ease-out, transform 0.3s ease-out' : 'none',
      }}
    >
      <AnimatePresence mode="wait">
        {/* ═══ Phase 0: AIZ ENTERTAINMENT ═══ */}
        {phase === 0 && (
          <motion.div
            key="aiz"
            className="flex flex-col items-center justify-center w-full h-full"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <pre
              className={`text-term-green text-[clamp(7px,0.55vw,12px)] leading-tight whitespace-pre ${
                aizGlow ? 'aiz-glow' : 'glow-text'
              }`}
            >
              {AIZ_LINES.slice(0, aizLine).map((line, i) => (
                <motion.span
                  key={i}
                  className="block aiz-line-appear"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1 }}
                >
                  {line}
                </motion.span>
              ))}
            </pre>
          </motion.div>
        )}

        {/* ═══ Phase 1: CRT 전원 ON ═══ */}
        {phase === 1 && (
          <motion.div
            key="crt-power"
            className="flex items-center justify-center w-full h-full"
            style={{ background: '#000' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {crtSubPhase === 0 && (
              <div className="crt-power-dot" />
            )}
            {crtSubPhase === 1 && (
              <div className="crt-power-line" />
            )}
            {crtSubPhase === 2 && (
              <motion.div
                className="w-full h-full"
                style={{ background: '#0a0a0a' }}
                initial={{ clipPath: 'inset(49% 0 49% 0)' }}
                animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              />
            )}
          </motion.div>
        )}

        {/* ═══ Phase 2: BIOS POST ═══ */}
        {phase === 2 && (
          <motion.div
            key="bios"
            className="w-full h-full flex items-start justify-start p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-xs leading-relaxed font-mono max-w-2xl">
              {renderBiosLines()}
            </div>
          </motion.div>
        )}

        {/* ═══ Phase 3: ASCII 로고 ═══ */}
        {phase === 3 && (
          <motion.div
            key="logo"
            className="flex flex-col items-center justify-center w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="splash-flicker"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <AsciiTitle />
            </motion.div>

            <motion.pre
              className="text-term-green text-xs glow-text text-center leading-tight mt-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {SUBTITLE_BOX}
            </motion.pre>
          </motion.div>
        )}

        {/* ═══ Phase 4: 선배 등장 + 대사 ═══ */}
        {phase === 4 && (
          <motion.div
            key="senpai"
            className="flex flex-col items-center justify-center w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* 대사 말풍선 */}
            <motion.div
              className="senpai-bubble mb-3 text-sm text-term-green glow-text"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {typedText}
              <span className="cursor-blink" />
            </motion.div>

            {/* 말풍선 꼬리 */}
            <div className="text-term-green/50 text-xs mb-1">▼</div>

            {/* 선배 캐릭터 */}
            <motion.div
              className="senpai-float text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <pre className="text-term-green glow-text text-sm leading-tight">
                {SENPAI_ASCII.join('\n')}
              </pre>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ Phase 5: 서비스 설명 ═══ */}
        {phase === 5 && (
          <motion.div
            key="features"
            className="flex flex-col items-center justify-center w-full h-full gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-2">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  className={`text-sm ${f.color} glow-text`}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.5, duration: 0.3, ease: 'easeOut' }}
                >
                  {f.icon}  {f.text}
                </motion.div>
              ))}
            </div>

            <motion.div
              className="text-term-green text-sm mt-4 text-reveal-glow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.4 }}
            >
              {TAGLINE}
            </motion.div>
          </motion.div>
        )}

        {/* ═══ Phase 6: 부팅 완료 ═══ */}
        {phase >= 6 && !fading && (
          <motion.div
            key="ready"
            className="flex flex-col items-center justify-center w-full h-full gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {/* 프로그레스 바 */}
            <div className="w-64 text-xs text-term-green font-mono">
              <div className="flex">
                <span className="glow-text">
                  {'▓'.repeat(Math.round(progress / 5))}{'░'.repeat(20 - Math.round(progress / 5))}
                </span>
                <span className="ml-2">{progress}%</span>
              </div>
            </div>

            {/* SYSTEM READY */}
            {progress >= 100 && (
              <motion.div
                className="text-term-green text-sm glow-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.3, 1] }}
                transition={{ duration: 0.6, times: [0, 0.3, 0.6, 1] }}
              >
                ▌ SYSTEM READY ▌
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
