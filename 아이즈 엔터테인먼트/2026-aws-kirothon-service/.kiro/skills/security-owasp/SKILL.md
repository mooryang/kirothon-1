---
name: OWASP Top 10 보안 패턴
description: OWASP Top 10 기준 보안 취약점 탐지 패턴 및 수정 가이드
---

## OWASP Top 10 탐지 패턴

### A01: Broken Access Control
- 패턴: 인증 미들웨어 없이 API 라우트 노출
- 탐지: app.get('/api/admin' 에 auth 미들웨어 없음
- 수정: 모든 보호 라우트에 인증/인가 미들웨어 적용

### A03: Injection
- SQL Injection: 문자열 연결로 쿼리 생성
  - 탐지: db.prepare(`SELECT * FROM users WHERE id = ${id}`)
  - 수정: db.prepare('SELECT * FROM users WHERE id = ?').get(id)
- Command Injection: 사용자 입력을 셸 명령에 직접 삽입
  - 탐지: exec(`git log ${userInput}`)
  - 수정: execa('git', ['log', userInput]) (인자 분리)

### A07: Identification and Authentication Failures
- 패턴: 하드코딩된 시크릿
  - 탐지 정규식: (api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}
  - 수정: 환경변수로 이동, .env + .gitignore

### A09: Security Logging and Monitoring Failures
- 패턴: 빈 catch 블록
  - 탐지: catch (e) {} 또는 catch (e) { /* ignore */ }
  - 수정: 최소 logger.error(e) 추가

## 시크릿 탐지 정규식

- /(api[_-]?key|secret|token|password|credential)\s*[:=]\s*['"][A-Za-z0-9+/=_-]{16,}/gi
- /ghp_[A-Za-z0-9]{36}/g (GitHub PAT)
- /sk-[A-Za-z0-9]{48}/g (OpenAI key)
- /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g

## 사용 에이전트
security-scanner가 PR 보안 스캔 시 이 스킬을 참조하여 OWASP 패턴 매칭 정확도 향상.
