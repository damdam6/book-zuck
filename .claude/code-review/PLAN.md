# AI Code Review System - Implementation Plan

## Context

GitHub Actions + AI를 연결하여 PR 자동 코드리뷰 시스템을 구축합니다.

- PR 이벤트에 반응하여 4개 전문 에이전트(Quality, Performance, Security + Orchestrator)가 병렬 리뷰
- 수정 커밋 시 Resolver가 해결된 코멘트 자동 resolve
- @bot 멘션 시 Responder가 질문에 답변
- 관련 이슈: #7~#31 (Epic 1~6)

## 디렉토리 구조

```
프로젝트 루트/
├── .ai-review/                    # 실제 AI 리뷰 시스템 코드
│   ├── src/
│   │   ├── dispatcher.ts          # 이벤트 라우팅 진입점
│   │   ├── types.ts               # 공유 인터페이스 정의
│   │   ├── config.ts              # .ai-review.yml 로더/파서
│   │   ├── agents/
│   │   │   ├── reviewers/
│   │   │   │   ├── quality.ts     # 코드 품질 검토
│   │   │   │   ├── performance.ts # 성능 검토
│   │   │   │   └── security.ts   # 보안 검토
│   │   │   ├── orchestrator.ts    # 결과 병합/종합 리뷰 생성
│   │   │   ├── resolver.ts        # 해결된 코멘트 자동 resolve
│   │   │   └── responder.ts       # @bot 질문 답변
│   │   ├── providers/
│   │   │   ├── base.ts            # LLM Provider 추상 클래스 + Factory
│   │   │   ├── kimi.ts            # Kimi (Moonshot AI) - OpenAI 호환 API
│   │   │   ├── anthropic.ts
│   │   │   └── google.ts
│   │   └── github/
│   │       ├── diff.ts            # PR diff 추출 + 필터링
│   │       ├── comments.ts        # 리뷰 코멘트 CRUD
│   │       └── threads.ts         # GraphQL 스레드 관리
│   ├── prompts/
│   │   ├── quality.md
│   │   ├── performance.md
│   │   ├── security.md
│   │   ├── orchestrator.md
│   │   ├── resolver.md
│   │   └── responder.md
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json              # Node.js용 별도 TS 설정
├── .claude/code-review/           # 개발 가이드라인 & 에이전트 설정
│   ├── PLAN.md                    # 이 파일 - 전체 프로젝트 계획
│   ├── GUIDELINES.md              # 코드리뷰 시스템 개발 규칙/컨벤션
│   ├── ARCHITECTURE.md            # 아키텍처 설명 & 다이어그램
│   └── agents/                    # 개발용 Claude Code 에이전트 설정
│       ├── review-agent.md        # 리뷰 에이전트 개발 가이드
│       └── test-agent.md          # 테스트 에이전트 가이드
├── .github/workflows/
│   └── ai-review.yml              # GitHub Actions 워크플로우
└── .ai-review.yml                 # 설정 파일 (프로젝트 루트)
```

## 언어 선택: TypeScript

- 이슈의 인터페이스 정의를 그대로 활용 가능
- `tsconfig.json`을 `.ai-review/` 내부에 별도 구성 (target: ES2022, module: NodeNext)
- `npm run build`로 `dist/`에 JS 컴파일 후 GitHub Actions에서 실행
- GitHub Actions 실행에 영향 없음 (빌드 단계에서 JS로 변환)

## 구현 순서

### Phase 1: 프로젝트 초기화 (Epic 1, #7-#10)

1. **프로젝트 스캐폴딩 (#8)**
   - `.ai-review/` 디렉토리 구조 생성
   - `package.json` 초기화 (deps: `@octokit/rest`, `@octokit/graphql`, `js-yaml`, `minimatch`, `openai`(Kimi용), `@anthropic-ai/sdk`, `@google/generative-ai`)
   - `tsconfig.json` 구성

2. **공유 타입 정의 (`src/types.ts`)**
   - `LLMProvider`, `DiffChunk`, `Issue`, `ReviewComment`, `OrchestratorInput/Output`, `ResolverResult`, `AppConfig` 인터페이스

3. **LLM Provider 추상화 (#9)**
   - `base.ts`: 공통 인터페이스 + retry/backoff 로직 + ProviderFactory
   - `kimi.ts` (Moonshot AI, OpenAI 호환 SDK 사용), `anthropic.ts`, `google.ts`: 각 SDK 래퍼

4. **설정 파일 파서 (#10)**
   - `config.ts`: 루트의 `.ai-review.yml` 로드, 검증, 기본값 처리, 프롬프트 파일 로드

### Phase 2: GitHub API 연동 (Epic 2, #11-#14)

5. **PR diff 추출 (#12)** - `github/diff.ts`
6. **리뷰 코멘트 CRUD (#13)** - `github/comments.ts`
7. **GraphQL 스레드 관리 (#14)** - `github/threads.ts`

(5, 6, 7은 병렬 작업 가능)

### Phase 3: 리뷰 에이전트 (Epic 3, #15-#19)

8. **공통 리뷰 유틸리티** - 프롬프트 로드 → LLM 호출 → JSON 파싱 공통 함수
9. **Quality Agent (#16)** - `agents/reviewers/quality.ts`
10. **Performance Agent (#17)** - `agents/reviewers/performance.ts`
11. **Security Agent (#18)** - `agents/reviewers/security.ts`
12. **Orchestrator (#19)** - `agents/orchestrator.ts` (중복제거, 심각도 재분류, false positive 필터링, 요약 생성)

(9, 10, 11은 병렬 작업 가능)

### Phase 4: Resolver (Epic 4, #20-#22)

13. **Resolver 로직 (#21)** + **프롬프트 (#22)** - `agents/resolver.ts`, `prompts/resolver.md`

### Phase 5: Responder (Epic 5, #23-#25)

14. **Responder 로직 (#24)** + **프롬프트 (#25)** - `agents/responder.ts`, `prompts/responder.md`

### Phase 6: 통합 (Epic 6, #26-#31)

15. **Event Dispatcher (#27)** - `src/dispatcher.ts`
16. **GitHub Actions 워크플로우 (#28)** - `.github/workflows/ai-review.yml`
17. **프롬프트 세트 (#29)** - `prompts/*.md` (quality, performance, security, orchestrator)
18. **E2E 테스트 (#30)**
19. **문서 (#31)**

### 개발 가이드라인 설정 (.claude/code-review/)

20. **GUIDELINES.md** - 코딩 컨벤션, PR 규칙, 에러 핸들링 패턴
21. **ARCHITECTURE.md** - 시스템 아키텍처 문서
22. **에이전트 가이드** - Claude Code 에이전트 활용 개발 가이드

## 핵심 설계 결정

| 항목                  | 결정                                              | 이유                         |
| --------------------- | ------------------------------------------------- | ---------------------------- |
| 설정 파일 위치        | 프로젝트 루트 `.ai-review.yml`                    | .eslintrc 등과 동일 컨벤션   |
| GitHub Actions 진입점 | `node .ai-review/dist/dispatcher.js`              | TS 빌드 후 JS 실행           |
| 에이전트 실행 방식    | Quality/Performance/Security는 `Promise.all` 병렬 | 속도 최적화                  |
| LLM 출력 파싱         | 코드펜스 제거 + JSON.parse + fallback regex       | LLM 출력 불안정성 대응       |
| 에러 처리             | 개별 에이전트 실패 시 빈 배열 반환 (fail-safe)    | 하나의 실패가 전체 중단 방지 |
| concurrency           | `cancel-in-progress: true`                        | 같은 PR 중복 실행 방지       |

## 검증 방법

1. **단위 테스트**: 각 모듈별 vitest 테스트 (LLM/GitHub API는 mock)
2. **통합 테스트**: dispatcher → agents → comments 전체 파이프라인 mock 테스트
3. **E2E**: 테스트 PR 생성하여 실제 GitHub API + LLM 호출 검증 (opt-in)
4. **수동 검증**: 실제 PR에서 리뷰 코멘트 게시 확인

## 첫 작업 범위

Phase 1 (프로젝트 초기화) + `.claude/code-review/` 가이드라인 설정부터 시작합니다.

- `.ai-review/` 디렉토리 구조 생성 및 package.json 초기화
- `src/types.ts` 공유 인터페이스 정의
- `.claude/code-review/` 개발 가이드라인 작성
