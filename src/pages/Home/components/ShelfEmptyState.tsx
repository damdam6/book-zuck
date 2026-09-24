// 빈 상태 — 점선 책등 1개 + 안내 문구 (PRD §7-1 상태).
const ShelfEmptyState = () => (
  <div className="flex min-h-[380px] items-end gap-6 pl-5 compact:min-h-[640px] compact:pl-8">
    <div
      className="flex h-[300px] w-13 flex-none items-center justify-center rounded-[2px] border-2 border-dashed border-neutral-400 compact:h-[520px]"
      aria-hidden="true"
    />
    <p className="pb-6 text-[15px] text-neutral-700">첫 모임을 등록해 보세요</p>
  </div>
);

export default ShelfEmptyState;
