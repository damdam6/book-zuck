// DEV-ONLY. `client_secret` is bundled into the browser via VITE_ env vars.
// Move auth + transcribe + poll behind a server proxy before shipping.
// See docs/rtzr-stt-api.md §9.3.

const BASE = "https://openapi.vito.ai";

let cached: { token: string; expireAt: number } | null = null;

export async function authenticate(): Promise<string> {
  if (cached && Date.now() < cached.expireAt - 30 * 60_000) return cached.token;

  const clientId = import.meta.env.VITE_RTZR_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_RTZR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing VITE_RTZR_CLIENT_ID / VITE_RTZR_CLIENT_SECRET in .env",
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${BASE}/v1/authenticate`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    throw new Error(`auth failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expire_at: number };
  cached = { token: json.access_token, expireAt: json.expire_at * 1000 };
  return cached.token;
}

export async function submitTranscribe(
  file: File,
  config: TranscribeConfig,
): Promise<string> {
  const token = await authenticate();
  const fd = new FormData();
  fd.append("file", file);
  fd.append("config", JSON.stringify(config));
  const res = await fetch(`${BASE}/v1/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    throw new Error(`submit failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function pollUntilDone(
  id: string,
  onTick?: (status: string) => void,
  intervalMs = 5000,
): Promise<TranscribeResults> {
  const token = await authenticate();
  while (true) {
    const res = await fetch(`${BASE}/v1/transcribe/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`poll failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as PollResponse;
    onTick?.(json.status);
    if (json.status === "completed") return json.results;
    if (json.status === "failed") {
      throw new Error(
        `transcription failed: ${json.error?.code ?? "?"} ${json.error?.message ?? ""}`,
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export type Utterance = {
  start_at: number;
  duration: number;
  msg: string;
  spk: number;
  lang: string;
};

export type TranscribeResults = { utterances: Utterance[] };

export type TranscribeConfig = {
  model_name?: "sommers" | "whisper";
  language?: "ko" | "ja" | "detect" | "multi";
  language_candidates?: string[];
  use_diarization?: boolean;
  diarization?: { spk_count: number };
  use_itn?: boolean;
  use_disfluency_filter?: boolean;
  use_profanity_filter?: boolean;
  use_paragraph_splitter?: boolean;
  paragraph_splitter?: { max: number };
  domain?: "GENERAL" | "CALL";
  use_word_timestamp?: boolean;
  keywords?: string[];
};

type PollResponse =
  | { id: string; status: "transcribing" }
  | { id: string; status: "completed"; results: TranscribeResults }
  | { id: string; status: "failed"; error?: { code: string; message: string } };
