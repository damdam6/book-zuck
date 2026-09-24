import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import ProfileModal from "@/components/Modal/ProfileModal";
import BrandLogo from "@/components/common/BrandLogo";

const NAV_ITEMS = [
  { to: "/bookshelf", label: "책장", match: (p: string) => p.startsWith("/bookshelf") },
  { to: "/my", label: "마이페이지", match: (p: string) => p.startsWith("/my") },
];

const TAB_ITEMS = [
  { to: "/", label: "홈", match: (p: string) => p === "/" },
  { to: "/bookshelf", label: "책장", match: (p: string) => p.startsWith("/bookshelf") },
  { to: "/my", label: "마이", match: (p: string) => p.startsWith("/my") },
];

const TheHeader = () => {
  const { user, name, profile } = useAuth();
  const { pathname } = useLocation();
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
    <>
      <header className="mx-auto flex w-full max-w-(--width-shell) items-center justify-between px-[clamp(20px,4vw,32px)] py-[clamp(16px,3vw,28px)]">
        <Link to="/" className="text-black">
          <BrandLogo />
        </Link>

        <div className="flex items-center gap-[clamp(16px,3vw,28px)]">
          <nav className="hidden items-center gap-[clamp(16px,3vw,28px)] text-[15px] compact:flex">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "border-b-2 pb-0.5",
                    active
                      ? "border-orange-500 text-orange-500"
                      : "border-transparent text-black",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {user ? (
            <div className="relative">
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2"
                onClick={() => setIsOpen((prev) => !prev)}
              >
                <img
                  className="h-12 w-12 rounded-full object-cover"
                  src={profile}
                  alt={name}
                />
                <span className="text-sm font-medium">{name}</span>
              </button>

              {isOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsOpen(false)}
                  />
                  <div className="absolute right-0 top-14 z-20">
                    <ProfileModal onNavigate={() => setIsOpen(false)} />
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="min-h-11 cursor-pointer rounded px-[18px] py-[11px] text-sm font-medium text-white bg-black"
              onClick={signInWithGoogle}
            >
              구글 로그인
            </button>
          )}
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-3 border-t border-black bg-white pb-[env(safe-area-inset-bottom)] compact:hidden">
        {TAB_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-0.5"
            >
              <span
                className={cn(
                  "font-hand text-[28px] leading-none",
                  active ? "text-orange-500" : "text-black",
                )}
              >
                {item.label}
              </span>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  active ? "bg-orange-500" : "bg-transparent",
                )}
              />
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default TheHeader;
