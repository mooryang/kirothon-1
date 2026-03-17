-- 퇴근/출근 세션
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,           -- 'clock_out' | 'clock_in'
  timestamp TEXT NOT NULL,      -- ISO 8601
  instruction TEXT,             -- 퇴근 시 특별 지시사항
  created_at TEXT DEFAULT (datetime('now'))
);

-- baseline 스냅샷
CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES sessions(id),
  type TEXT NOT NULL,           -- 'prs' | 'issues' | 'ci' | 'commits'
  data TEXT NOT NULL,           -- JSON
  captured_at TEXT DEFAULT (datetime('now'))
);

-- 감지된 변화 (diff)
CREATE TABLE IF NOT EXISTS diffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES sessions(id),
  type TEXT NOT NULL,           -- 'new_pr' | 'new_issue' | 'ci_fail' | 'comment' | 'commit'
  ref_id TEXT,                  -- GitHub PR/Issue 번호 등
  title TEXT,
  data TEXT NOT NULL,           -- JSON (상세 데이터)
  detected_at TEXT DEFAULT (datetime('now'))
);

-- AI 분석 결과
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diff_id INTEGER REFERENCES diffs(id),
  category TEXT NOT NULL,       -- 'auto' | 'approve' | 'direct'
  summary TEXT NOT NULL,        -- AI 요약
  detail TEXT,                  -- AI 상세 분석 (JSON)
  risk_level TEXT,              -- 'low' | 'medium' | 'high'
  suggestion TEXT,              -- AI 제안
  analyzed_at TEXT DEFAULT (datetime('now'))
);

-- 자동 처리 기록
CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER REFERENCES analyses(id),
  action_type TEXT NOT NULL,    -- 'merge' | 'close' | 'comment' | 'label'
  status TEXT NOT NULL,         -- 'completed' | 'failed' | 'pending'
  result TEXT,                  -- 결과 메시지
  executed_at TEXT DEFAULT (datetime('now'))
);

-- 일일 업무 요약
CREATE TABLE IF NOT EXISTS daily_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  commits_count INTEGER DEFAULT 0,
  prs_reviewed INTEGER DEFAULT 0,
  issues_closed INTEGER DEFAULT 0,
  summary TEXT,                 -- AI 생성 요약
  tomorrow_prep TEXT,           -- AI 생성 내일 준비
  created_at TEXT DEFAULT (datetime('now'))
);
