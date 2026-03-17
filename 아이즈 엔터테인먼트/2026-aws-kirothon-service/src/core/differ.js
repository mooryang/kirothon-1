// baseline 대비 diff 추출

export function extractDiff(baseline, current) {
  const diffs = [];

  // 새 PR 감지
  const baselinePRs = new Set((baseline.prs || []).map(p => p.number));
  for (const pr of (current.prs || [])) {
    if (!baselinePRs.has(pr.number)) {
      diffs.push({
        type: 'new_pr',
        ref_id: `#${pr.number}`,
        title: `PR #${pr.number} — ${pr.title} (${pr.author})`,
        data: {
          number: pr.number,
          title: pr.title,
          author: pr.author,
          labels: pr.labels,
          dependabot: pr.author === 'dependabot[bot]' || pr.author === 'dependabot',
        },
      });
    }
  }

  // 새 이슈 감지
  const baselineIssues = new Set((baseline.issues || []).map(i => i.number));
  for (const issue of (current.issues || [])) {
    if (!baselineIssues.has(issue.number)) {
      diffs.push({
        type: 'new_issue',
        ref_id: `#${issue.number}`,
        title: `Issue #${issue.number} — ${issue.title}`,
        data: {
          number: issue.number,
          title: issue.title,
          author: issue.author,
          labels: issue.labels,
        },
      });
    }
  }

  // CI 변화 감지
  const baselineFails = new Set(
    (baseline.ci || []).filter(c => c.conclusion === 'failure').map(c => c.id)
  );
  for (const run of (current.ci || [])) {
    if (run.conclusion === 'failure' && !baselineFails.has(run.id)) {
      diffs.push({
        type: 'ci_fail',
        ref_id: run.head_branch,
        title: `CI 실패 — ${run.name} (${run.head_branch})`,
        data: {
          run_id: run.id,
          name: run.name,
          branch: run.head_branch,
          status: run.status,
          conclusion: run.conclusion,
        },
      });
    }
  }

  // 새 커밋 감지
  const baselineCommits = new Set((baseline.commits || []).map(c => c.sha));
  for (const commit of (current.commits || [])) {
    if (!baselineCommits.has(commit.sha)) {
      diffs.push({
        type: 'commit',
        ref_id: commit.sha,
        title: `커밋 ${commit.sha} — ${commit.message}`,
        data: {
          sha: commit.sha,
          message: commit.message,
          author: commit.author,
          date: commit.date,
        },
      });
    }
  }

  return diffs;
}
