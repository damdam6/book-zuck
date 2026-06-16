-- transcriptions: 음성 업로드 → 한국어 전사 결과 저장
-- 스펙: docs/specs/audio-upload-transcribe-store/spec.md
--
-- row 생성/수정은 Edge Function(service role)이 수행한다.
-- 인증 사용자는 자기 row만 SELECT 가능(상태 폴링용). insert/update 정책 없음.

create extension if not exists pgcrypto;

create table if not exists public.transcriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  r2_object_key       text not null,
  file_name           text not null,
  file_size           bigint,
  status              text not null default 'uploading'
                        check (status in ('uploading', 'transcribing', 'completed', 'failed')),
  rtzr_transcribe_id  text,
  language            text not null default 'ko',
  config              jsonb not null default '{}'::jsonb,
  utterances          jsonb,
  error_code          text,
  error_message       text,
  submitted_at        timestamptz,            -- status='transcribing' 전환 시각(최대 대기 계산용)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists transcriptions_user_id_idx on public.transcriptions (user_id);
-- 폴링 워커가 진행 중 작업을 스캔할 때 사용
create index if not exists transcriptions_status_idx on public.transcriptions (status);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transcriptions_set_updated_at on public.transcriptions;
create trigger transcriptions_set_updated_at
  before update on public.transcriptions
  for each row execute function public.set_updated_at();

-- RLS: 최소 정책(v1). 세부 권한은 추후 반복.
alter table public.transcriptions enable row level security;

drop policy if exists "select own transcriptions" on public.transcriptions;
create policy "select own transcriptions"
  on public.transcriptions
  for select
  to authenticated
  using (auth.uid() = user_id);
-- insert/update 정책 없음 → Edge Function service role 키로만 기록(RLS 우회)
