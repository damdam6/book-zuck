# AI Code Review System - Development Guidelines

## 개발 컨벤션

### 언어 및 런타임
- **TypeScript** (strict mode)
- **Node.js ES2022** (ESM modules)
- `.ai-review/` 내부에 독립적인 `tsconfig.json` 사용
- 루트 프로젝트(React/Vite)의 TS 설정과 분리

### 코드 스타일
- 함수형 스타일 우선, 클래스는 Provider 추상화 등 필요한 곳에만 사용
- 모든 public 함수에 명시적 반환 타입 선언
- `any` 타입 사용 금지 - `unknown` 사용 후 타입 가드
- 파일당 하나의 주요 책임 (Single Responsibility)

### 에러 핸들링 패턴
- **에이전트 레벨**: 개별 에이전트 실패 시 빈 배열 반환 (fail-safe)
- **Provider 레벨**: rate limit/timeout은 retry, API 키 누락은 즉시 throw
- **GitHub API 레벨**: API 에러는 로깅 후 graceful 처리
- 절대로 하나의 에이전트 실패가 전체 파이프라인을 중단시키지 않을 것

### LLM 출력 파싱
- JSON 응답에서 코드펜스(```) 자동 제거
- `JSON.parse` 실패 시 regex로 JSON 블록 추출 시도
- 파싱 완전 실패 시 빈 배열 반환 + 경고 로그

## 프로젝트 구조 규칙

### 파일 배치
- `src/types.ts` - 모든 공유 인터페이스 (이 파일만 다른 모듈에서 import)
- `src/providers/` - LLM Provider만 (비즈니스 로직 없음)
- `src/github/` - GitHub API 호출만 (비즈니스 로직 없음)
- `src/agents/` - 에이전트 비즈니스 로직
- `prompts/` - 시스템 프롬프트 (Markdown)

### 의존성 방향
```
types.ts (의존성 없음)
    ↑
config.ts, providers/*, github/*
    ↑
agents/*
    ↑
dispatcher.ts
```
순환 의존성 금지. 하위 모듈이 상위 모듈을 import하지 않을 것.

## 테스트 규칙

- `vitest` 사용
- LLM API 호출은 항상 mock
- GitHub API 호출도 mock
- 각 에이전트에 대해 최소 3가지 케이스: 정상, 빈 diff, 파싱 실패

## Git 워크플로우

### 브랜치 전략
- Epic별로 브랜치 생성: `feature/epic-1-setup`, `feature/epic-2-github-api`
- 이슈별 커밋: `feat: add LLM provider abstraction (#9)`

### 커밋 메시지
- `feat:` 새 기능
- `fix:` 버그 수정
- `refactor:` 리팩토링
- `test:` 테스트 추가
- `docs:` 문서
- `chore:` 설정/의존성

## 설정 파일 참조

- 설정 파일: 프로젝트 루트 `.ai-review.yml`
- 설정 스키마: `src/types.ts`의 `AppConfig` 인터페이스
- 에이전트별 provider/model 독립 지정 가능
- `exclude_files`로 리뷰 제외 파일 패턴 지정
