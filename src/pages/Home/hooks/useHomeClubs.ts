import { useCallback, useEffect, useState } from "react";
import { HOME_CLUB_BOOKS, type HomeClubBook } from "@/pages/Home/data/clubBooks";

export type HomeClubsStatus = "loading" | "success" | "empty" | "error";

export type UseHomeClubsResult = {
  status: HomeClubsStatus;
  clubs: HomeClubBook[];
  retry: () => void;
};

const MOCK_LOAD_DELAY_MS = 300;

// M3(Supabase clubs+books 연동) 전까지는 목업 배열을 지연 후 반환한다.
// status 계약(loading/success/empty/error)은 그대로 유지해 실제 fetch로 교체할 때
// 호출부(HorizontalShelf)가 바뀌지 않도록 한다.
export const useHomeClubs = (): UseHomeClubsResult => {
  const [status, setStatus] = useState<HomeClubsStatus>("loading");
  const [clubs, setClubs] = useState<HomeClubBook[]>([]);

  const load = useCallback(() => {
    setStatus("loading");
    const timer = setTimeout(() => {
      const sorted = [...HOME_CLUB_BOOKS].sort((a, b) => a.heldAt.localeCompare(b.heldAt));
      setClubs(sorted);
      setStatus(sorted.length === 0 ? "empty" : "success");
    }, MOCK_LOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => load(), [load]);

  return { status, clubs, retry: load };
};
