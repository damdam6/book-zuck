# 구현 계획: 음성 업로드 → 한국어 전사 → 저장

> 대상 스펙: [`spec.md`](./spec.md) · 브랜치: `feat/audio-upload-transcribe-store`
> 상태: **초안 — 사람 승인 대기 중** (Phase 2 / PLAN)

## 개요

브라우저(임시 단일 화면)에서 음성 파일을 받아 **Cloudflare R2**에 직접 업로드하고,
**Supabase Edge Function**이 R2 파일을 RTZR/VITO STT로 제출해 한국어 전사를 수행한 뒤,
**pg_cron 폴링 워커**가 결과를 받아 Supabase `transcriptions` 테이블에 저장한다.
음성 원본은 R2에 영구 보관한다.

## 아키텍처 결정 (스펙 + PLAN 확정 사항)

- **백엔드:** Supabase Edge Functions (Deno). 별도 서버 없음.
- **저장소:** Cloudflare R2 (S3 호환). 업로드는 **presigned PUT URL** 방식 —
  브라우저가 R2에 직접 PUT(대용량이 Edge Function을 통과하지 않음).
- **비동기:** `stt-submit`은 즉시 반환, `stt-poll`(pg_cron **10초** 주기)이 종료까지 진행.
- **row 생성 위치(스펙 대비 정제):** `stt-presign`이 `transcriptions` row를
  `status='uploading'`로 **생성**하고 `id`·presigned URL·객체 키를 반환한다.
  업로드 완료 후 `stt-submit(id)`가 RTZR에 제출하며 `status='transcribing'`으로
  갱신한다. → row 생성/수정은 모두 서버(서비스 롤)에서 수행.
- **RLS(v1 최소):** RLS 활성화. 인증 사용자는 **자기 row만 SELECT** 가능
  (상태 폴링용). insert/update는 Edge Function이 **service role 키**로 수행(RLS 우회).
  세부 권한 정책은 추후 반복.
- **파일 전달:** `stt-submit`이 R2에서 받은 파일을 **`FormData`로 통째로** RTZR에
  전달(참고 `sttClient.ts`와 동일, RTZR 검증 방식). 메모리 적재 제약이 있어 UI는
  압축 포맷(m4a/mp3) 권장 + 파일 크기 상한(기본 **500MB**)으로 대형 WAV를 막는다.
- **RTZR config 기본값:** `model_name=sommers`, `language=ko`,
  `use_diarization=true`, `diarization.spk_count=0`(자동).
- **테스트:** v1은 **수동 검증**(프론트·Edge 모두). 자동화 러너 미도입.
- **패키지 매니저:** pnpm. 잔재 `package-lock.json`은 정리(별도 승인).

## 의존성 그래프

```
[T1] R2 버킷/CORS/자격증명 + Supabase 시크릿  ─┐
[T2] transcriptions 마이그레이션 + 최소 RLS    ─┤
[T3] Edge _shared 헬퍼 (cors/r2/rtzr) + 스캐폴딩 ┘
        │
        ├──▶ [T4] stt-presign (row 생성 + presigned PUT)
        │            │
        │            ▼
        ├──▶ [T5] stt-submit (R2 다운로드 → RTZR 제출 → transcribing)
        │            │
        │            ▼
        └──▶ [T6] stt-poll + pg_cron (완료/실패 갱신)
                     │
                     ▼
            [T7] 프론트 임시 화면 (presign→PUT→submit→폴링→렌더)
                     │
                     ▼
            [T8] 라우트 연결 + env 문서 + 정리
```

구현은 그래프 하단(기반)부터: T1~T3 → T4 → T5 → T6 → T7 → T8.

## 태스크 목록

상세 태스크와 수용 기준은 [`tasks.md`](./tasks.md) 참조.

### Phase 0: 기반
- [ ] T1: R2 버킷·CORS·자격증명 + Supabase 시크릿 등록
- [ ] T2: `transcriptions` 마이그레이션 + 최소 RLS
- [ ] T3: Edge Function `_shared` 헬퍼 + supabase 프로젝트 스캐폴딩

### 체크포인트: 기반
- [ ] `supabase db push` 성공, 테이블·RLS 적용 확인
- [ ] `supabase functions serve`로 빈 함수 부팅 확인
- [ ] R2에 수동 테스트 PUT 성공(임시)

### Phase 1: 업로드 경로
- [ ] T4: `stt-presign` Edge Function

### Phase 2: 전사 파이프라인
- [ ] T5: `stt-submit` Edge Function (R2→RTZR 스트리밍 제출)
- [ ] T6: `stt-poll` Edge Function + pg_cron 10초 스케줄

### 체크포인트: 백엔드 파이프라인
- [ ] presign→PUT→submit→poll 흐름이 cURL/스크립트로 end-to-end 동작
- [ ] 실제 1시간 내외 한국어 음성으로 row가 `completed`+`utterances` 도달

### Phase 3: 프론트 + 마무리
- [ ] T7: `src/AudioStt.tsx` 임시 단일 화면
- [ ] T8: 라우트 연결 + `.env` 예시/문서 + `package-lock.json` 정리

### 체크포인트: 완료
- [ ] 스펙 "성공 기준" 전 항목 충족
- [ ] `pnpm build` / `pnpm lint` 통과
- [ ] 사람 리뷰

## 리스크와 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 대형 WAV가 Edge Function 메모리 한계 초과(FormData 메모리 적재) | 높음 | UI 포맷 권장(m4a/mp3) + 크기 상한(500MB); 한계 시 청크/별도 워커; 배포 후 실측 |
| RTZR 폴링 429(A0003) | 중 | 10초 주기, `stt-poll`에 백오프; tick당 작업 수 제한 |
| presigned URL 오남용/만료 | 중 | 짧은 만료(예: 5분), 로그인 사용자만 발급, 객체 키에 user_id 강제 |
| R2 자격증명 노출 | 높음 | 서버 시크릿만 사용, `VITE_` 금지, `grep` 검증 |
| pg_cron/pg_net 미활성 프로젝트 | 중 | T6에서 확장 활성화 마이그레이션 포함(사전 승인) |
| RTZR 무료 크레딧 소진 | 중 | 통합 테스트는 짧은 샘플 위주, 1회 풀 테스트만 |

## 미해결 질문 (PLAN 잔여)

- pg_cron이 Edge Function을 어떻게 호출할지: `pg_net`로 함수 URL 호출 vs DB 내
  SQL로 직접 폴링? → T6에서 `pg_net` + 함수 호출 방식 우선.
- `stt-poll` 한 tick에서 처리할 최대 작업 수 / 작업당 최대 대기(기본 30분) 확정.
- 최소 RLS 정책의 정확한 SQL(자기 row SELECT) — T2에서 확정.
