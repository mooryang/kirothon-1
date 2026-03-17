// 업무 정리 + 내일 준비 생성

export async function generateDailySummary(commits, prs, issues) {
  const commitsCount = commits?.length || 0;
  const prsReviewed = prs?.filter(p => p.state === 'closed' || p.merged)?.length || 0;
  const issuesClosed = issues?.filter(i => i.state === 'closed')?.length || 0;

  const summary = [];
  if (commitsCount > 0) summary.push(`커밋 ${commitsCount}건`);
  if (prsReviewed > 0) summary.push(`PR ${prsReviewed}건 리뷰`);
  if (issuesClosed > 0) summary.push(`Issue ${issuesClosed}건 클로즈`);

  return {
    commits_count: commitsCount,
    prs_reviewed: prsReviewed,
    issues_closed: issuesClosed,
    summary: summary.join(', ') || '활동 없음',
  };
}

export async function generateTomorrowPrep(calendar, sprint, pending) {
  const items = [];

  // 캘린더 일정
  if (calendar && Array.isArray(calendar)) {
    for (const event of calendar) {
      items.push({
        id: items.length + 1,
        text: `${event.time || ''} ${event.title}`,
        checked: true,
      });
    }
  }

  // 대기 중인 PR 리뷰
  if (pending?.prs) {
    for (const pr of pending.prs) {
      items.push({
        id: items.length + 1,
        text: `PR #${pr.number} 리뷰 (${pr.author || '대기 중'})`,
        checked: false,
      });
    }
  }

  // 블로커 이슈
  if (pending?.blockers) {
    for (const issue of pending.blockers) {
      items.push({
        id: items.length + 1,
        text: `Issue #${issue.number} — ${issue.title} (블로커)`,
        checked: false,
      });
    }
  }

  // 스프린트 정보
  if (sprint) {
    items.push({
      id: items.length + 1,
      text: `스프린트 진행률: ${sprint.completed || 0}/${sprint.total || 0}`,
      checked: true,
    });
  }

  return items;
}
