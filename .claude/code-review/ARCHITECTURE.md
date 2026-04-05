# AI Code Review System - Architecture

## 시스템 개요

GitHub webhook 이벤트를 받아 AI 기반 코드리뷰를 자동 수행하는 시스템입니다.

## 아키텍처 다이어그램

```
GitHub webhook events
    │
    ▼
┌─────────────────────────────┐
│     Event Dispatcher        │
│  이벤트 분류 + 에이전트 라우팅  │
└─────┬──────────┬────────────┘
      │          │         │
      ▼          ▼         ▼
 PR opened   push(sync)  @bot comment
      │          │         │
      ▼          ▼         ▼
┌──────────┐ ┌────────┐ ┌──────────┐
│ Review   │ │Resolver│ │Responder │
│ Pipeline │ │자동해결 │ │질문 답변  │
└────┬─────┘ └────────┘ └──────────┘
     │
     ▼
┌─────────────────────────────────────┐
│     Review Pipeline (병렬 실행)       │
│                                     │
│ ┌─────────┐ ┌───────────┐ ┌──────┐ │
│ │Quality  │ │Performance│ │Secur.│ │
│ │코드 품질 │ │성능 검토   │ │보안  │ │
│ └────┬────┘ └─────┬─────┘ └──┬───┘ │
│      └────────────┼──────────┘     │
│                   ▼                │
│         ┌──────────────────┐       │
│         │  Orchestrator    │       │
│         │ 종합검토 + 병합   │       │
│         └────────┬─────────┘       │
└──────────────────┼─────────────────┘
                   ▼
        GitHub API: review comments 게시
```

## 모듈 구조

### Providers (`src/providers/`)
LLM API 추상화 레이어. OpenAI, Anthropic, Google을 공통 인터페이스로 래핑.
- `base.ts` - 추상 클래스 + retry 로직 + ProviderFactory
- `openai.ts` / `anthropic.ts` / `google.ts` - 각 SDK 래퍼

### GitHub (`src/github/`)
GitHub API 연동 모듈.
- `diff.ts` - PR diff 추출 + 파일 필터링
- `comments.ts` - 리뷰 코멘트 CRUD (REST API)
- `threads.ts` - 리뷰 스레드 관리 (GraphQL API)

### Agents (`src/agents/`)
AI 에이전트 구현.
- `reviewers/quality.ts` - 코드 품질 검토 (네이밍, 구조, 중복, 에러 핸들링)
- `reviewers/performance.ts` - 성능 검토 (복잡도, 메모리, N+1, 캐싱)
- `reviewers/security.ts` - 보안 검토 (인젝션, XSS, 시크릿 노출)
- `orchestrator.ts` - 결과 병합, 중복 제거, false positive 필터링
- `resolver.ts` - 수정된 코멘트 자동 resolve
- `responder.ts` - @bot 질문 답변

### Config (`src/config.ts`)
`.ai-review.yml` 설정 파일 로드 및 검증.

### Dispatcher (`src/dispatcher.ts`)
GitHub Actions 진입점. 이벤트 타입별 라우팅.

## 데이터 흐름

### Review Pipeline
1. Dispatcher가 `pull_request.opened` 이벤트 수신
2. `github/diff.ts`로 PR diff 추출 (exclude 패턴 적용)
3. Quality, Performance, Security 에이전트 병렬 실행 (`Promise.all`)
4. 각 에이전트가 `Issue[]` 반환
5. Orchestrator가 3개 결과를 병합하여 `OrchestratorOutput` 생성
6. `github/comments.ts`로 inline review comments 일괄 게시

### Resolver
1. `pull_request.synchronize` 이벤트 수신
2. `github/threads.ts`로 미해결 스레드 조회
3. 각 스레드의 코멘트 + 새 diff를 LLM에 전달
4. confidence >= threshold이면 자동 resolve

### Responder
1. `issue_comment.created` 이벤트에서 @bot 멘션 감지
2. 코드 컨텍스트 + 스레드 히스토리 수집
3. LLM으로 답변 생성 후 reply 게시
