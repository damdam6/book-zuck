-- stt-poll Edge Function을 pg_cron으로 10초마다 호출한다(pg_net 사용).
-- 함수 URL과 cron 시크릿은 Supabase Vault에 저장해 참조한다(평문 하드코딩 금지).
--
-- 사전 준비(대시보드 SQL 또는 supabase secrets 아님 — DB Vault):
--   select vault.create_secret('https://<project-ref>.functions.supabase.co/stt-poll', 'edge_stt_poll_url');
--   select vault.create_secret('<랜덤-문자열>', 'cron_secret');
-- 그리고 동일한 cron_secret 값을 Edge Function 시크릿 CRON_SECRET에도 등록한다.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- 기존 동일 이름 잡 제거(재적용 안전)
select cron.unschedule('stt-poll-10s')
where exists (select 1 from cron.job where jobname = 'stt-poll-10s');

select cron.schedule(
  'stt-poll-10s',
  '10 seconds',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_stt_poll_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  );
  $$
);
