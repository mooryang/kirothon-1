// 야간 이벤트 버퍼 — nightScan → 클라이언트 전달 브릿지
// global에 저장하여 HMR 생존 + API route에서 접근 가능

const MAX_EVENTS = 100;

/**
 * 이벤트 타입:
 * - agent_start: agent 실행 시작 { agent, prompt_preview }
 * - agent_done: agent 실행 완료 { agent, duration_ms, category, risk_level }
 * - agent_error: agent 실행 실패 { agent, error }
 * - agent_delegate: #agents 위임 { from, to, task_preview }
 * - scan_stage: 스캔 단계 변경 { stage, progress }
 * - scan_complete: 스캔 사이클 완료 { diffs_found, results_summary }
 * - log: 일반 로그 { msg, level: 'info'|'warn'|'error' }
 * - stat_update: 통계 업데이트 { auto, approve, direct, total }
 * - power_load: Power 활성화 { power, tools_count }
 * - power_unload: Power 비활성화 { power }
 * - skill_load: Skill 로드 { skill, agent }
 * - hook_fire: Hook 실행 { hook, trigger }
 */

function getBuffer() {
  if (!global._nightEvents) {
    global._nightEvents = [];
  }
  return global._nightEvents;
}

function getState() {
  if (!global._nightState) {
    global._nightState = {
      activeAgent: null,
      agentStartedAt: null,
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
      powers: {
        'night-ops': { active: false, tools_count: 0 },
      },
      skills: {
        'ci-pattern-analysis': { loaded: false, by: null },
        'senpai-voice': { loaded: false, by: null },
      },
      hooks: {
        'inject-repo-context': { lastFired: null },
        'post-analysis': { lastFired: null },
        'save-result': { lastFired: null },
      },
    };
  }
  return global._nightState;
}

export function emit(type, data = {}) {
  const buffer = getBuffer();
  const state = getState();
  const event = {
    id: Date.now() + Math.random(),
    type,
    timestamp: new Date().toISOString(),
    ...data,
  };

  buffer.push(event);
  if (buffer.length > MAX_EVENTS) {
    buffer.splice(0, buffer.length - MAX_EVENTS);
  }

  // 상태 자동 업데이트
  switch (type) {
    case 'agent_start':
      state.activeAgent = data.agent;
      state.agentStartedAt = Date.now();
      if (state.agents[data.agent]) {
        state.agents[data.agent].status = 'running';
      }
      break;
    case 'agent_done':
      if (state.agents[data.agent]) {
        state.agents[data.agent].status = 'done';
        state.agents[data.agent].lastRun = new Date().toISOString();
        state.agents[data.agent].lastDuration = data.duration_ms;
      }
      state.activeAgent = null;
      state.agentStartedAt = null;
      break;
    case 'agent_error':
      if (state.agents[data.agent]) {
        state.agents[data.agent].status = 'error';
      }
      state.activeAgent = null;
      state.agentStartedAt = null;
      break;
    case 'scan_stage':
      state.scanStage = data.stage;
      state.scanProgress = data.progress || 0;
      break;
    case 'stat_update':
      Object.assign(state.stats, data);
      break;
    case 'power_load':
      if (state.powers[data.power]) {
        state.powers[data.power] = { active: true, tools_count: data.tools_count || 0 };
      }
      break;
    case 'power_unload':
      if (state.powers[data.power]) {
        state.powers[data.power] = { active: false, tools_count: 0 };
      }
      break;
    case 'skill_load':
      if (state.skills[data.skill]) {
        state.skills[data.skill] = { loaded: true, by: data.agent };
      }
      break;
    case 'hook_fire':
      if (state.hooks[data.hook]) {
        state.hooks[data.hook] = { lastFired: new Date().toISOString() };
      }
      break;
    case 'agent_delegate':
      // 위임 이벤트는 로그로만 기록 (상태 변경 없음)
      break;
  }
}

/**
 * 클라이언트 폴링용 — sinceId 이후 이벤트 + 현재 상태 반환
 */
export function getEvents(sinceId = 0) {
  const buffer = getBuffer();
  const state = getState();

  const newEvents = sinceId
    ? buffer.filter(e => e.id > sinceId)
    : buffer.slice(-20); // 초기 로드 시 최근 20개

  return {
    events: newEvents,
    state: {
      ...state,
      agentElapsed: state.agentStartedAt
        ? Date.now() - state.agentStartedAt
        : null,
    },
  };
}

/**
 * 상태 초기화 (clock-in 시)
 */
export function resetEvents() {
  global._nightEvents = [];
  global._nightState = null;
}
