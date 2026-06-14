// stt-submit — 자체완결형(대시보드 복붙 배포용).
// 업로드 완료된 R2 객체를 RTZR로 제출(FormData 파일 단위)하고 transcribing으로 전환.
// 폴링은 stt-poll 담당.
//
// 요청(POST):  { transcriptionId }
// 응답:        { status: 'transcribing', rtzrTranscribeId } 또는 오류
//
// 필요한 시크릿: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY(자동 주입),
//                R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
//                RTZR_CLIENT_ID, RTZR_CLIENT_SECRET, RTZR_BASE_URL(선택)

import { AwsClient } from "npm:aws4fetch@1.0.20";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

function rtzrBase(): string {
  return Deno.env.get("RTZR_BASE_URL") ?? "https://openapi.vito.ai";
}

const FRIENDLY: Record<string, string> = {
  H0001: "전사 요청 파라미터가 올바르지 않습니다.",
  H0010: "지원하지 않는 오디오 형식입니다.",
  H0002: "전사 서비스 인증에 실패했습니다.",
  H0003: "전사 서비스 권한이 없습니다.",
  H0005: "파일 크기가 허용 한도를 초과했습니다.",
  H0006: "오디오 길이가 허용 한도(4시간)를 초과했습니다.",
  A0001: "전사 사용량 한도를 초과했습니다.",
  A0002: "동시 처리 한도를 초과했습니다. 잠시 후 다시 시도하세요.",
  A0003: "요청이 너무 잦습니다. 잠시 후 다시 시도하세요.",
  E500: "전사 서버 오류가 발생했습니다.",
};

class RtzrError extends Error {
  code: string;
  constructor(httpStatus: number, rawBody: string) {
    let code = `HTTP_${httpStatus}`;
    let message = rawBody;
    try {
      const parsed = JSON.parse(rawBody);
      code = parsed?.error?.code ?? parsed?.code ?? code;
      message = parsed?.error?.message ?? parsed?.message ?? message;
    } catch { /* raw 유지 */ }
    super(`RTZR ${code}: ${message}`);
    this.code = code;
  }
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

// R2 객체 다운로드(서명된 GET)
async function getObject(key: string): Promise<Response> {
  const accountId = env("R2_ACCOUNT_ID");
  const bucket = env("R2_BUCKET");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = `https://${accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucket)}/${encodedKey}`;
  const client = new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    region: "auto",
    service: "s3",
  });
  const res = await client.fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`R2 getObject 실패: ${res.status} ${await res.text()}`);
  return res;
}

// RTZR 인증 토큰(메모리 캐시, 만료 30분 전 갱신)
let cachedToken: { token: string; expireAt: number } | null = null;
async function authenticate(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expireAt - 30 * 60_000) return cachedToken.token;
  const body = new URLSearchParams({
    client_id: env("RTZR_CLIENT_ID"),
    client_secret: env("RTZR_CLIENT_SECRET"),
  });
  const res = await fetch(`${rtzrBase()}/v1/authenticate`, { method: "POST", body });
  if (!res.ok) throw new Error(`RTZR auth 실패: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { access_token: string; expire_at: number };
  cachedToken = { token: j.access_token, expireAt: j.expire_at * 1000 };
  return cachedToken.token;
}

// 파일(Blob)을 FormData로 통째로 RTZR에 제출
async function submitTranscribeFile(file: Blob, fileName: string, config: unknown): Promise<string> {
  const token = await authenticate();
  const fd = new FormData();
  fd.append("file", file, fileName);
  fd.append("config", JSON.stringify(config ?? {}));
  const res = await fetch(`${rtzrBase()}/v1/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    body: fd,
  });
  const text = await res.text();
  if (!res.ok) throw new RtzrError(res.status, text);
  return (JSON.parse(text) as { id: string }).id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  let payload: { transcriptionId?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const { transcriptionId } = payload;
  if (!transcriptionId) return json({ error: "transcriptionId_required" }, 400);

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const { data: row, error: selErr } = await admin
    .from("transcriptions")
    .select("*")
    .eq("id", transcriptionId)
    .single();
  if (selErr || !row) return json({ error: "not_found" }, 404);
  if (row.user_id !== user.id) return json({ error: "forbidden" }, 403);
  if (row.status !== "uploading") {
    return json({ status: row.status, rtzrTranscribeId: row.rtzr_transcribe_id });
  }

  try {
    const obj = await getObject(row.r2_object_key);
    const file = await obj.blob();
    const rtzrId = await submitTranscribeFile(file, row.file_name, row.config);

    await admin
      .from("transcriptions")
      .update({
        rtzr_transcribe_id: rtzrId,
        status: "transcribing",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", transcriptionId);

    return json({ status: "transcribing", rtzrTranscribeId: rtzrId });
  } catch (err) {
    const code = err instanceof RtzrError ? err.code : "submit_error";
    const message =
      err instanceof RtzrError
        ? (FRIENDLY[err.code] ?? "전사 처리 중 오류가 발생했습니다.")
        : err instanceof Error
          ? err.message
          : String(err);

    await admin
      .from("transcriptions")
      .update({ status: "failed", error_code: code, error_message: message })
      .eq("id", transcriptionId);

    return json({ status: "failed", error_code: code, message }, 502);
  }
});
