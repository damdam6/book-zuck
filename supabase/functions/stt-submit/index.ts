// stt-submit: 업로드 완료된 R2 객체를 RTZR로 스트리밍 제출한다.
// transcribe id를 저장하고 status='transcribing'으로 갱신. 폴링은 stt-poll 담당.
//
// 요청(POST):  { transcriptionId }
// 응답:        { status: 'transcribing', rtzrTranscribeId } 또는 오류

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";
import { getObject } from "../_shared/r2.ts";
import {
  friendlyMessage,
  RtzrError,
  submitTranscribeStream,
  type TranscribeConfig,
} from "../_shared/rtzr.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const user = await getUser(req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);

  let payload: { transcriptionId?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const { transcriptionId } = payload;
  if (!transcriptionId) return jsonResponse({ error: "transcriptionId_required" }, 400);

  const admin = adminClient();
  const { data: row, error: selErr } = await admin
    .from("transcriptions")
    .select("*")
    .eq("id", transcriptionId)
    .single();
  if (selErr || !row) return jsonResponse({ error: "not_found" }, 404);
  if (row.user_id !== user.id) return jsonResponse({ error: "forbidden" }, 403);
  if (row.status !== "uploading") {
    // 이미 제출/처리된 작업은 멱등 처리
    return jsonResponse({ status: row.status, rtzrTranscribeId: row.rtzr_transcribe_id });
  }

  try {
    const obj = await getObject(row.r2_object_key);
    if (!obj.body) throw new Error("R2 객체 본문이 비어 있습니다.");
    const contentType = obj.headers.get("content-type") ?? "application/octet-stream";

    const rtzrId = await submitTranscribeStream(
      obj.body,
      row.file_name,
      contentType,
      (row.config ?? {}) as TranscribeConfig,
    );

    await admin
      .from("transcriptions")
      .update({
        rtzr_transcribe_id: rtzrId,
        status: "transcribing",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", transcriptionId);

    return jsonResponse({ status: "transcribing", rtzrTranscribeId: rtzrId });
  } catch (err) {
    const code = err instanceof RtzrError ? err.code : "submit_error";
    const message =
      err instanceof RtzrError
        ? friendlyMessage(err.code)
        : err instanceof Error
          ? err.message
          : String(err);

    await admin
      .from("transcriptions")
      .update({ status: "failed", error_code: code, error_message: message })
      .eq("id", transcriptionId);

    return jsonResponse({ status: "failed", error_code: code, message }, 502);
  }
});
