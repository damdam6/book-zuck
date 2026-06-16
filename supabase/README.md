# 음성 전사 백엔드 셋업 (클라우드 대시보드 only, CLI 불필요)

스펙/계획: [`../docs/specs/audio-upload-transcribe-store/`](../docs/specs/audio-upload-transcribe-store/)

구성: 브라우저 → **R2(presigned PUT)** → **Edge Function** → **RTZR** → **Postgres `transcriptions`**.
폴링은 `pg_cron`(10초)이 `stt-poll`을 호출한다.

> Edge Function 3개는 **자체완결형(파일 1개)**이라 Supabase 대시보드 편집기에
> 그대로 복붙해서 배포할 수 있다. CLI/로컬 설치 불필요.

## 1. Cloudflare R2

1. R2에서 버킷 `audio-uploads` 생성(**비공개**).
2. R2 API 토큰(S3 호환 Access Key ID / Secret) 발급 → 값 보관.
3. 계정 ID(`R2_ACCOUNT_ID`) 확인(R2 개요 페이지).
4. 버킷 **Settings → CORS Policy**에 앱 오리진의 `PUT` 허용:
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:5173", "https://<배포-도메인>"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

## 2. DB 마이그레이션 — 대시보드 SQL Editor

Supabase 대시보드 → **SQL Editor**에서 아래 두 파일 내용을 순서대로 실행:
1. `migrations/20260614000001_transcriptions.sql` (테이블 + 최소 RLS + 트리거)
2. `migrations/20260614000002_cron_stt_poll.sql` (pg_cron/pg_net + 10초 스케줄)

이어서 **Vault 시크릿** 등록(같은 SQL Editor):
```sql
select vault.create_secret('https://<project-ref>.functions.supabase.co/stt-poll', 'edge_stt_poll_url');
select vault.create_secret('<랜덤문자열-CRON_SECRET와 동일값>', 'cron_secret');
```

## 3. Edge Function 시크릿 — 대시보드

대시보드 → **Edge Functions → Secrets**에 등록:

| 키 | 값 |
|---|---|
| `RTZR_CLIENT_ID` / `RTZR_CLIENT_SECRET` | RTZR 콘솔 발급 |
| `RTZR_BASE_URL` (선택) | `https://openapi.vito.ai` |
| `R2_ACCOUNT_ID` | Cloudflare 계정 ID |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 키 |
| `R2_BUCKET` | `audio-uploads` |
| `CRON_SECRET` | 위 Vault `cron_secret`과 **동일한 값** |

> `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`는 함수에 자동 주입된다.

## 4. Edge Function 배포 — 대시보드 편집기

대시보드 → **Edge Functions → Create a new function**. 함수 이름과 파일 내용을
아래대로 복붙 후 Deploy:

| 함수 이름 | 붙여넣을 파일 | Verify JWT |
|---|---|---|
| `stt-presign` | `functions/stt-presign/index.ts` | 켜둠(기본) |
| `stt-submit` | `functions/stt-submit/index.ts` | 켜둠(기본) |
| `stt-poll` | `functions/stt-poll/index.ts` | **꺼야 함** (cron이 JWT 없이 호출) |

> `stt-poll`은 생성/설정에서 **"Verify JWT" 옵션을 OFF**로 둔다. 대신 코드가
> `x-cron-secret` 헤더(= `CRON_SECRET`)로 보호한다.

## 5. 프론트 환경 변수

`.env`(루트)에 브라우저 변수만:
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## 6. 동작 확인 (수동, v1)

1. 로그인 후 `/stt`에서 휴대폰 녹음(m4a/mp3) 업로드.
2. `transcriptions` row가 `uploading → transcribing → completed`로 전이, `utterances` 채워짐.
3. R2 버킷에 객체가 남아 있음(영구 보관).
4. 빌드 번들에 자격증명 없음: `pnpm build && grep -rE 'RTZR|R2_' dist/` → 결과 없음.
