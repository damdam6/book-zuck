import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/SupabaseClient";
import { useState } from "react";
import ProfileModal from "@/components/Modal/ProfileModal";

const TheHeader = () => {
  const { user, name, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) console.error("로그인 실패:", error.message);
  };

  return (
    <div className="px-24 py-8 flex justify-between items-center">
      <div>로고</div>

      {user ? (
        <div
          className="flex items-center p-4 gap-4"
          onClick={() => setIsOpen(!isOpen)}
        >
          <img className="w-12 h-12 rounded-full" src={profile} alt={name} />
          <span className="text-xl font-bold">{name}</span>

          {isOpen && (
            <>
              <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 top-12 z-10">
                <ProfileModal />
              </div>
            </>
          )}
        </div>
      ) : (
        <button className="cursor-pointer font-bold" onClick={signInWithGoogle}>
          구글 로그인
        </button>
      )}
    </div>
  );
};

export default TheHeader;
