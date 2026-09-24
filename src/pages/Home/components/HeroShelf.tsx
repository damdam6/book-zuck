import { Link } from "react-router-dom";
import type { CSSProperties } from "react";

type HeroShelfProps = {
  onAgendaClick: () => void;
};

const GREY_SPINES = [
  { height: 560, tone: "bg-neutral-700" },
  { height: 540, tone: "bg-neutral-600" },
  { height: 500, tone: "bg-neutral-400" },
  { height: 520, tone: "bg-neutral-500" },
];

// PRD §7-1: 좌측 책등 묶음(700×580 기준) — 회색 4단계 + 흰색 + 붉은 point 책등 6권,
// 붉은 책등 위 검정 북마크 탭 + 스티커 2장. wide(≥1200)에서만 우측 묶음 추가.
// 반응형 스케일은 JS 없이 CSS 커스텀 프로퍼티로 재현한다(PRD §4-5 공식).
const HeroShelf = ({ onAgendaClick }: HeroShelfProps) => (
  <section className="relative pt-[clamp(12px,2.5vw,40px)]">
    <div className="flex flex-wrap items-end justify-between gap-[clamp(24px,3vw,48px)]">
      <div
        className="relative w-[calc(700px*var(--hero-scale))] max-w-full [--hero-scale:clamp(0.55,calc((100vw_-_40px)/760px),0.85)] desktop:[--hero-scale:1] h-[calc(580px*var(--hero-scale))]"
      >
        <div className="absolute bottom-0 left-0 flex h-[580px] w-[700px] origin-bottom-left scale-[var(--hero-scale)] items-end">
          {GREY_SPINES.map((spine, i) => (
            <div
              key={i}
              data-ob=""
              className={`ml-1.5 flex h-[var(--h)] w-[105px] flex-none items-center justify-center rounded-t-[6px] first:ml-0 ${spine.tone}`}
              style={{ "--h": `${spine.height}px` } as CSSProperties}
            >
              <span className="text-caption font-light text-white/60 [writing-mode:vertical-rl]">
                BUCKZUCK
              </span>
            </div>
          ))}

          <div data-ob="" className="ml-1.5 h-[480px] w-[80px] flex-none rounded-t-[6px] bg-white" />

          <div
            data-ob=""
            className="relative ml-1.5 h-[530px] w-[110px] flex-none rounded-t-[6px] bg-orange-500"
          >
            <div className="absolute top-0 left-3.5 h-9 w-3.5 bg-black [clip-path:polygon(0_0,100%_0,100%_100%,50%_72%,0_100%)]" />
            <span className="absolute top-8 right-6 text-[15px] text-white/85 [writing-mode:vertical-rl]">
              BUCKZUCK
            </span>

            <button
              type="button"
              onClick={onAgendaClick}
              className="absolute top-[170px] left-6 flex h-25 w-35 -rotate-[8deg] cursor-pointer items-center justify-center bg-black shadow-[2px_4px_10px_rgba(0,0,0,.25)]"
            >
              <span className="absolute -top-2 left-10 h-4 w-11 -rotate-[4deg] bg-tape" />
              <span className="font-hand text-[54px] leading-none text-white">발제</span>
            </button>

            <Link
              to="/bookshelf"
              className="absolute top-[320px] -left-7.5 flex h-27.5 w-27.5 rotate-[4deg] cursor-pointer items-center justify-center bg-white shadow-[2px_4px_10px_rgba(0,0,0,.2)]"
            >
              <span className="absolute -top-2 left-8 h-4 w-11 rotate-[3deg] bg-tape" />
              <span className="font-hand text-[50px] leading-none text-black">책장</span>
              <span className="absolute bottom-3.5 left-7.5 h-0.75 w-12.5 rounded-sm bg-orange-500" />
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden min-w-30 flex-1 self-stretch wide:block" />

      <div className="hidden flex-none items-end wide:flex">
        <div
          data-ob=""
          className="flex h-[520px] w-25 flex-none flex-col items-center rounded-t-[6px] bg-coral-300 pt-10"
        >
          <span className="text-[14px] font-bold tracking-[2px] text-white/70">BZBZ</span>
        </div>
        <div
          data-ob=""
          className="ml-1.5 flex h-[560px] w-24 flex-none flex-col items-center justify-between rounded-t-[6px] bg-neutral-300 py-6"
        >
          <span className="text-[24px] font-medium tracking-[2px] text-white [writing-mode:vertical-rl]">
            BUCKZUCK
          </span>
          <span className="text-center text-[9px] tracking-[1px] text-white">
            BOOKCLUB
            <br />
            DOKSEOMOIM
          </span>
        </div>
      </div>
    </div>

    <div className="flex gap-0 wide:gap-[260px]">
      <div data-floor="" className="h-3 flex-1 bg-black" />
      <div data-floor="" className="hidden h-3 w-55 wide:block" />
    </div>
  </section>
);

export default HeroShelf;
