# Spec: Styling & Design System Foundation (브랜드 색상 토큰 + 폰트 + shadcn/ui)

## Objective

Tailwind v4가 설치만 된 백지 상태(`src/index.css` = `@import "tailwindcss";`)에서
디자인 시스템 기반을 세운다. 두 계층으로 구성:

- **계층 1 — 브랜드 색상 팔레트:** 디자이너 확정 hex를 **색상 이름 + 명도 weight**
  토큰(`red-100`, `blue-700` …)으로 `@theme`에 전역 선언. 역할(semantic)이 아니라
  색 이름이라 어디서든 `bg-red-300`처럼 자유롭게 사용. 컴포넌트별 의미 매핑은 후속.
- **계층 2 — shadcn/ui:** 접근성 있는 재사용 컴포넌트를 위해 shadcn 도입. shadcn의
  semantic 토큰(`--primary/--background/--border` …)을 계층 1 팔레트에 매핑.

**범위 (사용자 확정):** 풀 디자인 시스템 = ① 색상 토큰 ② 폰트(Pretendard) ③ shadcn/ui.
**다크 모드 제외**(라이트만). 기존 5개 페이지 대규모 리팩토링은 안 함(토큰/기반만 구축).

### Success = (정의)

- 디자이너 팔레트의 모든 hex가 `@theme`에 `--color-<계열>-<weight>` 토큰으로 존재하고
  `bg-red-300`, `text-blue-700`, `bg-orange-500` 등 유틸리티가 생성된다.
- Pretendard가 전역 적용되고 `index.html lang="ko"`.
- `npx shadcn` 설치가 동작해 `src/components/ui/`에 최소 컴포넌트(`button`, `card`,
  `badge`)가 생성되고, semantic 토큰이 브랜드 팔레트에 매핑되어 렌더된다.
- `npm run build` + `npm run lint` 통과, 기존 페이지/헤더/모달 렌더 정상.

## Tech Stack

- Vite 6 + React 19 + TypeScript ~5.8 (strict)
- Tailwind CSS 4 (`@tailwindcss/vite`) — **CSS-first `@theme`** (JS config 없음)
- **폰트:** Pretendard — `index.html` CDN `<link>` (통상적 방식, 런타임 의존성 없음)
- **shadcn/ui** (Tailwind v4 / React 19 지원) — 신규 의존성:
  - `class-variance-authority`, `clsx`, `tailwind-merge` (cn 헬퍼/variant)
  - `tw-animate-css` (v4용 애니메이션; 구 `tailwindcss-animate` 대체)
  - `lucide-react` (shadcn 기본 아이콘)
  - `@radix-ui/react-slot` 외 컴포넌트별 radix 패키지(설치 시 자동 추가)

> shadcn 도입은 사용자 명시 승인됨(원래는 Ask first 항목).

## Commands

```
Dev:    npm run dev
Build:  npm run build      # tsc -b && vite build  (검증 게이트)
Lint:   npm run lint       # eslint .
shadcn: npx shadcn@latest init       # 초기화 (components.json, lib/utils, css 토큰)
        npx shadcn@latest add button card badge   # 컴포넌트 추가
```

## Project Structure

```
src/
├── index.css              # ① @import tailwindcss / tw-animate-css
│                          # ② @theme  → 브랜드 색상 팔레트(red-100…) + --font-sans
│                          # ③ :root   → shadcn semantic vars (--primary…)
│                          # ④ @theme inline → semantic→유틸 브리지 (--color-primary 등)
├── lib/
│   ├── supabaseClient.ts  # 기존
│   └── utils.ts           # ← shadcn cn() 헬퍼 (clsx + tailwind-merge)
├── components/
│   ├── ui/                # ← shadcn 컴포넌트 (button.tsx, card.tsx, badge.tsx) — 소문자 파일명(shadcn 관례)
│   ├── common/TheHeader.tsx
│   └── Modal/ProfileModal.tsx
└── pages/ ...             # 기존 5개 (이번 작업서 미변경)
components.json            # ← shadcn 설정 (루트)
```

**파일명 관례 예외:** 프로젝트는 PascalCase지만 `src/components/ui/` 내부는 shadcn
관례인 소문자(`button.tsx`)를 따른다(벤더 컴포넌트라 업스트림 일치 우선).

**별칭 주의:** shadcn CLI는 루트 `tsconfig.json`에서 `paths`를 찾는다. 현재 `@/*`는
`tsconfig.app.json`·`vite.config.ts`에만 있으므로, init 전 루트 `tsconfig.json`에
`compilerOptions.baseUrl/paths`를 보강하거나 `components.json` aliases로 해결한다.

## Code Style

### `src/index.css` — 3계층 구성 (Tailwind v4)

```css
@import "tailwindcss";
@import "tw-animate-css";

/* ── 계층 1: 브랜드 색상 팔레트 (색이름 + weight) ── */
@theme {
  --color-red-100: #ffdada;  --color-red-300: #ff7e7e;  --color-red-800: #970000;
  --color-green-100: #d2e6b9; --color-green-300: #9bc97e; --color-green-700: #588b38;
  --color-yellow-100: #fff6ca; --color-yellow-200: #fff8a8; --color-yellow-300: #ffed94;
  --color-yellow-400: #ffe14e; --color-yellow-700: #d99101;
  --color-blue-100: #c6e9f4; --color-blue-300: #7acfea; --color-blue-700: #1983ad;
  --color-lime-300: #ecff7d;
  --color-orange-500: #f83c00;          /* Point color */
  --color-purple-300: #dac3f4;
  --color-indigo-300: #a9b3e8;
  --color-coral-300: #ffa77b;
  --color-gray-100: #f1f1f1; --color-gray-400: #bebebe;
  --color-gray-500: #8d8d8d; --color-gray-700: #555555;

  --font-sans: "Pretendard Variable", Pretendard, system-ui, sans-serif;
}

/* ── 계층 2: shadcn semantic 토큰 → 브랜드 팔레트 매핑 (라이트만) ── */
:root {
  --radius: 0.625rem;
  --background: #ffffff;        --foreground: #000000;
  --card: #ffffff;             --card-foreground: #000000;
  --popover: #ffffff;          --popover-foreground: #000000;
  --primary: #f83c00;          --primary-foreground: #ffffff;   /* point */
  --secondary: #f1f1f1;        --secondary-foreground: #000000;
  --muted: #f1f1f1;            --muted-foreground: #555555;
  --accent: #f1f1f1;           --accent-foreground: #000000;
  --destructive: #970000;      --destructive-foreground: #ffffff;
  --border: #bebebe;           --input: #bebebe;   --ring: #f83c00;
}

/* ── 계층 3: semantic → Tailwind 유틸 브리지 ── */
@theme inline {
  --color-background: var(--background);   --color-foreground: var(--foreground);
  --color-card: var(--card);               --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);         --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);         --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);     --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);             --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);           --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive); --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);           --color-input: var(--input);   --color-ring: var(--ring);
  --radius-lg: var(--radius);
}
```

> 위 매핑 hex는 **제안값** (Open Question 2). shadcn init이 생성하는 기본 oklch 값을
> 이 브랜드 hex로 교체하는 방식.

### 폰트 (`index.html`)

```html
<link rel="stylesheet" as="style" crossorigin
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
```
`<html lang="en">` → `lang="ko"`.

### `src/lib/utils.ts` (shadcn 표준)

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

브랜드 팔레트는 `bg-red-300`처럼 직접, shadcn 컴포넌트는 `<Button>` 등으로 사용.

## Testing Strategy

테스트 러너 미설치. 검증은:

- **빌드 게이트:** `npm run build` (tsc strict) 통과
- **Lint:** `npm run lint` 통과 (shadcn 생성 파일이 `noUnusedLocals` 등에 안 걸리는지 확인)
- **수동 확인:** `npm run dev`로 (a) Pretendard 적용, (b) shadcn `Button`/`Badge`/`Card`가
  primary=point 색으로 렌더, (c) `bg-red-300` 등 브랜드 유틸 동작, (d) 기존 페이지/모달 정상.
- **토큰 대조:** 디자이너 팔레트 표의 모든 hex가 `@theme`에 1:1 존재하는지 리뷰.

테스트 러너 도입은 별도 결정.

## Boundaries

- **Always:** 색상 SSOT = `src/index.css`. 브랜드 색은 토큰 유틸(`bg-red-300`)만, 생 hex 금지.
  shadcn 컴포넌트는 `src/components/ui/`에만. `@/` alias 유지. `build`+`lint` 통과 후 커밋.
- **Ask first:** shadcn 외 추가 런타임 의존성, 폰트 self-host 전환, 다크모드 도입,
  기존 페이지 대규모 리팩토링, semantic 매핑값 대량 변경, ProfileModal을 shadcn Dialog로 교체.
- **Never:** 컴포넌트에 브랜드 hex 하드코딩, `tailwind.config.js` 생성(v4 위배),
  시크릿 커밋, `wiki/` 직접 수정, 디자이너 팔레트에 없는 임의 색 추가.

## Success Criteria

- [ ] 디자이너 팔레트의 모든 hex가 `@theme`에 `--color-<계열>-<weight>`로 선언됨
      (red 3 / green 3 / yellow 5 / blue 3 / lime / orange(point) / purple / indigo / coral / gray 4).
- [ ] `bg-red-300`, `text-blue-700`, `bg-orange-500`, `bg-gray-100` 등 유틸리티 적용 가능(빌드 통과).
- [ ] Pretendard 전역 적용 + `index.html lang="ko"`.
- [ ] shadcn 설치 완료: `components.json`, `src/lib/utils.ts(cn)`, `src/components/ui/`에
      `button`·`card`·`badge` 존재, semantic 토큰이 브랜드 팔레트에 매핑됨.
- [ ] shadcn `Button`(primary=point), `Badge`, `Card`가 데모에서 정상 렌더.
- [ ] `npm run build` + `npm run lint` 통과, 기존 5개 페이지·헤더·모달 정상.

## Open Questions

1. **shadcn base color / style** — init 시 base color(neutral/gray/stone/zinc/slate)와
   style(new-york 권장) 선택. 제안: **base=neutral, style=new-york**. (구현 중 확정)
2. **semantic 매핑값** — 위 `:root` 매핑(primary=point, destructive=red-800,
   border=gray-400 등)이 디자인 의도와 맞는지 검토. 특히 `--border`(#BEBEBE) 진하기,
   `--muted-foreground`(#555555) 적정성.
3. **라벨 없는 색 용도** `purple-300/indigo-300/coral-300` — 토큰 선언만, UI 미적용(용도 후속).
4. **추가 컴포넌트 범위** — 이번엔 `button/card/badge`만. `dialog`(ProfileModal 대체),
   `input`/`select`(발제 등록 폼) 등은 후속 단계.
5. **태그 색 매핑** — 발제 4태그(토론=red, 대입=green, 확장=yellow, 이해=blue)와 브랜드
   weight의 대응은 컴포넌트 단계에서 정의(이번 범위는 전역 색 선언까지).
