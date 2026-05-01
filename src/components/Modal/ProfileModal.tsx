// src/components/Modal/ProfileModal.tsx
import { supabase } from "@/lib/SupabaseClient";
import { useAuth } from "@/hooks/useAuth";

const ProfileModal = () => {
  const { name, email, profile } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="w-64 rounded-2xl bg-gray-400 p-6 flex flex-col items-center gap-4">
      {/* 프로필 사진 */}
      <img
        src={profile}
        alt={name}
        className="w-20 h-20 rounded-full object-cover bg-gray-300"
      />

      {/* 이름 + 이메일 */}
      <div className="text-center">
        <p className="text-white font-bold text-lg">{name}님</p>
        <p className="text-white text-sm">{email}</p>
      </div>

      {/* 구분선 */}
      <hr className="w-full border-gray-500" />

      {/* 마이페이지 */}
      <button className="w-full text-left text-white cursor-pointer py-1">
        마이페이지
      </button>

      <hr className="w-full border-gray-500" />

      {/* 로그아웃 */}
      <button
        onClick={handleSignOut}
        className="w-full text-left text-white cursor-pointer py-1"
      >
        로그아웃
      </button>
    </div>
  );
};

export default ProfileModal;
