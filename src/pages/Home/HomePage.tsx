import TheHeader from "@/components/common/TheHeader";
import { Button } from "@/components/ui/button";

const HomePage = () => {
  return (
    <>
      <TheHeader />
      <main className="px-24 py-8">
        <h1 className="text-2xl font-bold">홈 화면</h1>
        <Button className="mt-4">모임 추가</Button>
        <div className="mt-4 text-gray-700">책장</div>
      </main>
    </>
  );
};

export default HomePage;
