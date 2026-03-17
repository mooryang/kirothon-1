---
inclusion: always
---

# 기술 스택 명세 (Tech Stack)

> 이 문서는 "전설의 선배 (CS-Senpai)" 프로젝트의 기술 스택을 정의한다.

## 1. 런타임 & 언어

| 항목 | 선택 | 비고 |
|------|------|------|
| 런타임 | Node.js 22 LTS | native fetch, ES2024 |
| 언어 | JavaScript | CJS 기본, Next.js 영역은 Next.js 기본 설정 따름 |
| 패키지 매니저 | pnpm | workspace 지원, 디스크 효율 |

## 2. 프론트엔드 (웹 터미널 대시보드)

| 레이어 | 패키지 | 용도 |
|--------|--------|------|
| 프레임워크 | Next.js 15 (App Router) | SSR + API Routes, 단일 서버 |
| 스타일링 | Tailwind CSS v4 + CSS CRT 효과 | 유틸리티 기반, scanline/glow/flicker |
| 차트 | `recharts` | 터미널 테마 적용 데이터 시각화 |
| 애니메이션 | `framer-motion` + CSS `@keyframes` | 타이핑 효과, 전환 애니메이션 |
| 폰트 | JetBrains Mono | 모노스페이스, 코드 가독성 |
| ASCII 아트 | `figlet` | 헤더/배너 ASCII 아트 생성 |

## 3. 백엔드 (스케줄러 & 데이터)

| 레이어 | 패키지 | 용도 |
|--------|--------|------|
| 데이터 저장 | `better-sqlite3` | ShiftReport 영속화, 단일 파일 DB |
| GitHub API | `octokit` | REST API, PR/CI/Issue 데이터 수집 |
| 스케줄러 | `node-cron` | cron 표현식 기반 야간 폴링 (단순 반복에 적합) |
| 설정 관리 | `zod` | config 스키마 검증 + 타입 추론 |
| 로깅 | `pino` | 구조화된 JSON 로깅 |
| 프로세스 실행 | `execa` | Kiro CLI 에이전트 subprocess 실행 |

## 4. 분석 엔진 (Kiro CLI)

| 항목 | 설명 |
|------|------|
| 실행 방식 | `kiro-cli chat --no-interactive --trust-all-tools --agent <name>` |
| 병렬 실행 | subagent는 각각 독립 컨텍스트에서 병렬 실행 |
| 입력 방식 | 프롬프트를 임시 파일로 저장 후 stdin 파이핑 (셸 이스케이프 방지) |
| 타임아웃 | `KIRO_AGENT_TIMEOUT` 환경변수 (기본 120초) |
| 출력 | 구조화된 JSON (stdout 파싱) |
| 에이전트 목록 | `pr-reviewer`, `ci-analyzer`, `agenda-planner` |
| 에이전트 정의 | `.kiro/agents/` 디렉토리에 MD로 정의 |

## 5. 개발 도구

| 도구 | 용도 |
|------|------|
| `vitest` | 단위/통합 테스트 |
| `eslint` + `prettier` | 코드 품질 & 포맷팅 |

## 6. 에러 핸들링 정책

### 에이전트 실행 실패

- 최대 3회 재시도 (exponential backoff: 1s → 2s → 4s)
- 3회 실패 시 해당 에이전트 스킵, 에러 로그 기록 (`pino`)
- 나머지 에이전트는 계속 실행
- ShiftReport에 실패한 에이전트 정보 포함

### GitHub API 에러

- Rate limit 도달 시: `x-ratelimit-reset` 헤더 기반 대기 후 재시도
- 네트워크 에러: 3회 재시도 후 스킵, 마지막 캐시 데이터 사용
- 인증 실패: 즉시 중단, 에러 로그 + 대시보드 알림

### 일반 에러

- 예상치 못한 에러는 `pino`로 구조화 로깅
- 야간 근무 전체가 중단되지 않도록 각 단계를 try-catch로 격리
- 크리티컬 에러 (DB 접근 불가 등)만 전체 중단

## 7. 코딩 컨벤션

### 파일 구조

- 백엔드: CJS (`require`/`module.exports`)
- Next.js 웹: Next.js 기본 설정 따름 (App Router)
- 설정 파일: `config.yaml` 단일 파일

### 네이밍

- 파일명: kebab-case (`shift-manager.js`, `github-poller.js`)
- 변수/함수: camelCase
- 상수: UPPER_SNAKE_CASE
- 컴포넌트: PascalCase (`CRTScreen.jsx`, `BBSMenu.jsx`)

### 코드 스타일

- `prettier` 기본 설정 (세미콜론, 싱글 쿼트)
- 함수는 가능한 한 순수 함수로 작성
- 사이드 이펙트는 명시적으로 분리
- JSDoc 주석으로 주요 함수 문서화

## 8. 프로젝트 구조

```
cs-senpai/
├── package.json
├── config.yaml              # 사용자 설정 (레포 목록, 폴링 주기 등)
├── src/
│   ├── scheduler/           # 야간 스케줄러
│   │   ├── shift-manager.js
│   │   └── github-poller.js
│   ├── agents/              # Kiro CLI 에이전트 실행기
│   │   ├── runner.js        # 공통 에이전트 실행 로직 (임시파일 + stdin)
│   │   └── parsers/         # 에이전트 출력 파서
│   ├── store/               # 데이터 저장소
│   │   ├── db.js            # SQLite 초기화
│   │   └── shift-store.js   # ShiftReport CRUD
│   └── shared/              # 공유 유틸
│       ├── config.js        # zod 스키마 + 설정 로더
│       └── errors.js        # 에러 핸들링 유틸
├── web/                     # Next.js 앱
│   ├── app/
│   │   ├── page.jsx         # 메인 대시보드
│   │   ├── layout.jsx       # CRT 레이아웃
│   │   └── api/             # 데이터 API
│   ├── components/
│   │   ├── CRTScreen.jsx    # CRT 모니터 래퍼
│   │   ├── Terminal.jsx     # 터미널 출력 컴포넌트
│   │   └── BBSMenu.jsx      # BBS 스타일 메뉴
│   └── styles/
│       └── crt.css          # CRT 효과 CSS
├── agents/                  # Kiro CLI 에이전트 정의 파일
│   ├── pr-reviewer.md
│   ├── ci-analyzer.md
│   └── agenda-planner.md
└── tests/
```

## 9. 핵심 의존성 요약

```json
{
  "dependencies": {
    "next": "^15",
    "tailwindcss": "^4",
    "recharts": "차트 시각화",
    "framer-motion": "애니메이션",
    "figlet": "ASCII 아트",
    "better-sqlite3": "임베디드 DB",
    "octokit": "GitHub API",
    "node-cron": "스케줄러",
    "execa": "프로세스 실행",
    "zod": "스키마 검증",
    "pino": "로깅"
  },
  "devDependencies": {
    "vitest": "테스트",
    "eslint": "린팅",
    "prettier": "포맷팅"
  }
}
```

## 10. 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `GITHUB_TOKEN` | (필수) | GitHub Personal Access Token |
| `KIRO_AGENT_TIMEOUT` | `120` | 에이전트 실행 타임아웃 (초) |
| `POLLING_INTERVAL` | `*/30 * * * *` | cron 표현식 (기본 30분) |
| `DB_PATH` | `./data/cs-senpai.db` | SQLite DB 파일 경로 |
| `LOG_LEVEL` | `info` | pino 로그 레벨 |
