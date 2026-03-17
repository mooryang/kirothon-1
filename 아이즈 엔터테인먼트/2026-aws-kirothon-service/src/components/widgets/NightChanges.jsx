'use client';

const DEFAULT_CHANGES = [
  {
    id: 1, category: 'approve',
    title: 'PR #93 — 세션 만료 로직 수정 (김개발)',
    detail: '+47 -12, 리스크: low',
    diffData: { files: ['session.js', 'middleware.js'] },
    analysis: { suggestion: 'refreshWindow 비율 확인 필요', risk: 'low' },
  },
  {
    id: 2, category: 'approve',
    title: 'CI 실패 — PR #91 auth.spec.ts 타임아웃',
    detail: '타임아웃 5s→10s 제안',
    diffData: { files: ['auth.spec.ts'] },
    analysis: { suggestion: '타임아웃 5s→10s 변경으로 안정화', risk: 'medium' },
  },
  {
    id: 3, category: 'auto',
    title: 'PR #94 dependabot 보안 패치 — 자동 머지됨',
    detail: 'lodash 4.17.21→4.17.24',
    diffData: { files: ['package.json', 'package-lock.json'] },
    analysis: { suggestion: '보안 패치, 테스트 통과 확인', risk: 'low' },
  },
  {
    id: 4, category: 'auto',
    title: 'Issue #155 중복 — 자동 클로즈',
    detail: '#142와 중복 확인',
    diffData: { files: [] },
    analysis: { suggestion: '#142와 동일 증상, 자동 클로즈', risk: 'low' },
  },
  {
    id: 5, category: 'direct',
    title: 'Issue #160 — 아키텍처 방향 결정 필요',
    detail: '@carlos-dev 코멘트',
    diffData: { files: [] },
    analysis: { suggestion: '모놀리스 vs 마이크로서비스 논의 필요', risk: 'high' },
  },
  {
    id: 6, category: 'auto',
    title: '일일 빌드 — main 정상',
    detail: '전체 테스트 통과',
    diffData: { files: [] },
    analysis: { suggestion: '전체 테스트 통과, 이상 없음', risk: 'low' },
  },
];

const BORDER_COLORS = {
  auto: 'border-l-[3px] border-l-term-green',
  approve: 'border-l-[3px] border-l-term-amber',
  direct: 'border-l-[3px] border-l-term-red',
};

const CATEGORY_STYLES = {
  auto: { icon: '🟢', className: 'status-auto' },
  approve: { icon: '🟡', className: 'status-approve' },
  direct: { icon: '🔴', className: 'status-direct' },
};

const RISK_COLORS = {
  low: 'text-term-green',
  medium: 'text-term-amber',
  high: 'text-term-red',
};

function formatFiles(files) {
  if (!files || files.length === 0) return '';
  if (files.length <= 2) return files.join(', ');
  return `${files[0]}, ${files[1]} +${files.length - 2}`;
}

export default function NightChanges({ items, onSelect }) {
  const changes = items && items.length > 0 ? items : DEFAULT_CHANGES;

  return (
    <div className="space-y-1.5">
      {changes.map((change, i) => {
        const cat = CATEGORY_STYLES[change.category] || CATEGORY_STYLES.auto;
        const borderClass = BORDER_COLORS[change.category] || BORDER_COLORS.auto;
        const risk = change.analysis?.risk || 'low';
        const riskColor = RISK_COLORS[risk] || RISK_COLORS.low;
        const files = change.diffData?.files;
        const suggestion = change.analysis?.suggestion ||
          change.analysis?.detail?.review_points?.[0];
        const isAuto = change.category === 'auto';

        return (
          <div
            key={change.id || i}
            role="button"
            tabIndex={0}
            className={`${borderClass} pl-3 pr-2 py-1 cursor-pointer hover:bg-term-green/10 rounded-r group transition-colors`}
            onClick={() => onSelect?.(change.id || i + 1)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                onSelect?.(change.id || i + 1);
              }
            }}
          >
            {/* 1줄: 제목 */}
            <div className="flex items-center gap-2 text-sm">
              <span className="flex-shrink-0">{cat.icon}</span>
              <span className="text-term-amber flex-shrink-0 text-xs">[{i + 1}]</span>
              <span className={`${cat.className} flex-1 min-w-0 truncate`}>
                {change.title}
              </span>
              {isAuto && (
                <span className="text-term-green text-xs flex-shrink-0">✓ 완료</span>
              )}
              <span className="text-term-green/20 group-hover:text-term-green/60 text-xs transition-colors flex-shrink-0">
                →
              </span>
            </div>
            {/* 2줄: diff stats + 리스크 + 파일명 */}
            <div className="text-xs text-term-green/40 mt-0.5 pl-10 flex items-center gap-1.5">
              <span>{change.detail}</span>
              {risk && (
                <>
                  <span className="text-term-border">·</span>
                  <span className={`${riskColor} uppercase font-bold text-[10px]`}>{risk}</span>
                </>
              )}
              {files && files.length > 0 && (
                <>
                  <span className="text-term-border">·</span>
                  <span className="text-term-cyan/50">{formatFiles(files)}</span>
                </>
              )}
            </div>
            {/* 3줄: AI 프리뷰 */}
            {suggestion && (
              <div className="text-xs text-term-amber/50 mt-0.5 pl-10">
                ▸ {suggestion}
              </div>
            )}
          </div>
        );
      })}
      <div className="text-term-green/30 text-xs mt-1 pl-3">
        숫자키 또는 클릭으로 상세 보기
      </div>
    </div>
  );
}
