---
inclusion: always
---

# Power 전용 코드 리뷰 기준

night-ops Power가 활성화된 상태에서 GitHub 도구를 사용할 때 적용되는 추가 규칙.

## 자동 처리 안전장치

- 🟢 auto만 자동 실행 (🟡🔴은 절대 자동 실행 안 함)
- main 브랜치 직접 머지 절대 금지
- dependabot PR: CI 전체 통과 확인 후에만 머지
- 이슈 클로즈: 중복 확인된 것만

## 도구 사용 규칙

- `github_merge_pull_request`: category가 "auto"이고 dependabot PR이며 테스트 통과일 때만 호출
- `github_update_issue` (close): category가 "auto"이고 중복 확인된 이슈만
- `github_create_review`: category가 "approve"일 때 AI 리뷰 코멘트 작성
- `github_create_comment`: 분석 결과 요약을 PR/이슈에 코멘트로 게시

## 금지 사항

- category가 "direct"인 항목에 대한 자동 액션 금지
- 리뷰 없이 머지 금지
- 라벨 임의 변경 금지 (분석 결과 기반만 허용)
