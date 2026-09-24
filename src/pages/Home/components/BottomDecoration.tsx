// 하단 장식 — WELCOME 아웃라인 책등, 코랄 DOKSEO ARCHIVE, 회전 회색 책등(데스크톱),
// 중앙 알약 placeholder 4개 + 코랄 스티커. 순수 장식, 데이터 없음(PRD §7-1).
const BottomDecoration = () => (
  <div
    aria-hidden="true"
    className="flex flex-wrap items-end gap-3 overflow-hidden pt-10 compact:pt-14 wide:pt-18"
  >
    <div
      data-ob=""
      className="flex h-[560px] w-32.5 flex-none flex-col items-center justify-between rounded-t-lg border-2 border-neutral-500 py-5"
    >
      <span className="text-sm tracking-[2px] text-neutral-500">WELCOME</span>
      <span className="text-[30px] font-medium tracking-[2px] text-neutral-500 [writing-mode:vertical-rl]">
        BUCKZUCK
      </span>
      <span className="h-9 w-17.5 rounded border-2 border-neutral-500" />
    </div>

    <div
      data-ob=""
      className="ml-1.5 flex h-[520px] w-27.5 flex-none items-center justify-center rounded-t-[6px] bg-coral-300"
    >
      <span className="text-[26px] font-light tracking-[4px] text-white [writing-mode:vertical-rl]">
        DOKSEO ARCHIVE
      </span>
    </div>

    <div className="hidden desktop:flex desktop:items-end">
      <div
        data-ob=""
        className="ml-1.5 h-[480px] w-25 flex-none origin-bottom-left -rotate-[6deg] rounded-t-[6px] bg-neutral-300"
      />
      <div data-ob="" className="ml-1.5 h-[450px] w-20 flex-none rounded-t-[6px] bg-neutral-100" />
    </div>

    <div className="relative flex min-w-0 flex-1 basis-full flex-col items-center gap-2 pt-[180px] compact:basis-50">
      <div className="absolute top-0 left-1/2 h-32.5 w-37.5 -translate-x-[30%] -rotate-[6deg] bg-coral-300 shadow-[12px_14px_0_var(--color-neutral-600)]">
        <span className="absolute -top-2 left-14 h-4 w-10 bg-tape" />
      </div>
      <div className="flex h-17.5 w-full max-w-112.5 items-center justify-center rounded-[35px/14px] bg-neutral-100 text-center text-lg tracking-[1px] text-neutral-500">
        BUCKZUCKBUCKZUCK DOKSEOMOIM
      </div>
      <div className="flex h-20 w-full max-w-120 items-center rounded-md bg-coral-300 pl-6 text-sm tracking-[2px] text-white">
        BZBZ
      </div>
      <div className="flex h-17.5 w-full max-w-110 items-center justify-center rounded-[35px/14px] bg-neutral-100 text-center text-2xl tracking-[8px] text-neutral-500">
        B+Z B+Z
      </div>
      <div className="flex h-22.5 w-full max-w-90 items-center justify-center bg-neutral-200 text-center text-[28px] leading-[1.1] font-bold tracking-[2px] text-white">
        BZBZ DOKSEO
      </div>
    </div>

    <div className="hidden desktop:flex desktop:items-end">
      <div data-ob="" className="h-[500px] w-22.5 flex-none rounded-t-[6px] bg-neutral-400" />
      <div
        data-ob=""
        className="ml-1.5 flex h-[560px] w-30 flex-none flex-col items-center justify-between rounded-t-[6px] bg-neutral-500 py-10"
      >
        <span className="text-[26px] tracking-[2px] text-white/60 [writing-mode:vertical-rl]">
          BUCKZUCK
        </span>
        <span className="text-center text-[9px] tracking-[1px] text-white/70">
          BOOKCLUB
          <br />
          DOKSEOMOIM
        </span>
      </div>
    </div>
  </div>
);

export default BottomDecoration;
