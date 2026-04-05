# 프롬프트 커스터마이즈 가이드

## 프롬프트 파일 구조

프롬프트 파일은 `.ai-review/prompts/` 디렉토리에 위치합니다:

```
prompts/
├── quality.md        # 코드 품질 검토
├── performance.md    # 성능 검토
├── security.md       # 보안 검토
├── orchestrator.md   # 종합 검토 + 병합
├── resolver.md       # 해결 여부 판정
└── responder.md      # 질문 답변
```

## 프롬프트 수정 방법

각 프롬프트 파일은 Markdown 형식이며, 다음 구조를 따릅니다:

```markdown
# Role
에이전트의 역할 정의

# Task
수행할 작업 설명

# Review Criteria (또는 판정 기준)
검토 항목 목록

# Output
출력 형식 (JSON 스키마 또는 Markdown)

# Notes
추가 지시사항
```

파일을 직접 편집하면 다음 PR부터 적용됩니다.

## 검토 항목 추가/제거

### 검토 항목 추가 예시

`prompts/quality.md`에 새 항목을 추가하려면 `# Review Criteria` 섹션에 추가:

```markdown
# Review Criteria

1. **Naming conventions** — ...
2. **Code structure** — ...
...
7. **Magic numbers** — Are there unexplained numeric literals that should be constants?
```

### 검토 항목 제거 예시

불필요한 항목을 삭제하면 됩니다. 예를 들어 TypeScript 프로젝트가 아니면 `Type safety` 항목을 제거:

```markdown
# Review Criteria

1. **Naming conventions** — ...
2. **Code structure** — ...
3. **Code duplication** — ...
4. **Readability** — ...
5. **Error handling** — ...
~~6. **Type safety** — ...~~  ← 이 줄 삭제
```

## 언어 변경

### 리뷰 응답 언어 변경

각 프롬프트 파일의 Output 섹션에서 언어 지시를 변경합니다.

**한국어 (기본):**
```markdown
All `title`, `description`, and `suggestion` fields must be written in **Korean (한국어)**.
```

**영어로 변경:**
```markdown
All `title`, `description`, and `suggestion` fields must be written in **English**.
```

**일본어로 변경:**
```markdown
All `title`, `description`, and `suggestion` fields must be written in **Japanese (日本語)**.
```

> `resolver.md`의 `reason` 필드, `responder.md`의 전체 응답, `orchestrator.md`의 `summary`와 `body`도 동일하게 변경해야 합니다.

## Severity 기준 커스터마이즈

프롬프트의 `# Severity Levels` 섹션을 수정하여 기준을 조정할 수 있습니다:

```markdown
# Severity Levels

- `critical` — 머지 전 반드시 수정. 프로덕션 장애 가능성.
- `warning` — 수정 권장. 유지보수성 또는 안정성에 영향.
- `info` — 참고 사항. 개선 기회.
- `nitpick` — 스타일 선호. 선택적.
```

기준을 엄격하게 하려면 각 레벨의 설명을 강화하고, 느슨하게 하려면 완화합니다.

## JSON 출력 스키마

리뷰 에이전트(quality, performance, security)의 출력 스키마:

```json
{
  "issues": [
    {
      "file": "파일 경로",
      "line": 42,
      "severity": "critical | warning | info | nitpick",
      "category": "quality | performance | security",
      "title": "이슈 제목",
      "description": "문제 설명",
      "suggestion": "개선 제안"
    }
  ]
}
```

Orchestrator 출력 스키마:

```json
{
  "summary": "PR 요약 (Markdown)",
  "comments": [
    {
      "path": "파일 경로",
      "line": 42,
      "body": "코멘트 내용 (Markdown)",
      "severity": "warning"
    }
  ]
}
```

> 스키마를 변경하면 `src/agents/` 코드도 함께 수정해야 합니다. 프롬프트만 변경할 때는 스키마를 유지하세요.
