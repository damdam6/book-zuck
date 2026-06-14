// 임시 단일 화면: 음성 업로드 → 한국어 전사 → 결과 표시.
// 흐름: 클라이언트 검증 → stt-presign → R2 직접 PUT → stt-submit → row 폴링 → utterances 렌더.
// 시스템(백엔드 파이프라인) 검증용 임시 UI이며 정식 UI는 이후 별도 작업.

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

type Status = "idle" | "uploading" | "transcribing" | "completed" | "failed";

type Utterance = {
  start_at: number;
  duration: number;
  msg: string;
  spk: number;
  lang: string;
};

const ALLOWED_EXT = ["mp4", "m4a", "mp3", "amr", "flac", "wav"];
const MAX_SIZE = 200 * 1024 * 1024; // 200MB (Edge Function 메모리 한도 고려)
const POLL_INTERVAL_MS = 5000;

const formatTimestamp = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const validate = (file: File): string | null => {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) {
    return "지원하지 않는 형식입니다. (mp3/wav/m4a/flac/amr/mp4)";
  }
  if (file.size > MAX_SIZE) {
    return "파일이 너무 큽니다. 최대 200MB까지 가능합니다. (긴 녹음은 m4a/mp3 압축 권장)";
  }
  return null;
};

export function AudioStt() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [utterances, setUtterances] = useState<Utterance[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const busy = status === "uploading" || status === "transcribing";

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const pollUntilDone = (transcriptionId: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      const { data, error } = await supabase
        .from("transcriptions")
        .select("status, utterances, error_message")
        .eq("id", transcriptionId)
        .single();
      if (error) return; // 일시 오류는 다음 tick에서 재시도
      if (data.status === "completed") {
        window.clearInterval(pollRef.current!);
        setUtterances(Array.isArray(data.utterances) ? data.utterances : []);
        setStatus("completed");
      } else if (data.status === "failed") {
        window.clearInterval(pollRef.current!);
        setErrorMsg(data.error_message ?? "전사에 실패했습니다.");
        setStatus("failed");
      }
    }, POLL_INTERVAL_MS);
  };

  const run = async () => {
    if (!file || !user) return;
    setUtterances(null);
    setErrorMsg(null);

    const invalid = validate(file);
    if (invalid) {
      setErrorMsg(invalid);
      setStatus("failed");
      return;
    }

    setStatus("uploading");
    const contentType = file.type || "application/octet-stream";

    try {
      // 1) presign — row 생성 + presigned PUT URL
      const { data: presign, error: presignErr } = await supabase.functions.invoke(
        "stt-presign",
        { body: { fileName: file.name, fileSize: file.size, contentType } },
      );
      if (presignErr || !presign?.uploadUrl) {
        throw new Error(presign?.message ?? presignErr?.message ?? "업로드 준비에 실패했습니다.");
      }

      // 2) R2에 파일 직접 PUT (presign 시 서명한 content-type과 동일해야 함)
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!putRes.ok) throw new Error(`업로드 실패: ${putRes.status}`);

      // 3) submit — RTZR 제출, transcribing 전환
      const { data: submit, error: submitErr } = await supabase.functions.invoke(
        "stt-submit",
        { body: { transcriptionId: presign.transcriptionId } },
      );
      if (submitErr || submit?.status === "failed") {
        throw new Error(submit?.message ?? submitErr?.message ?? "전사 요청에 실패했습니다.");
      }

      // 4) 완료까지 폴링
      setStatus("transcribing");
      pollUntilDone(presign.transcriptionId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("failed");
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">음성 → 한국어 전사 (임시)</h1>
      <p className="text-sm text-gray-500">
        음성 파일(mp3/wav/m4a/flac/amr/mp4, 최대 200MB)을 업로드하면 한국어로
        전사합니다. 긴 녹음은 m4a/mp3 압축을 권장합니다.
      </p>

      {!user && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          업로드하려면 먼저 로그인해야 합니다.
        </div>
      )}

      <div className="space-y-2">
        <input
          type="file"
          accept="audio/*,.mp4,.m4a,.mp3,.amr,.flac,.wav"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy || !user}
        />
        {file && (
          <p className="text-sm text-gray-600">
            {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
        <button
          onClick={run}
          disabled={!file || busy || !user}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-300"
        >
          {busy ? "처리 중…" : "업로드 후 전사"}
        </button>
      </div>

      <div className="text-sm">
        <span className="font-semibold">상태:</span>{" "}
        {status === "idle" && "대기"}
        {status === "uploading" && "업로드 중…"}
        {status === "transcribing" && "전사 중… (최대 수십 분 소요될 수 있음)"}
        {status === "completed" && "완료"}
        {status === "failed" && "실패"}
      </div>

      {errorMsg && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {utterances && (
        <div className="space-y-1">
          <div className="font-semibold">전사 결과 ({utterances.length}개 발화)</div>
          <ul className="space-y-1 text-sm">
            {utterances.map((u, i) => (
              <li key={i}>
                <span className="text-gray-500">
                  [{formatTimestamp(u.start_at)} 화자 {u.spk}]
                </span>{" "}
                {u.msg}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
