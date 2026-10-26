// Fitting a bank's name onto a sign (houseStyleArt.tsx, houseStyleQuant.tsx):
// the font size that fits the text in the sign's box, and the SVG text
// attributes for it, squeezing long names with textLength once the size
// would drop below a readable minimum.

/** Font size that fits `text` in `w`, and a squeeze for names that won't fit. */
export function fit(text: string, w: number, h: number, widthPerEm: number) {
  const size = Math.min(h * 0.72, w / Math.max(1, text.length * widthPerEm));
  const min = 4.2;
  return size >= min
    ? { fontSize: `${size.toFixed(2)}px` }
    : { fontSize: `${min}px`, textLength: w, lengthAdjust: 'spacingAndGlyphs' as const };
}

/** The text attributes for a fitted size, with an optional fill. */
export const attrs = (t: ReturnType<typeof fit>, w: number, fill?: string) => {
  const style = fill ? { fontSize: t.fontSize, fill } : { fontSize: t.fontSize };
  return 'textLength' in t ? { style, textLength: w, lengthAdjust: t.lengthAdjust } : { style };
};
