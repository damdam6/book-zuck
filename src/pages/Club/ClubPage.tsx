import { useParams } from "react-router-dom";
import TheHeader from "@/components/common/TheHeader";

const ClubPage = () => {
  const { clubId } = useParams<{ clubId: string }>();
  return (
    <>
      <TheHeader />
      <main className="px-24 py-8">
        <h1 className="text-2xl font-bold">모임 화면</h1>
        <p className="text-gray-500">clubId: {clubId}</p>
        {/* TODO: Club 상세 구현 (M5, PRD §7-4) */}
      </main>
    </>
  );
};

export default ClubPage;
