// stt-poll: status='transcribing' 작업을 RTZR로 폴링해 결과를 저장한다.
// pg_cron이 pg_net으로 10초마다 호출한다(사용자 인증 없음 → x-cron-secret로 보호).
//
// completed → utterances 저장 + status='completed'
// failed    → error_code/message + status='failed'
// 최대 대기(기본 30분) 초과 → status='failed'(timeout)

import { jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { friendlyMessage, pollTranscribe, RtzrError } from "../_shared/rtzr.ts";

const MAX_JOBS_PER_TICK = 20;
const MAX_WAIT_MS = 30 * 60_000; // 작업당 최대 대기 30분(RTZR 문서 권장 상한)

Deno.serve(async (req) => {
  // cron 전용: 공유 시크릿 확인
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const admin = adminClient();
  const { data: jobs, error } = await admin
    .from("transcriptions")
    .select("id, rtzr_transcribe_id, submitted_at")
    .eq("status", "transcribing")
    .not("rtzr_transcribe_id", "is", null)
    .order("submitted_at", { ascending: true })
    .limit(MAX_JOBS_PER_TICK);

  if (error) return jsonResponse({ error: "db_select_failed", message: error.message }, 500);
  if (!jobs || jobs.length === 0) return jsonResponse({ processed: 0 });

  const now = Date.now();
  let completed = 0;
  let failed = 0;
  let pending = 0;

  for (const job of jobs) {
    // 최대 대기 초과 → 타임아웃 실패 처리
    const startedAt = job.submitted_at ? new Date(job.submitted_at).getTime() : now;
    if (now - startedAt > MAX_WAIT_MS) {
      await admin
        .from("transcriptions")
        .update({
          status: "failed",
          error_code: "TIMEOUT",
          error_message: "전사 대기 시간이 초과되었습니다.",
        })
        .eq("id", job.id);
      failed++;
      continue;
    }

    try {
      const res = await pollTranscribe(job.rtzr_transcribe_id as string);
      if (res.status === "completed") {
        await admin
          .from("transcriptions")
          .update({ status: "completed", utterances: res.results.utterances })
          .eq("id", job.id);
        completed++;
      } else if (res.status === "failed") {
        await admin
          .from("transcriptions")
          .update({
            status: "failed",
            error_code: res.error?.code ?? "FAILED",
            error_message: friendlyMessage(res.error?.code ?? ""),
          })
          .eq("id", job.id);
        failed++;
      } else {
        pending++; // transcribing — 다음 tick에서 재시도
      }
    } catch (err) {
      // A0003(요청 과다)는 다음 tick에서 백오프 재시도, 그 외도 일단 보류
      if (err instanceof RtzrError && err.code === "A0003") {
        pending++;
        break; // 이번 tick은 중단(레이트 리밋 백오프)
      }
      pending++;
    }
  }

  return jsonResponse({ processed: jobs.length, completed, failed, pending });
});
