---
name: git-commit
description: >
  Staged 변경사항을 분석해서 적절한 git 커밋 메시지를 자동으로 생성하고 커밋까지 실행하는 스킬.
  "커밋 만들어줘", "staged 변경사항 커밋해줘", "git commit 해줘", "변경사항 정리해서 커밋",
  "commit message 작성해줘" 같은 요청이 오면 반드시 이 스킬을 사용할 것.
disable-model-invocation: true
model: claude-opus-4-5
---

# Git Auto-Commit Skill

Staged 변경사항을 분석하고 의미 있는 커밋 메시지를 생성해 커밋을 실행한다.

## 설치 방법

### 전역 설치 (모든 프로젝트에서 `/git-commit` 사용)

```bash
mkdir -p ~/.claude/skills/git-commit
cp SKILL.md ~/.claude/skills/git-commit/SKILL.md
```

### 프로젝트 전용 설치

```bash
mkdir -p .claude/skills/git-commit
cp SKILL.md .claude/skills/git-commit/SKILL.md
```

설치 후 Claude Code에서 `/git-commit` 입력하면 바로 실행된다.

> **권한 설정**: git commit 권한 요청을 없애려면 Claude Code 세션에서 한 번 "항상 허용(Always allow)"을 선택하거나, 프로젝트 `.claude/settings.json`에 아래를 추가한다:
>
> ```json
> {
>   "permissions": {
>     "allow": [
>       "Bash(git diff*)",
>       "Bash(git log*)",
>       "Bash(git status*)",
>       "Bash(git commit*)"
>     ]
>   }
> }
> ```

---

## 워크플로우

### 1. 현재 상태 파악

```bash
git status
git diff --staged
git log --oneline -5
```

- `git status`: 어떤 파일이 staged됐는지 확인
- `git diff --staged`: 실제 변경 내용 확인
- `git log --oneline -5`: 최근 커밋 스타일/컨벤션 파악

### 2. 변경사항 분석

diff를 읽고 다음을 파악한다:

- **무엇을** 변경했는가 (파일, 함수, 로직)
- **왜** 변경했는가 (버그 수정, 기능 추가, 리팩토링, 문서 등)
- **영향 범위** (단일 파일 vs 여러 모듈)

### 3. 커밋 메시지 작성 규칙

기존 커밋 로그에서 컨벤션을 감지해 따른다. 컨벤션이 없으면 **Conventional Commits** 형식 사용:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**타입 선택 기준:**
| type | 사용 상황 |
|------|-----------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `docs` | 문서만 변경 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 설정, 의존성 변경 |
| `style` | 포맷팅, 세미콜론 등 (로직 무관) |
| `perf` | 성능 개선 |

**제목(subject) 작성 규칙:**

- 50자 이내
- 명령형으로 작성 ("Add feature" not "Added feature")
- 끝에 마침표 없음
- 영어 또는 프로젝트 언어 따름

**본문(body) - 필요한 경우만:**

- 72자 줄바꿈
- 무엇을 왜 바꿨는지 설명 (how는 코드가 설명함)
- 변경이 복잡하거나 맥락이 필요할 때 추가

### 4. 커밋 실행

```bash
git commit -m "<subject>"
# 본문이 필요한 경우
git commit -m "<subject>" -m "<body>"
```

---

## 예시

### 단순 버그 수정

```
fix(auth): handle null token in refresh flow
```

### 기능 추가 + 본문

```
feat(api): add rate limiting to /upload endpoint

Prevents abuse by limiting requests to 10/min per IP.
Uses Redis sliding window counter with 60s TTL.
```

### 리팩토링

```
refactor(db): extract query builder into separate module
```

---

## 주의사항

- Staged된 변경사항이 없으면 사용자에게 알리고 중단
- 변경 내용이 너무 광범위하면 논리적 단위로 나눌 것을 제안
- 민감한 정보(API 키, 비밀번호 등)가 staged됐으면 커밋 전에 경고
- `--no-verify` 플래그는 사용하지 않음 (훅 우회 금지)
