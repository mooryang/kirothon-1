// GitHub 데이터 수집 (pull)
import { Octokit } from '@octokit/rest';

function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token || token === 'ghp_xxxxxxxxxxxx') {
    return null;
  }
  return new Octokit({ auth: token });
}

function parseRepo() {
  const repo = process.env.GITHUB_REPO || 'owner/repo-name';
  const [owner, name] = repo.split('/');
  return { owner, repo: name };
}

export async function collectBaseline(repoStr) {
  const octokit = getOctokit();
  if (!octokit) {
    throw new Error('GITHUB_TOKEN이 설정되지 않았습니다');
  }

  const { owner, repo } = repoStr ? { owner: repoStr.split('/')[0], repo: repoStr.split('/')[1] } : parseRepo();

  const [prs, issues, runs, commits] = await Promise.all([
    octokit.pulls.list({ owner, repo, state: 'open', per_page: 20 }),
    octokit.issues.list({ owner, repo, state: 'open', per_page: 30, filter: 'all' }),
    octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 10 }).catch(() => ({ data: { workflow_runs: [] } })),
    octokit.repos.listCommits({ owner, repo, per_page: 20 }).catch(() => ({ data: [] })),
  ]);

  return {
    prs: prs.data.map(pr => ({
      number: pr.number,
      title: pr.title,
      author: pr.user?.login,
      state: pr.state,
      draft: pr.draft,
      labels: pr.labels?.map(l => l.name) || [],
      created_at: pr.created_at,
      updated_at: pr.updated_at,
    })),
    issues: issues.data
      .filter(i => !i.pull_request)
      .map(issue => ({
        number: issue.number,
        title: issue.title,
        author: issue.user?.login,
        state: issue.state,
        labels: issue.labels?.map(l => l.name) || [],
        created_at: issue.created_at,
      })),
    ci: runs.data.workflow_runs.map(run => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      head_branch: run.head_branch,
      created_at: run.created_at,
    })),
    commits: commits.data.map(c => ({
      sha: c.sha?.substring(0, 7),
      message: c.commit?.message?.split('\n')[0],
      author: c.commit?.author?.name,
      date: c.commit?.author?.date,
    })),
  };
}

export async function collectCurrent(repoStr) {
  return collectBaseline(repoStr);
}

export async function getPRDetail(prNumber) {
  const octokit = getOctokit();
  if (!octokit) return null;

  const { owner, repo } = parseRepo();

  const [pr, files] = await Promise.all([
    octokit.pulls.get({ owner, repo, pull_number: prNumber }),
    octokit.pulls.listFiles({ owner, repo, pull_number: prNumber }),
  ]);

  return {
    number: pr.data.number,
    title: pr.data.title,
    author: pr.data.user?.login,
    body: pr.data.body,
    additions: pr.data.additions,
    deletions: pr.data.deletions,
    files: files.data.map(f => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    })),
  };
}

export function getDiff(baseline, current) {
  const { extractDiff } = require('./differ');
  return extractDiff(baseline, current);
}
