import { useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { Link } from "react-router-dom";
import type { HomeClubBook } from "@/pages/Home/data/clubBooks";
import type { HomeClubsStatus } from "@/pages/Home/hooks/useHomeClubs";
import ShelfSkeleton from "@/pages/Home/components/ShelfSkeleton";
import ShelfEmptyState from "@/pages/Home/components/ShelfEmptyState";
import ShelfErrorState from "@/pages/Home/components/ShelfErrorState";

type HorizontalShelfProps = {
  shelfRef: RefObject<HTMLElement | null>;
  status: HomeClubsStatus;
  clubs: HomeClubBook[];
  onRetry: () => void;
};

const scrollBy = (row: HTMLDivElement | null, direction: 1 | -1) => {
  row?.scrollBy({ left: direction * Math.round(window.innerWidth * 0.6), behavior: "smooth" });
};

// 책등(접힘) 폭·높이는 책마다 다르다: 높이는 제목 길이%3로 소폭 변주해 들쭉날쭉한
// 책장 느낌을 낸다(PRD §7-1). 반응형(모바일 vs 그 외)은 CSS 커스텀 프로퍼티로 처리해
// 뷰포트 JS 추적 없이 구현한다(HeroShelf의 --hero-scale과 동일한 패턴).
const spineSizeStyle = (book: HomeClubBook): CSSProperties => {
  const desktopW = book.spineWidth;
  const mobileW = Math.round(book.spineWidth * 0.85);
  const desktopH = 540 + (book.title.length % 3) * 30;
  const mobileH = 320 + (book.title.length % 3) * 26;
  return {
    background: book.spineColor,
    color: book.spineInk,
    ...({
      "--spine-w-mobile": `${mobileW}px`,
      "--spine-w-desktop": `${desktopW}px`,
      "--spine-h-mobile": `${mobileH}px`,
      "--spine-h-desktop": `${desktopH}px`,
    } as CSSProperties),
  };
};

const HorizontalShelf = ({ shelfRef, status, clubs, onRetry }: HorizontalShelfProps) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!expandedId) return;
    const raf = requestAnimationFrame(() => {
      const card = cardRef.current;
      const row = rowRef.current;
      if (!card || !row) return;
      const r = card.getBoundingClientRect();
      const rr = row.getBoundingClientRect();
      const target = row.scrollLeft + (r.left - rr.left) - (rr.width - r.width) / 2;
      row.scrollTo({
        left: Math.max(0, Math.min(target, row.scrollWidth - rr.width)),
        behavior: "smooth",
      });
      const fits = r.height + 80 <= window.innerHeight;
      const top = fits
        ? r.top + window.scrollY - (window.innerHeight - r.height) / 2
        : r.top + window.scrollY - 24;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [expandedId]);

  const showButtons = status === "success" && clubs.length > 0;

  return (
    <section ref={shelfRef} className="pt-12 compact:pt-16 wide:pt-20">
      <div className="relative">
        {showButtons && (
          <>
            <button
              type="button"
              aria-label="이전"
              onClick={() => scrollBy(rowRef.current, -1)}
              className="absolute top-1/2 left-2 z-[4] flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/55 text-2xl leading-none text-black backdrop-blur-sm hover:bg-white/90"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="다음"
              onClick={() => scrollBy(rowRef.current, 1)}
              className="absolute top-1/2 right-2 z-[4] flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/55 text-2xl leading-none text-black backdrop-blur-sm hover:bg-white/90"
            >
              ›
            </button>
          </>
        )}

        {status === "loading" && <ShelfSkeleton />}
        {status === "empty" && <ShelfEmptyState />}
        {status === "error" && <ShelfErrorState onRetry={onRetry} />}

        {status === "success" && (
          <div ref={rowRef} className="overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
            <div className="flex w-max min-w-full items-end gap-10 py-0 pl-5 compact:gap-[120px] compact:pl-8">
              {clubs.map((book) =>
                book.id === expandedId ? (
                  <Link
                    key={book.id}
                    ref={cardRef}
                    to={`/clubs/${book.id}`}
                    className="flex w-[300px] max-w-[calc(100vw-40px)] flex-none flex-col overflow-hidden rounded-xl border border-neutral-400 bg-white shadow-[0_12px_40px_rgba(0,0,0,.12)] compact:h-[620px] compact:w-[760px] compact:max-w-none compact:flex-row"
                  >
                    <div
                      className="relative flex h-45 flex-none items-center justify-center compact:h-full compact:w-95"
                      style={{ background: book.spineColor }}
                    >
                      <div className="absolute inset-0 [background:repeating-linear-gradient(-45deg,rgba(255,255,255,.08)_0_10px,transparent_10px_22px)]" />
                      <span
                        className="relative text-[clamp(36px,8vw,64px)] font-bold tracking-[12px] [writing-mode:horizontal-tb] compact:[writing-mode:vertical-rl]"
                        style={{ color: book.spineInk }}
                      >
                        {book.title}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-5 compact:p-10">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="m-0 text-[clamp(24px,5vw,32px)] font-bold">{book.title}</h3>
                        <span className="text-sm whitespace-nowrap text-neutral-700">
                          {book.heldAt}
                        </span>
                      </div>
                      <div className="mt-1 text-[15px] text-neutral-700">
                        {book.author} · {book.publisher}
                      </div>
                      <ol className="mt-5 flex flex-col gap-3.5 p-0 text-base leading-normal compact:mt-9 compact:gap-5.5">
                        {book.agendas.map((text, i) => (
                          <li key={i} className="flex list-none gap-3">
                            <span className="flex-none font-medium text-orange-500">{i + 1}.</span>
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                              {text}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5 text-[13px] text-neutral-700">
                        <span>
                          참여 {book.participantCount}명 · {book.place}
                        </span>
                        <span className="font-medium text-black">
                          한 번 더 누르면 모임 기록으로 →
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <button
                    key={book.id}
                    type="button"
                    data-ob=""
                    onClick={() => setExpandedId(book.id)}
                    style={spineSizeStyle(book)}
                    className="flex h-[var(--spine-h-mobile)] w-[var(--spine-w-mobile)] flex-none cursor-pointer flex-col items-center justify-between rounded-[2px] py-7 pb-5.5 shadow-[inset_-3px_0_6px_rgba(0,0,0,.12)] transition-transform duration-200 hover:-translate-y-3.5 compact:h-[var(--spine-h-desktop)] compact:w-[var(--spine-w-desktop)]"
                  >
                    <span className="text-[20px] font-bold tracking-[6px] [writing-mode:vertical-rl]">
                      {book.title}
                    </span>
                    <span className="text-[11px] tracking-[3px] opacity-85 [writing-mode:vertical-rl]">
                      {book.author}
                    </span>
                    <span className="text-[9px] opacity-75">{book.publisher}</span>
                  </button>
                ),
              )}
              <div className="w-5 flex-none compact:w-8" />
            </div>
          </div>
        )}
      </div>
      <div data-floor="" className="ml-0 h-3 bg-black compact:ml-[33%]" />
    </section>
  );
};

export default HorizontalShelf;
