// stt-presign — 자체완결형(대시보드 복붙 배포용).
// 로그인 사용자에게 R2 직접 업로드용 presigned PUT URL을 발급한다.
// transcriptions row를 status='uploading'으로 생성하고 id/URL/객체키를 반환.
//
// 요청(POST):  { fileName, fileSize, contentType }
// 응답:        { transcriptionId, uploadUrl, objectKey }
//
// 필요한 시크릿: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY(자동 주입),
//                R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET

import { AwsClient } from "npm:aws4fetch@1.0.20";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_EXT = ["mp4", "m4a", "mp3", "amr", "flac", "wav"];
// Edge Function이 파일을 blob으로 메모리에 적재해 RTZR에 전달하므로(메모리 한도 ~256MB)
// 상한을 현실적으로 200MB로 둔다. 휴대폰 m4a 1.5시간(~130MB)은 여유, 대형 WAV는 차단.
const MAX_SIZE = 200 * 1024 * 1024; // 200MB

// 화자분리 자동(spk_count=0), 한국어 sommers 모델
const DEFAULT_CONFIG = {
  model_name: "sommers",
  language: "ko",
  use_diarization: true,
  diarization: { spk_count: 0 },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const anon = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
  });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// R2 presigned PUT URL (S3 호환). 기본 만료 5분.
async function presignPut(key: string, contentType: string, expiresSec = 300): Promise<string> {
  const accountId = env("R2_ACCOUNT_ID");
  const bucket = env("R2_BUCKET");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = new URL(
    `https://${accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucket)}/${encodedKey}`,
  );
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  const client = new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    region: "auto",
    service: "s3",
  });
  const signed = await client.sign(
    new Request(url, { method: "PUT", headers: { "content-type": contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  let payload: { fileName?: string; fileSize?: number; contentType?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { fileName, fileSize, contentType } = payload;
  if (!fileName || typeof fileName !== "string") {
    return json({ error: "fileName_required" }, 400);
  }
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) {
    return json({ error: "unsupported_format", message: "지원하지 않는 오디오 형식입니다." }, 400);
  }
  if (typeof fileSize !== "number" || fileSize <= 0 || fileSize > MAX_SIZE) {
    return json(
      { error: "invalid_size", message: "파일 크기가 허용 범위를 벗어났습니다(최대 200MB)." },
      400,
    );
  }

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const id = crypto.randomUUID();
  // 경로 구분자를 제거하고 basename만 사용(경로 조작 방지, 객체 키 위생)
  const safeName = fileName.split(/[\\/]/).pop() || "audio";
  const objectKey = `${user.id}/${id}/${safeName}`;

  const { error: insertError } = await admin.from("transcriptions").insert({
    id,
    user_id: user.id,
    r2_object_key: objectKey,
    file_name: safeName,
    file_size: fileSize,
    status: "uploading",
    config: DEFAULT_CONFIG,
  });
  if (insertError) {
    return json({ error: "db_insert_failed", message: insertError.message }, 500);
  }

  const uploadUrl = await presignPut(objectKey, contentType ?? "application/octet-stream");
  return json({ transcriptionId: id, uploadUrl, objectKey });
});
