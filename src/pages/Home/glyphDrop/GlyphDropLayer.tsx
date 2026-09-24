import { useRef } from "react";
import type { RefObject } from "react";
import type { GlyphLetter } from "@/pages/Home/glyphDrop/letters";
import {
  useGlyphDropPhysics,
  type GlyphFloorMode,
} from "@/pages/Home/glyphDrop/useGlyphDropPhysics";

type GlyphDropLayerProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  letters: GlyphLetter[];
  floorMode: GlyphFloorMode;
};

// 순수 장식 — 스크린리더에는 노출하지 않는다(aria-hidden). 물리는
// useGlyphDropPhysics가 이 컴포넌트의 span에 직접 DOM 조작으로 적용한다.
const GlyphDropLayer = ({ containerRef, letters, floorMode }: GlyphDropLayerProps) => {
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  useGlyphDropPhysics({ containerRef, itemRefs, letters, floorMode });

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3] overflow-visible">
      {letters.map((letter, i) => (
        <span
          key={`${letter.char}-${i}`}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className="font-sankofa absolute top-0 left-0 text-[120px] leading-[1.5] font-normal tracking-[-0.03em] opacity-0"
          style={{ color: letter.color, willChange: "transform" }}
        >
          {letter.char}
        </span>
      ))}
    </div>
  );
};

export default GlyphDropLayer;
