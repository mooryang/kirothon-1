---
description: 퇴근 화면 (Evening Handoff) 기능 요구사항
---

## 요구사항 (EARS 표기법)

WHEN 사용자가 EveningHandoff 화면에 진입하면
THE SYSTEM SHALL night-summarizer를 호출하여 오늘 업무 요약을 생성하고 표시한다

WHEN 내일 예정 항목이 표시되면
THE SYSTEM SHALL 체크리스트로 렌더링하고, 사용자가 각 항목을 토글할 수 있게 한다

WHEN 사용자가 "밤새 특별히 봐줄 것" 입력란에 텍스트를 입력하면
THE SYSTEM SHALL 입력값을 sessions 테이블의 instruction 컬럼에 저장한다

WHEN 사용자가 [퇴근합니다] 버튼을 누르면
THE SYSTEM SHALL baseline 스냅샷을 저장하고
THE SYSTEM SHALL night-ops Power를 활성화하고
THE SYSTEM SHALL 30분 간격 cron을 시작한다

WHEN 퇴근 처리가 완료되면
THE SYSTEM SHALL 전산과 선배 퇴근 대사를 typing-effect 애니메이션으로 표시한다

WHEN 야간 엔진이 시작되면
THE SYSTEM SHALL 야간 전환 브릿지 애니메이션을 표시하고 모니터링 상태로 전환한다

## 수용 기준

- 오늘 업무 요약은 Kiro night-summarizer가 generateDailySummary로 생성
- 내일 예정은 GitHub 마일스톤 + 캘린더 연동 데이터 기반
- 특별 지시사항은 sessions 테이블의 instruction 컬럼에 저장
- [퇴근합니다] 클릭 시:
  1. /api/clock-out 호출 (instruction 포함)
  2. scanner.js baseline 수집 시작
  3. scheduler.js cron 등록
  4. UI가 "야간 전환 브릿지" 화면으로 전환
- 특별 지시사항이 있으면 해당 Kiro subagent에 instruction으로 전달
