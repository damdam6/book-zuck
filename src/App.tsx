import { Route, Routes } from "react-router-dom";
import HomePage from "@/pages/Home/HomePage";
import BookshelfPage from "@/pages/Bookshelf/BookshelfPage";
import BookAgendaPage from "@/pages/BookAgenda/BookAgendaPage";
import AgendaNewPage from "@/pages/AgendaNew/AgendaNewPage";
import MyPage from "@/pages/My/MyPage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bookshelf" element={<BookshelfPage />} />
        <Route path="/books/:bookId/agenda" element={<BookAgendaPage />} />
        <Route path="/agenda/new" element={<AgendaNewPage />} />
        <Route path="/my" element={<MyPage />} />
      </Routes>
    </>
  );
}

export default App;
