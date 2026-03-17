```json
{
  "name": "레포 컨텍스트 자동 주입",
  "version": "1.0.0",
  "description": "프롬프트 제출 시 현재 레포 컨텍스트(GITHUB_REPO, 세션 ID, 마지막 스캔 시각)를 자동 주입하여 매번 수동으로 넘기지 않아도 되게 한다.",
  "when": {
    "type": "promptSubmit"
  },
  "then": {
    "type": "askAgent",
    "prompt": "분석 전 현재 컨텍스트를 확인해. 대상 레포: GITHUB_REPO 환경변수, 현재 시각, 활성 세션 ID, 마지막 스캔 시각을 파악하고 이후 분석에 반영해."
  }
}
```