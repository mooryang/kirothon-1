'use client';

import { useState, useCallback, useEffect } from 'react';
import Panel from './Panel';
import CommandBar from './CommandBar';

// ─── 카테고리/타입 상수 (NightChanges와 동일 패턴) ──────────────
const CATEGORY_STYLES = {
  auto:    { icon: '🟢', label: '자동처리', color: 'term-green', border: 'border-green-500/60' },
  approve: { icon: '🟡', label: '승인필요', color: 'term-amber', border: 'border-amber-500/60' },
  direct:  { icon: '🔴', label: '방향결정', color: 'term-red',   border: 'border-red-500/60' },
};

const TYPE_LABELS = {
  new_pr:    { icon: '📝', label: 'Pull Request' },
  ci_fail:   { icon: '🔧', label: 'CI 실패' },
  new_issue: { icon: '📋', label: 'Issue' },
  comment:   { icon: '💬', label: '코멘트' },
  commit:    { icon: '🔍', label: '코드 리뷰' },
};

const RISK_STYLES = {
  low:    { label: 'LOW',    className: 'status-auto' },
  medium: { label: 'MEDIUM', className: 'status-approve' },
  high:   { label: 'HIGH',   className: 'status-direct' },
};

// ─── 타입별 왼쪽 패널 렌더러 ────────────────────────────────────

function RenderPR({ data }) {
  if (!data) return null;
  const diffLines = (data.diff || '').split('\n');
  const hasVuln = data.vulnerability;

  return (
    <div className="text-xs leading-relaxed space-y-3">
      {/* 작성자 + Dependabot 배지 */}
      {(data.author || data.dependabot) && (
        <div className="flex items-center gap-2">
          {data.author && <span className="text-gray-300">{data.author}</span>}
          {data.dependabot && (
            <span className="px-2 py-0.5 bg-blue-900/30 border border-blue-700/40 text-blue-400 rounded text-xs">🤖 Dependabot</span>
          )}
        </div>
      )}

      {data.description && (
        <p className="text-term-green/80 text-sm">{data.description}</p>
      )}

      {/* 브랜치 정보 */}
      {data.branch && (
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-term-cyan">{data.branch}</span>
          <span>→</span>
          <span className="text-term-cyan">{data.base || 'main'}</span>
        </div>
      )}

      {/* 보안 취약점 박스 */}
      {hasVuln && (
        <div className="border border-red-500/50 bg-red-900/20 p-2 rounded">
          <div className="text-term-red font-bold text-sm mb-1">🔴 보안 취약점</div>
          <div className="text-gray-300">
            <span className="text-term-red">{data.vulnerability.cve}</span>
            {' — '}
            <span className="text-term-amber">Severity: {data.vulnerability.severity?.toUpperCase()}</span>
          </div>
          {data.vulnerability.description && (
            <div className="text-gray-400 mt-1">{data.vulnerability.description}</div>
          )}
        </div>
      )}

      {/* 파일 트리 + stats */}
      {data.files && (
        <div className="space-y-1">
          <div className="text-gray-500 text-xs">── 변경 파일 ──</div>
          {data.files.map((f, i) => (
            <div key={i} className="text-term-cyan pl-2">📄 {f}</div>
          ))}
        </div>
      )}
      {(data.additions !== undefined || data.deletions !== undefined) && (
        <div className="flex gap-3">
          <span className="text-term-green">+{data.additions || 0}</span>
          <span className="text-term-red">-{data.deletions || 0}</span>
        </div>
      )}

      {/* Diff 코드 */}
      {diffLines.length > 1 && (
        <>
          <div className="text-gray-500 text-xs">── diff ──</div>
          <pre className="text-xs">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={
                  line.startsWith('+') ? 'text-term-green bg-green-900/20' :
                  line.startsWith('-') ? 'text-term-red bg-red-900/20' :
                  line.startsWith('@@') ? 'text-term-cyan' :
                  'text-gray-400'
                }
              >
                {line}
              </div>
            ))}
          </pre>
        </>
      )}

      {/* CI 상태 */}
      {data.ci_status && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">CI:</span>
          <span className={data.ci_status === 'passing' ? 'text-term-green' : 'text-term-red'}>{data.ci_status}</span>
          {data.all_tests_pass && <span className="text-term-green">✓ 전체 테스트 통과</span>}
        </div>
      )}
    </div>
  );
}

function RenderCIFail({ data }) {
  if (!data) return null;
  const errorLines = (data.error_log || '').split('\n');

  return (
    <div className="text-xs leading-relaxed space-y-3">
      {/* 메타 그리드 */}
      <div className="grid grid-cols-2 gap-2">
        {data.pr_number && (
          <div className="border border-gray-700 p-2 rounded">
            <div className="text-gray-500 text-xs">PR</div>
            <div className="text-term-amber">#{data.pr_number} {data.pr_title || ''}</div>
          </div>
        )}
        {data.job_name && (
          <div className="border border-gray-700 p-2 rounded">
            <div className="text-gray-500 text-xs">Job</div>
            <div className="text-term-cyan">{data.job_name}</div>
          </div>
        )}
        {data.failed_test && (
          <div className="border border-gray-700 p-2 rounded">
            <div className="text-gray-500 text-xs">실패 테스트</div>
            <div className="text-term-red">{data.failed_test}</div>
          </div>
        )}
        {data.duration && (
          <div className="border border-gray-700 p-2 rounded">
            <div className="text-gray-500 text-xs">소요시간</div>
            <div className="text-gray-300">{data.duration}</div>
          </div>
        )}
        {data.previous_status && (
          <div className="border border-gray-700 p-2 rounded">
            <div className="text-gray-500 text-xs">이전 상태</div>
            <div className={data.previous_status === 'passing' ? 'text-term-green' : 'text-term-red'}>{data.previous_status}</div>
          </div>
        )}
      </div>

      {/* GitHub Actions 링크 */}
      {data.run_url && (
        <div className="text-xs">
          <span className="text-gray-500">Actions: </span>
          <a href={data.run_url} target="_blank" rel="noopener noreferrer" className="text-term-cyan underline hover:text-term-green">{data.run_url}</a>
        </div>
      )}

      {/* 에러 로그 */}
      {errorLines.length > 0 && (
        <>
          <div className="text-gray-500 text-xs">── 에러 로그 ──</div>
          <pre className="bg-red-900/10 border border-red-900/30 p-2 rounded text-xs">
            {errorLines.map((line, i) => (
              <div
                key={i}
                className={
                  line.includes('FAIL') || line.includes('●') ? 'text-term-red' :
                  line.includes('Timeout') || line.includes('Error') ? 'text-term-amber' :
                  'text-gray-400'
                }
              >
                {line}
              </div>
            ))}
          </pre>
        </>
      )}
    </div>
  );
}

function RenderIssue({ data }) {
  if (!data) return null;

  return (
    <div className="text-xs leading-relaxed space-y-3">
      {data.description && (
        <p className="text-term-green/80 text-sm">{data.description}</p>
      )}

      {/* 현재 이슈 ↔ 원본 이슈 비교 */}
      {data.original_issue && (
        <div className="space-y-2">
          <div className="text-gray-500 text-xs">── 이슈 비교 ──</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-amber-700/40 p-2 rounded">
              <div className="text-gray-500 text-xs mb-1">현재 이슈</div>
              <div className="text-term-amber">#{data.issue_number} {data.issue_title || ''}</div>
            </div>
            <div className="border border-green-700/40 p-2 rounded">
              <div className="text-gray-500 text-xs mb-1">원본 이슈</div>
              <div className="text-term-green">
                #{data.original_issue.number} {data.original_issue.title || ''}
              </div>
              {data.original_issue.state && (
                <div className="text-gray-400 mt-1">
                  상태: <span className={data.original_issue.state === 'closed' ? 'text-term-green' : 'text-term-amber'}>{data.original_issue.state}</span>
                </div>
              )}
              {data.original_issue.resolution && (
                <div className="text-gray-400 mt-1">{data.original_issue.resolution}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 유사도 바 */}
      {data.similarity !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">유사도</span>
            <span className="text-term-green">{Math.round(data.similarity * 100)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-term-green h-2 rounded-full"
              style={{ width: `${Math.round(data.similarity * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 매칭 키워드 태그 */}
      {data.matching_keywords?.length > 0 && (
        <div className="space-y-1">
          <div className="text-gray-500 text-xs">매칭 키워드</div>
          <div className="flex flex-wrap gap-1">
            {data.matching_keywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 bg-green-900/30 border border-green-700/40 text-term-green rounded text-xs">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RenderComment({ data }) {
  if (!data) return null;

  return (
    <div className="text-xs leading-relaxed space-y-3">
      {/* 이슈 컨텍스트 */}
      {data.issue_title && (
        <div className="border border-gray-700 p-2 rounded">
          <div className="text-gray-500 text-xs">이슈</div>
          <div className="text-term-amber">#{data.issue_number} {data.issue_title}</div>
        </div>
      )}

      {/* 코멘트 본문 */}
      {data.comment_body && (
        <div className="space-y-1">
          <div className="text-gray-500 text-xs">── {data.commenter || '코멘트'} ──</div>
          <blockquote className="border-l-2 border-term-cyan/50 pl-3 text-gray-300 text-sm whitespace-pre-wrap">
            {data.comment_body}
          </blockquote>
        </div>
      )}

      {/* 관련 이슈 */}
      {data.related_issues?.length > 0 && (
        <div className="space-y-1">
          <div className="text-gray-500 text-xs">관련 이슈</div>
          <div className="flex gap-2">
            {data.related_issues.map((issue, i) => (
              <span key={i} className="text-term-cyan">{issue}</span>
            ))}
          </div>
        </div>
      )}

      {/* 참여자 + 라벨 */}
      <div className="flex flex-wrap gap-4">
        {data.participants?.length > 0 && (
          <div className="space-y-1">
            <div className="text-gray-500 text-xs">참여자</div>
            <div className="flex gap-2">
              {data.participants.map((p, i) => (
                <span key={i} className="text-term-green">{p}</span>
              ))}
            </div>
          </div>
        )}
        {data.labels?.length > 0 && (
          <div className="space-y-1">
            <div className="text-gray-500 text-xs">라벨</div>
            <div className="flex flex-wrap gap-1">
              {data.labels.map((label, i) => (
                <span key={i} className="px-2 py-0.5 bg-amber-900/20 border border-amber-700/30 text-term-amber rounded text-xs">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RenderCommit({ data }) {
  if (!data) return null;

  const severityBorder = {
    high:   'border-red-500/50',
    medium: 'border-amber-500/50',
    low:    'border-green-500/50',
  };
  const severityText = {
    high:   'text-term-red',
    medium: 'text-term-amber',
    low:    'text-term-green',
  };

  return (
    <div className="text-xs leading-relaxed space-y-3">
      {/* 지시사항 박스 */}
      {data.instruction && (
        <div className="border border-term-cyan/40 bg-cyan-900/10 p-2 rounded">
          <div className="text-gray-500 text-xs mb-1">📋 특별 지시사항</div>
          <div className="text-term-cyan text-sm">{data.instruction}</div>
        </div>
      )}

      {/* 요약 */}
      {data.summary && (
        <p className="text-term-green/80 text-sm">{data.summary}</p>
      )}

      {/* 빌드 상태 + 커버리지 + 파일 수/라인 수 */}
      <div className="flex gap-4 text-sm flex-wrap">
        {data.build_status && (
          <span className="text-gray-300">빌드: <span className={data.build_status === 'passing' ? 'text-term-green' : 'text-term-red'}>{data.build_status}</span></span>
        )}
        {data.test_coverage && (
          <span className="text-gray-300">커버리지: <span className="text-term-cyan">{data.test_coverage}</span></span>
        )}
        {data.files_reviewed && (
          <span className="text-gray-300">{data.files_reviewed.length}개 파일</span>
        )}
        {data.total_lines && (
          <span className="text-gray-300">{data.total_lines}줄</span>
        )}
      </div>

      {/* 검토 파일 목록 */}
      {data.files_reviewed?.length > 0 && (
        <div className="space-y-1">
          <div className="text-gray-500 text-xs">── 검토 파일 ──</div>
          {data.files_reviewed.map((f, i) => (
            <div key={i} className="text-term-cyan pl-2 text-xs">📄 {f}</div>
          ))}
        </div>
      )}

      {/* Findings 리스트 */}
      {data.findings?.length > 0 && (
        <div className="space-y-2">
          <div className="text-gray-500 text-xs">── Findings ({data.findings.length}건) ──</div>
          {data.findings.map((f, i) => (
            <div
              key={i}
              className={`border-l-2 ${severityBorder[f.severity] || 'border-gray-500'} pl-2 py-1`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${severityText[f.severity] || 'text-gray-400'}`}>
                  {(f.severity || 'info').toUpperCase()}
                </span>
                <span className="text-gray-500 text-xs">{f.file}:{f.line}</span>
              </div>
              <div className="text-gray-300 mt-0.5">{f.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 타입별 오른쪽 패널 상세 분석 ──────────────────────────────

function RenderAnalysisDetail({ type, detail, category }) {
  if (!detail) return null;

  switch (type) {
    case 'new_pr': {
      // auto 카테고리(dependabot) vs approve 카테고리(일반 PR)
      if (category === 'auto') {
        return (
          <div className="space-y-2">
            {detail.package && (
              <div>
                <span className="text-gray-500">패키지: </span>
                <span className="text-term-cyan">{detail.package}</span>
                {detail.from_version && detail.to_version && (
                  <span className="text-gray-400"> ({detail.from_version} → {detail.to_version})</span>
                )}
              </div>
            )}
            {detail.vulnerability_fixed && (
              <div>
                <span className="text-gray-500">수정 취약점: </span>
                <span className="text-term-red">{detail.vulnerability_fixed}</span>
              </div>
            )}
            {detail.auto_merge_criteria?.length > 0 && (
              <div>
                <div className="text-gray-500 mb-1">자동 머지 조건:</div>
                {detail.auto_merge_criteria.map((c, i) => (
                  <div key={i} className="text-term-green pl-2">✓ {c}</div>
                ))}
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="space-y-2">
          {detail.code_quality && (
            <div>
              <span className="text-gray-500">코드 품질: </span>
              <span className="text-gray-300">{detail.code_quality}</span>
            </div>
          )}
          {detail.security_impact && (
            <div>
              <span className="text-gray-500">보안 영향: </span>
              <span className="text-gray-300">{detail.security_impact}</span>
            </div>
          )}
          {detail.breaking_changes !== undefined && (
            <div>
              <span className="text-gray-500">Breaking Changes: </span>
              <span className={detail.breaking_changes ? 'text-term-red' : 'text-term-green'}>
                {detail.breaking_changes ? '있음' : '없음'}
              </span>
            </div>
          )}
          {detail.review_points?.length > 0 && (
            <div>
              <div className="text-gray-500 mb-1">리뷰 포인트:</div>
              {detail.review_points.map((p, i) => (
                <div key={i} className="text-term-amber pl-2">▸ {p}</div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'ci_fail':
      return (
        <div className="space-y-2">
          {detail.root_cause && (
            <div>
              <span className="text-gray-500">근본 원인: </span>
              <span className="text-term-red">{detail.root_cause}</span>
            </div>
          )}
          {detail.affected_test && (
            <div>
              <span className="text-gray-500">실패 테스트: </span>
              <span className="text-term-amber">{detail.affected_test}</span>
            </div>
          )}
          {detail.suggested_fix && (
            <div>
              <span className="text-gray-500">수정 제안: </span>
              <span className="text-term-cyan">{detail.suggested_fix}</span>
            </div>
          )}
          {detail.impact && (
            <div>
              <span className="text-gray-500">영향: </span>
              <span className="text-term-amber">{detail.impact}</span>
            </div>
          )}
          {detail.similar_issues?.length > 0 && (
            <div>
              <div className="text-gray-500 mb-1">유사 이력:</div>
              {detail.similar_issues.map((s, i) => (
                <div key={i} className="text-gray-400 pl-2">• {s}</div>
              ))}
            </div>
          )}
        </div>
      );

    case 'new_issue':
      return (
        <div className="space-y-2">
          {detail.duplicate_confidence !== undefined && (
            <div>
              <span className="text-gray-500">중복 확신도: </span>
              <span className="text-term-green">
                {typeof detail.duplicate_confidence === 'number'
                  ? `${Math.round(detail.duplicate_confidence * 100)}%`
                  : detail.duplicate_confidence}
              </span>
            </div>
          )}
          {detail.original_issue && (
            <div>
              <span className="text-gray-500">원본: </span>
              <span className="text-gray-300">{detail.original_issue}</span>
            </div>
          )}
          {detail.resolution && (
            <div>
              <span className="text-gray-500">해결 방법: </span>
              <span className="text-gray-300">{detail.resolution}</span>
            </div>
          )}
          {detail.auto_close_criteria?.length > 0 && (
            <div>
              <div className="text-gray-500 mb-1">자동 클로즈 조건:</div>
              {detail.auto_close_criteria.map((c, i) => (
                <div key={i} className="text-term-green pl-2">✓ {c}</div>
              ))}
            </div>
          )}
        </div>
      );

    case 'comment':
      return (
        <div className="space-y-2">
          {detail.topic && (
            <div>
              <span className="text-gray-500">주제: </span>
              <span className="text-term-amber">{detail.topic}</span>
            </div>
          )}
          {detail.key_considerations?.length > 0 && (
            <div className="space-y-2">
              <div className="text-gray-500">옵션 비교:</div>
              {detail.key_considerations.map((kc, i) => (
                <div key={i} className="border border-gray-700 p-2 rounded text-xs">
                  <div className="text-term-cyan font-bold mb-1">{kc.option}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-term-green text-xs mb-0.5">장점</div>
                      {kc.pros?.map((p, j) => (
                        <div key={j} className="text-gray-300 pl-1">+ {p}</div>
                      ))}
                    </div>
                    <div>
                      <div className="text-term-red text-xs mb-0.5">단점</div>
                      {kc.cons?.map((c, j) => (
                        <div key={j} className="text-gray-300 pl-1">- {c}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {detail.stakeholders?.length > 0 && (
            <div>
              <span className="text-gray-500">이해관계자: </span>
              <span className="text-gray-300">{detail.stakeholders.join(', ')}</span>
            </div>
          )}
          {detail.deadline && (
            <div>
              <span className="text-gray-500">기한: </span>
              <span className="text-term-amber">{detail.deadline}</span>
            </div>
          )}
          {detail.impact && (
            <div>
              <span className="text-gray-500">영향: </span>
              <span className="text-term-red">{detail.impact}</span>
            </div>
          )}
        </div>
      );

    case 'commit':
      return (
        <div className="space-y-2">
          {detail.build_duration && (
            <div>
              <span className="text-gray-500">빌드 시간: </span>
              <span className="text-gray-300">{detail.build_duration}</span>
            </div>
          )}
          {detail.test_suites !== undefined && (
            <div>
              <span className="text-gray-500">테스트 스위트: </span>
              <span className="text-gray-300">{detail.test_suites}개</span>
            </div>
          )}
          <div className="flex gap-4">
            {detail.tests_passed !== undefined && (
              <div>
                <span className="text-gray-500">통과: </span>
                <span className="text-term-green">{detail.tests_passed}</span>
              </div>
            )}
            {detail.tests_failed !== undefined && (
              <div>
                <span className="text-gray-500">실패: </span>
                <span className={detail.tests_failed > 0 ? 'text-term-red' : 'text-term-green'}>{detail.tests_failed}</span>
              </div>
            )}
          </div>
          {detail.coverage && (
            <div>
              <span className="text-gray-500">커버리지: </span>
              <span className="text-term-cyan">{detail.coverage}</span>
            </div>
          )}
          {detail.special_instruction_result && (
            <div>
              <span className="text-gray-500">특별 지시 결과: </span>
              <span className="text-term-amber">{detail.special_instruction_result}</span>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}

// ─── 왼쪽 패널 라우터 ──────────────────────────────────────────

function LeftPanel({ type, data, title }) {
  switch (type) {
    case 'new_pr':
      return <RenderPR data={data} />;
    case 'ci_fail':
      return <RenderCIFail data={data} />;
    case 'new_issue':
      return <RenderIssue data={data} />;
    case 'comment':
      return <RenderComment data={data} />;
    case 'commit':
      return <RenderCommit data={data} />;
    default:
      return <div className="text-gray-400 text-sm">{title}</div>;
  }
}

// ─── 프롬프트 생성 ──────────────────────────────────────────────

function generatePrompt(item, diffData, analysisData) {
  const type = item.type || 'new_pr';
  const category = item.category || analysisData.category || 'auto';
  const refId = item.ref_id || '';
  const lines = [];

  switch (type) {
    case 'new_pr': {
      const isDependabot = diffData.dependabot || category === 'auto';
      if (isDependabot && diffData.vulnerability) {
        lines.push(`PR ${refId} dependabot 보안 패치 확인.`);
        if (diffData.branch) lines.push(`브랜치: ${diffData.branch} → ${diffData.base || 'main'}`);
        if (diffData.files?.length) {
          const stats = (diffData.additions || diffData.deletions) ? ` (+${diffData.additions || 0} -${diffData.deletions || 0})` : '';
          lines.push(`변경 파일: ${diffData.files.join(', ')}${stats}`);
        }
        if (diffData.vulnerability) {
          lines.push(`취약점: ${diffData.vulnerability.description || ''} (${diffData.vulnerability.cve || ''})`);
        }
        if (diffData.ci_status) {
          const testNote = diffData.all_tests_pass ? ', 전체 테스트 통과' : '';
          lines.push(`CI: ${diffData.ci_status}${testNote}`);
        }
        lines.push('');
        lines.push('패키지 업데이트를 확인하고 문제 없으면 머지해줘.');
      } else {
        lines.push(`PR ${refId} 리뷰 요청.`);
        if (diffData.branch) lines.push(`브랜치: ${diffData.branch} → ${diffData.base || 'main'}`);
        if (diffData.author) lines.push(`작성자: ${diffData.author}`);
        if (diffData.files?.length) {
          const stats = (diffData.additions || diffData.deletions) ? ` (+${diffData.additions || 0} -${diffData.deletions || 0})` : '';
          lines.push(`변경 파일: ${diffData.files.join(', ')}${stats}`);
        }
        if (diffData.description) lines.push(`설명: ${diffData.description}`);
        lines.push('');
        if (analysisData.summary) lines.push(`AI 분석: ${analysisData.summary}`);
        if (analysisData.suggestion) lines.push(`제안: ${analysisData.suggestion}`);
        if (analysisData.detail?.review_points?.length) {
          lines.push('확인 포인트:');
          analysisData.detail.review_points.forEach(p => lines.push(`- ${p}`));
        }
        lines.push('');
        lines.push('위 PR을 리뷰하고 확인 포인트를 점검해줘.');
      }
      break;
    }

    case 'ci_fail': {
      lines.push('CI 실패 수정 요청.');
      if (diffData.pr_number) lines.push(`PR: #${diffData.pr_number} ${diffData.pr_title || ''}`);
      if (diffData.job_name) lines.push(`실패 Job: ${diffData.job_name}`);
      if (diffData.failed_test) lines.push(`실패 테스트: ${diffData.failed_test}`);
      if (diffData.previous_status) lines.push(`이전 상태: ${diffData.previous_status}`);
      lines.push('');
      if (analysisData.detail?.root_cause) lines.push(`근본 원인: ${analysisData.detail.root_cause}`);
      if (analysisData.detail?.suggested_fix) lines.push(`수정 제안: ${analysisData.detail.suggested_fix}`);
      if (analysisData.detail?.impact) lines.push(`영향: ${analysisData.detail.impact}`);
      if (diffData.run_url) lines.push(`GitHub Actions: ${diffData.run_url}`);
      lines.push('');
      lines.push('위 CI 실패를 분석하고 수정해줘.');
      break;
    }

    case 'new_issue': {
      lines.push(`Issue ${refId} 처리 요청.`);
      if (item.title) lines.push(`제목: ${item.title}`);
      if (diffData.original_issue) {
        const orig = diffData.original_issue;
        lines.push(`중복 대상: #${orig.number} (${orig.title || ''}${orig.state ? ', ' + orig.state : ''})`);
      }
      if (diffData.similarity !== undefined) lines.push(`유사도: ${Math.round(diffData.similarity * 100)}%`);
      if (diffData.matching_keywords?.length) lines.push(`매칭 키워드: ${diffData.matching_keywords.join(', ')}`);
      if (diffData.original_issue?.resolution) lines.push(`해결: ${diffData.original_issue.resolution}`);
      lines.push('');
      lines.push('중복 여부를 확인하고 처리해줘.');
      break;
    }

    case 'comment': {
      lines.push(`Issue ${refId} 검토 요청.`);
      if (diffData.issue_title) lines.push(`이슈: ${diffData.issue_number ? '#' + diffData.issue_number + ' ' : ''}${diffData.issue_title}`);
      if (diffData.commenter) lines.push(`코멘트: ${diffData.commenter}`);
      if (diffData.related_issues?.length) lines.push(`관련 이슈: ${diffData.related_issues.join(', ')}`);
      lines.push('');
      if (analysisData.detail?.topic) lines.push(`주제: ${analysisData.detail.topic}`);
      if (analysisData.detail?.key_considerations?.length) {
        lines.push('옵션:');
        analysisData.detail.key_considerations.forEach(kc => {
          lines.push(`- ${kc.option}: 장점(${(kc.pros || []).join(', ')}), 단점(${(kc.cons || []).join(', ')})`);
        });
      }
      if (analysisData.detail?.stakeholders?.length) lines.push(`이해관계자: ${analysisData.detail.stakeholders.join(', ')}`);
      if (analysisData.detail?.deadline) lines.push(`기한: ${analysisData.detail.deadline}`);
      if (analysisData.detail?.impact) lines.push(`영향: ${analysisData.detail.impact}`);
      lines.push('');
      lines.push('위 내용을 분석하고 추천 의견을 정리해줘.');
      break;
    }

    case 'commit': {
      lines.push('코드 리뷰 발견사항 수정 요청.');
      if (diffData.instruction) lines.push(`지시사항: ${diffData.instruction}`);
      if (diffData.files_reviewed?.length) lines.push(`검토 파일: ${diffData.files_reviewed.join(', ')}`);
      if (diffData.total_lines) lines.push(`검토 범위: ${diffData.total_lines}줄`);
      lines.push('');
      if (diffData.findings?.length) {
        lines.push('발견사항:');
        diffData.findings.forEach(f => {
          lines.push(`- [${(f.severity || 'info').toUpperCase()}] ${f.file}:${f.line} — ${f.message}`);
        });
      }
      lines.push('');
      if (diffData.build_status) lines.push(`빌드: ${diffData.build_status}${diffData.test_coverage ? ', 커버리지: ' + diffData.test_coverage : ''}`);
      lines.push('');
      lines.push('위 발견사항을 수정해줘.');
      break;
    }

    default:
      lines.push(`${item.title || refId} 확인 요청.`);
      if (analysisData.summary) lines.push(analysisData.summary);
      break;
  }

  return lines.join('\n');
}

// 타입별 프롬프트 설명 (미리보기 헤더용)
const PROMPT_DESCRIPTIONS = {
  new_pr:    '이 프롬프트를 Claude Code나 kiro-cli에 붙여넣으면 PR 리뷰를 바로 시작합니다.',
  ci_fail:   '이 프롬프트를 Claude Code나 kiro-cli에 붙여넣으면 CI 실패 원인 분석 및 수정을 시작합니다.',
  new_issue: '이 프롬프트를 Claude Code나 kiro-cli에 붙여넣으면 이슈 중복 확인 및 처리를 시작합니다.',
  comment:   '이 프롬프트를 Claude Code나 kiro-cli에 붙여넣으면 논의 분석 및 의견 정리를 시작합니다.',
  commit:    '이 프롬프트를 Claude Code나 kiro-cli에 붙여넣으면 코드 리뷰 발견사항 수정을 시작합니다.',
};

// ─── 프롬프트 미리보기 모달 ─────────────────────────────────────

function PromptPreview({ prompt, description, onClose, onCopy, copied }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="border border-term-green bg-term-bg p-5 max-w-2xl w-full mx-4 font-mono text-sm"
        style={{ boxShadow: '0 0 30px rgba(0,255,65,0.15), 0 0 60px rgba(0,255,65,0.05)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="text-term-amber text-center mb-1 text-base font-bold">
          📋 프롬프트 미리보기
        </div>
        <div className="text-gray-400 text-center text-xs mb-3">
          {description}
        </div>
        <div className="text-term-green/30 text-center text-xs mb-3">
          ════════════════════════════════════════
        </div>

        {/* 프롬프트 본문 */}
        <div className="max-h-[50vh] overflow-y-auto border border-gray-700 bg-black/40 rounded p-3 mb-4">
          <pre className="text-term-green/90 text-xs whitespace-pre-wrap leading-relaxed">
            {prompt}
          </pre>
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Esc 닫기</span>
          <button
            onClick={onCopy}
            className={`px-4 py-1.5 border rounded text-xs font-bold transition-colors ${
              copied
                ? 'border-term-green bg-term-green/20 text-term-green'
                : 'border-term-cyan text-term-cyan hover:bg-term-cyan/10'
            }`}
          >
            {copied ? '✓ 복사됨!' : '클립보드에 복사'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 DetailView ────────────────────────────────────────────

export default function DetailView({ item, analysis, onApprove, onComment, onSkip, onBack }) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [promptDesc, setPromptDesc] = useState('');

  // 프롬프트 미리보기 열기
  const handleOpenPromptPreview = useCallback(() => {
    if (!item) return;
    let diff = {};
    try {
      diff = typeof item.data === 'string' ? JSON.parse(item.data) : item.data || {};
    } catch { diff = {}; }
    const type = item.type || 'new_pr';
    setPromptText(generatePrompt(item, diff, analysis || {}));
    setPromptDesc(PROMPT_DESCRIPTIONS[type] || '이 프롬프트를 AI 도구에 붙여넣어 작업을 시작합니다.');
    setCopied(false);
    setShowPromptPreview(true);
  }, [item, analysis]);

  // 클립보드 복사
  const handleCopyFromPreview = useCallback(() => {
    navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [promptText]);

  // [P] 키보드 단축키
  useEffect(() => {
    if (showPromptPreview) return; // 미리보기 열려있으면 무시
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleOpenPromptPreview();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleOpenPromptPreview, showPromptPreview]);

  if (!item) return null;

  let diffData = {};
  try {
    diffData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data || {};
  } catch {
    diffData = {};
  }
  const analysisData = analysis || {};
  const itemType = item.type || 'new_pr';
  const itemCategory = item.category || analysisData.category || 'auto';

  const catStyle = CATEGORY_STYLES[itemCategory] || CATEGORY_STYLES.auto;
  const typeLabel = TYPE_LABELS[itemType] || { icon: '📄', label: itemType };
  const riskStyle = RISK_STYLES[analysisData.riskLevel || analysisData.risk_level] || RISK_STYLES.low;

  // 메타 정보 추출
  const author = diffData.author || diffData.commenter || '';
  const branch = diffData.branch || '';
  const refId = item.ref_id || '';
  const detectedAt = item.detected_at ? new Date(item.detected_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }) : '';

  const handleCommentSubmit = async () => {
    if (comment.trim()) {
      onComment?.(item.id, comment);
      setComment('');
      setShowComment(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 스트립 */}
      <div className={`flex items-center gap-3 px-4 py-2 bg-gray-900/80 border-b-2 ${catStyle.border} text-sm`}>
        <span className={`text-${catStyle.color}`}>{catStyle.icon} {catStyle.label}</span>
        <span className="text-gray-600">│</span>
        <span className="text-gray-300">{typeLabel.icon} {typeLabel.label}</span>
        {refId && (
          <>
            <span className="text-gray-600">│</span>
            <span className="text-term-cyan">{refId}</span>
          </>
        )}
        {author && (
          <>
            <span className="text-gray-600">│</span>
            <span className="text-gray-400">{author}</span>
          </>
        )}
        {branch && (
          <>
            <span className="text-gray-600">│</span>
            <span className="text-gray-500 text-xs truncate max-w-[200px]">{branch}</span>
          </>
        )}
        {detectedAt && (
          <span className="text-gray-500 text-xs ml-auto" title="감지 시각">{detectedAt}</span>
        )}
      </div>

      {/* 좌우 분할 패널 */}
      <div className="grid grid-cols-2 gap-[1px] flex-1 overflow-hidden">
        {/* 왼쪽: 타입별 상세 콘텐츠 */}
        <Panel label={item.title || `${typeLabel.label} ${refId}`}>
          <LeftPanel type={itemType} data={diffData} title={item.title} />
        </Panel>

        {/* 오른쪽: AI 리뷰 + 상세 분석 */}
        <Panel label="🤖 AI 리뷰">
          <div className="space-y-4 text-sm">
            {/* 요약 */}
            <div>
              <span className="text-gray-500">요약:</span>
              <p className="mt-1 text-gray-200">{analysisData.summary || '분석 대기 중...'}</p>
            </div>

            {/* 리스크 + 카테고리 배지 */}
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500">리스크: </span>
                <span className={`${riskStyle.className}`}>
                  {riskStyle.label}
                </span>
              </div>
              <div>
                <span className="text-gray-500">카테고리: </span>
                <span className={
                  itemCategory === 'direct' ? 'status-direct' :
                  itemCategory === 'approve' ? 'status-approve' :
                  'status-auto'
                }>
                  {catStyle.icon} {catStyle.label}
                </span>
              </div>
            </div>

            {/* 제안 */}
            {analysisData.suggestion && (
              <div>
                <span className="text-gray-500">제안:</span>
                <p className="mt-1 text-term-cyan">{analysisData.suggestion}</p>
              </div>
            )}

            {/* 상세 분석 구분선 + 타입별 분석 */}
            {analysisData.detail && (
              <>
                <div className="flex items-center gap-2 text-gray-600 text-xs">
                  <span className="flex-1 border-t border-gray-700" />
                  <span>상세 분석</span>
                  <span className="flex-1 border-t border-gray-700" />
                </div>
                <RenderAnalysisDetail
                  type={itemType}
                  detail={analysisData.detail}
                  category={itemCategory}
                />
              </>
            )}

            {/* 코멘트 입력 */}
            {showComment && (
              <div className="mt-4">
                <textarea
                  className="w-full bg-transparent border border-term-green text-term-green outline-none p-2 text-xs glow-text resize-none"
                  rows={3}
                  placeholder="코멘트를 입력하세요... (Enter 전송, Esc 취소)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCommentSubmit();
                    }
                    if (e.key === 'Escape') {
                      setShowComment(false);
                      setComment('');
                    }
                  }}
                  autoFocus
                />
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* 하단 커맨드 바 */}
      <CommandBar
        location={`상세 > ${refId}`}
        shift="day"
        actions={[
          { key: 'A', label: '승인', onClick: () => onApprove?.(item.id) },
          { key: 'C', label: '코멘트', onClick: () => setShowComment(!showComment) },
          { key: 'S', label: '건너뛰기', onClick: () => onSkip?.(item.id) },
          { key: 'P', label: '프롬프트', onClick: handleOpenPromptPreview },
          { key: 'Esc', label: '돌아가기', onClick: onBack },
        ]}
      />

      {/* 프롬프트 미리보기 모달 */}
      {showPromptPreview && (
        <PromptPreview
          prompt={promptText}
          description={promptDesc}
          copied={copied}
          onClose={() => setShowPromptPreview(false)}
          onCopy={handleCopyFromPreview}
        />
      )}
    </div>
  );
}
