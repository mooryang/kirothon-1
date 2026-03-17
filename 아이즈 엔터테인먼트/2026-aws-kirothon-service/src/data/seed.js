// 데모용 시드 데이터
const {
  insertSession,
  insertSnapshot,
  insertDiff,
  insertAnalysis,
  insertAction,
  insertDailySummary,
} = require('./db');

// ─── 신규 데모 데이터 (DORA, 코드건강도, AI통계, 리스크, 레포펄스) ───

const doraMetrics = {
  deployFrequency: { value: 4.2, unit: 'deploys/week', grade: 'High', trend: 'up' },
  leadTime: { value: 2.3, unit: 'hours', grade: 'Elite', trend: 'stable' },
  changeFailureRate: { value: 8.5, unit: '%', grade: 'High', trend: 'down' },
  mttr: { value: 45, unit: 'minutes', grade: 'Elite', trend: 'stable' },
};

const codeHealth = {
  score: 7.2,
  trend: 'up',
  prevScore: 6.8,
  hotspots: [
    { file: 'auth.service.ts', score: 3.1, changes: 12, reason: '높은 복잡도 + 잦은 수정' },
    { file: 'payment/handler.ts', score: 4.5, changes: 8, reason: '에러 핸들링 부족' },
    { file: 'api/middleware.js', score: 5.0, changes: 6, reason: '테스트 커버리지 낮음' },
  ],
  testCoverage: 73.2,
  testCoverageTrend: 'up',
};

const aiWorkStats = {
  linesAnalyzed: 2847,
  reviewsGenerated: 5,
  issuesFound: 12,
  autoFixed: 3,
  avgReviewTime: '3.2s',
  humanAvgReviewTime: '4.2h',
  nightNumber: 47,
  consecutiveCleanNights: 12,
};

const riskAlerts = [
  { type: 'stale_pr', ref: 'PR #89', age: '52h', owner: '김개발', severity: 'warn' },
  { type: 'security', ref: 'CVE-2024-XXXXX', package: 'lodash', severity: 'info', resolved: true },
  { type: 'long_branch', ref: 'feature/payment-v2', age: '12d', commits: 34, severity: 'warn' },
];

const repoPulse = {
  commits: 47,
  linesAdded: 3842,
  linesDeleted: 1567,
  netLines: 2275,
  contributors: ['김개발', 'carlos-dev', 'bot-reviewer', '박디자인'],
  topContributor: { name: '김개발', commits: 21 },
  mergedPRs: 8,
  openedIssues: 5,
  closedIssues: 7,
};

/**
 * 데모 시드 데이터 삽입
 * 야간근무 시나리오: 18:30 퇴근 → 06:30 출근
 */
function seedDemoData(db) {
  // 기존 데이터 초기화
  db.exec(`
    DELETE FROM actions;
    DELETE FROM analyses;
    DELETE FROM diffs;
    DELETE FROM snapshots;
    DELETE FROM sessions;
    DELETE FROM daily_summaries;
  `);

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // ─── (a) 세션: 18:30 퇴근 ────────────────────────────────
  const sessionId = insertSession({
    type: 'clock_out',
    timestamp: `${yesterday}T18:30:00+09:00`,
    instruction: '결제 모듈 에러핸들링 봐줘',
  });

  // ─── (b) 스냅샷: baseline ─────────────────────────────────
  insertSnapshot({
    sessionId,
    type: 'prs',
    data: {
      items: [
        { number: 87, title: '결제 API v2 마이그레이션', state: 'merged', author: '박선임', merged_at: `${yesterday}T17:00:00Z` },
        { number: 89, title: '사용자 프로필 캐시 최적화', state: 'open', author: '김개발', review_state: 'pending', created_at: `${yesterday}T14:00:00Z` },
        { number: 91, title: '인증 토큰 갱신 로직 개선', state: 'open', author: '이주니어', ci_status: 'failing', created_at: `${yesterday}T16:30:00Z` },
      ],
    },
  });

  insertSnapshot({
    sessionId,
    type: 'issues',
    data: {
      items: [
        { number: 150, title: '로그인 실패 시 에러 메시지 개선', state: 'open', labels: ['bug', 'p2'], assignee: '김개발' },
        { number: 151, title: '대시보드 로딩 속도 개선', state: 'open', labels: ['performance'], assignee: '박선임' },
        { number: 153, title: '모바일 반응형 깨짐 (iOS Safari)', state: 'open', labels: ['bug', 'mobile'], assignee: '이주니어' },
        { number: 155, title: '검색 필터 초기화 안 됨', state: 'open', labels: ['bug'], assignee: null },
        { number: 156, title: '마이크로서비스 전환 아키텍처 설계', state: 'open', labels: ['architecture', 'discussion'], assignee: '박선임' },
        { number: 158, title: 'API 레이트 리밋 정책 수립', state: 'open', labels: ['enhancement'], assignee: null },
      ],
    },
  });

  insertSnapshot({
    sessionId,
    type: 'ci',
    data: {
      sprint: { total: 19, completed: 13, percent: 68, name: 'Sprint 14' },
      ci_status: 'partial_fail',
      failing_jobs: [{ pr: 91, job: 'test-auth', reason: 'timeout' }],
    },
  });

  // ─── (c) 6개 Diff (시간순) ────────────────────────────────

  // Diff 1: 20:30 — 새 PR #93
  const diff1Id = insertDiff({
    sessionId,
    type: 'new_pr',
    refId: '#93',
    title: '세션 만료 로직 수정 (김개발)',
    data: {
      author: '김개발',
      additions: 47,
      deletions: 12,
      files: ['src/auth/session.js', 'src/auth/middleware.js'],
      diff: [
        '--- a/src/auth/session.js',
        '+++ b/src/auth/session.js',
        '@@ -45,8 +45,12 @@ class SessionManager {',
        '   checkExpiry(token) {',
        '-    const timeout = 3600;',
        '+    const timeout = config.sessionTimeout || 3600;',
        '+    const refreshWindow = timeout * 0.1;',
        '     const now = Date.now() / 1000;',
        '-    return now > token.exp;',
        '+    if (now > token.exp - refreshWindow) {',
        '+      return this.refreshToken(token);',
        '+    }',
        '+    return now > token.exp;',
        '   }',
        '',
        '--- a/src/auth/middleware.js',
        '+++ b/src/auth/middleware.js',
        '@@ -12,3 +12,8 @@ async function authMiddleware(req, res, next) {',
        '+  // 세션 자동 갱신 처리',
        '+  if (session.needsRefresh) {',
        '+    const newToken = await sessionManager.refresh(session);',
        '+    res.setHeader("X-New-Token", newToken);',
        '+  }',
      ].join('\n'),
      description: '세션 만료 시 자동 갱신 로직 추가. config 기반 타임아웃 설정 지원.',
      branch: 'feature/session-refresh',
      base: 'main',
      created_at: `${yesterday}T20:30:00Z`,
    },
    detectedAt: `${yesterday}T20:30:00+09:00`,
  });

  // Diff 2: 22:00 — CI 실패
  const diff2Id = insertDiff({
    sessionId,
    type: 'ci_fail',
    refId: '#91',
    title: 'CI 실패 — auth.spec.ts 타임아웃',
    data: {
      pr_number: 91,
      pr_title: '인증 토큰 갱신 로직 개선',
      author: '이주니어',
      job_name: 'test-auth',
      failed_test: 'auth.spec.ts',
      error_log: [
        'FAIL src/auth/__tests__/auth.spec.ts',
        '  ● Token refresh flow › should refresh expired token',
        '',
        '    Timeout - Async callback was not invoked within the 5000 ms timeout',
        '    specified by jest.setTimeout.',
        '',
        '      at node_modules/jest-jasmine2/build/queue_runner.js:68:21',
        '      at Timeout.callback [as _onTimeout] (node_modules/jsdom/lib/jsdom/browser/Window.js:523:19)',
      ].join('\n'),
      run_url: 'https://github.com/org/repo/actions/runs/12345',
      duration: '4m 32s',
      previous_status: 'passing',
    },
    detectedAt: `${yesterday}T22:00:00+09:00`,
  });

  // Diff 3: 01:00 — dependabot PR #94
  const diff3Id = insertDiff({
    sessionId,
    type: 'new_pr',
    refId: '#94',
    title: 'dependabot 보안 패치 lodash',
    data: {
      author: 'dependabot[bot]',
      dependabot: true,
      additions: 3,
      deletions: 3,
      files: ['package.json', 'package-lock.json'],
      diff: [
        '--- a/package.json',
        '+++ b/package.json',
        '@@ -15,7 +15,7 @@',
        '     "express": "^4.18.2",',
        '-    "lodash": "4.17.21",',
        '+    "lodash": "4.17.24",',
        '     "mongoose": "^7.0.0",',
      ].join('\n'),
      description: 'Bumps lodash from 4.17.21 to 4.17.24. Security: Prototype Pollution fix (CVE-2024-XXXXX)',
      vulnerability: {
        severity: 'high',
        cve: 'CVE-2024-XXXXX',
        description: 'Prototype Pollution in lodash',
      },
      ci_status: 'passing',
      all_tests_pass: true,
      branch: 'dependabot/npm_and_yarn/lodash-4.17.24',
      base: 'main',
    },
    detectedAt: `${today}T01:00:00+09:00`,
  });

  // Diff 4: 01:00 — Issue #155 중복
  const diff4Id = insertDiff({
    sessionId,
    type: 'new_issue',
    refId: '#155',
    title: 'Issue #155 — #142와 중복 확인',
    data: {
      issue_number: 155,
      issue_title: '검색 필터 초기화 안 됨',
      duplicate_of: '#142',
      original_issue: {
        number: 142,
        title: '검색 결과 필터 리셋 버그',
        state: 'closed',
        closed_at: `${yesterday}T10:00:00Z`,
        resolution: 'PR #85에서 수정됨',
      },
      similarity: 0.92,
      matching_keywords: ['검색', '필터', '초기화', '리셋'],
      description: 'Issue #155의 내용이 이미 클로즈된 #142와 92% 유사. PR #85에서 수정 완료된 건으로 확인.',
    },
    detectedAt: `${today}T01:00:00+09:00`,
  });

  // Diff 5: 03:00 — Issue #160 코멘트
  const diff5Id = insertDiff({
    sessionId,
    type: 'comment',
    refId: '#160',
    title: 'Issue #160 — @carlos-dev 아키텍처 코멘트',
    data: {
      issue_number: 160,
      issue_title: '마이크로서비스 전환 — API Gateway 설계',
      commenter: '@carlos-dev',
      comment_body: [
        '현재 모놀리스에서 마이크로서비스로 전환 시,',
        'API Gateway 패턴을 적용해야 합니다.',
        '',
        '제안:',
        '1. Kong Gateway 도입 (오픈소스)',
        '2. 서비스별 rate limiting 설정',
        '3. 인증은 Gateway 레벨에서 처리',
        '',
        '하지만 팀 내에서 AWS API Gateway vs Kong 논의가 필요합니다.',
        '비용과 운영 복잡도를 고려해야 합니다.',
      ].join('\n'),
      related_issues: ['#156', '#158'],
      labels: ['architecture', 'discussion', 'decision-needed'],
      participants: ['@carlos-dev', '@박선임', '@김개발'],
    },
    detectedAt: `${today}T03:00:00+09:00`,
  });

  // Diff 6: 06:00 — 특별 지시 분석 완료
  const diff6Id = insertDiff({
    sessionId,
    type: 'commit',
    refId: null,
    title: '특별 지시 분석 완료: 결제 모듈 847줄',
    data: {
      instruction: '결제 모듈 에러핸들링 봐줘',
      files_reviewed: [
        'src/payment/processor.js',
        'src/payment/gateway.js',
        'src/payment/refund.js',
        'src/payment/webhook.js',
        'src/payment/validation.js',
        'src/payment/retry.js',
        'src/payment/errors.js',
        'src/payment/middleware.js',
        'src/payment/__tests__/processor.spec.js',
        'src/payment/__tests__/gateway.spec.js',
        'src/payment/__tests__/refund.spec.js',
        'src/payment/__tests__/webhook.spec.js',
      ],
      total_lines: 847,
      findings: [
        { file: 'src/payment/processor.js', line: 45, severity: 'high', message: 'catch 블록에서 에러를 삼키고 있음 — 로깅 누락' },
        { file: 'src/payment/processor.js', line: 112, severity: 'medium', message: '타임아웃 에러와 네트워크 에러 구분 없음' },
        { file: 'src/payment/gateway.js', line: 78, severity: 'high', message: 'PG사 응답 파싱 실패 시 fallback 없음' },
        { file: 'src/payment/refund.js', line: 33, severity: 'low', message: '부분 환불 시 금액 검증 로직 개선 가능' },
        { file: 'src/payment/webhook.js', line: 90, severity: 'medium', message: 'webhook 재시도 로직에 exponential backoff 미적용' },
      ],
      summary: '결제 모듈 12파일 847줄 검토 완료. 주요 발견: 에러 삼킴 2건(high), 에러 구분 미흡 2건(medium), 개선 가능 1건(low)',
      build_status: 'passing',
      test_coverage: '78%',
    },
    detectedAt: `${today}T06:00:00+09:00`,
  });

  // ─── (d) 6개 분석 결과 ────────────────────────────────────

  // Analysis 1: PR#93 — 승인 필요
  const analysis1Id = insertAnalysis({
    diffId: diff1Id,
    category: 'approve',
    summary: '세션 만료 로직 수정 — 리스크 낮음',
    detail: JSON.stringify({
      code_quality: 'good',
      test_coverage: 'existing tests pass',
      breaking_changes: false,
      security_impact: 'positive — 세션 갱신으로 보안 강화',
      review_points: [
        'refreshWindow 비율(10%)이 적절한지 확인',
        'config.sessionTimeout 기본값 3600이 프로덕션 설정과 일치하는지 확인',
        'X-New-Token 헤더 추가에 따른 CORS 설정 확인 필요',
      ],
    }),
    riskLevel: 'low',
    suggestion: '타임아웃 설정 확인 필요',
  });

  // Analysis 2: CI 실패 — 승인 필요
  const analysis2Id = insertAnalysis({
    diffId: diff2Id,
    category: 'approve',
    summary: 'CI 타임아웃 — auth.spec.ts',
    detail: JSON.stringify({
      root_cause: 'jest.setTimeout 기본값(5000ms) 초과',
      affected_test: 'Token refresh flow > should refresh expired token',
      suggested_fix: 'jest.setTimeout(10000) 또는 테스트 내 async 로직 최적화',
      similar_issues: ['이전에도 CI 환경에서 간헐적 타임아웃 발생 이력'],
      impact: 'PR #91 머지 블로킹',
    }),
    riskLevel: 'medium',
    suggestion: '타임아웃 5s→10s 변경 제안',
  });

  // Analysis 3: dependabot — 자동 처리
  const analysis3Id = insertAnalysis({
    diffId: diff3Id,
    category: 'auto',
    summary: 'dependabot 보안 패치 — 테스트 통과',
    detail: JSON.stringify({
      package: 'lodash',
      from_version: '4.17.21',
      to_version: '4.17.24',
      vulnerability_fixed: 'Prototype Pollution (CVE-2024-XXXXX)',
      all_tests_pass: true,
      auto_merge_criteria: ['dependabot PR', '보안 패치', 'CI 통과', 'minor version'],
    }),
    riskLevel: 'low',
    suggestion: null,
  });

  // Analysis 4: Issue #155 중복 — 자동 처리
  const analysis4Id = insertAnalysis({
    diffId: diff4Id,
    category: 'auto',
    summary: 'Issue #155 중복 — #142와 동일',
    detail: JSON.stringify({
      duplicate_confidence: 0.92,
      original_issue: '#142 (검색 결과 필터 리셋 버그)',
      resolution: 'PR #85에서 이미 수정됨',
      auto_close_criteria: ['유사도 90% 이상', '원본 이슈 이미 해결됨'],
    }),
    riskLevel: 'low',
    suggestion: null,
  });

  // Analysis 5: Issue #160 — 방향 결정 필요
  const analysis5Id = insertAnalysis({
    diffId: diff5Id,
    category: 'direct',
    summary: '아키텍처 방향 결정 필요',
    detail: JSON.stringify({
      topic: 'API Gateway 선택: AWS API Gateway vs Kong',
      key_considerations: [
        { option: 'AWS API Gateway', pros: ['관리형 서비스', 'AWS 생태계 통합'], cons: ['벤더 종속', '비용 증가 가능'] },
        { option: 'Kong Gateway', pros: ['오픈소스', '유연한 플러그인'], cons: ['직접 운영 필요', '러닝 커브'] },
      ],
      stakeholders: ['@carlos-dev', '@박선임', '@김개발'],
      deadline: '이번 스프린트 종료 전',
      impact: '마이크로서비스 전환 전체 일정에 영향',
    }),
    riskLevel: 'high',
    suggestion: '팀 논의 필요',
  });

  // Analysis 6: 일일 빌드 — 자동 처리
  const analysis6Id = insertAnalysis({
    diffId: diff6Id,
    category: 'auto',
    summary: '일일 빌드 정상 — main 전체 테스트 통과',
    detail: JSON.stringify({
      build_duration: '3m 12s',
      test_suites: 42,
      tests_passed: 187,
      tests_failed: 0,
      coverage: '78%',
      special_instruction_result: '결제 모듈 에러핸들링 검토 완료 — 5건 발견',
    }),
    riskLevel: 'low',
    suggestion: null,
  });

  // ─── (e) 3개 액션 ─────────────────────────────────────────

  // Action 1: PR #94 자동 머지
  insertAction({
    analysisId: analysis3Id,
    actionType: 'merge',
    status: 'completed',
    result: 'PR #94 자동 머지 완료',
  });

  // Action 2: Issue #155 중복 클로즈
  insertAction({
    analysisId: analysis4Id,
    actionType: 'close',
    status: 'completed',
    result: 'Issue #155 중복으로 클로즈',
  });

  // Action 3: 일일 빌드 코멘트
  insertAction({
    analysisId: analysis6Id,
    actionType: 'comment',
    status: 'completed',
    result: '일일 빌드 확인 완료',
  });

  // ─── (f) 일일 요약 ────────────────────────────────────────

  insertDailySummary({
    date: today,
    commitsCount: 7,
    prsReviewed: 1,
    issuesClosed: 3,
    summary: '커밋 7건 (feature/payment-v2), PR #87 리뷰 완료, Issue #150/#151/#153 클로즈, 스프린트 68%',
    tomorrowPrep: {
      items: [
        { id: 1, time: '10:00', item: '스프린트 리뷰 — 진행상황 자료 준비됨', status: '✓', est: '30m', priority: 'normal' },
        { id: 2, time: '14:00', item: 'v2.3.1 배포 — 체크리스트 점검 완료', status: '✓', est: '1h', priority: 'normal' },
        { id: 3, time: 'ASAP', item: 'PR #89 리뷰 (24h 경과, 김개발 대기)', status: '○', est: '20m', priority: 'high' },
        { id: 4, time: 'ASAP', item: 'PR #93 리뷰 — AI 분석 완료', status: '○', est: '15m', priority: 'high' },
        { id: 5, time: '~', item: 'Issue #160 방향 결정 (블로커)', status: '⚠', est: '?', priority: 'critical' },
      ],
    },
  });

  // ─── (g) 이번 주 월~금 시드 (오늘 제외) ───────────────────
  const weeklyDailyData = [
    { dow: 1, commits: 8, prs: 2, issues: 2, summary: '스프린트 시작. Auth 모듈 리팩토링 착수.' },
    { dow: 2, commits: 5, prs: 1, issues: 1, summary: 'PR #85 리뷰, Issue #142 수정 완료.' },
    { dow: 3, commits: 4, prs: 1, issues: 0, summary: '결제 모듈 코드리뷰, 테스트 보강.' },
    { dow: 4, commits: 3, prs: 1, issues: 2, summary: 'CI 파이프라인 최적화, Issue #148/#149 클로즈.' },
    { dow: 5, commits: 0, prs: 0, issues: 0, summary: '' },
  ];

  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
  }

  const monday = getMonday(new Date());
  for (const day of weeklyDailyData) {
    const d = new Date(monday);
    d.setDate(d.getDate() + day.dow - 1);
    const dateStr = d.toISOString().split('T')[0];
    if (dateStr === today) continue; // 오늘은 위에서 이미 삽입
    if (day.commits > 0 || day.prs > 0 || day.issues > 0) {
      insertDailySummary({
        date: dateStr,
        commitsCount: day.commits,
        prsReviewed: day.prs,
        issuesClosed: day.issues,
        summary: day.summary,
        tomorrowPrep: null,
      });
    }
  }

  return { sessionId, today };
}

module.exports = { seedDemoData, doraMetrics, codeHealth, aiWorkStats, riskAlerts, repoPulse };
