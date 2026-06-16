import { Route, Routes } from "react-router-dom";
import HomePage from "@/pages/Home/HomePage";
import BookshelfPage from "@/pages/Bookshelf/BookshelfPage";
import BookAgendaPage from "@/pages/BookAgenda/BookAgendaPage";
import AgendaNewPage from "@/pages/AgendaNew/AgendaNewPage";
import MyPage from "@/pages/My/MyPage";
import { AudioStt } from "@/AudioStt";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bookshelf" element={<BookshelfPage />} />
        <Route path="/books/:bookId/agenda" element={<BookAgendaPage />} />
        <Route path="/agenda/new" element={<AgendaNewPage />} />
        <Route path="/my" element={<MyPage />} />
        {/* 임시: 음성 업로드 → 한국어 전사 검증 화면 */}
        <Route path="/stt" element={<AudioStt />} />
      </Routes>
    </>
  );
}

export default App;
