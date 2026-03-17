---
name: night-ops
description: 야간 GitHub 모니터링 및 자동화 도구
activation_keywords:
  - PR, pull request, 코드 리뷰
  - CI, 빌드 실패, 테스트
  - issue, 이슈, 버그
  - merge, 머지, 자동 처리
---

## 제공 도구

이 Power가 활성화되면 GitHub MCP 서버의 8개 도구가 컨텍스트에 로드됩니다:

1. `github_get_pull_request` — PR 상세 + diff 조회
2. `github_merge_pull_request` — PR 머지 실행
3. `github_create_review` — PR 리뷰 코멘트 작성
4. `github_list_issues` — 이슈 목록 조회
5. `github_update_issue` — 이슈 상태 변경 (클로즈, 라벨)
6. `github_create_comment` — PR/이슈에 코멘트 추가
7. `github_get_workflow_run` — CI/CD 실행 결과 조회
8. `github_add_labels` — 라벨 추가

## 컨텍스트 효율

- pr-reviewer 에이전트 → PR 키워드로 Power 활성화 → GitHub 도구 8개 로드
- night-summarizer → PR/CI 키워드 없으면 Power 비활성화 → 불필요한 도구 로드 없음
- 에이전트별로 필요한 순간에만 도구가 컨텍스트에 올라옴
