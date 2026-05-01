import { useEffect, useState } from "react";
import { supabase } from "@/lib/SupabaseClient";
import type { Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const user = session?.user;

  return {
    session,
    user,
    email: user?.email,
    name: user?.user_metadata.full_name,
    profile: user?.user_metadata.avatar_url,
  };
};
