// RTZR / ReturnZero VITO STT 클라이언트 (서버 측).
// 참고 브랜치 src/lib/sttClient.ts의 검증된 로직을 Deno env 기반으로 이식.
// 자격증명은 Edge Function 시크릿에서만 읽는다. 레퍼런스: docs/rtzr-stt-api.md

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function baseUrl(): string {
  return Deno.env.get("RTZR_BASE_URL") ?? "https://openapi.vito.ai";
}

export type TranscribeConfig = {
  model_name?: "sommers" | "whisper";
  language?: "ko" | "ja" | "detect" | "multi";
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

// 화자분리 자동(spk_count=0). 한국어 sommers 모델.
export const DEFAULT_CONFIG: TranscribeConfig = {
  model_name: "sommers",
  language: "ko",
  use_diarization: true,
  diarization: { spk_count: 0 },
};

export type Utterance = {
  start_at: number;
  duration: number;
  msg: string;
  spk: number;
  lang: string;
};

export type PollResponse =
  | { id: string; status: "transcribing" }
  | { id: string; status: "completed"; results: { utterances: Utterance[] } }
  | { id: string; status: "failed"; error?: { code: string; message: string } };

// 토큰 메모리 캐시(만료 30분 전 갱신). Edge Function 인스턴스 수명 동안 유효.
let cached: { token: string; expireAt: number } | null = null;

export async function authenticate(): Promise<string> {
  if (cached && Date.now() < cached.expireAt - 30 * 60_000) return cached.token;

  const body = new URLSearchParams({
    client_id: env("RTZR_CLIENT_ID"),
    client_secret: env("RTZR_CLIENT_SECRET"),
  });
  const res = await fetch(`${baseUrl()}/v1/authenticate`, { method: "POST", body });
  if (!res.ok) {
    throw new Error(`RTZR auth 실패: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expire_at: number };
  cached = { token: json.access_token, expireAt: json.expire_at * 1000 };
  return cached.token;
}

/**
 * 파일(Blob)을 RTZR로 제출하고 transcribe id를 반환.
 * 참고 브랜치 sttClient.ts와 동일하게 FormData(multipart)에 파일을 통째로 담아 보낸다.
 * (RTZR가 검증·지원하는 방식. Content-Length가 설정되어 chunked 거부 문제가 없다.)
 *
 * 주의: 파일 전체를 메모리에 올린다. Edge Function 메모리 한도가 있으므로 긴 녹음은
 * 압축 포맷(m4a/mp3)을 권장하고 업로드 단계에서 크기 상한으로 막는다.
 */
export async function submitTranscribeFile(
  file: Blob,
  fileName: string,
  config: TranscribeConfig = DEFAULT_CONFIG,
): Promise<string> {
  const token = await authenticate();

  const fd = new FormData();
  fd.append("file", file, fileName);
  fd.append("config", JSON.stringify(config));

  const res = await fetch(`${baseUrl()}/v1/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    body: fd, // Content-Type(boundary 포함)은 fetch가 자동 설정
  });

  const text = await res.text();
  if (!res.ok) {
    throw new RtzrError(res.status, text);
  }
  return (JSON.parse(text) as { id: string }).id;
}

/** RTZR 작업 상태 폴링(1회). */
export async function pollTranscribe(id: string): Promise<PollResponse> {
  const token = await authenticate();
  const res = await fetch(`${baseUrl()}/v1/transcribe/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new RtzrError(res.status, text);
  }
  return JSON.parse(text) as PollResponse;
}

// RTZR 오류를 코드/메시지로 보존(사용자 친화 매핑은 호출부에서 수행).
export class RtzrError extends Error {
  httpStatus: number;
  code: string;
  constructor(httpStatus: number, rawBody: string) {
    let code = `HTTP_${httpStatus}`;
    let message = rawBody;
    try {
      const parsed = JSON.parse(rawBody);
      code = parsed?.error?.code ?? parsed?.code ?? code;
      message = parsed?.error?.message ?? parsed?.message ?? message;
    } catch {
      // raw 텍스트 유지
    }
    super(`RTZR ${code}: ${message}`);
    this.name = "RtzrError";
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

// 사용자에게 보여줄 친절한 메시지(raw 코드 노출 방지).
const FRIENDLY: Record<string, string> = {
  H0001: "전사 요청 파라미터가 올바르지 않습니다.",
  H0010: "지원하지 않는 오디오 형식입니다.",
  H0002: "전사 서비스 인증에 실패했습니다.",
  H0003: "전사 서비스 권한이 없습니다.",
  H0004: "전사 결과를 찾을 수 없습니다.",
  H0007: "전사 결과가 만료되었습니다.",
  H0005: "파일 크기가 허용 한도를 초과했습니다.",
  H0006: "오디오 길이가 허용 한도(4시간)를 초과했습니다.",
  A0001: "전사 사용량 한도를 초과했습니다.",
  A0002: "동시 처리 한도를 초과했습니다. 잠시 후 다시 시도하세요.",
  A0003: "요청이 너무 잦습니다. 잠시 후 다시 시도하세요.",
  E500: "전사 서버 오류가 발생했습니다.",
};

export function friendlyMessage(code: string): string {
  return FRIENDLY[code] ?? "전사 처리 중 오류가 발생했습니다.";
}
