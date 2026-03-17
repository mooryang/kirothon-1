```json
{
  "name": "분석 결과 자동 저장",
  "version": "1.0.0",
  "description": "에이전트 실행 종료 시 분석 결과 JSON을 analyses 테이블에 저장하고 세션 통계를 갱신한다.",
  "when": {
    "type": "agentStop"
  },
  "then": {
    "type": "runCommand",
    "command": "node src/store/save-analysis.js"
  }
}
```