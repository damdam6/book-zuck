import { useRef } from "react";
import TheHeader from "@/components/common/TheHeader";
import { useHomeClubs } from "@/pages/Home/hooks/useHomeClubs";
import HeroShelf from "@/pages/Home/components/HeroShelf";
import HorizontalShelf from "@/pages/Home/components/HorizontalShelf";
import BottomDecoration from "@/pages/Home/components/BottomDecoration";
import GlyphDropLayer from "@/pages/Home/glyphDrop/GlyphDropLayer";
import { HOME_BOTTOM_LETTERS, HOME_HERO_LETTERS } from "@/pages/Home/glyphDrop/letters";

// PRD §7-1 — 히어로 책장 + Glyph Drop + 가로 책장 + 하단 장식.
// 히어로 Glyph 레이어는 히어로+가로 책장을 함께 감싼 박스(heroSectionRef) 위에 올려
// 두 섹션의 [data-ob]/[data-floor]를 모두 충돌 대상으로 삼는다(설계 §3 참고).
const HomePage = () => {
  const { status, clubs, retry } = useHomeClubs();
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLElement>(null);
  const bottomSectionRef = useRef<HTMLDivElement>(null);

  const scrollToShelf = () => {
    const el = shelfRef.current;
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 20,
      behavior: "smooth",
    });
  };

  return (
    <>
      <TheHeader />
      <main className="mx-auto w-full max-w-(--width-shell) overflow-x-hidden pb-16 shadow-[0_0_0_1px_var(--color-neutral-100)] compact:pb-0">
        <div ref={heroSectionRef} className="relative px-5 compact:px-8">
          <GlyphDropLayer
            containerRef={heroSectionRef}
            letters={HOME_HERO_LETTERS}
            floorMode="dom"
          />
          <HeroShelf onAgendaClick={scrollToShelf} />
          <HorizontalShelf shelfRef={shelfRef} status={status} clubs={clubs} onRetry={retry} />
        </div>

        <div ref={bottomSectionRef} className="relative overflow-hidden px-5 compact:px-8">
          <GlyphDropLayer
            containerRef={bottomSectionRef}
            letters={HOME_BOTTOM_LETTERS}
            floorMode="container-bottom"
          />
          <BottomDecoration />
        </div>
      </main>
    </>
  );
};

export default HomePage;
