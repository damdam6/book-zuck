import { Route, Routes } from "react-router-dom";
import MainPage from "@/pages/MainPage";
import { AudioStt } from "@/AudioStt";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MainPage />} />
        {/* 임시: 음성 업로드 → 한국어 전사 검증 화면 */}
        <Route path="/stt" element={<AudioStt />} />
      </Routes>
    </>
  );
}

export default App;
