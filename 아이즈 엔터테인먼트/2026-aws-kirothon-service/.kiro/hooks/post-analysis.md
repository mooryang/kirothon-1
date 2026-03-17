```json
{
  "name": "분석 후 자동 분류 처리",
  "version": "1.0.0",
  "description": "에이전트 분석 완료 후 category 필드를 확인하여 auto는 자동 처리, approve/direct는 DB 저장만 수행한다.",
  "when": {
    "type": "agentStop"
  },
  "then": {
    "type": "askAgent",
    "prompt": "방금 완료된 분석 결과 JSON의 category 필드를 확인해. auto인 경우: dependabot PR은 CI 전체 통과 확인 후 머지, 중복 이슈는 클로즈. approve/direct인 경우: DB에 저장만 하고 처리하지 마. 모든 결과를 analyses 테이블에 INSERT하고 actions 테이블에 처리 기록을 남겨."
  }
}
```