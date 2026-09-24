// 홈 Glyph Drop 글자·색 구성 — PRD §7-1 OQ5 권장안 채택(docs/PRD.md §11 OQ5):
// "BUCKZUCK"에서 히어로 4자(B U C K) + 하단 3자(Z U C), point→초록→노랑→남색 4색이
// 7글자 전체에 걸쳐 순환한다. 색은 브랜드 토큰 var()만 참조하고 생 hex를 쓰지 않는다.
export type GlyphLetter = {
  char: string;
  color: string;
  /** 낙하 시작까지의 지연(초). 프로토타입(docs/design/buckzuck-bookclub.dc.html)의
   *  스태거 간격을 참고한 값. */
  delayS: number;
};

const GLYPH_COLOR_CYCLE = [
  "var(--color-orange-500)",
  "var(--color-glyph-green)",
  "var(--color-glyph-yellow)",
  "var(--color-glyph-navy)",
];

const colorFor = (index: number) => GLYPH_COLOR_CYCLE[index % GLYPH_COLOR_CYCLE.length];

export const HOME_HERO_LETTERS: GlyphLetter[] = ["B", "U", "C", "K"].map((char, i) => ({
  char,
  color: colorFor(i),
  delayS: [0.2, 0.6, 0.9, 1.4][i],
}));

export const HOME_BOTTOM_LETTERS: GlyphLetter[] = ["Z", "U", "C"].map((char, i) => ({
  char,
  color: colorFor(i + HOME_HERO_LETTERS.length),
  delayS: [1.8, 2.2, 2.6][i],
}));
