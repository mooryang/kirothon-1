---
inclusion: fileMatch
fileMatchPattern: "**/*.{js,ts,jsx,tsx}"
---

# 코드 리뷰 기준 (우선순위 순)

## 1. 보안 (Critical)

- OWASP Top 10 기준 점검
- Injection (SQL, NoSQL, Command, LDAP)
- XSS (Reflected, Stored, DOM-based)
- CSRF 토큰 검증
- 인증/인가 우회 가능성
- 하드코딩된 시크릿, 토큰, 비밀번호

## 2. 에러 핸들링 (High)

- try-catch 누락 여부
- 빈 catch 블록 금지 (최소 로깅 필수)
- 에러 삼킴 금지 (catch 후 무시하는 패턴)
- async/await에서 unhandled rejection 방지
- 에러 메시지에 민감 정보 노출 금지

## 3. 성능 (Medium)

- N+1 쿼리 패턴
- 불필요한 루프 (중첩 루프, 반복 DB 호출)
- 메모리 누수 (이벤트 리스너 미해제, 클로저 참조)
- 대용량 데이터 처리 시 스트리밍/페이지네이션 사용 여부

## 4. 테스트 (Medium)

- 변경된 로직에 대한 테스트 존재 여부
- 엣지 케이스 커버리지
- 모킹이 과도하지 않은지 (실제 동작 검증 가능한지)

## 5. 컨벤션 (Low)

- 네이밍: camelCase(변수/함수), PascalCase(컴포넌트), UPPER_SNAKE_CASE(상수), kebab-case(파일)
- 파일 구조: tech.md 프로젝트 구조 준수
- import 순서: 외부 패키지 → 내부 모듈 → 상대 경로
