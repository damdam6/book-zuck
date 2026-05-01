# RTZR STT API — File Transcription Reference

Source: <https://developers.rtzr.ai/docs/stt-file/>
Provider: ReturnZero (VITO OpenAPI)
Scope: async file-based transcription only (not streaming)

---

## 1. Base URL

```
https://openapi.vito.ai
```

## 2. Authentication

OAuth2-style client-credentials exchange returning a short-lived JWT.

- **Endpoint:** `POST /v1/authenticate`
- **Content-Type:** `application/x-www-form-urlencoded` (form fields)
- **Body fields:**
  - `client_id` — issued by RTZR console
  - `client_secret` — issued by RTZR console
- **Response:**
  ```json
  { "access_token": "<JWT>", "expire_at": 1700000000 }
  ```
- **Use in subsequent requests:** `Authorization: Bearer <access_token>`
- **Refresh policy:** renew when current time is within 30 minutes of `expire_at`.

## 3. Submit a file for transcription

- **Endpoint:** `POST /v1/transcribe`
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
  - `Accept: application/json`
- **Multipart fields:**

  | Field    | Type        | Required | Notes                                          |
  | -------- | ----------- | -------- | ---------------------------------------------- |
  | `file`   | binary      | yes      | Audio file (see §5 for formats)                |
  | `config` | JSON string | yes      | Transcription config (see §4); send as string  |

- **Success response (HTTP 200):**
  ```json
  { "id": "<TRANSCRIBE_ID>" }
  ```
  Use this `id` to poll for the result (§6).

### cURL example

```bash
curl -X POST "https://openapi.vito.ai/v1/transcribe" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample.wav" \
  -F 'config={"use_diarization":true,"diarization":{"spk_count":2}}'
```

## 4. `config` parameters

All optional unless noted. Send as a JSON-encoded string in the `config` form field.

| Parameter                | Type    | Default   | Allowed values                             | Notes                                                        |
| ------------------------ | ------- | --------- | ------------------------------------------ | ------------------------------------------------------------ |
| `model_name`             | string  | `sommers` | `sommers`, `whisper`                       | Recognition model                                            |
| `language`               | string  | `ko`      | `ko`, `ja`, `detect`, `multi`              | `detect` / `multi` only valid with `whisper`                 |
| `language_candidates`    | array   | —         | subset of `["ko","ja","zh","en"]`          | Only used when `language` is `detect` or `multi`             |
| `use_diarization`        | boolean | `false`   | —                                          | Speaker diarization on/off                                   |
| `diarization.spk_count`  | integer | `0`       | `0` = auto-predict, otherwise positive int | Only used when `use_diarization` is `true`                   |
| `use_itn`                | boolean | `true`    | —                                          | Inverse text normalization (numbers/units/English)           |
| `use_disfluency_filter`  | boolean | `true`    | —                                          | Removes filler words                                         |
| `use_profanity_filter`   | boolean | `false`   | —                                          | Masks profanity                                              |
| `use_paragraph_splitter` | boolean | `true`    | —                                          | Paragraph segmentation                                       |
| `paragraph_splitter.max` | integer | `50`      | `>= 1`                                     | Max characters per paragraph; only used when splitter is on  |
| `domain`                 | string  | `GENERAL` | `GENERAL`, `CALL`                          | Acoustic domain                                              |
| `use_word_timestamp`     | boolean | `false`   | —                                          | Include per-word timestamps in result                        |
| `keywords`               | array   | —         | array of strings                           | Boost recognition for domain terms                           |

### Example config

```json
{
  "model_name": "sommers",
  "use_diarization": true,
  "diarization": { "spk_count": 2 },
  "use_itn": true,
  "use_disfluency_filter": true,
  "use_profanity_filter": false,
  "use_paragraph_splitter": true,
  "paragraph_splitter": { "max": 50 },
  "domain": "GENERAL",
  "use_word_timestamp": false,
  "keywords": []
}
```

## 5. File constraints

- **Formats:** `mp4`, `m4a`, `mp3`, `amr`, `flac`, `wav`
- **Max file size:** 2 GB
- **Max duration:** 4 hours
- **Processing time:** typically starts within ~5 minutes; can exceed 30 minutes under peak load.

## 6. Poll for the result

- **Endpoint:** `GET /v1/transcribe/{TRANSCRIBE_ID}`
- **Headers:** `Authorization: Bearer <access_token>`
- **Recommended polling interval:** 5 seconds (shorter intervals can trigger HTTP 429 / `A0003`)

### Status values

| `status`       | Meaning                                         |
| -------------- | ----------------------------------------------- |
| `transcribing` | Job still running — keep polling                |
| `completed`    | Result is ready in `results.utterances`         |
| `failed`       | Job failed — see `error.code` / `error.message` |

### `completed` response shape

```json
{
  "id": "<TRANSCRIBE_ID>",
  "status": "completed",
  "results": {
    "utterances": [
      {
        "start_at": 4737,
        "duration": 2360,
        "msg": "안녕하세요.",
        "spk": 0,
        "lang": "ko"
      }
    ]
  }
}
```

| Field                   | Type    | Meaning                                          |
| ----------------------- | ------- | ------------------------------------------------ |
| `id`                    | string  | Transcribe job ID                                |
| `status`                | string  | `transcribing` / `completed` / `failed`          |
| `results.utterances[]`  | array   | Spoken segments in chronological order           |
| `utterances[].start_at` | integer | Segment start time (milliseconds)                |
| `utterances[].duration` | integer | Segment duration (milliseconds)                  |
| `utterances[].msg`      | string  | Transcribed text                                 |
| `utterances[].spk`      | integer | Speaker / channel index (when diarization is on) |
| `utterances[].lang`     | string  | ISO 639-1 language code (detected or configured) |

### `failed` response shape

```json
{
  "id": "<TRANSCRIBE_ID>",
  "status": "failed",
  "error": { "code": "<CODE>", "message": "<MESSAGE>" }
}
```

## 7. Errors

| HTTP | Code    | Meaning                                         |
| ---- | ------- | ----------------------------------------------- |
| 400  | `H0001` | Invalid parameter                               |
| 400  | `H0010` | Unsupported file format                         |
| 401  | `H0002` | Invalid token                                   |
| 403  | `H0003` | Unauthorized                                    |
| 404  | `H0004` | Transcription result not found                  |
| 410  | `H0007` | Transcription result expired                    |
| 413  | `H0005` | File size exceeds limit                         |
| 413  | `H0006` | File duration exceeds limit                     |
| 429  | `A0001` | Usage quota exceeded                            |
| 429  | `A0002` | Concurrent processing limit exceeded            |
| 429  | `A0003` | Request rate limit exceeded (polling too often) |
| 500  | `E500`  | Server error                                    |

## 8. Rate / concurrency limits

- Concurrent jobs and total quota depend on account tier (set in RTZR console).
- Poll at most every ~5 s per job; back off on `A0003`.
- Treat `A0001` / `A0002` as user-visible errors (not retryable in-session).

---

## 9. Integration notes for this codebase

This repo is a Vite + React + TS SPA using Supabase for auth and data. Plan the STT integration with that in mind.

### 9.1 Where the code will live

| Concern                                              | Suggested path                     | Mirrors                     |
| ---------------------------------------------------- | ---------------------------------- | --------------------------- |
| Low-level API client (auth + transcribe + poll)      | `src/lib/sttClient.ts`             | `src/lib/supabaseClient.ts` |
| Shared TS types (`TranscribeConfig`, `Utterance`, …) | `src/lib/sttClient.ts` (same file) | —                           |
| React state hook (`useTranscribe`)                   | `src/hooks/useTranscribe.ts`       | `src/hooks/useAuth.ts`      |

### 9.2 Environment variables

Vite exposes anything prefixed `VITE_` to the browser bundle. That has security consequences for this API — see §9.3.

| Var                       | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| `VITE_RTZR_CLIENT_ID`     | RTZR `client_id`                               |
| `VITE_RTZR_CLIENT_SECRET` | RTZR `client_secret` — **see §9.3**            |
| `VITE_RTZR_BASE_URL`      | `https://openapi.vito.ai` (override for tests) |

### 9.3 Security caveat — do NOT call RTZR directly from the browser in production

`client_secret` is a long-lived credential. Anything bundled with `VITE_` is shipped to every visitor's browser, so a direct browser → RTZR call leaks it permanently.

Two acceptable architectures:

1. **Recommended:** put the auth + transcribe + polling calls behind a **Supabase Edge Function** (or any server you control). The browser uploads the file to that function; the function holds `RTZR_CLIENT_ID` / `RTZR_CLIENT_SECRET` as Supabase secrets (no `VITE_` prefix) and proxies to RTZR. This also avoids CORS issues.
2. **Dev-only:** call RTZR directly from the SPA using the `VITE_RTZR_*` vars, accepting that the secret is exposed. Acceptable for local prototyping only — never deploy this build.

The reference client in `src/lib/sttClient.ts` should be written so it works against either a direct RTZR base URL or a same-origin proxy URL — only `VITE_RTZR_BASE_URL` changes.

### 9.4 Token caching

The JWT lives until `expire_at`. Cache it in memory inside `sttClient.ts` and refresh when within 30 minutes of expiry. Do not persist it to `localStorage`.

### 9.5 Polling shape for the React hook

`useTranscribe(file, config)` should expose:

- `status`: `'idle' | 'uploading' | 'transcribing' | 'completed' | 'failed'`
- `transcribeId`: `string | null`
- `utterances`: `Utterance[] | null`
- `error`: `{ code: string; message: string } | null`
- `progressMs?`: optional, derived from last `utterances[-1].start_at + duration`

Polling interval: 5 s. Back off (e.g. doubled, capped at 30 s) on `A0003`. Stop polling on `completed` or `failed`, on component unmount, and after a configurable max wait (default 30 min).

### 9.6 File-format guard

Before upload, validate extension against §5 (`mp4`, `m4a`, `mp3`, `amr`, `flac`, `wav`) and size ≤ 2 GB. Surface `H0010` / `H0005` / `H0006` to the user with a friendly message rather than the raw RTZR code.
