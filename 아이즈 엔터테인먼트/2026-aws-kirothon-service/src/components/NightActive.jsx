'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Panel from './Panel';
import AsciiTitle from './AsciiTitle';
import CommandBar from './CommandBar';
import { getGreeting } from '../persona/senpai.js';

// ─── 목업 시나리오 (v4: powers, skills, hooks, #agents 위임 포함) ───
const MOCK_SCENARIO = [
  // 스캔 시작 — hook + power 활성화
  [1000,  'hook_fire',    { hook: 'inject-repo-context', trigger: 'prompt_submit' }],
  [1200,  'log',          { msg: '[hook] inject-repo-context → 레포 컨텍스트 주입', level: 'info' }],
  [1500,  'power_load',   { power: 'night-ops', tools_count: 8 }],
  [1700,  'log',          { msg: '[power] night-ops 활성화 (GitHub MCP 8개 도구)', level: 'info' }],
  [2000,  'scan_stage',   { stage: 'collect', progress: 10 }],
  [2500,  'log',          { msg: 'GitHub 데이터 수집 중... (cs-senpai/main)', level: 'info' }],
  [4000,  'scan_stage',   { stage: 'diff', progress: 30 }],
  [4500,  'log',          { msg: '3건 변화 감지', level: 'info' }],

  // 1차: PR 분석 — night-summarizer → #pr-reviewer 위임
  [5000,  'scan_stage',   { stage: 'analyze', progress: 40 }],
  [5100,  'agent_delegate', { from: 'night-summarizer', to: 'pr-reviewer', task_preview: 'PR #93 — 세션 만료 로직 수정' }],
  [5200,  'agent_start',  { agent: 'pr-reviewer', prompt_preview: 'PR #93 — 세션 만료 로직 수정 (김개발)' }],
  [5500,  'log',          { msg: '#pr-reviewer 위임 → PR #93 — 세션 만료 로직 수정', level: 'info' }],
  [9000,  'agent_done',   { agent: 'pr-reviewer', duration_ms: 3800, category: 'approve', risk_level: 'medium' }],
  [9100,  'hook_fire',    { hook: 'post-analysis', trigger: 'agent_turn_complete' }],
  [9200,  'hook_fire',    { hook: 'save-result', trigger: 'agent_stop' }],
  [9300,  'log',          { msg: 'pr-reviewer 완료 (3.8s) → approve / medium', level: 'info' }],
  [9500,  'stat_update',  { auto: 0, approve: 1, direct: 0, total: 1 }],

  // 2차: CI 분석 — ci-pattern-analysis 스킬 로드
  [10000, 'scan_stage',   { stage: 'analyze', progress: 55 }],
  [10100, 'agent_delegate', { from: 'night-summarizer', to: 'ci-analyzer', task_preview: 'CI 실패 — auth.spec.ts 타임아웃' }],
  [10200, 'skill_load',   { skill: 'ci-pattern-analysis', agent: 'ci-analyzer' }],
  [10300, 'log',          { msg: '[skill] ci-pattern-analysis 로드 → ci-analyzer', level: 'info' }],
  [10400, 'agent_start',  { agent: 'ci-analyzer', prompt_preview: 'CI 실패 — auth.spec.ts 타임아웃' }],
  [10500, 'log',          { msg: '#ci-analyzer 위임 → CI 실패 분석 (패턴 매칭 적용)', level: 'info' }],
  [14000, 'agent_done',   { agent: 'ci-analyzer', duration_ms: 3600, category: 'approve', risk_level: 'low' }],
  [14100, 'hook_fire',    { hook: 'post-analysis', trigger: 'agent_turn_complete' }],
  [14200, 'hook_fire',    { hook: 'save-result', trigger: 'agent_stop' }],
  [14300, 'log',          { msg: 'ci-analyzer 완료 (3.6s) → approve / low', level: 'info' }],
  [14500, 'stat_update',  { auto: 0, approve: 2, direct: 0, total: 2 }],

  // 3차: 이슈 분석 — #issue-triager 위임
  [15000, 'scan_stage',   { stage: 'analyze', progress: 75 }],
  [15100, 'agent_delegate', { from: 'night-summarizer', to: 'issue-triager', task_preview: 'Issue #155 — #142와 중복' }],
  [15200, 'agent_start',  { agent: 'issue-triager', prompt_preview: 'Issue #155 — #142와 중복 확인' }],
  [15500, 'log',          { msg: '#issue-triager 위임 → Issue #155 중복 확인', level: 'info' }],
  [18000, 'agent_done',   { agent: 'issue-triager', duration_ms: 2800, category: 'auto', risk_level: 'low' }],
  [18100, 'hook_fire',    { hook: 'post-analysis', trigger: 'agent_turn_complete' }],
  [18200, 'hook_fire',    { hook: 'save-result', trigger: 'agent_stop' }],
  [18300, 'log',          { msg: 'issue-triager 완료 (2.8s) → auto / low', level: 'info' }],
  [18500, 'stat_update',  { auto: 1, approve: 2, direct: 0, total: 3 }],

  // 자동 처리 + 저장 + power unload
  [19000, 'scan_stage',   { stage: 'execute', progress: 90 }],
  [19500, 'log',          { msg: '🟢 auto close: Issue #155 클로즈 (중복)', level: 'info' }],
  [20000, 'scan_stage',   { stage: 'save', progress: 95 }],
  [20500, 'log',          { msg: '분석 결과 DB 저장 완료', level: 'info' }],
  [21000, 'power_unload', { power: 'night-ops' }],
  [21200, 'scan_complete', { diffs_found: 3, results_summary: { auto: 1, approve: 2, direct: 0 } }],
  [21500, 'log',          { msg: '스캔 완료: 3건 (🟢1 🟡2 🔴0)', level: 'info' }],
  [22000, 'scan_stage',   { stage: 'idle', progress: 100 }],

  // 2차 스캔 — dependabot 자동 머지
  [35000, 'log',          { msg: '다음 스캔까지 대기 중...', level: 'info' }],
  [50000, 'hook_fire',    { hook: 'inject-repo-context', trigger: 'prompt_submit' }],
  [50200, 'power_load',   { power: 'night-ops', tools_count: 8 }],
  [50500, 'scan_stage',   { stage: 'collect', progress: 10 }],
  [51000, 'log',          { msg: 'GitHub 데이터 수집 중...', level: 'info' }],
  [52000, 'scan_stage',   { stage: 'diff', progress: 30 }],
  [52500, 'log',          { msg: 'dependabot PR #94 감지 (lodash 보안 패치)', level: 'info' }],
  [53000, 'scan_stage',   { stage: 'analyze', progress: 50 }],
  [53100, 'agent_delegate', { from: 'night-summarizer', to: 'pr-reviewer', task_preview: 'PR #94 — dependabot lodash' }],
  [53200, 'agent_start',  { agent: 'pr-reviewer', prompt_preview: 'PR #94 — dependabot lodash 4.17.24' }],
  [53500, 'log',          { msg: '#pr-reviewer 위임 → dependabot 보안 패치', level: 'info' }],
  [56000, 'agent_done',   { agent: 'pr-reviewer', duration_ms: 2800, category: 'auto', risk_level: 'low' }],
  [56100, 'hook_fire',    { hook: 'post-analysis', trigger: 'agent_turn_complete' }],
  [56200, 'hook_fire',    { hook: 'save-result', trigger: 'agent_stop' }],
  [56300, 'log',          { msg: 'pr-reviewer 완료 (2.8s) → auto / low', level: 'info' }],
  [56500, 'stat_update',  { auto: 2, approve: 2, direct: 0, total: 4 }],
  [57000, 'scan_stage',   { stage: 'execute', progress: 90 }],
  [57500, 'log',          { msg: '🟢 auto merge: PR #94 자동 머지 완료', level: 'info' }],
  [58000, 'power_unload', { power: 'night-ops' }],
  [58200, 'scan_stage',   { stage: 'idle', progress: 100 }],
  [58500, 'log',          { msg: '스캔 완료: 1건 (🟢1 🟡0 🔴0)', level: 'info' }],

  // senpai-voice 스킬 로드 (브리핑 준비)
  [62000, 'skill_load',   { skill: 'senpai-voice', agent: 'night-summarizer' }],
  [62200, 'log',          { msg: '[skill] senpai-voice 로드 → night-summarizer (브리핑 준비)', level: 'info' }],
];

const STAGE_LABELS = {
  idle: '대기', collect: 'GitHub 수집', diff: 'Diff 추출',
  analyze: 'AI 분석', save: 'DB 저장', execute: '자동 처리',
};

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatDuration(ms) {
  if (!ms) return '-';
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────
export default function NightActive({ instruction, onClockIn }) {
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState([]);
  const [nightState, setNightState] = useState({
    activeAgent: null,
    agentElapsed: null,
    scanStage: 'idle',
    scanProgress: 0,
    stats: { auto: 0, approve: 0, direct: 0, total: 0 },
    agents: {
      'pr-reviewer': { status: 'idle', lastRun: null, lastDuration: null },
      'ci-analyzer': { status: 'idle', lastRun: null, lastDuration: null },
      'issue-triager': { status: 'idle', lastRun: null, lastDuration: null },
      'security-scanner': { status: 'idle', lastRun: null, lastDuration: null },
      'night-summarizer': { status: 'idle', lastRun: null, lastDuration: null },
    },
    powers: { 'night-ops': { active: false, tools_count: 0 } },
    skills: { 'ci-pattern-analysis': { loaded: false, by: null }, 'senpai-voice': { loaded: false, by: null } },
    hooks: { 'inject-repo-context': { lastFired: null }, 'post-analysis': { lastFired: null }, 'save-result': { lastFired: null } },
  });
  const [isMockMode, setIsMockMode] = useState(false);
  const [senpaiText, setSenpaiText] = useState('');
  const logRef = useRef(null);
  const lastEventId = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const changeSenpai = () => {
      const cats = ['scan_start', 'found_issue', 'idle', 'auto_fixed'];
      const cat = cats[Math.floor(Math.random() * cats.length)];
      setSenpaiText(getGreeting(cat, { repo: 'cs-senpai', count: nightState.stats.auto || 3 }));
    };
    changeSenpai();
    const id = setInterval(changeSenpai, 18000 + Math.random() * 12000);
    return () => clearInterval(id);
  }, [nightState.stats.auto]);

  const processEvent = useCallback((event) => {
    // 로그 이벤트 목록 확장
    const logTypes = ['log', 'agent_start', 'agent_done', 'agent_error', 'agent_delegate',
      'scan_complete', 'power_load', 'power_unload', 'skill_load', 'hook_fire'];
    if (logTypes.includes(event.type)) {
      setLogs(prev => {
        const logEntry = {
          id: event.id || Date.now() + Math.random(),
          time: new Date(event.timestamp || Date.now()).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          msg: event.msg || formatEventMsg(event),
          type: event.type,
          level: event.level || 'info',
        };
        return [...prev.slice(-60), logEntry];
      });
    }

    setNightState(prev => {
      const next = { ...prev, agents: { ...prev.agents }, powers: { ...prev.powers }, skills: { ...prev.skills }, hooks: { ...prev.hooks } };
      switch (event.type) {
        case 'agent_start':
          next.activeAgent = event.agent;
          next.agentElapsed = 0;
          if (next.agents[event.agent]) next.agents[event.agent] = { ...next.agents[event.agent], status: 'running' };
          break;
        case 'agent_done':
          if (next.agents[event.agent]) next.agents[event.agent] = { status: 'done', lastRun: event.timestamp || new Date().toISOString(), lastDuration: event.duration_ms };
          next.activeAgent = null;
          next.agentElapsed = null;
          break;
        case 'agent_error':
          if (next.agents[event.agent]) next.agents[event.agent] = { ...next.agents[event.agent], status: 'error' };
          next.activeAgent = null;
          next.agentElapsed = null;
          break;
        case 'scan_stage':
          next.scanStage = event.stage;
          next.scanProgress = event.progress || 0;
          break;
        case 'stat_update':
          next.stats = { ...next.stats, ...event };
          break;
        case 'power_load':
          if (next.powers[event.power]) next.powers[event.power] = { active: true, tools_count: event.tools_count || 0 };
          break;
        case 'power_unload':
          if (next.powers[event.power]) next.powers[event.power] = { active: false, tools_count: 0 };
          break;
        case 'skill_load':
          if (next.skills[event.skill]) next.skills[event.skill] = { loaded: true, by: event.agent };
          break;
        case 'hook_fire':
          if (next.hooks[event.hook]) next.hooks[event.hook] = { lastFired: new Date().toISOString() };
          break;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/status').then(r => r.json()).then(data => {
      if (cancelled) return;
      setIsMockMode(!(data.status === 'night' && data.night?.events?.length > 0));
    }).catch(() => { if (!cancelled) setIsMockMode(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isMockMode) {
      const timers = MOCK_SCENARIO.map(([delay, type, data]) =>
        setTimeout(() => {
          processEvent({ id: Date.now() + Math.random(), type, timestamp: new Date().toISOString(), ...data });
        }, delay)
      );
      return () => timers.forEach(clearTimeout);
    } else {
      const poll = async () => {
        try {
          const res = await fetch(`/api/status?sinceId=${lastEventId.current}`);
          const data = await res.json();
          if (data.night?.events) {
            for (const event of data.night.events) {
              processEvent(event);
              if (event.id > lastEventId.current) lastEventId.current = event.id;
            }
          }
          if (data.night?.state) {
            setNightState(prev => ({ ...prev, ...data.night.state, agents: { ...prev.agents, ...data.night.state.agents }, stats: { ...prev.stats, ...data.night.state.stats }, powers: { ...prev.powers, ...data.night.state.powers }, skills: { ...prev.skills, ...data.night.state.skills }, hooks: { ...prev.hooks, ...data.night.state.hooks } }));
          }
        } catch { /* ignore */ }
      };
      poll();
      const id = setInterval(poll, 3000);
      return () => clearInterval(id);
    }
  }, [isMockMode, processEvent]);

  useEffect(() => {
    if (!nightState.activeAgent) return;
    const id = setInterval(() => {
      setNightState(prev => ({ ...prev, agentElapsed: (prev.agentElapsed || 0) + 1000 }));
    }, 1000);
    return () => clearInterval(id);
  }, [nightState.activeAgent]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const getLogColor = (entry) => {
    if (entry.level === 'error') return 'text-term-red';
    if (entry.level === 'warn') return 'text-term-yellow';
    if (entry.type === 'agent_start' || entry.type === 'agent_delegate') return 'text-term-cyan';
    if (entry.type === 'agent_done' || entry.type === 'scan_complete') return 'text-term-green';
    if (entry.type === 'power_load' || entry.type === 'power_unload') return 'text-term-amber';
    if (entry.type === 'skill_load') return 'text-term-cyan/70';
    if (entry.type === 'hook_fire') return 'text-term-amber/60';
    if (entry.msg?.includes('🟢')) return 'text-term-green';
    return 'text-term-amber/80';
  };

  const getAgentIcon = (s) => s === 'running' ? '●' : s === 'done' ? '✓' : s === 'error' ? '✗' : '○';
  const getAgentColor = (s) => s === 'running' ? 'text-term-cyan' : s === 'done' ? 'text-term-green' : s === 'error' ? 'text-term-red' : 'text-term-amber/40';

  const stages = ['collect', 'diff', 'analyze', 'save', 'execute'];
  const currentStageIdx = stages.indexOf(nightState.scanStage);
  const nightOps = nightState.powers['night-ops'];
  const hooksFired = Object.values(nightState.hooks).filter(h => h.lastFired).length;
  const skillsLoaded = Object.values(nightState.skills).filter(s => s.loaded).length;

  return (
    <div className="h-full flex flex-col night-breathing relative">
      <div className="scan-sweep-line" />

      <button onClick={() => onClockIn?.()} className="absolute top-4 right-4 flex items-center gap-2 px-3 py-0.5 border-2 border-term-green/50 text-term-green text-xs font-bold clock-pulse-green cursor-pointer hover:bg-term-green hover:text-black z-10">
        <kbd className="px-1 py-0.5 bg-term-green/10 border border-term-green/30 text-[10px] rounded">E</kbd>
        <span>☀ 출근합니다</span>
      </button>

      <div className="flex flex-col items-center py-3 gap-1">
        <AsciiTitle color="var(--color-term-amber)" size="small" />
        <div className="text-xl text-term-amber glow-text-amber font-bold tracking-wider">
          야간 근무 중 — {formatElapsed(elapsed)}
          {isMockMode && <span className="text-xs text-term-amber/40 ml-2">[DEMO]</span>}
        </div>
        {senpaiText && (
          <div className="text-xs text-term-amber/70 glow-text-amber mt-0.5 max-w-lg text-center truncate">
            💬 &quot;{senpaiText}&quot;
          </div>
        )}
      </div>

      {/* 4분할 메인 그리드 */}
      <div className="flex-1 grid grid-cols-2 grid-rows-[1fr_1fr] gap-[1px] px-2 pb-2 overflow-hidden min-h-0">

        {/* 좌상: Kiro 레이어 상태 */}
        <Panel label="Kiro 레이어" icon="🤖" accent="cyan">
          <div className="space-y-2 text-xs overflow-auto h-full">
            {/* Agents */}
            <div className="text-[10px] text-term-cyan/50 uppercase tracking-wider">agents</div>
            {Object.entries(nightState.agents).map(([name, agent]) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`${getAgentColor(agent.status)} text-sm`}>{getAgentIcon(agent.status)}</span>
                  <span className={agent.status === 'running' ? 'text-term-cyan font-bold' : 'text-term-amber/70'}>{name}</span>
                </div>
                <div className="text-term-amber/50">
                  {agent.status === 'running' && nightState.activeAgent === name
                    ? <span className="text-term-cyan animate-pulse">⏱ {formatDuration(nightState.agentElapsed)}</span>
                    : agent.lastDuration ? <span>{formatDuration(agent.lastDuration)}</span> : <span>—</span>}
                </div>
              </div>
            ))}

            {/* Power */}
            <div className="mt-2 pt-2 border-t border-term-border">
              <div className="text-[10px] text-term-amber/50 uppercase tracking-wider">power</div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5">
                  <span className={nightOps.active ? 'text-term-green' : 'text-term-amber/30'}>{nightOps.active ? '⚡' : '○'}</span>
                  <span className={nightOps.active ? 'text-term-green font-bold' : 'text-term-amber/40'}>night-ops</span>
                </div>
                <span className={nightOps.active ? 'text-term-green' : 'text-term-amber/30'}>
                  {nightOps.active ? `MCP ${nightOps.tools_count}개 도구` : 'off'}
                </span>
              </div>
            </div>

            {/* Skills */}
            <div className="mt-2 pt-2 border-t border-term-border">
              <div className="text-[10px] text-term-cyan/50 uppercase tracking-wider">skills</div>
              {Object.entries(nightState.skills).map(([name, skill]) => (
                <div key={name} className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className={skill.loaded ? 'text-term-cyan' : 'text-term-amber/30'}>{skill.loaded ? '◆' : '○'}</span>
                    <span className={skill.loaded ? 'text-term-cyan' : 'text-term-amber/40'}>{name}</span>
                  </div>
                  <span className="text-term-amber/40">{skill.loaded ? `← ${skill.by}` : ''}</span>
                </div>
              ))}
            </div>

            {/* Hooks */}
            <div className="mt-2 pt-2 border-t border-term-border">
              <div className="text-[10px] text-term-amber/50 uppercase tracking-wider">hooks ({hooksFired}/3)</div>
              {Object.entries(nightState.hooks).map(([name, hook]) => (
                <div key={name} className="flex items-center justify-between mt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={hook.lastFired ? 'text-term-amber' : 'text-term-amber/30'}>{hook.lastFired ? '⚙' : '○'}</span>
                    <span className={hook.lastFired ? 'text-term-amber/80' : 'text-term-amber/30'}>{name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* 우상: kiro-cli 로그 */}
        <Panel label="kiro-cli 로그" icon="📜" accent="amber">
          <div ref={logRef} className="h-full overflow-auto scrollbar-hide text-xs space-y-0.5 font-mono">
            {logs.length === 0 && <div className="text-term-amber/30 animate-pulse">이벤트 대기 중...</div>}
            {logs.map((log) => (
              <div key={log.id} className={`log-entry ${getLogColor(log)}`}>
                <span className="text-term-amber/30">[{log.time}]</span>{' '}{log.msg}
              </div>
            ))}
          </div>
        </Panel>

        {/* 좌하: 스캔 사이클 진행률 */}
        <Panel label="스캔 사이클" icon="🔄" accent="green">
          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              {stages.map((stage, idx) => {
                const isActive = stage === nightState.scanStage;
                const isDone = currentStageIdx > idx || (nightState.scanStage === 'idle' && nightState.scanProgress === 100);
                return (
                  <div key={stage} className="flex items-center gap-2">
                    <span className={isActive ? 'text-term-green animate-pulse' : isDone ? 'text-term-green' : 'text-term-amber/30'}>
                      {isActive ? '▶' : isDone ? '✓' : '○'}
                    </span>
                    <span className={isActive ? 'text-term-green font-bold' : isDone ? 'text-term-green/70' : 'text-term-amber/40'}>
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="relative h-3 border border-term-border bg-term-bg overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-term-green/40 transition-all duration-500" style={{ width: `${nightState.scanProgress}%` }} />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-term-green/70">
                {nightState.scanStage === 'idle' && nightState.scanProgress === 100 ? '완료' : nightState.scanStage === 'idle' ? '대기' : `${nightState.scanProgress}%`}
              </div>
            </div>
            <div className="text-term-amber/50 text-center">
              {nightState.scanStage === 'idle' ? (nightState.scanProgress === 100 ? '다음 스캔 대기 중...' : '스캔 대기 중') : `${STAGE_LABELS[nightState.scanStage]} 진행 중...`}
            </div>

            {/* 현재 위임 정보 */}
            {nightState.activeAgent && (
              <div className="mt-2 pt-2 border-t border-term-border text-term-cyan">
                <div className="flex items-center gap-1">
                  <span className="animate-pulse">▶</span>
                  <span className="text-term-amber/50">night-summarizer →</span>
                  <span className="font-bold">#{nightState.activeAgent}</span>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* 우하: 처리 현황 + 선배 */}
        <Panel label="처리 현황" icon="📊" accent="green">
          <div className="h-full flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-term-green">🟢 auto</span>
                <span className="text-term-green font-bold text-lg">{nightState.stats.auto}건 처리</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-term-yellow">🟡 approve</span>
                <span className="text-term-yellow font-bold text-lg">{nightState.stats.approve}건 대기</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-term-red">🔴 direct</span>
                <span className="text-term-red font-bold text-lg">{nightState.stats.direct}건</span>
              </div>
              <div className="border-t border-term-border pt-2 flex items-center justify-between text-xs text-term-amber/60">
                <span>전체</span>
                <span className="text-term-amber font-bold">{nightState.stats.total}건 분석</span>
              </div>
            </div>
            {instruction && (
              <div className="mt-2 pt-2 border-t border-term-border">
                <div className="text-[10px] text-term-amber/40 mb-1">✏️ 특별 지시</div>
                <div className="text-xs text-term-amber">{instruction}</div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <CommandBar
        location={`야간 근무 — ${formatElapsed(elapsed)}`}
        shift="night"
        leftExtra={
          nightState.scanStage !== 'idle'
            ? `[${STAGE_LABELS[nightState.scanStage]}] ${nightState.scanProgress}%`
            : `🟢${nightState.stats.auto} 🟡${nightState.stats.approve} 🔴${nightState.stats.direct}${nightOps.active ? ' ⚡power' : ''}${skillsLoaded > 0 ? ` ◆skill×${skillsLoaded}` : ''}`
        }
        actions={[{ key: 'E', label: '출근하기', onClick: () => onClockIn?.() }]}
      />
    </div>
  );
}

function formatEventMsg(event) {
  switch (event.type) {
    case 'agent_start': return `${event.agent} 시작 → ${event.prompt_preview || ''}`;
    case 'agent_done': return `${event.agent} 완료 (${formatDuration(event.duration_ms)}) → ${event.category}`;
    case 'agent_error': return `${event.agent} 에러: ${event.error}`;
    case 'agent_delegate': return `[#agents] ${event.from} → #${event.to}: ${event.task_preview}`;
    case 'scan_complete': return `스캔 완료: ${event.diffs_found}건`;
    case 'power_load': return `[power] ${event.power} 활성화 (${event.tools_count}개 도구)`;
    case 'power_unload': return `[power] ${event.power} 비활성화`;
    case 'skill_load': return `[skill] ${event.skill} 로드 → ${event.agent}`;
    case 'hook_fire': return `[hook] ${event.hook} 실행 (${event.trigger})`;
    default: return event.msg || JSON.stringify(event);
  }
}
