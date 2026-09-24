import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { GlyphLetter } from "@/pages/Home/glyphDrop/letters";

// 히어로 레이어는 히어로+가로 책장을 함께 감싼 박스 안의 모든 [data-ob]/[data-floor]를
// 충돌 대상으로 삼는다("dom"). 하단 장식 레이어는 실제 바닥선 없이 박스 하단 자체를
// 합성 바닥으로 쓴다("container-bottom"). 프로토타입 startFx()의 hero/bottom 두 레이어 구성과
// 동일하다 (docs/design/buckzuck-bookclub.dc.html:402-454).
export type GlyphFloorMode = "dom" | "container-bottom";

type ItemState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  started: boolean;
  resting: boolean;
  gone: boolean;
  bookHits: number;
  front: boolean;
  xFrac: number;
};

type Rect = { l: number; t: number; r: number; b: number };

const GRAVITY = 0.55;
const START_DELAY_MS = 400; // Home 진입/재진입 0.4s 후 재생 (PRD §7-1)
const HORIZONTAL_SLOTS = [0.12, 0.3, 0.5, 0.68, 0.88];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pickSlot = () => {
  const base = HORIZONTAL_SLOTS[Math.floor(Math.random() * HORIZONTAL_SLOTS.length)];
  return base + rand(-0.02, 0.02);
};
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const relRect = (el: Element, cr: DOMRect): Rect => {
  const r = el.getBoundingClientRect();
  return { l: r.left - cr.left, t: r.top - cr.top, r: r.right - cr.left, b: r.bottom - cr.top };
};
const overlaps = (item: ItemState, w: number, h: number, o: Rect) =>
  !(item.x + w <= o.l || item.x >= o.r || item.y + h <= o.t || item.y >= o.b);

type UseGlyphDropPhysicsArgs = {
  containerRef: RefObject<HTMLDivElement | null>;
  itemRefs: RefObject<(HTMLSpanElement | null)[]>;
  letters: GlyphLetter[];
  floorMode: GlyphFloorMode;
};

// 낙하(중력)→책등(data-ob) 충돌 시 옆으로 이탈(6회 초과 시 앞으로 빼서 통과)→바닥선
// (data-floor 또는 합성 바닥)에서 감쇠 후 정지, 화면 밖 제거. DOM을 직접 조작해(el.style)
// 프레임마다 React 리렌더를 유발하지 않는다 — 프로토타입 startFx()와 동일한 접근.
export const useGlyphDropPhysics = ({
  containerRef,
  itemRefs,
  letters,
  floorMode,
}: UseGlyphDropPhysicsArgs) => {
  const lettersRef = useRef(letters);
  lettersRef.current = letters;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items: ItemState[] = lettersRef.current.map(() => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
      vr: 0,
      started: false,
      resting: false,
      gone: false,
      bookHits: 0,
      front: false,
      xFrac: pickSlot(),
    }));

    let rafId: number | null = null;
    let timeoutId: number | null = null;

    const placeAtRest = (item: ItemState, w: number, h: number, cr: DOMRect) => {
      item.x = item.xFrac * cr.width - w / 2;
      item.y = cr.height - h - 14;
      item.rot = rand(-3, 3);
      item.started = true;
      item.resting = true;
    };

    const start = () => {
      if (prefersReducedMotion()) {
        const cr = container.getBoundingClientRect();
        items.forEach((item, i) => {
          const el = itemRefs.current[i];
          if (!el) return;
          placeAtRest(item, el.offsetWidth, el.offsetHeight, cr);
          el.style.opacity = "1";
          el.style.transform = `translate(${item.x}px, ${item.y}px) rotate(${item.rot}deg)`;
        });
        return;
      }

      const t0 = performance.now();
      let last = t0;

      const step = (now: number) => {
        const dt = Math.min(2, (now - last) / 16.7);
        last = now;
        const t = (now - t0) / 1000;
        let alive = false;

        const cr = container.getBoundingClientRect();
        const obstacles = Array.from(container.querySelectorAll("[data-ob]")).map((el) =>
          relRect(el, cr),
        );
        const floors: Rect[] =
          floorMode === "dom"
            ? Array.from(container.querySelectorAll("[data-floor]")).map((el) => relRect(el, cr))
            : [];
        if (floorMode === "container-bottom") {
          floors.push({ l: -100000, r: 100000, t: cr.height, b: cr.height + 50 });
        }

        items.forEach((item, i) => {
          const el = itemRefs.current[i];
          if (!el || item.gone) return;
          const w = el.offsetWidth || 90;
          const h = el.offsetHeight || 140;

          if (!item.started) {
            if (t < lettersRef.current[i].delayS) {
              alive = true;
              return;
            }
            item.started = true;
            item.x = item.xFrac * cr.width - w / 2;
            item.y = -h - 40;
            item.vx = rand(-0.75, 0.75);
            el.style.opacity = "1";
          }

          if (item.resting) return;
          alive = true;

          const prevX = item.x;
          const prevY = item.y;
          // 바닥선 두께(12px)보다 프레임당 이동량이 커지면 충돌을 건너뛰고 그대로
          // 통과(터널링)해 버린다. 낙하 거리가 긴 컨테이너(히어로+가로 책장 전체)에서
          // 실제로 발생해 종단 속도를 둔다 — 프로토타입엔 없던 안전장치.
          item.vy = Math.min(item.vy + GRAVITY * dt, 11);
          item.x += item.vx * dt;
          item.y += item.vy * dt;
          item.vr = Math.max(-12, Math.min(12, item.vr)) * 0.995;
          item.rot += item.vr * dt;

          const hitBook = (o: Rect) => {
            if (!overlaps(item, w, h, o)) return;
            const cx = item.x + w / 2;
            const ocx = (o.l + o.r) / 2;
            const dir = cx < ocx ? -1 : 1;
            item.bookHits += 1;
            if (item.bookHits > 6) {
              item.front = true;
              return;
            }
            if (prevY + h <= o.t + 1) {
              item.y = o.t - h;
              item.vy = -Math.max(4, Math.abs(item.vy) * 0.45);
              item.vx = dir * rand(3, 6);
              item.vr = dir * rand(6, 10);
            } else if (prevX + w <= o.l + 1) {
              item.x = o.l - w;
              item.vx = -Math.abs(item.vx) * 0.6 - 1;
              item.vr = -4;
            } else if (prevX >= o.r - 1) {
              item.x = o.r;
              item.vx = Math.abs(item.vx) * 0.6 + 1;
              item.vr = 4;
            } else {
              item.vx = dir * rand(3, 5);
            }
          };

          const hitFloor = (o: Rect) => {
            if (!overlaps(item, w, h, o) || prevY + h > o.t + 1) return;
            item.y = o.t - h;
            item.vy = -Math.abs(item.vy) * 0.42;
            item.vx *= 0.55;
            item.vr *= 0.5;
            if (Math.abs(item.vy) < 1.2) {
              item.vy = 0;
              item.vx = 0;
              item.vr = 0;
              item.rot = Math.round(item.rot / 360) * 360 + rand(-3, 3);
              item.resting = true;
            }
          };

          if (!item.front) obstacles.forEach(hitBook);
          floors.forEach(hitFloor);

          if (item.y > cr.height + 300 || item.x < -400 || item.x > cr.width + 400) {
            item.gone = true;
            el.style.opacity = "0";
          }

          el.style.transform = `translate(${item.x}px, ${item.y}px) rotate(${item.rot}deg)`;
        });

        rafId = alive ? requestAnimationFrame(step) : null;
      };

      rafId = requestAnimationFrame(step);
    };

    timeoutId = window.setTimeout(start, START_DELAY_MS);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [containerRef, itemRefs, floorMode]);
};
