# 음성 전사 백엔드 셋업 (Supabase + Cloudflare R2 + RTZR)

스펙/계획: [`../docs/specs/audio-upload-transcribe-store/`](../docs/specs/audio-upload-transcribe-store/)

구성: 브라우저 → **R2(presigned PUT)** → **Edge Function** → **RTZR** → **Postgres `transcriptions`**.
폴링은 `pg_cron`(10초)이 `stt-poll`을 호출한다.

## 0. 사전 준비

- Supabase CLI 설치: `brew install supabase/tap/supabase` (또는 공식 문서)
- 프로젝트 링크: `supabase link --project-ref <project-ref>`

## 1. Cloudflare R2 (T1)

1. R2에서 버킷 `audio-uploads` 생성(**비공개**).
2. R2 API 토큰(S3 호환 액세스 키/시크릿) 발급.
3. 버킷 CORS에 앱 오리진의 `PUT` 허용. 예:
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

## 2. Supabase 시크릿 (T1)

```bash
supabase secrets set \
  RTZR_CLIENT_ID=... RTZR_CLIENT_SECRET=... \
  R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=audio-uploads \
  CRON_SECRET=$(openssl rand -hex 16)
```
> `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY`는 함수에 자동 주입된다.

## 3. DB 마이그레이션 (T2, T6)

```bash
supabase db push
```
적용 내용: `transcriptions` 테이블 + 최소 RLS, `pg_cron`/`pg_net` 확장, `stt-poll` 10초 스케줄.

이후 **Vault 시크릿**을 등록한다(대시보드 SQL Editor 또는 psql):
```sql
select vault.create_secret('https://<project-ref>.functions.supabase.co/stt-poll', 'edge_stt_poll_url');
select vault.create_secret('<위 CRON_SECRET와 동일한 값>', 'cron_secret');
```

## 4. Edge Function 배포 (T3~T6)

```bash
supabase functions deploy stt-presign
supabase functions deploy stt-submit
# stt-poll은 pg_net이 사용자 JWT 없이 호출하므로 JWT 검증 비활성화 + x-cron-secret로 보호
supabase functions deploy stt-poll --no-verify-jwt
```

## 5. 로컬 개발

```bash
supabase functions serve   # 함수 로컬 실행
pnpm dev                   # 프론트(/stt 라우트)
```

## 6. 동작 확인 (수동, v1)

1. 로그인 후 `/stt`에서 짧은 한국어 음성 업로드.
2. `transcriptions` row가 `uploading → transcribing → completed`로 전이, `utterances` 채워짐.
3. R2 버킷에 객체가 남아 있음(영구 보관).
4. 빌드 번들에 자격증명 없음: `pnpm build && grep -rE 'RTZR|R2_' dist/` → 결과 없음.
