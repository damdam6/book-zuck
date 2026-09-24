import logoMarkup from "@/assets/brand/logo.svg?raw";

// 빌드 타임에 번들되는 리포 내 정적 SVG 파일 — 인라인해야 fill="currentColor"가
// 실제로 부모 text color를 상속한다(<img src>는 항상 검정으로 고정됨).
const BrandLogo = ({ className }: { className?: string }) => (
  <span
    role="img"
    aria-label="북적북적"
    className={className}
    dangerouslySetInnerHTML={{ __html: logoMarkup }}
  />
);

export default BrandLogo;
