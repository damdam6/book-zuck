# 스펙: 음성 업로드 → 한국어 전사 → 저장

> 상태: **초안 — 사람 승인 대기 중** (Phase 1 / SPECIFY)
> 브랜치: `feat/audio-upload-transcribe-store`
> `worktree-rtzr-stt-doc`의 DEV 전용 브라우저 직접 호출 클라이언트를 대체함.

## 목표 (Objective)

로그인한 사용자가 음성 녹음 파일을 업로드하면, 백엔드가 RTZR/VITO STT API로
**한국어** 전사를 수행하고, 그 결과를 Supabase에 저장해 나중에 다시 읽을 수
있게 한다. 음성 원본 파일은 **Cloudflare R2**에 영구 보관한다.

참고 브랜치 `worktree-rtzr-stt-doc`는 RTZR 왕복 호출이 동작함을 검증했지만,
`client_secret`을 브라우저 번들에 포함시켜(`VITE_RTZR_*`) **브라우저에서 직접**
RTZR를 호출한다. 해당 문서(`docs/rtzr-stt-api.md` §9.3) 스스로 **이대로 배포하지
말라**고 명시한다. 이 스펙은 그 흐름을 제대로 된 시스템으로 재구성한다:
브라우저 → **Cloudflare R2** → **Supabase Edge Function** → RTZR → Supabase 테이블.

> **왜 R2인가:** 대상 음성이 1~1.5시간(압축 m4a/mp3 기준 약 60~130MB, WAV는 수백
> MB)이라 Supabase Storage 무료 한도(파일당 50MB, 총 1GB)로는 영구 보관이
> 불가능하다. Cloudflare R2는 무료 10GB·파일 크기 제한 없음·egress 무료라 이
> 워크로드에 적합하다. (자세한 비교는 결정 #3 참고.)

### 사용자 스토리

1. **로그인한 사용자로서**, 음성 파일(mp3/wav/m4a/flac/amr/mp4)을 선택해 업로드할
   수 있고, 업로드 진행 상황 / 검증 오류를 볼 수 있다.
2. **시스템으로서**, 업로드된 파일을 Cloudflare R2 버킷에 저장한다.
3. **백엔드로서**, 저장된 파일을 RTZR에 한국어 인식 요청으로 제출하고, 사용자를
   막지 않으면서(non-blocking) 작업 상태를 추적한다.
4. **백엔드로서**, 전사가 완료되면 반환된 utterances를 업로드와 연결된 Supabase
   테이블에 저장한다.
5. **로그인한 사용자로서**, 전사 상태(`uploading → transcribing →
   completed/failed`)를 확인하고 완료된 전사 결과를 읽을 수 있다.

### 성공의 모습

- 사용자가 한국어 음성 클립을 업로드하면, 제공자(RTZR) 처리 시간 내에 읽을 수
  있는 한국어 전사 결과를 화면에서 본다 — 그리고 **RTZR · R2 자격 증명은 절대
  브라우저에 도달하지 않는다.**
- Postgres의 전사 행(row)에는 전체 `utterances[]`가 들어 있고, R2에 저장된 음성
  파일(객체 키)과 업로드한 사용자에 연결된다.

## 기술 스택 (Tech Stack)

- **프론트엔드:** Vite 6 + React 19 + TypeScript ~5.8, React Router 7, Tailwind 4
  (기존 SPA).
- **백엔드:** **Supabase Edge Functions** (Deno 런타임, TypeScript).
- **데이터/인증:** Supabase — Postgres + Auth (`@supabase/supabase-js` ^2.103).
- **음성 저장소:** **Cloudflare R2** (S3 호환 객체 스토리지). Edge Function에서
  AWS S3 호환 SDK / presigned URL로 접근.
- **스케줄러:** Supabase `pg_cron` (+ `pg_net` / 함수 호출) — 폴링 워커 구동.
- **STT 제공자:** RTZR / ReturnZero VITO OpenAPI (`https://openapi.vito.ai`),
  모델 `sommers`, `language: "ko"`. `docs/rtzr-stt-api.md` 참고.

## 결정 사항 (이해관계자와 확정, 2026-06-14)

| # | 결정 항목 | 선택 |
|---|----------|------|
| 1 | 백엔드 런타임 | **Supabase Edge Functions** (별도 서버 없음) |
| 2 | 비동기 처리 | **제출 + 예약 폴링 워커** (pg_cron), in-request 대기 아님 |
| 3 | 음성 저장소 | **Cloudflare R2** (무료 10GB·파일 크기 무제한·egress 무료) |
| 4 | 음성 보관 | **음성 원본 영구 보관** |
| 5 | 인증 범위 | **로그인 필수**; 세부 RLS/권한은 추후 반복에서 설계 |

→ 결정 1, 2, 3은 PLAN 단계에서 `docs/adr/` 아래 ADR로 기록할 가치가 있다.

## 아키텍처

업로드 경로는 **presigned URL 방식**으로 고정된다 — R2는 Supabase Auth와 묶여
있지 않으므로, 인증된 사용자에게만 Edge Function이 presigned URL을 발급해 브라우저가
R2에 직접 PUT 한다(대용량 파일이 Edge Function을 통과하지 않음).

```
┌──────────┐ 1.presign 요청  ┌────────────────────┐
│ 브라우저  │ ───────────────▶│ Edge: stt-presign  │  (PUT용 presigned URL + 객체키 발급)
│ (React)  │ ◀───────────────│  - 로그인 확인      │
│          │   URL+키         └────────────────────┘
│          │ 2.파일 직접 PUT   ┌────────────────────┐
│          │ ───────────────▶ │ Cloudflare R2       │
│          │                  │  버킷: audio-uploads │
│          │ 3.submit(객체키)  └────────────────────┘
│          │ ─────────────┐              ▲
└────┬─────┘              ▼              │ GET(객체 다운로드)
     │           ┌──────────────────┐    │
     │ 6. 상태   │ Edge: stt-submit │────┘
     │  조회     │  - R2에서 다운로드 │  4. POST /v1/transcribe
     │           │  - RTZR 인증      │ ─────────────────────▶ RTZR
     │           │  - row 삽입       │  ◀───── { id }          (VITO)
     ▼           │    status=        │                          ▲
┌──────────┐     │    transcribing   │                          │
│transcriptions│◀└──────────────────┘                          │
│  테이블    │            ▲                                     │
└──────────┘             │ completed/failed 로 update           │
     ▲      ┌─────────────┴────────┐  5. GET /v1/transcribe/{id}│
     └──────│ Edge: stt-poll       │ ───────────────────────────┘
            │ (pg_cron 약 30초마다) │
            └──────────────────────┘
```

**in-request 대기를 안 하는 이유:** RTZR 작업은 최대 ~30분까지 걸릴 수 있는데,
Edge Function은 실행 시간 제한이 짧다. `stt-submit`은 작업이 접수되면 즉시
반환하고, `stt-poll`(cron)이 작업을 안정적으로 종료 상태까지 진행시킨다.

**대용량 파일 주의:** RTZR `/v1/transcribe`는 multipart 파일 업로드만 받고 URL
입력을 지원하지 않는다(문서 §3). 따라서 `stt-submit`이 R2에서 파일을 받아 RTZR로
**스트리밍 전달**해야 한다. 1~1.5시간 압축 파일(~60~130MB)은 스트리밍으로 처리
가능하나, 대형 WAV(수백 MB)는 Edge Function 메모리/시간 제한에 닿을 수 있다 →
미해결 질문 참고.

## 프로젝트 구조

> **프론트엔드는 구조화하지 않는다.** 업로드 → 상태 표시 → 전사 결과를 **임시
> 화면 하나**(단일 컴포넌트)에서 모두 처리한다. 별도의 페이지/컴포넌트/훅/lib
> 분리 없이 한 파일에 담는다. 이 화면은 시스템(백엔드 파이프라인)을 검증하기 위한
> 임시 UI이며, 정식 UI는 이후 별도 작업으로 다룬다.

```
src/
  AudioStt.tsx              → 임시 단일 화면: 파일 선택+검증, presign 요청,
                              R2 직접 PUT, stt-submit 호출, 상태 조회, 전사 렌더링까지 한 곳에서
  lib/
    supabaseClient.ts       → (기존) 공용 클라이언트 — 그대로 사용
supabase/
  functions/
    stt-presign/index.ts    → 로그인 확인, R2 PUT용 presigned URL + 객체키 발급
    stt-submit/index.ts     → R2에서 객체 다운로드, RTZR 인증, POST transcribe, row 삽입
    stt-poll/index.ts       → 진행 중 작업 RTZR 폴링, row 갱신
    _shared/r2.ts           → R2(S3 호환) 클라이언트: presign(PUT) + get(다운로드)
    _shared/rtzr.ts         → RTZR 인증 + transcribe + poll 헬퍼 (서버 측, secret 보관)
    _shared/cors.ts         → CORS 헤더
  migrations/
    NNNN_transcriptions.sql → 테이블 + 인덱스 + (추후) RLS 정책
    NNNN_cron_stt_poll.sql  → stt-poll pg_cron 스케줄
docs/
  rtzr-stt-api.md           → 제공자 레퍼런스 (참고 브랜치에서 가져옴)
  specs/audio-upload-transcribe-store/  → 이 스펙, plan, tasks
  adr/                      → 백엔드-런타임 + 비동기-워커 + R2-저장소 결정 ADR
```

> R2 버킷(`audio-uploads`) 생성과 CORS 설정은 Cloudflare 대시보드/Wrangler에서
> 수행한다(Supabase 마이그레이션 대상 아님). PLAN에서 셋업 절차를 문서화한다.

> 참고 브랜치의 `src/SttTest.tsx`, `src/stt-test.tsx`, `src/lib/sttClient.ts`,
> `stt-test.html`, 그리고 `/rtzr` Vite 프록시는 **DEV 전용 프로토타입**이며 이
> 시스템으로 가져오지 **않는다**. `docs/rtzr-stt-api.md`는 가져온다.

## 데이터 모델 (제안 — PLAN에서 다듬기)

`public.transcriptions`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `user_id` | `uuid` → `auth.users` | 업로더 |
| `r2_object_key` | `text` | R2 `audio-uploads` 내 객체 키 |
| `file_name` | `text` | 원본 파일명 |
| `file_size` | `bigint` | 바이트 |
| `status` | `text` | `uploading` \| `transcribing` \| `completed` \| `failed` |
| `rtzr_transcribe_id` | `text` null | RTZR 작업 id |
| `language` | `text` default `'ko'` | |
| `config` | `jsonb` | RTZR에 보낸 TranscribeConfig |
| `utterances` | `jsonb` null | 완료 시 전체 `results.utterances[]` |
| `error_code` / `error_message` | `text` null | 실패 시 |
| `created_at` / `updated_at` | `timestamptz` | |

R2 버킷: `audio-uploads`, 객체 키 `{user_id}/{transcription_id}/{filename}`.

## 명령어 (Commands)

```
개발(프론트엔드):       pnpm dev
빌드:                   pnpm build           # tsc -b && vite build
린트:                   pnpm lint            # eslint .
Edge 함수 로컬 실행:    supabase functions serve stt-submit
Edge 함수 배포:         supabase functions deploy stt-submit
DB 마이그레이션 적용:   supabase db push     # (또는 CLI migration up)
Supabase 시크릿:        supabase secrets set RTZR_CLIENT_ID=... RTZR_CLIENT_SECRET=... \
                          R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=...
```

> 패키지 매니저는 **pnpm**으로 확정한다(`pnpm-lock.yaml`이 최신, 2026-04-27).
> 오래된 `package-lock.json`(2026-04-03)은 잔재이므로 정리 대상. Supabase CLI를
> dev 의존성으로 추가할지 독립 실행할지는 PLAN에서 확정.

## 환경 변수

| 변수 | 위치 | 용도 |
|------|------|------|
| `VITE_SUPABASE_URL` | 브라우저 | 기존 |
| `VITE_SUPABASE_ANON_KEY` | 브라우저 | 기존 |
| `RTZR_CLIENT_ID` | **Edge Function 시크릿** | RTZR client id — **절대** `VITE_` 금지 |
| `RTZR_CLIENT_SECRET` | **Edge Function 시크릿** | RTZR secret — **절대** `VITE_` 금지 |
| `RTZR_BASE_URL` | Edge Function 시크릿(선택) | 기본값 `https://openapi.vito.ai` |
| `R2_ACCOUNT_ID` | **Edge Function 시크릿** | Cloudflare 계정 ID |
| `R2_ACCESS_KEY_ID` | **Edge Function 시크릿** | R2 액세스 키 — **절대** `VITE_` 금지 |
| `R2_SECRET_ACCESS_KEY` | **Edge Function 시크릿** | R2 시크릿 키 — **절대** `VITE_` 금지 |
| `R2_BUCKET` | Edge Function 시크릿 | `audio-uploads` |

참고 브랜치의 `VITE_RTZR_*` 변수는 **제거**된다. RTZR·R2 자격 증명은 모두 서버
측(Edge Function 시크릿)에만 두며 브라우저 번들에서 접근 가능해서는 안 된다.

## 코드 스타일

기존 레포 컨벤션을 따른다(`src/lib/supabaseClient.ts`, `src/hooks/useAuth.ts`
참고): TypeScript, 큰따옴표, named export, `src`에 대한 `@/` import alias, 환경
변수 누락 시 즉시 실패(fail fast). 단, **프론트는 임시 단일 컴포넌트**이므로 훅/lib
분리 없이 한 파일(`src/AudioStt.tsx`)에서 상태와 로직을 모두 다룬다. 형태 예시:

```tsx
// src/AudioStt.tsx — 임시 단일 화면
type Status = "idle" | "uploading" | "transcribing" | "completed" | "failed";

export function AudioStt() {
  const [status, setStatus] = useState<Status>("idle");
  const [row, setRow] = useState<TranscriptionRow | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const run = async (file: File) => {
    // 1) 클라이언트 검증(포맷/크기) → 2) stt-presign 호출로 URL+키 받기 →
    // 3) 파일을 R2에 직접 PUT → 4) stt-submit(객체키) 호출 →
    // 5) 상태 조회(폴링) → 6) 완료 시 utterances 렌더링 — 전부 이 컴포넌트 안에서
  };

  // 파일 input + 상태 표시 + 전사 결과를 한 화면에 렌더
}
```

서버 측(Edge Function)은 시크릿을 보관하고 참고 `sttClient.ts`의 검증된 로직을
그대로 반영하되, `import.meta.env`가 아니라 Deno env에서 자격 증명을 읽는다:

```ts
// supabase/functions/_shared/rtzr.ts
const BASE = Deno.env.get("RTZR_BASE_URL") ?? "https://openapi.vito.ai";
const clientId = Deno.env.get("RTZR_CLIENT_ID")!;
const clientSecret = Deno.env.get("RTZR_CLIENT_SECRET")!;
```

## 테스트 전략

- **프론트엔드:** 임시 단일 화면이므로 자동화 테스트 대상에서 제외하고 **수동
  확인**으로 검증한다(파일 선택 → 검증 오류/업로드 → 상태 전이 → 전사 표시).
  포맷/크기 검증 로직만 추후 순수 함수로 떼어내면 단위 테스트 가능.
- **Edge Function:** `stt-presign` / `stt-submit` / `stt-poll`을
  `supabase functions serve`로 샘플 음성에 대해 로컬 테스트, row 전이
  `transcribing → completed` 검증. 가능하면 RTZR·R2는 모킹.
- **통합(수동, 게이트):** 실제 1시간 내외 한국어 음성으로 end-to-end 1회 실행 →
  R2에 객체 생성 + `transcriptions`에 row 생성 + UI에 전사 표시 확인.
- **오류 매핑:** RTZR 오류 코드(`H0010`, `H0005`, `H0006`, `A0001/2/3`)가 raw 코드가
  아니라 친절한 사용자 메시지로 매핑되는지 검증.

## 경계 (Boundaries)

- **항상(Always):** RTZR·R2 자격 증명은 서버 측에만 보관(`VITE_` 접두 금지);
  업로드 전 + Edge Function 양쪽에서 파일 포맷/크기 검증; presigned URL은 로그인
  사용자에게만 발급; 커밋 전 `pnpm lint`와 `pnpm build` 실행.
- **먼저 물어보기(Ask first):** DB 스키마/마이그레이션 변경, 의존성 추가(Supabase
  CLI, S3 SDK 등), pg_cron/pg_net 활성화, R2 버킷/CORS 설정 변경, RLS 정책 최종
  설계, 잔재 `package-lock.json` 삭제.
- **절대 금지(Never):** 시크릿이나 `.env` 커밋; 브라우저 직접 호출 RTZR 클라이언트
  배포; R2 버킷을 공개(public) 설정; 사용자 음성 삭제(결정 #4에 따라 보관 = 영구);
  승인 없이 실패 테스트 삭제.

## 성공 기준 (검증 가능)

- [ ] 로그아웃 사용자는 업로드/presign에 접근 불가; 로그인 사용자는 가능.
- [ ] 미지원 포맷 또는 한도 초과 파일 업로드는 클라이언트 측에서 친절한 메시지와
      함께 거부됨(R2·RTZR로 네트워크 호출 없음).
- [ ] 유효한 업로드는 R2 `{user_id}/{id}/` 아래 객체와, `status='transcribing'`
      및 `rtzr_transcribe_id`를 가진 `transcriptions` row를 생성.
- [ ] 빌드된 브라우저 번들 어디에도 RTZR·R2 자격 증명이 나타나지 않음
      (`grep -rE 'RTZR|R2_' dist/`에 민감 정보 없음).
- [ ] `stt-poll` 워커가 실제 작업을 `status='completed'`(+`utterances` 채움) 또는
      `status='failed'`(+`error_code/message`)로 진행.
- [ ] UI가 상태를 보여주고 완료된 한국어 전사를 렌더링.
- [ ] 완료 후에도 음성 파일이 R2에 남아 있음(영구 보관).

## 미해결 질문 (PLAN 이전/중에 해결)

1. **UI 상태 전달:** **추후 결정(보류)** — v1은 단일 임시 화면이라 가장 단순한
   클라이언트 폴링(`transcriptions` row 주기 조회)으로 구현하고, Supabase Realtime
   구독 전환은 나중에 결정한다.
2. **대용량 파일의 RTZR 전달:** RTZR가 URL 입력을 지원하지 않으므로 `stt-submit`이
   R2 파일을 받아 스트리밍 전달해야 한다. 1.5시간 대형 WAV(수백 MB)에서 Edge
   Function 메모리/시간 제한 검증 필요 — 한계 시 (a) 업로드 단계에서 권장 포맷/비트레이트
   안내, (b) 별도 워커/청크 처리 검토. → PLAN에서 확정.
3. **pg_cron 주기 & 배치:** 간격(예: 30초), tick당 최대 작업 수, `failed`로
   표시하기 전 작업당 최대 대기(API 문서상 ~30분 상한 제안).
4. **RTZR `config` 기본값:** diarization on/off, `spk_count` 자동(0)? 참고 기본값
   (`sommers`, `use_diarization: true`, `spk_count: 0`) 그대로 유지?
5. **테스트 러너:** Edge Function 자동화 테스트에 Vitest 도입 vs v1은 수동 검증으로?
   (프론트는 수동 확정.)
6. **RLS 세부:** 결정 #5에 따라 보류 — v1 최소 안전 정책(예: 인증된 사용자만 자기
   row insert/select)인가, 완전 공개인가?
7. **클라이언트 파일 크기 상한:** R2는 사실상 무제한이나 RTZR 한도(2GB·4시간)와
   Edge 스트리밍 한계를 고려해 UI 상한을 정한다(예: 500MB 권장).
```
