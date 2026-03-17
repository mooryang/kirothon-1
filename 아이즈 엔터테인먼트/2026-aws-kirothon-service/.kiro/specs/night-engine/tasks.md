---
description: 야간 엔진 구현 태스크 목록
---

## 구현 태스크

- [ ] TASK-1: scanner.js — GitHub 데이터 수집 (collectBaseline, collectCurrent, getDiff)
- [ ] TASK-2: differ.js — baseline 대비 diff 추출
- [ ] TASK-3: analyzer.js — Kiro CLI subagent 호출 (runKiroSubagent, analyzeAllDiffs)
- [ ] TASK-4: executor.js — 🟢 auto 항목 자동 처리 (mergePR, closeIssue, addComment, addLabel)
- [ ] TASK-5: scheduler.js — node-cron 야간 스캔 관리
- [ ] TASK-6: summarizer.js — 출근 시 night-summarizer 호출 → 브리핑 생성
- [ ] TASK-7: API 라우트 연결 (clock-out, clock-in, status, action, scan)
- [ ] TASK-8: post-analysis Hook 연동 (분석 완료 → 자동 분류 → DB 저장)
