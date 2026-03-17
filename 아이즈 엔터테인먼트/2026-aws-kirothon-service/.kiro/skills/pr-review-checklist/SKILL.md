---
name: PR 리뷰 체크리스트
description: PR 코드 리뷰 시 체계적으로 점검할 항목과 severity 판정 기준
---

## 리뷰 체크리스트 (우선순위 순)

### 1. 보안 (severity: critical)
- [ ] SQL/Command Injection 가능성
- [ ] XSS 필터링 여부 (사용자 입력 → HTML 출력)
- [ ] CSRF 토큰 검증
- [ ] 인증/인가 미들웨어 적용 여부
- [ ] 하드코딩된 시크릿/토큰
- [ ] 에러 메시지에 민감 정보 노출

### 2. 에러 핸들링 (severity: warning~critical)
- [ ] try-catch 누락 (async 함수 특히 주의)
- [ ] 빈 catch 블록 (최소 로깅 필수)
- [ ] 에러 삼킴 (catch 후 무시)
- [ ] unhandled promise rejection
- [ ] 에러 전파 체인 끊김

### 3. 성능 (severity: warning)
- [ ] N+1 쿼리 패턴 (루프 안 DB 호출)
- [ ] 불필요한 중첩 루프
- [ ] 메모리 누수 (이벤트 리스너 미해제)
- [ ] 대용량 데이터 일괄 로딩 (페이지네이션 필요)

### 4. 테스트 (severity: info~warning)
- [ ] 변경된 로직에 테스트 존재
- [ ] 엣지 케이스 커버리지
- [ ] 모킹 과도 여부

### 5. 컨벤션 (severity: info)
- [ ] 네이밍 규칙 준수 (camelCase, PascalCase, kebab-case)
- [ ] import 순서 (외부 → 내부 → 상대)
- [ ] 파일 구조 준수

## severity 판정 기준

| severity | 기준 | 예시 |
|----------|------|------|
| critical | 보안 취약점, 데이터 손실 가능 | SQL injection, 인증 우회 |
| warning | 잠재적 버그, 성능 이슈 | 빈 catch, N+1 쿼리 |
| info | 개선 권고, 스타일 | 네이밍, import 순서 |

## approved 판정

- critical 1개 이상 → approved: false
- warning만 → approved: true (코멘트 첨부)
- info만 → approved: true

## 사용 에이전트
pr-reviewer가 코드 리뷰 시 이 스킬을 참조하여 체계적 리뷰 수행.
