# 태스크: 음성 업로드 → 한국어 전사 → 저장

> 대상 계획: [`plan.md`](./plan.md) · 스펙: [`spec.md`](./spec.md)
> 검증 기준: 자동 테스트 미도입(v1). 빌드 `pnpm build`, 린트 `pnpm lint`, 그 외 수동 확인.

---

## Phase 0: 기반

### T1: R2 버킷·CORS·자격증명 + Supabase 시크릿 등록

**설명:** Cloudflare R2에 `audio-uploads` 버킷을 만들고, 브라우저 직접 PUT을 위한
CORS를 설정하고, S3 호환 액세스 키를 발급한다. RTZR·R2 자격증명을 Supabase
Edge Function 시크릿으로 등록한다. (인프라 + 문서 작업)

**수용 기준:**
- [ ] R2 버킷 `audio-uploads` 생성(비공개), CORS에 앱 오리진의 PUT 허용
- [ ] RTZR/R2 자격증명이 `supabase secrets`에 등록(`VITE_` 접두 없음)
- [ ] 셋업 절차가 `docs/specs/.../plan.md` 또는 별도 README에 기록

**검증:**
- [ ] 수동: 발급 키로 임시 presigned PUT을 만들어 파일 업로드 성공
- [ ] 수동: `supabase secrets list`에 RTZR_*/R2_* 노출 없이 등록 확인

**의존성:** 없음
**파일:** (코드 없음 — Cloudflare 대시보드/CLI, Supabase CLI, 문서)
**규모:** S

---

### T2: `transcriptions` 마이그레이션 + 최소 RLS

**설명:** `public.transcriptions` 테이블과 인덱스, `updated_at` 트리거, 최소
RLS(인증 사용자 자기 row SELECT)를 마이그레이션으로 작성한다.

**수용 기준:**
- [ ] 스펙 데이터 모델대로 컬럼 생성(`r2_object_key`, `status`, `utterances` jsonb 등)
- [ ] `status` CHECK 제약(`uploading|transcribing|completed|failed`)
- [ ] 인덱스: `(user_id)`, `(status)`(폴링 워커용)
- [ ] RLS 활성화 + `authenticated`의 `select using (auth.uid() = user_id)` 정책
- [ ] insert/update는 정책 없음 → Edge Function service role로만 수행

**검증:**
- [ ] `supabase db push` 성공
- [ ] 수동: 다른 사용자 row가 anon/authenticated로 조회되지 않음 확인

**의존성:** 없음
**파일:**
- `supabase/migrations/NNNN_transcriptions.sql`
**규모:** S

---

### T3: 공용 로직(RTZR/R2/CORS/Supabase) — 자체완결형 함수에 인라인

**설명:** 대시보드 복붙 배포(선택지 A)를 위해 별도 `_shared` 모듈 대신 각 함수에
공용 로직을 인라인한다. 공용 로직: CORS/JSON 응답, env fail-fast, Supabase
admin/getUser, R2 presign(PUT)·get, RTZR 인증 캐시·제출(FormData)·폴링·오류 매핑.
RTZR 로직은 참고 브랜치 `sttClient.ts`의 검증된 흐름을 Deno env 기반으로 이식.

**수용 기준:**
- [ ] CORS 헤더/프리플라이트 처리
- [ ] `authenticate()`(토큰 캐시), `submitTranscribeFile(blob, name, config)`,
      `pollTranscribe(id)` — Deno env에서 자격증명 읽기
- [ ] `presignPut(key, contentType, expiresSec)`, `getObject(key)` (S3 호환)
- [ ] 시크릿 누락 시 즉시 실패(fail fast)
- [ ] 각 함수가 외부 상대 import 없이 단독 배포 가능

**검증:**
- [ ] `pnpm build`/`pnpm lint`는 프론트 한정 — 함수는 대시보드 배포 후 부팅 확인
- [ ] 수동: presign URL에 PUT 성공, getObject로 다운로드 성공

**의존성:** T1
**파일:** (T4~T6 함수 파일에 인라인)
- `supabase/functions/stt-presign/index.ts`
- `supabase/functions/stt-submit/index.ts`
- `supabase/functions/stt-poll/index.ts`
**규모:** M

---

### ✅ 체크포인트: 기반
- [ ] `supabase db push` 성공, 테이블·RLS 적용 확인
- [ ] `supabase functions serve` 부팅 확인
- [ ] R2 수동 PUT/GET 성공

---

## Phase 1: 업로드 경로

### T4: `stt-presign` Edge Function

**설명:** 로그인 사용자의 요청을 받아 `transcriptions` row를 `status='uploading'`로
생성하고, R2 객체 키 `{user_id}/{id}/{filename}`에 대한 presigned PUT URL을 반환한다.

**수용 기준:**
- [ ] Authorization(Supabase JWT) 검증 — 미인증 401
- [ ] 요청 본문: `{ fileName, fileSize, contentType }` 검증(포맷/크기 상한 200MB)
- [ ] row 생성(service role): `user_id`, `r2_object_key`, `file_name`, `file_size`,
      `status='uploading'`, `config`(기본값)
- [ ] 응답: `{ transcriptionId, uploadUrl, objectKey }` (URL 만료 ~5분)

**검증:**
- [ ] 수동(cURL): 인증 헤더로 호출 → URL 수신 → 해당 URL에 PUT 성공 → R2에 객체 확인
- [ ] 수동: 미인증 호출 401, 미지원 포맷/초과 크기 400

**의존성:** T2, T3
**파일:**
- `supabase/functions/stt-presign/index.ts`
**규모:** S

---

## Phase 2: 전사 파이프라인

### T5: `stt-submit` Edge Function (R2 → RTZR 파일 제출)

**설명:** `transcriptionId`를 받아 R2에서 객체를 가져와 RTZR `/v1/transcribe`로
**`FormData`(파일 통째)로 제출**하고(참고 `sttClient.ts` 방식), 반환된 `id`를 row에
저장하며 `status='transcribing'`로 갱신한다.

**수용 기준:**
- [ ] 요청: `{ transcriptionId }`; 소유자 확인(JWT의 uid == row.user_id)
- [ ] R2 `getObject` → `blob()` → `FormData`에 담아 RTZR 제출
- [ ] 성공 시 `rtzr_transcribe_id` 저장 + `status='transcribing'`
- [ ] RTZR 오류(H0010/H0005/H0006 등) → `status='failed'` + `error_code/message` 매핑
- [ ] 즉시 반환(폴링은 T6이 담당)

**검증:**
- [ ] 수동: T4 업로드 후 호출 → row가 `transcribing` + `rtzr_transcribe_id` 보유
- [ ] 수동: 1시간 내외 음성으로 메모리 한계 내 동작 실측(리스크 검증)

**의존성:** T3, T4
**파일:**
- `supabase/functions/stt-submit/index.ts`
**규모:** M

---

### T6: `stt-poll` Edge Function + pg_cron 10초 스케줄

**설명:** `status='transcribing'` row를 모아 RTZR를 폴링하고, `completed`면
`utterances` 저장 + `status='completed'`, `failed`면 오류 저장. pg_cron이 10초마다
`pg_net`으로 함수를 호출하도록 마이그레이션을 추가한다.

**수용 기준:**
- [ ] 진행 중 row 조회(tick당 최대 N개) → 각 RTZR 폴링
- [ ] `completed`: `utterances` jsonb 저장, `status='completed'`
- [ ] `failed`: `error_code/message`, `status='failed'`
- [ ] 429(A0003) 백오프 처리; 작업당 최대 대기(기본 30분) 초과 시 `failed`
- [ ] pg_cron 10초 스케줄 + `pg_net` 호출 마이그레이션(확장 활성화 포함)

**검증:**
- [ ] 수동: T5 이후 자동으로 row가 `completed`+`utterances` 도달
- [ ] 수동: 강제 실패 케이스가 `failed`로 기록

**의존성:** T5
**파일:**
- `supabase/functions/stt-poll/index.ts`
- `supabase/migrations/NNNN_cron_stt_poll.sql`
**규모:** M

---

### ✅ 체크포인트: 백엔드 파이프라인
- [ ] presign→PUT→submit→poll end-to-end(cURL/스크립트) 동작
- [ ] 실제 1시간 내외 한국어 음성으로 `completed`+`utterances` 확인
- [ ] 번들/로그에 자격증명 노출 없음

---

## Phase 3: 프론트 + 마무리

### T7: `src/AudioStt.tsx` 임시 단일 화면

**설명:** 파일 선택+클라이언트 검증 → `stt-presign` 호출 → R2 직접 PUT →
`stt-submit` 호출 → `transcriptions` row 폴링 → 완료 시 utterances 렌더까지 한
컴포넌트에서 처리한다. 훅/lib 분리 없음.

**수용 기준:**
- [ ] 로그인 세션 없으면 업로드 동작 비활성/안내
- [ ] 클라이언트 검증: 포맷(mp3/wav/m4a/flac/amr/mp4), 크기 상한(200MB)
- [ ] 상태 표시: `uploading → transcribing → completed/failed`
- [ ] 완료 시 `utterances`를 시간/화자와 함께 렌더(참고 `SttTest.tsx` 표시 형태 차용)
- [ ] 오류는 친절한 메시지로 표시(raw 코드 노출 X)

**검증:**
- [ ] 수동: 한국어 음성 업로드 → 화면에 전사 표시 end-to-end
- [ ] `pnpm build` 통과

**의존성:** T4, T5, T6
**파일:**
- `src/AudioStt.tsx`
- `src/App.tsx` (라우트 — T8과 함께 가능)
**규모:** M

---

### T8: 라우트 연결 + `.env` 예시/문서 + 정리

**설명:** `AudioStt`를 임시 라우트(예: `/stt`)에 연결하고, `.env.example`과 셋업
문서를 정리한다. 잔재 `package-lock.json` 삭제(승인 후).

**수용 기준:**
- [ ] `/stt` 라우트에서 화면 접근 가능
- [ ] `.env.example`에 `VITE_SUPABASE_*` 명시(서버 시크릿은 별도 안내, `VITE_` 금지 강조)
- [ ] README/plan에 R2·Supabase·RTZR 셋업 절차 정리
- [ ] (승인 시) `package-lock.json` 삭제, pnpm 단일화

**검증:**
- [ ] `pnpm build` / `pnpm lint` 통과
- [ ] 수동: 새 환경에서 문서만 보고 셋업 재현 가능

**의존성:** T7
**파일:**
- `src/App.tsx`
- `.env.example`
- `README.md` 또는 `docs/specs/.../plan.md`
**규모:** S

---

### ✅ 체크포인트: 완료
- [ ] 스펙 "성공 기준" 전 항목 충족
- [ ] `pnpm build` / `pnpm lint` 통과
- [ ] 사람 리뷰 후 머지
