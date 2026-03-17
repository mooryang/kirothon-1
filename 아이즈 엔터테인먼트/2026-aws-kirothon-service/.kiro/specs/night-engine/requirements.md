---
description: 야간근무 엔진의 기능 요구사항
---

## 요구사항

REQ-1: 퇴근 트리거 시 GitHub 레포의 baseline 스냅샷을 수집한다
REQ-2: 30분 간격으로 baseline 대비 변화를 감지한다
REQ-3: 변화 감지 시 유형별 전담 subagent를 병렬 호출하여 분석한다
REQ-4: 분석 결과를 3단계(auto/approve/direct)로 자동 분류한다
REQ-5: auto 항목은 GitHub Power를 통해 자동 처리한다
REQ-6: 모든 분석/처리 결과를 SQLite에 기록한다
REQ-7: 출근 트리거 시 night-summarizer가 브리핑을 생성한다

## 수용 기준

- auto 처리는 dependabot PR(테스트 통과) + 중복 이슈만 허용
- main 브랜치 직접 머지 절대 금지
- 모든 에이전트 출력은 JSON 포맷 (steering/output-format.md 준수)
