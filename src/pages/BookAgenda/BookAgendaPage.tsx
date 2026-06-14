import { useParams } from "react-router-dom";
import TheHeader from "@/components/common/TheHeader";

const BookAgendaPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  return (
    <>
      <TheHeader />
      <main className="px-24 py-8">
        <h1 className="text-2xl font-bold">책별 모임 발제</h1>
        <p className="text-gray-500">bookId: {bookId}</p>
        {/* TODO: 해당 책의 발제 목록 구현 */}
      </main>
    </>
  );
};

export default BookAgendaPage;
