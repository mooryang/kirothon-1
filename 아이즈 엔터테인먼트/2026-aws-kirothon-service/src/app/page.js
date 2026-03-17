'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import MorningBrief from '../components/MorningBrief';
import EveningHandoff from '../components/EveningHandoff';
import DetailView from '../components/DetailView';
import Timelapse from '../components/Timelapse';
import NightActive from '../components/NightActive';
import SplashScreen from '../components/SplashScreen';
import HelpOverlay from '../components/HelpOverlay';
import useTerminalKeys from '../hooks/useTerminalKeys';

// 페이지 전환 애니메이션 설정
const pageVariants = {
  // brief → handoff: 슬라이드 좌측
  slideLeft: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { x: '-100%', opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } },
  },
  // handoff → active: 페이드 투 블랙 → 앰버 페이드인
  fadeBlack: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } },
  },
  // active → brief: CRT 부팅
  crtBoot: {
    initial: { clipPath: 'inset(50% 50% 50% 50%)', opacity: 0 },
    animate: {
      clipPath: 'inset(0% 0% 0% 0%)',
      opacity: 1,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  },
  // brief → detail: 스케일 확대
  scaleUp: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { scale: 0.9, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
  },
  // detail → brief: 스케일 축소 (brief 입장에서)
  scaleDown: {
    initial: { scale: 1.1, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { scale: 1.1, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
  },
  // 기본 페이드
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  },
};

const VIEW_LABELS = {
  brief: 'Morning Brief',
  detail: '상세 보기',
  handoff: '퇴근 준비',
  active: '야간 근무',
};

// ModeIndicator: 모든 화면 상단에 표시
function ModeIndicator({ shift, view }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('ko-KR', { hour12: false, timeZone: 'Asia/Seoul' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const viewLabel = VIEW_LABELS[view] || '';

  if (shift === 'night') {
    return (
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1 text-xs bg-amber-900/30 border-b border-amber-800/50">
        <span className="pulse-dot" />
        <span className="text-term-amber glow-text-amber">
          {'🌙 야간 근무 중'}
        </span>
        {viewLabel && (
          <>
            <span className="text-term-amber/30">|</span>
            <span className="text-term-amber/70">{viewLabel}</span>
          </>
        )}
        <span className="text-term-amber/70 ml-auto">{time} KST</span>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1 text-xs bg-green-900/20 border-b border-green-800/30">
      <span className="w-2 h-2 rounded-full bg-term-green inline-block" />
      <span className="text-term-green glow-text">
        {'☀ 주간 근무'}
      </span>
      {viewLabel && (
        <>
          <span className="text-term-green/30">|</span>
          <span className="text-term-green/70">{viewLabel}</span>
        </>
      )}
      <span className="text-term-green/70 ml-auto">{time} KST</span>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-term-bg">
        <div className="text-term-green font-mono text-sm glow-text animate-pulse">
          시스템 초기화 중...
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const isTimelapse = searchParams.get('mode') === 'timelapse';

  // 이원화된 상태 모델
  const [shift, setShift] = useState('day'); // 'day' | 'night'
  const [view, setView] = useState(isTimelapse ? 'timelapse' : 'brief'); // 'brief' | 'handoff' | 'active' | 'detail' | 'timelapse'
  const [prevView, setPrevView] = useState(null);

  const [briefData, setBriefData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [nightInstruction, setNightInstruction] = useState('');
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('cs-senpai-booted');
    }
    return false;
  });
  const [showHelp, setShowHelp] = useState(false);

  // 전환 시 이전 뷰 추적 (애니메이션 결정용)
  const changeView = useCallback((newView) => {
    setPrevView(view);
    setView(newView);
  }, [view]);

  // 앱 시작 시 상태 복원
  useEffect(() => {
    async function restoreStatus() {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          if (data.shift === 'night') {
            setShift('night');
            setView('active');
          }
        }
      } catch {
        // 복원 실패해도 기본값(day/brief) 유지
      }
    }
    if (!isTimelapse) restoreStatus();
  }, [isTimelapse]);

  // 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/demo');
        const json = await res.json();

        if (json.status === 'empty' || !json.data) {
          await fetch('/api/demo', { method: 'POST' });
          const retryRes = await fetch('/api/demo');
          const retryJson = await retryRes.json();
          setBriefData(retryJson.data || null);
        } else {
          setBriefData(json.data);
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        setBriefData(null);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // task 토글 (완료 ↔ 대기)
  const handleTaskToggle = useCallback(async (taskId) => {
    try {
      const res = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const json = await res.json();
      if (json.status === 'ok' && json.items) {
        setBriefData(prev => ({ ...prev, todayTasks: json.items }));
      }
    } catch (e) {
      console.error('task toggle failed:', e);
    }
  }, []);

  // 항목 선택 → 상세 뷰
  const handleSelect = useCallback((id) => {
    const DEFAULT_CHANGES = [
      {
        id: 1, type: 'new_pr', category: 'approve',
        title: 'PR #93 — 세션 만료 로직 수정 (김개발)',
        detail: '+47 -12, 리스크: low',
        detectedAt: new Date(Date.now() - 36000000).toISOString(), // ~10h ago
        diffData: {
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
          ].join('\n'),
          description: '세션 만료 시 자동 갱신 로직 추가. config 기반 타임아웃 설정 지원.',
          branch: 'feature/session-refresh',
          base: 'main',
        },
        analysis: {
          summary: '세션 만료 로직 수정 — 리스크 낮음',
          riskLevel: 'low',
          suggestion: '타임아웃 설정 확인 필요',
          detail: {
            code_quality: 'good',
            security_impact: 'positive — 세션 갱신으로 보안 강화',
            breaking_changes: false,
            review_points: [
              'refreshWindow 비율(10%)이 적절한지 확인',
              'config.sessionTimeout 기본값 3600이 프로덕션 설정과 일치하는지 확인',
              'X-New-Token 헤더 추가에 따른 CORS 설정 확인 필요',
            ],
          },
        },
      },
      {
        id: 2, type: 'ci_fail', category: 'approve',
        title: 'CI 실패 — PR #91 auth.spec.ts 타임아웃',
        detail: '타임아웃 5s→10s 제안',
        detectedAt: new Date(Date.now() - 28800000).toISOString(), // ~8h ago
        diffData: {
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
          ].join('\n'),
          run_url: 'https://github.com/org/repo/actions/runs/12345',
          duration: '4m 32s',
          previous_status: 'passing',
        },
        analysis: {
          summary: 'CI 타임아웃 — auth.spec.ts',
          riskLevel: 'medium',
          suggestion: '타임아웃 5s→10s 변경 제안',
          detail: {
            root_cause: 'jest.setTimeout 기본값(5000ms) 초과',
            affected_test: 'Token refresh flow > should refresh expired token',
            suggested_fix: 'jest.setTimeout(10000) 또는 테스트 내 async 로직 최적화',
            similar_issues: ['이전에도 CI 환경에서 간헐적 타임아웃 발생 이력'],
            impact: 'PR #91 머지 블로킹',
          },
        },
      },
      {
        id: 3, type: 'new_pr', category: 'auto',
        title: 'PR #94 dependabot 보안 패치 — 자동 머지됨',
        detail: 'lodash 4.17.21→4.17.24',
        detectedAt: new Date(Date.now() - 18000000).toISOString(), // ~5h ago
        diffData: {
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
        analysis: {
          summary: 'dependabot 보안 패치 — 테스트 통과',
          riskLevel: 'low',
          suggestion: null,
          detail: {
            package: 'lodash',
            from_version: '4.17.21',
            to_version: '4.17.24',
            vulnerability_fixed: 'Prototype Pollution (CVE-2024-XXXXX)',
            auto_merge_criteria: ['dependabot PR', '보안 패치', 'CI 통과', 'minor version'],
          },
        },
      },
      {
        id: 4, type: 'new_issue', category: 'auto',
        title: 'Issue #155 중복 — 자동 클로즈',
        detail: '#142와 중복 확인',
        detectedAt: new Date(Date.now() - 18000000).toISOString(), // ~5h ago
        diffData: {
          issue_number: 155,
          issue_title: '검색 필터 초기화 안 됨',
          duplicate_of: '#142',
          original_issue: {
            number: 142,
            title: '검색 결과 필터 리셋 버그',
            state: 'closed',
            resolution: 'PR #85에서 수정됨',
          },
          similarity: 0.92,
          matching_keywords: ['검색', '필터', '초기화', '리셋'],
          description: 'Issue #155의 내용이 이미 클로즈된 #142와 92% 유사. PR #85에서 수정 완료된 건으로 확인.',
        },
        analysis: {
          summary: 'Issue #155 중복 — #142와 동일',
          riskLevel: 'low',
          suggestion: null,
          detail: {
            duplicate_confidence: 0.92,
            original_issue: '#142 (검색 결과 필터 리셋 버그)',
            resolution: 'PR #85에서 이미 수정됨',
            auto_close_criteria: ['유사도 90% 이상', '원본 이슈 이미 해결됨'],
          },
        },
      },
      {
        id: 5, type: 'comment', category: 'direct',
        title: 'Issue #160 — 아키텍처 방향 결정 필요',
        detail: '@carlos-dev 코멘트',
        detectedAt: new Date(Date.now() - 10800000).toISOString(), // ~3h ago
        diffData: {
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
          ].join('\n'),
          related_issues: ['#156', '#158'],
          labels: ['architecture', 'discussion', 'decision-needed'],
          participants: ['@carlos-dev', '@박선임', '@김개발'],
        },
        analysis: {
          summary: '아키텍처 방향 결정 필요',
          riskLevel: 'high',
          suggestion: '팀 논의 필요',
          detail: {
            topic: 'API Gateway 선택: AWS API Gateway vs Kong',
            key_considerations: [
              { option: 'AWS API Gateway', pros: ['관리형 서비스', 'AWS 생태계 통합'], cons: ['벤더 종속', '비용 증가 가능'] },
              { option: 'Kong Gateway', pros: ['오픈소스', '유연한 플러그인'], cons: ['직접 운영 필요', '러닝 커브'] },
            ],
            stakeholders: ['@carlos-dev', '@박선임', '@김개발'],
            deadline: '이번 스프린트 종료 전',
            impact: '마이크로서비스 전환 전체 일정에 영향',
          },
        },
      },
      {
        id: 6, type: 'commit', category: 'auto',
        title: '일일 빌드 — main 정상',
        detail: '전체 테스트 통과',
        detectedAt: new Date(Date.now() - 3600000).toISOString(), // ~1h ago
        diffData: {
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
          ],
          total_lines: 847,
          findings: [
            { file: 'src/payment/processor.js', line: 45, severity: 'high', message: 'catch 블록에서 에러를 삼키고 있음 — 로깅 누락' },
            { file: 'src/payment/gateway.js', line: 78, severity: 'high', message: 'PG사 응답 파싱 실패 시 fallback 없음' },
            { file: 'src/payment/refund.js', line: 33, severity: 'low', message: '부분 환불 시 금액 검증 로직 개선 가능' },
          ],
          summary: '결제 모듈 8파일 847줄 검토 완료. 주요 발견: 에러 삼킴 2건(high), 개선 가능 1건(low)',
          build_status: 'passing',
          test_coverage: '78%',
        },
        analysis: {
          summary: '일일 빌드 정상 — main 전체 테스트 통과',
          riskLevel: 'low',
          suggestion: null,
          detail: {
            build_duration: '3m 12s',
            test_suites: 42,
            tests_passed: 187,
            tests_failed: 0,
            coverage: '78%',
            special_instruction_result: '결제 모듈 에러핸들링 검토 완료 — 5건 발견',
          },
        },
      },
    ];
    const changes = briefData?.nightChanges?.length > 0 ? briefData.nightChanges : DEFAULT_CHANGES;
    let change = changes.find(c => c.id === id);
    if (!change && id >= 1 && id <= changes.length) {
      change = changes[id - 1];
    }
    if (change) {
      setSelectedItem({
        id: change.id,
        type: change.type || 'new_pr',
        ref_id: change.refId || change.title.match(/#\d+/)?.[0] || '',
        title: change.title,
        category: change.category,
        data: change.diffData || {},
        detected_at: change.detectedAt || change.detected_at || null,
      });
      setSelectedAnalysis(change.analysis || {
        summary: change.detail,
        category: change.category,
        risk_level: 'low',
      });
      changeView('detail');
    }
  }, [briefData, changeView]);

  // 액션 핸들러
  const handleApprove = useCallback(async (itemId) => {
    try {
      await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: itemId, action: 'approve' }),
      });
    } catch (e) { console.error(e); }
    changeView('brief');
  }, [changeView]);

  const handleComment = useCallback(async (itemId, comment) => {
    try {
      await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: itemId, action: 'comment', comment }),
      });
    } catch (e) { console.error(e); }
  }, []);

  const handleSkip = useCallback(() => {
    changeView('brief');
  }, [changeView]);

  const handleBack = useCallback(() => {
    changeView('brief');
    setSelectedItem(null);
  }, [changeView]);

  // 퇴근 → 야간 전환
  const handleClockOut = useCallback((instruction) => {
    setNightInstruction(instruction || '');
    setShift('night');
    changeView('active');
  }, [changeView]);

  // 출근 → 주간 전환
  const handleClockIn = useCallback(() => {
    setShift('day');
    changeView('brief');
  }, [changeView]);

  // 스플래시 완료
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cs-senpai-booted', '1');
      // 첫 방문 시 도움말 자동 표시
      if (!sessionStorage.getItem('cs-senpai-help-shown')) {
        sessionStorage.setItem('cs-senpai-help-shown', '1');
        setShowHelp(true);
      }
    }
  }, []);

  // 키보드 단축키
  const keyHandlers = useMemo(() => ({
    onSelect: (num) => {
      if (view === 'brief' && shift === 'day') handleSelect(num);
    },
    onClockIn: () => {
      if (view === 'brief' && shift === 'day') changeView('handoff');
    },
    onApprove: () => {
      if (view === 'detail' && selectedItem) handleApprove(selectedItem.id);
    },
    onComment: () => {
      // toggle handled by DetailView
    },
    onSkip: () => {
      if (view === 'detail') handleSkip();
    },
    onBack: () => {
      if (view === 'detail') handleBack();
    },
    onDetail: () => {
      if (view === 'brief' && shift === 'day') handleSelect(1);
    },
    onClockInFromNight: () => {
      if (view === 'active' && shift === 'night') handleClockIn();
    },
    onEscape: () => {
      if (showHelp) {
        setShowHelp(false);
      } else if (view === 'detail') {
        handleBack();
      } else if (view === 'handoff') {
        changeView('brief');
      }
      // NightActive: Escape 무시 (교대 전환은 의도적 행동)
    },
    onHelp: () => {
      setShowHelp(prev => !prev);
    },
    onCopyPrompt: () => {
      // DetailView가 자체 처리
    },
  }), [view, shift, selectedItem, showHelp, handleSelect, handleApprove, handleSkip, handleBack, changeView, handleClockIn]);

  useTerminalKeys(keyHandlers);

  // 전환 애니메이션 결정
  const getVariant = () => {
    if (prevView === 'brief' && view === 'handoff') return pageVariants.slideLeft;
    if (prevView === 'handoff' && view === 'active') return pageVariants.fadeBlack;
    if (prevView === 'active' && view === 'brief') return pageVariants.crtBoot;
    if (prevView === 'brief' && view === 'detail') return pageVariants.scaleUp;
    if (prevView === 'detail' && view === 'brief') return pageVariants.scaleDown;
    return pageVariants.fade;
  };

  // 로딩
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" data-shift={shift}>
        <div className="text-term-green font-mono text-sm glow-text animate-pulse">
          야간 근무 기록 로딩 중...
        </div>
      </div>
    );
  }

  const variant = getVariant();

  // 화면 렌더링
  const renderView = () => {
    switch (view) {
      case 'timelapse':
        return (
          <motion.div key="timelapse" className="h-full" {...pageVariants.fade}>
            <Timelapse onComplete={() => changeView('brief')} />
          </motion.div>
        );

      case 'handoff':
        return (
          <motion.div key="handoff" className="h-full" {...variant}>
            <EveningHandoff
              todaySummary={briefData?.summary?.summary}
              tomorrowItems={briefData?.tomorrowTasks}
              onClockOut={handleClockOut}
              onBack={() => changeView('brief')}
            />
          </motion.div>
        );

      case 'active':
        return (
          <motion.div key="active" className="h-full" {...variant}>
            <NightActive
              instruction={nightInstruction}
              onClockIn={handleClockIn}
            />
          </motion.div>
        );

      case 'detail':
        return (
          <motion.div key="detail" className="h-full" {...variant}>
            <DetailView
              item={selectedItem}
              analysis={selectedAnalysis}
              onApprove={handleApprove}
              onComment={handleComment}
              onSkip={handleSkip}
              onBack={handleBack}
            />
          </motion.div>
        );

      case 'brief':
      default:
        return (
          <motion.div key="brief" className="h-full" {...variant}>
            <MorningBrief
              data={briefData}
              onSelect={handleSelect}
              onTaskToggle={handleTaskToggle}
              onSwitchEvening={() => changeView('handoff')}
              onHelp={() => setShowHelp(prev => !prev)}
            />
          </motion.div>
        );
    }
  };

  return (
    <div
      data-shift={shift}
      className="crt-overlay crt-screen h-screen flex flex-col overflow-hidden"
    >
      {/* CRT 부팅 스플래시 */}
      {showSplash && shift === 'day' && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      <ModeIndicator shift={shift} view={view} />
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {renderView()}
        </AnimatePresence>
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} view={view} />}
    </div>
  );
}
