---
inclusion: always
---

# 에이전트 출력 형식 (Output Schema)

> 마크다운 래핑, 설명 텍스트, 코드블록 감싸기 금지.
> 모든 에이전트 출력은 아래 JSON 스키마를 따른다.

## 공통 스키마

```json
{
  "agent": "에이전트명",
  "category": "auto | approve | direct",
  "summary": "한 줄 요약",
  "detail": { },
  "risk_level": "low | medium | high",
  "suggestion": "제안 사항",
  "senpai_comment": "전설의 선배 톤 코멘트"
}
```

## 필드 정의

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `agent` | string | Y | 에이전트 식별자 (`pr-reviewer`, `ci-analyzer`, `agenda-planner`) |
| `category` | enum | Y | `auto`: 자동 처리 완료, `approve`: 사용자 승인 필요, `direct`: 즉시 조치 필요 |
| `summary` | string | Y | 결과 한 줄 요약 (50자 이내) |
| `detail` | object | Y | 에이전트별 상세 데이터 (아래 참조) |
| `risk_level` | enum | Y | `low`: 정보성, `medium`: 주의 필요, `high`: 즉시 대응 |
| `suggestion` | string | N | 구체적 행동 제안 |
| `senpai_comment` | string | Y | 전설의 선배 페르소나 코멘트 (투덜거림 톤) |

## 에이전트별 detail 스키마

### pr-reviewer

```json
{
  "pr_number": 42,
  "title": "PR 제목",
  "author": "username",
  "files_changed": 5,
  "issues": [
    {
      "severity": "critical | warning | info",
      "file": "src/foo.js",
      "line": 23,
      "rule": "security/injection",
      "message": "설명"
    }
  ],
  "approved": false
}
```

### ci-analyzer

```json
{
  "workflow": "워크플로우명",
  "run_id": 12345,
  "status": "success | failure | cancelled",
  "failed_jobs": [
    {
      "name": "job명",
      "step": "실패 스텝",
      "error_summary": "에러 요약",
      "log_snippet": "관련 로그 (최대 500자)"
    }
  ],
  "duration_seconds": 180
}
```

### agenda-planner

```json
{
  "date": "2026-03-18",
  "priority_items": [
    {
      "type": "pr | issue | ci-fix | review",
      "ref": "#42",
      "title": "항목 제목",
      "priority": "high | medium | low",
      "reason": "우선순위 이유"
    }
  ],
  "estimated_hours": 4.5
}
```

## category 판정 기준

| category | 조건 |
|----------|------|
| `direct` | `risk_level: high` 또는 CI 실패 + 메인 브랜치 |
| `approve` | PR 리뷰에서 critical issue 발견, 머지 차단 권고 |
| `auto` | 정보성 리포트, 일정 정리, low risk 항목 |
