---
description: 야간 엔진 시스템 설계
---

## 시퀀스

1. clock-out API 호출
2. scanner.js → GitHub API로 baseline 수집 → snapshots 저장
3. scheduler.js → 30분 간격 cron 등록
4. 매 스캔 사이클:
   a. scanner.js → 현재 상태 수집
   b. differ.js → baseline 대비 diff 추출
   c. analyzer.js → diff를 유형별로 분류 → subagent 병렬 호출
   d. 결과를 analyses 테이블에 저장
   e. Hook(post-analysis) → auto 항목 자동 처리
5. clock-in API 호출
6. night-summarizer subagent → 전체 야간 활동 브리핑 생성

## Subagent 디스패치

- new_pr → pr-reviewer + security-scanner (병렬)
- ci_fail → ci-analyzer
- new_issue / comment → issue-triager
- 전체 병렬 실행 (Promise.allSettled), 하나 실패해도 나머지 계속

## 에러 핸들링

- subagent 타임아웃(120초) → 해당 항목 skip, 로그 기록
- GitHub API rate limit → 스캔 간격 자동 확장
- Kiro CLI 호출 실패 → 3회 재시도 후 에러 기록
