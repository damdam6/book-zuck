import { Link } from "react-router-dom";
import TheHeader from "@/components/common/TheHeader";
import { Button } from "@/components/ui/button";

const HomePage = () => {
  return (
    <>
      <TheHeader />
      <main className="px-24 py-8">
        <h1 className="text-2xl font-bold">홈 화면</h1>

        <Button asChild className="mt-4">
          <Link to="/agenda/new">모임 추가</Link>
        </Button>

        <nav className="mt-6 flex flex-col gap-2 text-blue-700 underline">
          <Link to="/bookshelf">책장 리스트 화면</Link>
          <Link to="/books/1/agenda">책별 발제 화면 (예: book 1)</Link>
          <Link to="/agenda/new">발제 등록 화면</Link>
          <Link to="/my">마이 화면</Link>
        </nav>
      </main>
    </>
  );
};

export default HomePage;
