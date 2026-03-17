---
inclusion: always
---

# SDD: 전설의 선배 (CS-Senpai)

## 1. 제품 개요

퇴근 버튼을 누르면 Kiro의 근무가 시작된다.
밤새 GitHub을 모니터링하고, Kiro CLI 커스텀 에이전트가 PR을 리뷰하고, CI를 분석하고, 내일 일정을 준비해서,
아침에 출근하면 레트로 터미널 스타일 웹 대시보드로 브리핑한다.

### 핵심 컨셉

- 야간근무 교대 모델: 사용자 = 주간, Kiro = 야간
- Pull 모델: 로컬에서 주기적으로 GitHub API 호출
- Kiro CLI 기반 분석: `kiro-cli chat --no-interactive --trust-all-tools --agent <name>` 자율 실행
- 웹 터미널 UI: Next.js + Tailwind CSS + CRT 효과 (하이텔/BBS 감성)
- 페르소나: "전설의 선배" — 투덜대면서도 빈틈없이 일하는 선배 개발자

### 왜 웹 터미널인가?

- blessed-contrib 유지보수 중단 + 한글/이모지 렌더링 불안정
- 진짜 CLI(iTerm)는 프로젝터 가독성 + 폰트 크기 조절 어려움
- 웹은 해커톤 시연에 안정적 (브라우저만 있으면 됨)
- CSS CRT 효과로 터미널 감성 100% — 차별화 유지
- 반응형 레이아웃으로 프로젝터 대응 용이

## 2. 도메인 모델

### 핵심 엔티티

| 엔티티 | 설명 |
|--------|------|
| NightShift | 하나의 야간 근무 세션 (퇴근~출근) |
| ShiftReport | 야간 근무 결과 브리핑 데이터 |
| PRReview | GitHub PR 리뷰 결과 |
| CIAnalysis | CI/CD 파이프라인 분석 결과 |
| AgendaItem | 내일 일정/할일 항목 |
| DashboardState | 웹 대시보드 렌더링 상태 |

### 도메인 흐름

```
[퇴근 버튼] → NightShift 시작
    ├── GitHub Polling (Pull 모델)
    │   ├── PR 목록 수집
    │   ├── CI 상태 수집
    │   └── Issue/Comment 수집
    ├── Kiro CLI Agent 실행
    │   ├── PR 리뷰 에이전트
    │   ├── CI 분석 에이전트
    │   └── 일정 준비 에이전트
    ├── ShiftReport 생성
    └── 결과 저장 (로컬 JSON/SQLite)

[출근] → 웹 대시보드 브리핑
    ├── CRT 터미널 UI 렌더링
    ├── ShiftReport 표시
    └── 인터랙티브 탐색
```

## 3. 시스템 아키텍처

### 컴포넌트 구성

```
cs-senpai/
├── scheduler/          # 야간 스케줄러 (cron/node-schedule)
│   ├── shift-manager   # NightShift 라이프사이클 관리
│   └── github-poller   # GitHub API 폴링
├── agents/             # Kiro CLI 커스텀 에이전트 정의
│   ├── pr-reviewer     # PR 리뷰 에이전트
│   ├── ci-analyzer     # CI 분석 에이전트
│   └── agenda-planner  # 일정 준비 에이전트
├── store/              # 데이터 저장소
│   └── shift-store     # ShiftReport 영속화
├── web/                # Next.js 웹 대시보드
│   ├── terminal-ui     # CRT 터미널 컴포넌트
│   ├── dashboard       # 브리핑 대시보드
│   └── api             # 데이터 API 라우트
└── shared/             # 공유 타입/유틸
    ├── types           # 도메인 타입 정의
    └── config          # 설정 관리
```

### 기술 스택

> 상세 기술 스택은 `tech.md` 참조

## 4. 핵심 기능 요구사항

### F1: 야간 근무 스케줄러

- 퇴근 버튼 클릭 시 NightShift 세션 시작
- 설정 가능한 폴링 주기 (기본 30분)
- GitHub API rate limit 고려한 스마트 폴링
- 근무 종료 조건: 출근 버튼 또는 시간 기반 자동 종료

### F2: GitHub 모니터링 (Pull 모델)

- 대상 레포지토리 목록 설정
- PR 목록 및 변경사항 수집
- CI/CD 파이프라인 상태 수집
- 새 이슈/코멘트 감지

### F3: Kiro CLI 에이전트 실행

- PR 리뷰: 코드 품질, 보안, 성능 관점 리뷰
- CI 분석: 실패 원인 분석 및 해결 제안
- 일정 준비: PR/이슈 기반 내일 우선순위 정리
- 에이전트 실행 결과를 구조화된 JSON으로 수집

### F4: 웹 터미널 대시보드

- CRT 모니터 효과 (스캔라인, 글로우, 깜빡임)
- 하이텔/BBS 스타일 메뉴 네비게이션
- 전설의 선배 페르소나 브리핑 텍스트
- 섹션별 드릴다운 (PR 상세, CI 로그 등)
- 반응형 레이아웃 (프로젝터 대응)

### F5: 브리핑 리포트

- 야간 근무 요약 (처리 건수, 주요 발견)
- PR 리뷰 결과 목록
- CI 상태 및 실패 분석
- 내일 추천 일정
- 전설의 선배 스타일 코멘트 (투덜거림 포함)

## 5. 페르소나 가이드라인

"전설의 선배(CS-Senpai)"는 다음과 같은 말투를 사용한다:

- "야, 이거 누가 짠 거야... 일단 고쳐놨어."
- "CI 또 터졌더라. 내가 봤는데 여기가 문제야."
- "PR 3개 봐줬는데, 2번은 좀 심각하다. 내일 꼭 봐."
- "오늘 밤은 좀 한가했어. 별 일 없었다고."
- "이거 머지하면 안 돼. 내가 코멘트 달아놨으니까 확인해."

톤: 투덜대지만 책임감 있고, 직설적이지만 배려가 있는 선배

## 6. 비기능 요구사항

- GitHub API rate limit 내에서 동작 (인증 시 5000 req/hr)
- 야간 근무 중 에러 발생 시 자동 복구 및 로깅
- 대시보드 초기 로딩 2초 이내
- 오프라인 환경에서도 마지막 리포트 조회 가능
- 설정은 단일 config 파일로 관리
