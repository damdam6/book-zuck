// stt-presign: 로그인 사용자에게 R2 직접 업로드용 presigned PUT URL을 발급한다.
// transcriptions row를 status='uploading'으로 먼저 생성하고 id/URL/객체키를 반환.
//
// 요청(POST):  { fileName, fileSize, contentType }
// 응답:        { transcriptionId, uploadUrl, objectKey }

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";
import { presignPut } from "../_shared/r2.ts";
import { DEFAULT_CONFIG } from "../_shared/rtzr.ts";

const ALLOWED_EXT = ["mp4", "m4a", "mp3", "amr", "flac", "wav"];
const MAX_SIZE = 500 * 1024 * 1024; // 500MB (스펙 결정: 대용량은 포맷 권장 + 상한으로 제한)

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const user = await getUser(req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);

  let payload: { fileName?: string; fileSize?: number; contentType?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const { fileName, fileSize, contentType } = payload;
  if (!fileName || typeof fileName !== "string") {
    return jsonResponse({ error: "fileName_required" }, 400);
  }
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) {
    return jsonResponse(
      { error: "unsupported_format", message: "지원하지 않는 오디오 형식입니다." },
      400,
    );
  }
  if (typeof fileSize !== "number" || fileSize <= 0 || fileSize > MAX_SIZE) {
    return jsonResponse(
      { error: "invalid_size", message: "파일 크기가 허용 범위를 벗어났습니다(최대 500MB)." },
      400,
    );
  }

  const admin = adminClient();
  const id = crypto.randomUUID();
  const objectKey = `${user.id}/${id}/${fileName}`;

  const { error: insertError } = await admin.from("transcriptions").insert({
    id,
    user_id: user.id,
    r2_object_key: objectKey,
    file_name: fileName,
    file_size: fileSize,
    status: "uploading",
    config: DEFAULT_CONFIG,
  });
  if (insertError) {
    return jsonResponse({ error: "db_insert_failed", message: insertError.message }, 500);
  }

  const uploadUrl = await presignPut(objectKey, contentType ?? "application/octet-stream");

  return jsonResponse({ transcriptionId: id, uploadUrl, objectKey });
});
