import { useState } from "react";
import {
  pollUntilDone,
  submitTranscribe,
  type TranscribeConfig,
  type Utterance,
} from "./lib/sttClient";

type Status = "idle" | "uploading" | "transcribing" | "done" | "error";

const DEFAULT_CONFIG: TranscribeConfig = {
  model_name: "sommers",
  use_diarization: true,
  diarization: { spk_count: 0 },
};

const formatMs = (ms: number) => {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

const formatTimestamp = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const SttTest = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [pollStatus, setPollStatus] = useState<string>("");
  const [transcribeId, setTranscribeId] = useState<string | null>(null);
  const [timings, setTimings] = useState<{
    submitMs: number;
    waitMs: number;
    totalMs: number;
  } | null>(null);
  const [utterances, setUtterances] = useState<Utterance[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const busy = status === "uploading" || status === "transcribing";

  const run = async () => {
    if (!file) return;
    setStatus("uploading");
    setPollStatus("");
    setTranscribeId(null);
    setTimings(null);
    setUtterances(null);
    setErrorMsg(null);

    const t0 = performance.now();
    try {
      const id = await submitTranscribe(file, DEFAULT_CONFIG);
      const t1 = performance.now();
      setTranscribeId(id);
      setStatus("transcribing");

      const results = await pollUntilDone(id, setPollStatus);
      const t2 = performance.now();

      setTimings({
        submitMs: t1 - t0,
        waitMs: t2 - t1,
        totalMs: t2 - t0,
      });
      setUtterances(results.utterances);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">RTZR STT Performance Test</h1>
      <p className="text-sm text-gray-500">
        Upload one audio file (mp3/wav/m4a/flac/amr/mp4, ≤2 GB, ≤4 h) and time
        the round-trip.
      </p>

      <div className="space-y-2">
        <input
          type="file"
          accept="audio/*,.mp4,.m4a,.mp3,.amr,.flac,.wav"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy}
        />
        {file && (
          <p className="text-sm text-gray-600">
            {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
        <button
          onClick={run}
          disabled={!file || busy}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-300"
        >
          {busy ? "Running…" : "Run"}
        </button>
      </div>

      <div className="text-sm">
        <span className="font-semibold">Status:</span> {status}
        {pollStatus && status === "transcribing" && ` (server: ${pollStatus})`}
        {transcribeId && (
          <span className="ml-2 text-gray-500">id: {transcribeId}</span>
        )}
      </div>

      {timings && (
        <div className="rounded border p-3 text-sm bg-gray-50">
          <div className="font-semibold mb-1">Timings</div>
          <div>Submit (upload + accept): {formatMs(timings.submitMs)}</div>
          <div>Wait (server transcribing): {formatMs(timings.waitMs)}</div>
          <div className="font-semibold">Total: {formatMs(timings.totalMs)}</div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {utterances && (
        <div className="space-y-1">
          <div className="font-semibold">
            Transcript ({utterances.length} utterances)
          </div>
          <ul className="space-y-1 text-sm">
            {utterances.map((u, i) => (
              <li key={i}>
                <span className="text-gray-500">
                  [{formatTimestamp(u.start_at)} spk {u.spk}]
                </span>{" "}
                {u.msg}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
