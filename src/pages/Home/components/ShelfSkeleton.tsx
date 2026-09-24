// 로딩 상태 — 책등 자리에 회색 스켈레톤 8개 (PRD §7-1 상태).
const ShelfSkeleton = () => (
  <div
    className="flex items-end gap-10 py-0 pl-5 compact:gap-[120px] compact:pl-8"
    aria-hidden="true"
  >
    {Array.from({ length: 8 }, (_, i) => (
      <div
        key={i}
        className="h-[380px] w-13 flex-none animate-pulse rounded-[2px] bg-neutral-100 compact:h-[640px]"
      />
    ))}
  </div>
);

export default ShelfSkeleton;
