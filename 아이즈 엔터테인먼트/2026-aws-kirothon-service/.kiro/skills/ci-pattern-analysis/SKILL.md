---
name: CI 실패 패턴 분석
description: CI/CD 실패 유형별 패턴 매칭 + 수정 제안 전문 지식
---

## CI 실패 패턴 DB

### 테스트 타임아웃
- 패턴: `Timeout - Async callback was not invoked within the 5000ms`
- 원인: 비동기 테스트 대기시간 초과
- 수정: jest.config.js `testTimeout` 값 상향 또는 해당 테스트에 개별 타임아웃 설정
- 관련 PR 매핑: 타임아웃 발생 파일과 동일 파일을 수정한 최근 PR

### 빌드 실패 — 타입 에러
- 패턴: `TS2345: Argument of type '...' is not assignable`
- 원인: 타입 불일치 (인터페이스 변경 후 호출부 미수정)
- 수정: 타입 정의 파일과 호출부 양쪽 확인

### 의존성 충돌
- 패턴: `peer dep missing` | `ERESOLVE unable to resolve dependency tree`
- 원인: 패키지 버전 호환성
- 수정: --legacy-peer-deps 또는 버전 고정

### OOM (Out of Memory)
- 패턴: `JavaScript heap out of memory`
- 원인: 빌드 시 메모리 부족
- 수정: NODE_OPTIONS=--max-old-space-size=4096

## 사용 에이전트
ci-analyzer가 CI 실패 분석 시 이 스킬을 참조하여 패턴 매칭 정확도 향상.
