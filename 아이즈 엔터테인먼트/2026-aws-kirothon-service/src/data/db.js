// SQLite 초기화 + 쿼리 헬퍼
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let _db = null;

/**
 * DB 싱글톤 — data/cs-senpai.db 자동 생성, schema.sql 적용
 */
function getDb() {
  if (_db) return _db;

  const dbPath = path.join(process.cwd(), 'data', 'cs-senpai.db');

  // data 디렉토리 생성
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  _db = new Database(dbPath);

  // WAL 모드 + 외래키 활성화
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // 스키마 적용
  const schemaPath = path.join(process.cwd(), 'src', 'data', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  _db.exec(schema);

  return _db;
}

// ─── Query Helpers ──────────────────────────────────────────

/** 최신 세션 조회 */
function getLatestSession() {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM sessions ORDER BY id DESC LIMIT 1
  `).get();
}

/** 세션의 모든 diff 조회 */
function getSessionDiffs(sessionId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM diffs WHERE session_id = ? ORDER BY detected_at ASC
  `).all(sessionId);
}

/** diff들에 대한 분석 결과 조회 */
function getAnalyses(sessionId) {
  const db = getDb();
  return db.prepare(`
    SELECT a.* FROM analyses a
    JOIN diffs d ON a.diff_id = d.id
    WHERE d.session_id = ?
    ORDER BY a.analyzed_at ASC
  `).all(sessionId);
}

/** 분석에 대한 액션 조회 */
function getActions(sessionId) {
  const db = getDb();
  return db.prepare(`
    SELECT act.* FROM actions act
    JOIN analyses a ON act.analysis_id = a.id
    JOIN diffs d ON a.diff_id = d.id
    WHERE d.session_id = ?
    ORDER BY act.executed_at ASC
  `).all(sessionId);
}

/** 날짜별 일일 요약 조회 */
function getDailySummary(date) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM daily_summaries WHERE date = ?
  `).get(date);
}

// ─── Insert Helpers ─────────────────────────────────────────

/** 세션 삽입 */
function insertSession({ type, timestamp, instruction }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO sessions (type, timestamp, instruction) VALUES (?, ?, ?)
  `).run(type, timestamp, instruction || null);
  return result.lastInsertRowid;
}

/** 스냅샷 삽입 */
function insertSnapshot({ sessionId, type, data }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO snapshots (session_id, type, data) VALUES (?, ?, ?)
  `).run(sessionId, type, typeof data === 'string' ? data : JSON.stringify(data));
  return result.lastInsertRowid;
}

/** Diff 삽입 */
function insertDiff({ sessionId, type, refId, title, data, detectedAt }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO diffs (session_id, type, ref_id, title, data, detected_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    type,
    refId || null,
    title || null,
    typeof data === 'string' ? data : JSON.stringify(data),
    detectedAt || new Date().toISOString()
  );
  return result.lastInsertRowid;
}

/** 분석 결과 삽입 */
function insertAnalysis({ diffId, category, summary, detail, riskLevel, suggestion }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO analyses (diff_id, category, summary, detail, risk_level, suggestion)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    diffId,
    category,
    summary,
    detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : null,
    riskLevel || null,
    suggestion || null
  );
  return result.lastInsertRowid;
}

/** 액션 삽입 */
function insertAction({ analysisId, actionType, status, result }) {
  const db = getDb();
  const res = db.prepare(`
    INSERT INTO actions (analysis_id, action_type, status, result)
    VALUES (?, ?, ?, ?)
  `).run(analysisId, actionType, status, result || null);
  return res.lastInsertRowid;
}

/** 일일 요약 삽입 */
function insertDailySummary({ date, commitsCount, prsReviewed, issuesClosed, summary, tomorrowPrep }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO daily_summaries (date, commits_count, prs_reviewed, issues_closed, summary, tomorrow_prep)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    date,
    commitsCount || 0,
    prsReviewed || 0,
    issuesClosed || 0,
    summary || null,
    tomorrowPrep ? (typeof tomorrowPrep === 'string' ? tomorrowPrep : JSON.stringify(tomorrowPrep)) : null
  );
  return result.lastInsertRowid;
}

/** task 상태 토글 (✓ ↔ ◯) */
function updateTaskStatus({ date, taskId, status }) {
  const db = getDb();
  const row = db.prepare('SELECT id, tomorrow_prep FROM daily_summaries WHERE date = ?').get(date);
  if (!row?.tomorrow_prep) return null;
  const prep = JSON.parse(row.tomorrow_prep);
  const item = prep.items?.find(t => t.id === taskId);
  if (!item) return null;
  item.status = status;
  db.prepare('UPDATE daily_summaries SET tomorrow_prep = ? WHERE id = ?')
    .run(JSON.stringify(prep), row.id);
  return prep.items;
}

/** 내일 예정 일괄 업데이트 */
function updateTomorrowPrep({ date, items }) {
  const db = getDb();
  const row = db.prepare('SELECT id, tomorrow_prep FROM daily_summaries WHERE date = ?').get(date);
  if (!row) return null;
  const prep = row.tomorrow_prep ? JSON.parse(row.tomorrow_prep) : {};
  prep.items = items;
  db.prepare('UPDATE daily_summaries SET tomorrow_prep = ? WHERE id = ?')
    .run(JSON.stringify(prep), row.id);
  return prep.items;
}

/** 주간 일일 요약 조회 (월~금) */
function getWeeklySummaries(mondayDate, fridayDate) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM daily_summaries WHERE date >= ? AND date <= ? ORDER BY date ASC'
  ).all(mondayDate, fridayDate);
}

module.exports = {
  getDb,
  getLatestSession,
  getSessionDiffs,
  getAnalyses,
  getActions,
  getDailySummary,
  getWeeklySummaries,
  insertSession,
  insertSnapshot,
  insertDiff,
  insertAnalysis,
  insertAction,
  insertDailySummary,
  updateTaskStatus,
  updateTomorrowPrep,
};
