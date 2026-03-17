// 자동 처리 실행 (머지, 클로즈 등)
import { Octokit } from '@octokit/rest';

function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token || token === 'ghp_xxxxxxxxxxxx') return null;
  return new Octokit({ auth: token });
}

function parseRepo() {
  const repo = process.env.GITHUB_REPO || 'owner/repo-name';
  const [owner, name] = repo.split('/');
  return { owner, repo: name };
}

export async function mergePR(prNumber) {
  const octokit = getOctokit();
  if (!octokit) {
    return { success: false, message: 'GitHub 토큰 미설정' };
  }

  const { owner, repo } = parseRepo();

  try {
    // PR 상태 확인
    const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });

    // main 브랜치 직접 머지 금지
    if (pr.base.ref === 'main' || pr.base.ref === 'master') {
      // dependabot만 예외 허용
      if (pr.user?.login !== 'dependabot[bot]') {
        return { success: false, message: 'main 브랜치 직접 머지 금지 (dependabot 제외)' };
      }
    }

    // 머지 실행
    await octokit.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      merge_method: 'squash',
    });

    return { success: true, message: `PR #${prNumber} 머지 완료` };
  } catch (error) {
    return { success: false, message: `머지 실패: ${error.message}` };
  }
}

export async function closeIssue(issueNumber, reason) {
  const octokit = getOctokit();
  if (!octokit) return { success: false, message: 'GitHub 토큰 미설정' };

  const { owner, repo } = parseRepo();

  try {
    await octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      state: 'closed',
      state_reason: reason || 'completed',
    });
    return { success: true, message: `Issue #${issueNumber} 클로즈` };
  } catch (error) {
    return { success: false, message: `클로즈 실패: ${error.message}` };
  }
}

export async function addComment(target, comment) {
  const octokit = getOctokit();
  if (!octokit) return { success: false, message: 'GitHub 토큰 미설정' };

  const { owner, repo } = parseRepo();
  const issueNumber = typeof target === 'object' ? target.number : parseInt(target);

  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: comment,
    });
    return { success: true, message: `코멘트 추가 완료 (#${issueNumber})` };
  } catch (error) {
    return { success: false, message: `코멘트 실패: ${error.message}` };
  }
}

export async function addLabel(target, labels) {
  const octokit = getOctokit();
  if (!octokit) return { success: false, message: 'GitHub 토큰 미설정' };

  const { owner, repo } = parseRepo();
  const issueNumber = typeof target === 'object' ? target.number : parseInt(target);

  try {
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels: Array.isArray(labels) ? labels : [labels],
    });
    return { success: true, message: `라벨 추가 완료 (#${issueNumber})` };
  } catch (error) {
    return { success: false, message: `라벨 추가 실패: ${error.message}` };
  }
}
