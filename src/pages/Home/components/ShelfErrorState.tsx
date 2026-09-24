type ShelfErrorStateProps = {
  onRetry: () => void;
};

// 에러 상태 — 인라인 메시지 + 다시 시도 (PRD §7-1 상태).
const ShelfErrorState = ({ onRetry }: ShelfErrorStateProps) => (
  <div className="flex min-h-[380px] flex-col items-start justify-center gap-3 pl-5 compact:min-h-[640px] compact:pl-8">
    <p className="text-[15px] text-neutral-700">모임 목록을 불러오지 못했어요.</p>
    <button
      type="button"
      onClick={onRetry}
      className="min-h-11 cursor-pointer rounded border border-black px-[18px] py-[11px] text-sm font-medium"
    >
      다시 시도
    </button>
  </div>
);

export default ShelfErrorState;
