# 설정 가이드

## GitHub Secrets 등록

AI 리뷰에 사용할 LLM API 키를 GitHub Secrets에 등록합니다.

### CLI로 등록

```bash
# Kimi (Moonshot AI)
gh secret set KIMI_API_KEY --body "your-api-key"

# Anthropic
gh secret set ANTHROPIC_API_KEY --body "your-api-key"

# Google
gh secret set GOOGLE_API_KEY --body "your-api-key"
```

### 웹에서 등록

1. GitHub 레포 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Name에 `KIMI_API_KEY` 등 입력, Secret에 API 키 입력

> 사용하지 않는 provider의 키는 등록하지 않아도 됩니다. `.ai-review.yml`에서 해당 provider를 사용하는 에이전트가 없으면 해당 키는 불필요합니다.

## .ai-review.yml 전체 레퍼런스

### agents 섹션

각 에이전트별 LLM provider, model, 프롬프트 파일을 지정합니다.

```yaml
agents:
  <agent_name>:
    provider: kimi | anthropic | google    # 필수
    model: <model_id>                      # 필수
    prompt_file: <path>                    # 필수 (prompts/ 기준 상대경로)
    confidence_threshold: <0.0~1.0>        # resolver 전용, 기본 0.8
```

| 에이전트 | 역할 | 실행 시점 |
|---------|------|----------|
| `quality` | 코드 품질 검토 (네이밍, 구조, 중복, 에러 핸들링) | PR opened/reopened/push |
| `performance` | 성능 검토 (복잡도, 메모리, N+1, 캐싱) | PR opened/reopened/push |
| `security` | 보안 검토 (인젝션, XSS, 시크릿 노출) | PR opened/reopened/push |
| `orchestrator` | 3개 결과 병합, 중복 제거, false positive 필터링 | PR opened/reopened/push |
| `resolver` | 이전 코멘트 해결 여부 자동 판정 | push (synchronize) |
| `responder` | @bot 멘션에 대한 질문 답변 | 코멘트 생성 |

### triggers 섹션

```yaml
triggers:
  review_on: [opened, reopened]     # 리뷰 실행 트리거 (기본값)
  resolve_on: [synchronize]         # Resolver 실행 트리거 (기본값)
  respond_to: "@review-bot"         # Responder 트리거 키워드 (기본값)
```

### options 섹션

```yaml
options:
  language: ko                       # 리뷰 응답 언어 (기본: ko)
  max_comments_per_review: 20        # PR당 최대 코멘트 수 (기본: 20)
  review_draft_pr: false             # Draft PR 리뷰 여부 (기본: false)
  skip_bot_prs: true                 # Bot PR 스킵 (기본: true)
  exclude_files:                     # 리뷰 제외 파일 패턴 (glob)
    - "*.lock"
    - "*.generated.*"
    - "dist/**"
    - "node_modules/**"
```

## 에이전트별 모델 추천

| 에이전트 | 추천 모델 | Provider | 비용 | 성능 | 이유 |
|---------|----------|----------|------|------|------|
| Quality | claude-sonnet-4-6 | Anthropic | 중 | 높음 | 코드 구조 이해에 강함 |
| Performance | kimi-k2.5 | Kimi | 낮음 | 중 | 256K 컨텍스트로 대형 diff 처리 |
| Security | claude-opus-4-6 | Anthropic | 높음 | 최고 | 보안은 정확도가 중요 |
| Orchestrator | gemini-2.5-flash | Google | 낮음 | 중 | 병합/필터링은 가벼운 모델로 충분 |
| Resolver | kimi-k2.5 | Kimi | 낮음 | 중 | 단순 비교 판정 |
| Responder | claude-sonnet-4-6 | Anthropic | 중 | 높음 | 자연어 답변 품질 |

### 비용 절감 팁

- `max_comments_per_review`를 줄이면 Orchestrator 출력이 짧아져 토큰 절약
- `exclude_files`에 자동 생성 파일(`.generated.*`, `dist/**`)을 추가하면 불필요한 LLM 호출 감소
- Performance/Resolver처럼 단순한 작업에는 저렴한 모델 사용

## 트러블슈팅

### API 키 관련
- **"Missing environment variable: KIMI_API_KEY"** → GitHub Secrets에 키가 등록되지 않음
- **"429 rate limit"** → API rate limit 초과. 자동 재시도(최대 3회)하지만, 지속되면 요청 빈도 확인

### 리뷰 관련
- **리뷰가 달리지 않음** → Actions 탭에서 워크플로우 실행 로그 확인. Draft PR이면 `review_draft_pr: true` 설정
- **너무 많은 코멘트** → `max_comments_per_review` 값을 줄이거나 `exclude_files` 패턴 추가
- **잘못된 리뷰** → `prompts/` 폴더의 프롬프트 수정 ([프롬프트 가이드](prompt-guide.md) 참고)
