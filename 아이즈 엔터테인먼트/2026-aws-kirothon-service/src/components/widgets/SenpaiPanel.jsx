'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getGreeting } from '../../persona/senpai';

// ── 멀티라인 ASCII 포즈 ──
const ASCII_POSES = {
  coffee: {
    label: '커피 타임',
    faceIdx: 0,
    frames: [
      ['  (◕‿◕)  ', '  c[_]っ  ', '   /|\\   ', '   / \\   '],
      ['  (◕‿◕) ~', '  c[_]っ  ', '   /|\\   ', '   / \\   '],
      ['  (◕‿◕)~ ', '  c[_]っ  ', '   /|\\   ', '   / \\   '],
    ],
  },
  working: {
    label: '분석 중',
    faceIdx: 0,
    frames: [
      ['  (◕_◕)  ', '  ⌨ /|   ', '  _/|\\   ', '   / \\   '],
      ['  (◕_◕)  ', '   ⌨|    ', '  _/|\\   ', '   / \\   '],
    ],
  },
  alert: {
    label: '주의 필요',
    faceIdx: 0,
    frames: [
      ['  (◉_◉)! ', '  \\|/    ', '   |     ', '  / \\    '],
      [' !(◉_◉)  ', '   \\|/   ', '   |     ', '  / \\    '],
    ],
  },
  happy: {
    label: '처리 완료',
    faceIdx: 0,
    frames: [
      [' \\(◕‿◕)/ ', '   \\|/   ', '    |    ', '   / \\   '],
      ['  (◕‿◕)✧ ', '   /|\\   ', '    |    ', '   / \\   '],
    ],
  },
  tired: {
    label: '야근 중...',
    faceIdx: 0,
    frames: [
      [' (¬_¬)zzz', '   /|_   ', '   /|    ', '  / \\    '],
      [' (¬_¬)zz ', '   /|__  ', '   /|    ', '  / \\    '],
    ],
  },
  thinking: {
    label: '고민 중',
    faceIdx: 0,
    frames: [
      ['  (◕.◕)? ', '  _/|    ', '   /|\\   ', '   / \\   '],
      ['  (◕.◕)  ', '   /|_   ', '   /|\\   ', '   / \\   '],
    ],
  },
};

// ── 씬 매핑: 카테고리 → 포즈+활동 ──
const SCENE_MAP = {
  greeting_morning: { mood: 'coffee',   activity: '☕ 아침 인사 중...' },
  greeting_evening: { mood: 'tired',    activity: '🌙 퇴근 인사 중...' },
  scan_start:       { mood: 'working',  activity: '🔍 레포 스캔 중...' },
  found_issue:      { mood: 'alert',    activity: '⚠ 이슈 발견!' },
  auto_fixed:       { mood: 'happy',    activity: '✅ 자동 처리 완료' },
  waiting_approval: { mood: 'thinking', activity: '⏳ 승인 대기 중...' },
  idle:             { mood: 'coffee',   activity: '☕ 커피 마시는 중...' },
  nudge_leave:      { mood: 'tired',    activity: '🏠 퇴근 독촉 중...' },
  weekly_summary:   { mood: 'happy',    activity: '📊 주간 정리 중...' },
  lunch_suggest:    { mood: 'coffee',   activity: '🍚 점심 추천 중...' },
};

const DIALOGUE_CATEGORIES = Object.keys(SCENE_MAP);

// ── 미니 활동 로그 풀 ──
const ACTIVITY_POOL = {
  scanning: [
    '🔍 PR #93 diff 분석 중...',
    '🔍 CI 파이프라인 확인 중...',
    '🔍 최근 커밋 히스토리 조회 중...',
    '🔍 브랜치 충돌 여부 확인 중...',
  ],
  idle: [
    '☕ 커피 내리는 중...',
    '💤 잠깐 눈 붙이는 중...',
    '📖 코드 리뷰 복습 중...',
    '🎵 lo-fi 틀어놓는 중...',
  ],
  working: [
    '⌨ PR #94 머지 처리 중...',
    '📝 아침 브리핑 준비 중...',
    '🔧 린트 에러 자동 수정 중...',
    '📊 테스트 커버리지 분석 중...',
  ],
};

// ── 타이핑 애니메이션 훅 ──
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

// ── 에너지 계산: 18:30 = 100%, 06:30 = 20% ──
function getEnergy() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMin = h * 60 + m;
  const startMin = 18 * 60 + 30;
  const endMin = 6 * 60 + 30;
  const totalSpan = 720;

  let elapsed;
  if (totalMin >= startMin) {
    elapsed = totalMin - startMin;
  } else if (totalMin <= endMin) {
    elapsed = (1440 - startMin) + totalMin;
  } else {
    return 80;
  }

  return Math.max(20, Math.round(100 - (elapsed / totalSpan) * 80));
}

// ── 커피 카운터: 18:30부터 2시간마다 +1, 에너지 40% 이하 보너스 ──
function getCoffeeCount(energy) {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMin = h * 60 + m;
  const startMin = 18 * 60 + 30;

  let elapsed;
  if (totalMin >= startMin) {
    elapsed = totalMin - startMin;
  } else if (totalMin < 7 * 60) {
    elapsed = (1440 - startMin) + totalMin;
  } else {
    return 2; // 낮 — 데모용
  }

  let cups = Math.floor(elapsed / 120) + 1;
  if (energy <= 40) cups += 1;
  return Math.min(cups, 7);
}

function decideMood(changes) {
  if (!changes || changes.length === 0) return 'coffee';
  const hasAlert = changes.some(c => c.category === 'direct');
  if (hasAlert) return 'alert';
  const approveCount = changes.filter(c => c.category === 'approve').length;
  if (approveCount >= 2) return 'working';
  const allAuto = changes.every(c => c.category === 'auto');
  if (allAuto) return 'happy';
  return 'coffee';
}

// ── Mood별 배경 그라데이션 ──
const MOOD_BG = {
  coffee:   'from-green-950/20 to-transparent',
  working:  'from-cyan-950/20 to-transparent',
  alert:    'from-red-950/25 to-transparent',
  happy:    'from-emerald-950/20 to-transparent',
  tired:    'from-amber-950/20 to-transparent',
  thinking: 'from-violet-950/15 to-transparent',
};

// ── 무드별 상태 아이콘 ──
const MOOD_ICON = {
  coffee: '☕',
  working: '⌨',
  alert: '⚠',
  happy: '✓',
  tired: '💤',
  thinking: '💭',
};

// ── 무드별 백라이트 CSS 클래스 ──
const MOOD_BACKLIGHT = {
  coffee:   'senpai-backlight',
  working:  'senpai-backlight',
  alert:    'senpai-backlight-alert',
  happy:    'senpai-backlight',
  tired:    'senpai-backlight-tired',
  thinking: 'senpai-backlight',
};

// ── 야근 진행률 계산: 18:30~06:30 ──
function getShiftProgress() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMin = h * 60 + m;
  const startMin = 18 * 60 + 30; // 18:30
  const endMin = 6 * 60 + 30;    // 06:30
  const totalSpan = 720;          // 12시간

  let elapsed;
  if (totalMin >= startMin) {
    elapsed = totalMin - startMin;
  } else if (totalMin <= endMin) {
    elapsed = (1440 - startMin) + totalMin;
  } else {
    return { percent: 62, remaining: '01:23' }; // 낮 — 데모용
  }

  const percent = Math.min(100, Math.round((elapsed / totalSpan) * 100));
  const remainMin = Math.max(0, totalSpan - elapsed);
  const rH = String(Math.floor(remainMin / 60)).padStart(2, '0');
  const rM = String(remainMin % 60).padStart(2, '0');
  return { percent, remaining: `${rH}:${rM}` };
}

export default function SenpaiPanel({ data }) {
  const changes = data?.nightChanges || [];
  const baseMood = decideMood(changes);
  const processedCount = changes.length;
  // ── 씬 상태 (대사 카테고리 인덱스 + 현재 mood) ──
  const [catIdx, setCatIdx] = useState(0);
  const [currentMood, setCurrentMood] = useState(baseMood);

  // ── 대사 ──
  const [dialogue, setDialogue] = useState(() =>
    getGreeting('greeting_morning', { count: processedCount })
  );
  const { displayed, isTyping } = useTypingEffect(dialogue, 35);

  // ── idle 프레임 애니메이션 (1.5초) ──
  const [frameIdx, setFrameIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setFrameIdx(prev => prev + 1);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // ── 눈 깜빡임 (3-5초) ──
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    const blink = () => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    };
    const schedule = () => {
      const delay = 3000 + Math.random() * 2000;
      return setTimeout(() => { blink(); timerId = schedule(); }, delay);
    };
    let timerId = schedule();
    return () => clearTimeout(timerId);
  }, []);

  // ── 호버/클릭 상태 ──
  const [isHovered, setIsHovered] = useState(false);
  const [hoverLine, setHoverLine] = useState('');
  const savedMoodRef = useRef(currentMood);

  const handleMouseEnter = useCallback(() => {
    savedMoodRef.current = currentMood;
    setIsHovered(true);
    setCurrentMood('thinking');
    setHoverLine(getGreeting('hover_reaction'));
  }, [currentMood]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setCurrentMood(savedMoodRef.current);
    setHoverLine('');
  }, []);

  // ── 대사 로테이션 (12초) + 씬 동기화 ──
  const advanceScene = useCallback(() => {
    setCatIdx(prev => {
      const next = (prev + 1) % DIALOGUE_CATEGORIES.length;
      const cat = DIALOGUE_CATEGORIES[next];
      const scene = SCENE_MAP[cat];
      setDialogue(getGreeting(cat, { count: processedCount, repo: 'cs-senpai' }));
      if (!isHovered) {
        setCurrentMood(scene.mood);
      } else {
        savedMoodRef.current = scene.mood;
      }
      return next;
    });
  }, [processedCount, isHovered]);

  useEffect(() => {
    const id = setInterval(advanceScene, 12000);
    return () => clearInterval(id);
  }, [advanceScene]);

  // ── 클릭 → 다음 씬 즉시 ──
  const handleClick = useCallback(() => {
    if (isHovered) {
      setIsHovered(false);
      setHoverLine('');
    }
    advanceScene();
  }, [isHovered, advanceScene]);

  // ── 미니 활동 로그 (6초) ──
  const [subActivity, setSubActivity] = useState('');
  useEffect(() => {
    const pickActivity = () => {
      const scene = SCENE_MAP[DIALOGUE_CATEGORIES[catIdx]];
      let pool;
      if (scene?.mood === 'working' || scene?.mood === 'alert') {
        pool = ACTIVITY_POOL.scanning;
      } else if (scene?.mood === 'happy' || scene?.mood === 'thinking') {
        pool = ACTIVITY_POOL.working;
      } else {
        pool = ACTIVITY_POOL.idle;
      }
      setSubActivity(pool[Math.floor(Math.random() * pool.length)]);
    };
    pickActivity();
    const id = setInterval(pickActivity, 6000);
    return () => clearInterval(id);
  }, [catIdx]);

  // ── 에너지 & 커피 ──
  const energy = getEnergy();
  const coffeeCount = getCoffeeCount(energy);
  const coffeeGlow = coffeeCount >= 7 ? 'glow-text-red' : coffeeCount >= 5 ? 'glow-text-amber' : '';

  // ── 현재 시간 ──
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  // ── ASCII 아트 렌더링 ──
  const pose = ASCII_POSES[currentMood] || ASCII_POSES.coffee;
  const currentFrame = pose.frames[frameIdx % pose.frames.length];

  const renderAsciiLines = useCallback(() => {
    return currentFrame.map((line, idx) => {
      let rendered = line;
      // 눈 깜빡임: faceIdx 줄에만 적용
      if (blinking && idx === pose.faceIdx) {
        rendered = rendered.replace(/◕/g, '─').replace(/◉/g, '─').replace(/¬/g, '─');
      }
      return rendered;
    });
  }, [currentFrame, blinking, pose.faceIdx]);

  const asciiLines = renderAsciiLines();

  // ── 야근 진행률 ──
  const shiftProgress = getShiftProgress();
  const shiftFilled = Math.round(shiftProgress.percent / 10);
  const shiftEmpty = 10 - shiftFilled;
  const shiftBar = '█'.repeat(shiftFilled) + '░'.repeat(shiftEmpty);
  const shiftColor = shiftProgress.percent < 40 ? 'text-term-green' : shiftProgress.percent < 70 ? 'text-term-amber' : 'text-term-red';

  const moodBg = MOOD_BG[currentMood] || MOOD_BG.coffee;
  const backlightClass = MOOD_BACKLIGHT[currentMood] || 'senpai-backlight';
  const moodIcon = MOOD_ICON[currentMood] || '☕';

  return (
    <div
      className={`flex flex-col h-full text-xs senpai-breathing senpai-hover-glow senpai-mood-transition cursor-pointer select-none bg-gradient-to-b ${moodBg} transition-all duration-700 ${currentMood === 'alert' ? 'senpai-shake' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* ASCII 캐릭터 */}
      <div className={`flex-1 flex flex-col items-center justify-center gap-1 relative ${backlightClass}`}>
        {/* 호버 말풍선 */}
        <AnimatePresence>
          {isHovered && hoverLine && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 4 }}
              transition={{ duration: 0.15 }}
              className="senpai-bubble text-term-green text-[10px] mb-1 whitespace-nowrap"
            >
              {hoverLine}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 멀티라인 ASCII 아트 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMood}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="senpai-float text-center leading-none"
          >
            <pre className="text-sm leading-[1.15] font-mono glow-text">
              {asciiLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </pre>
          </motion.div>
        </AnimatePresence>

        {/* 상태 라벨 */}
        <div className="text-term-green/50 flex items-center gap-1.5 mt-0.5">
          <span>{moodIcon} {pose.label}</span>
        </div>

        {/* 대사 */}
        <div className="text-term-amber text-center leading-snug px-1 min-h-[3em] glow-text-amber mt-1">
          &ldquo;{displayed}{isTyping ? '▌' : ''}&rdquo;
        </div>

        {/* 미니 활동 로그 */}
        <div className="h-4 overflow-hidden w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={subActivity}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className="text-term-green/40 text-center text-[10px] truncate"
            >
              {subActivity}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 하단 스탯 */}
      <div className="mt-auto space-y-1 border-t border-term-border/40 pt-1">
        {/* 커피 카운터 */}
        <div className={`text-center text-[10px] ${coffeeGlow}`}>
          <span className={coffeeCount >= 5 ? 'text-term-amber' : 'text-term-green/70'}>
            {'☕'.repeat(coffeeCount)} {coffeeCount}잔째
          </span>
        </div>

        {/* 야근 프로그레스 바 + 남은시간 인라인 */}
        <div className="flex items-center gap-1">
          <span className="text-term-amber text-[10px]">야근</span>
          <div className="flex-1 relative">
            <span className={`progress-bar ${shiftColor}`}>{shiftBar}</span>
          </div>
          <span className={`${shiftColor} text-[10px]`}>{shiftProgress.remaining}</span>
        </div>

        {/* 처리 건수 + 시간 */}
        <div className="text-term-green/50 text-center">
          처리 <span className="text-term-cyan">{processedCount}건</span>
          <span className="text-term-border mx-1">·</span>
          <span className="text-term-cyan">{timeStr}</span>
        </div>
      </div>
    </div>
  );
}
