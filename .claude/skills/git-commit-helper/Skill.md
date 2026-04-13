---
name: git-commit-helper
description: Analyze staged changes and create a conventional commit. Use when the user has staged changes and wants to commit, asks for a commit message, or runs /git-commit-helper. Reads the staged diff, matches the project's existing commit style from git log, and runs git commit with a properly formatted message.
allowed-tools: Bash(git diff *), Bash(git log *), Bash(git status *), Bash(git commit *)
---

# Git Commit Helper

Analyze staged changes and create a conventional commit message that matches the project's existing style.

## When to use

- User has staged changes with `git add` and wants to commit
- User says "commit this", "write a commit message", or similar
- User invokes `/git-commit-helper` directly

This skill does **not** stage files. If nothing is staged, stop and tell the user to `git add` first.

## Workflow

Follow these steps in order. Do not skip steps.

### 1. Verify there are staged changes

Run:

```bash
git status --short
```

If no files are staged (no lines starting with `M `, `A `, `D `, `R `, or `C ` in the left column), stop and tell the user:

> Nothing is staged. Run `git add <files>` first, then ask me to commit.

### 2. Read the staged diff

Run:

```bash
git diff --staged
```

Understand what actually changed. Focus on:

- Which files/modules are touched (for the scope)
- Whether it's a new feature, bug fix, refactor, doc change, etc. (for the type)
- Whether the change is trivial (subject only) or non-trivial (needs a body)

### 3. Learn the project's commit style

Run:

```bash
git log --oneline -20
```

Check:

- Are existing commits using Conventional Commits (`feat:`, `fix:`, ...)? If yes, match exactly.
- What scopes do they use? (e.g. `feat(auth):`, `fix(api):`) Reuse existing scope vocabulary when possible.
- Language — if the repo's commits are in Korean, write in Korean. If English, English.
- Subject capitalization, imperative vs past tense, trailing period, etc.

**Match the project. Do not impose Conventional Commits if the project doesn't use them.**

### 4. Compose the message

Default to Conventional Commits format unless step 3 says otherwise:

```
type(scope): short subject in imperative mood, under 72 chars

- Bullet describing what changed and why (not how)
- One bullet per logical change
- Omit body entirely for trivial changes

Closes #123
```

**Type selection:**

- `feat` — new user-visible functionality
- `fix` — bug fix
- `docs` — documentation only
- `refactor` — code change with no behavior change
- `perf` — performance improvement
- `test` — adding or fixing tests
- `chore` — build, deps, tooling, config
- `style` — formatting only

**Subject rules:**

- Imperative mood: "add", "fix", "remove" — not "added", "fixes", "removing"
- No trailing period
- Lowercase after the colon (unless project style differs)
- Under 72 characters

**When to add a body:**

- Multiple logical changes in one commit
- The "why" is non-obvious from the diff
- Breaking changes (use `BREAKING CHANGE:` footer)

**When to skip the body:**

- Single-purpose, self-explanatory change
- Typo fixes, small renames, dependency bumps

### 5. Show the message and run the commit

Print the proposed message to the user, then run:

```bash
git commit -m "type(scope): subject" -m "body line 1" -m "body line 2"
```

Use multiple `-m` flags for multi-paragraph messages — do not embed literal newlines or backticks in the subject. Avoid `$(...)`, backticks, and unescaped quotes inside the message; they can trigger permission re-prompts.

If the commit fails (e.g. pre-commit hook rejection), show the error to the user and stop. Do not retry automatically.

## Examples

### Example 1: Single feature, needs body

Staged diff: new `auth.service.ts` and `login.component.tsx` implementing JWT login.

```
feat(auth): add JWT-based user authentication

- Implement login/logout flow
- Add token management service
- Add auth guards for protected routes
```

### Example 2: Trivial fix, no body

Staged diff: one-line null check in `userProfile.ts`.

```
fix(api): handle null values in user profile
```

### Example 3: Docs only

Staged diff: README and `docs/api.md` updated with examples.

```
docs: add authentication examples to API docs
```

## Anti-patterns to avoid

| Bad                                  | Why                           | Better                                       |
| ------------------------------------ | ----------------------------- | -------------------------------------------- |
| `fix stuff`                          | Vague                         | `fix(auth): prevent logout on token refresh` |
| `added user authentication`          | Past tense                    | `feat(auth): add user authentication`        |
| `Update docs.`                       | Wrong format, trailing period | `docs: update API examples`                  |
| `feat: add login AND fix navbar bug` | Two changes in one commit     | Split into two commits                       |

## What this skill will NOT do

- **Will not stage files** (`git add` is not in allowed-tools by design)
- **Will not push** (`git push` is not allowed)
- **Will not amend or rebase** previous commits
- **Will not bypass hooks** (no `--no-verify`)
- **Will not auto-invoke** — user must run `/git-commit-helper` (`disable-model-invocation: true`)

If the user wants any of the above, tell them to run the command manually.
