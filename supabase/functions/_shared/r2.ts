// Cloudflare R2 (S3 호환) 접근 헬퍼.
// 자격증명은 Edge Function 시크릿(Deno env)에서만 읽는다. 브라우저 노출 금지.
//
// - presignPut: 브라우저가 R2에 직접 PUT 할 수 있는 presigned URL 발급
// - getObject:  stt-submit이 RTZR로 스트리밍 전달하기 위해 객체를 받아옴

import { AwsClient } from "npm:aws4fetch@1.0.20";

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

// https://<account_id>.r2.cloudflarestorage.com/<bucket>/<key>
function objectUrl(key: string): string {
  const accountId = env("R2_ACCOUNT_ID");
  const bucket = env("R2_BUCKET");
  const base = `https://${accountId}.r2.cloudflarestorage.com`;
  // key의 각 세그먼트를 인코딩(슬래시는 유지)
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${base}/${encodeURIComponent(bucket)}/${encodedKey}`;
}

function client(): AwsClient {
  return new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    region: "auto",
    service: "s3",
  });
}

/** 브라우저 직접 업로드용 presigned PUT URL. 기본 만료 5분. */
export async function presignPut(
  key: string,
  contentType: string,
  expiresSec = 300,
): Promise<string> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  const signed = await client().sign(
    new Request(url, { method: "PUT", headers: { "content-type": contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

/** 서버 측 객체 다운로드. 본문은 ReadableStream으로 그대로 스트리밍 가능. */
export async function getObject(key: string): Promise<Response> {
  const res = await client().fetch(objectUrl(key), { method: "GET" });
  if (!res.ok) {
    throw new Error(`R2 getObject 실패: ${res.status} ${await res.text()}`);
  }
  return res;
}
