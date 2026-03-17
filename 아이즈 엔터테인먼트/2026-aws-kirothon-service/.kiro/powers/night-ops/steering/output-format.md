---
inclusion: always
---

# Power 전용 출력 포맷

night-ops Power를 통해 GitHub 도구를 사용한 결과는 아래 형식으로 기록.

## 액션 결과 스키마
{
  "action_type": "merge | close | comment | label | review",
  "target": "PR #번호 또는 Issue #번호",
  "status": "completed | failed",
  "result": "결과 메시지",
  "tool_used": "사용한 GitHub MCP 도구명",
  "timestamp": "ISO 8601"
}
