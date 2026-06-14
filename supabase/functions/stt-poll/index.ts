// stt-poll — 자체완결형(대시보드 복붙 배포용).
// status='transcribing' 작업을 RTZR로 폴링해 결과를 저장한다.
// pg_cron이 pg_net으로 10초마다 호출(사용자 인증 없음 → x-cron-secret로 보호).
// 대시보드 배포 시 "Verify JWT" 옵션을 끄고 CRON_SECRET으로 보호할 것.
//
// completed → utterances 저장 + status='completed'
// failed    → error_code/message + status='failed'
// 최대 대기(30분) 초과 → status='failed'(TIMEOUT)
//
// 필요한 시크릿: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY(자동 주입),
//                RTZR_CLIENT_ID, RTZR_CLIENT_SECRET, RTZR_BASE_URL(선택), CRON_SECRET

import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_JOBS_PER_TICK = 20;
const MAX_WAIT_MS = 30 * 60_000;

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function rtzrBase(): string {
  return Deno.env.get("RTZR_BASE_URL") ?? "https://openapi.vito.ai";
}

const FRIENDLY: Record<string, string> = {
  H0010: "지원하지 않는 오디오 형식입니다.",
  H0005: "파일 크기가 허용 한도를 초과했습니다.",
  H0006: "오디오 길이가 허용 한도(4시간)를 초과했습니다.",
  E500: "전사 서버 오류가 발생했습니다.",
};

type Utterance = { start_at: number; duration: number; msg: string; spk: number; lang: string };
type PollResponse =
  | { status: "transcribing" }
  | { status: "completed"; results: { utterances: Utterance[] } }
  | { status: "failed"; error?: { code: string; message: string } };

class RtzrError extends Error {
  code: string;
  constructor(httpStatus: number, rawBody: string) {
    let code = `HTTP_${httpStatus}`;
    try {
      const parsed = JSON.parse(rawBody);
      code = parsed?.error?.code ?? parsed?.code ?? code;
    } catch { /* ignore */ }
    super(`RTZR ${code}`);
    this.code = code;
  }
}

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

async function pollTranscribe(id: string): Promise<PollResponse> {
  const token = await authenticate();
  const res = await fetch(`${rtzrBase()}/v1/transcribe/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) throw new RtzrError(res.status, text);
  return JSON.parse(text) as PollResponse;
}

Deno.serve(async (req) => {
  // fail-closed: CRON_SECRET 미설정이거나 헤더 불일치면 무조건 거부
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const { data: jobs, error } = await admin
    .from("transcriptions")
    .select("id, rtzr_transcribe_id, submitted_at")
    .eq("status", "transcribing")
    .not("rtzr_transcribe_id", "is", null)
    .order("submitted_at", { ascending: true })
    .limit(MAX_JOBS_PER_TICK);

  if (error) return json({ error: "db_select_failed", message: error.message }, 500);
  if (!jobs || jobs.length === 0) return json({ processed: 0 });

  const now = Date.now();
  let completed = 0;
  let failed = 0;
  let pending = 0;

  for (const job of jobs) {
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
        const code = res.error?.code ?? "FAILED";
        await admin
          .from("transcriptions")
          .update({
            status: "failed",
            error_code: code,
            error_message: FRIENDLY[code] ?? "전사 처리 중 오류가 발생했습니다.",
          })
          .eq("id", job.id);
        failed++;
      } else {
        pending++;
      }
    } catch (err) {
      if (err instanceof RtzrError && err.code === "A0003") {
        pending++;
        break; // 레이트 리밋 백오프 — 이번 tick 중단
      }
      pending++;
    }
  }

  return json({ processed: jobs.length, completed, failed, pending });
});
