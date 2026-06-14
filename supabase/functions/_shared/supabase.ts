// Edge Function용 Supabase 클라이언트 헬퍼.
// - admin: service role 키로 RLS 우회(row 생성/수정)
// - getUser: 요청의 Authorization JWT를 검증해 로그인 사용자 확인

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Supabase가 함수에 자동 주입한다.
export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

/** Authorization 헤더의 JWT로 로그인 사용자를 확인. 실패 시 null. */
export async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const anon = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
