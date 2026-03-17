---
name: 이슈 분류 패턴
description: GitHub 이슈 자동 분류를 위한 키워드 패턴 및 중복 감지 기준
---

## 분류 키워드 패턴

### bug (버그)
- 키워드: error, crash, fail, broken, not working, doesn't work, exception, 500, 404
- 패턴: 에러 로그/스택 트레이스 포함
- 문장 패턴: "~하면 에러가 발생", "~가 동작하지 않음", "~시 크래시"

### feature (기능 요청)
- 키워드: add, implement, support, enable, new, enhance, improve, request
- 문장 패턴: "~기능 추가", "~를 지원해주세요", "~하면 좋겠다"

### question (질문)
- 키워드: how to, how do I, is it possible, can I, what is, why does
- 문장 패턴: "~하는 방법", "~가 가능한가요", "~는 왜 이런가요"

### docs (문서)
- 키워드: typo, documentation, readme, docs, example, tutorial, guide
- 문장 패턴: "문서에 ~가 빠져있음", "README 업데이트 필요"

## 중복 감지 기준

### similarity_score 계산
- 제목 유사도: Jaccard similarity (단어 집합 비교) x 0.4
- 본문 키워드 매칭: TF-IDF 기반 코사인 유사도 x 0.4
- 관련 파일/컴포넌트 겹침: 파일 경로 매칭 x 0.2

### 판정 기준
- >= 0.8: 중복 (auto close)
- 0.6 ~ 0.8: 유사 (코멘트로 관련 이슈 링크, 사람 판단)
- < 0.6: 신규

## 우선순위 판정

| priority | 조건 |
|----------|------|
| high | 프로덕션 영향, 데이터 손실, 보안 관련, 다수 사용자 영향 |
| medium | 기능 장애, 성능 저하, UX 문제, 워크어라운드 존재 |
| low | 개선 사항, 문서 업데이트, 스타일 이슈, 단일 사용자 |

## 사용 에이전트
issue-triager가 이슈 분류 시 이 스킬을 참조하여 분류 정확도 향상.
