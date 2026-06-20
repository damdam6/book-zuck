---
status: accepted
---

# Supabase를 백엔드로 사용한다

## 맥락

북적이는 데이터 저장소와 API가 필요하지만 자체 백엔드 서버 코드는 두지 않는다.
`src/lib/supabaseClient.ts`가 프런트엔드에서 직접 Supabase 클라이언트를 생성한다.

## 결정

Supabase(호스티드 Postgres + 자동 생성 API)를 백엔드로 채택한다.
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`로 단일 공유 클라이언트를 초기화하고,
UI 컴포넌트가 이를 통해 직접 질의한다. 인증도 Supabase Auth(구글 로그인)를 사용한다.

## 근거 (3-criteria)

- **되돌리기 어려움:** BaaS 채택은 Supabase 클라이언트·인증 모델·Postgres 관례를 앱
  전반에 박는다. 교체 시 데이터 계층 전체를 다시 써야 한다.
- **비자명함:** anon 키가 클라이언트 번들에 포함되므로, 데이터 보호는 서버 비밀이
  아니라 전적으로 Row Level Security(RLS)에 의존한다.
- **실제 트레이드오프:** BaaS(빠른 셋업, 백엔드 코드 없음) vs 커스텀 API(통제력↑,
  작업량↑); 클라이언트 anon 키+RLS vs 서버 프록시.

## 영향

- 운영할 서버가 없어 반복이 빠르다.
- 보안은 Supabase RLS에 의존한다(anon 키는 번들에 공개됨).
- 앱이 Supabase 질의 API에 결합된다 — 현재 호출부를 감싸는 리포지토리 추상화가 없다.

## 근거 코드

- `src/lib/supabaseClient.ts:1-13`
- `src/hooks/useAuth.ts`
- `src/AudioStt.tsx`
