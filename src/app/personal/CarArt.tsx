// A small engraved car silhouette for the showroom cards (ART_DIRECTION:
// brass line art on the vault ground): a low grand tourer, or a rounded
// 1960s body for classics. Decorative only.
const SPORT =
  'M6 40h8a7 7 0 0 1 14 0h44a7 7 0 0 1 14 0h8v-6c0-3-2-5-6-6l-14-3-12-9c-3-2-6-3-10-3H40c-5 0-9 2-13 5l-8 6-9 2c-3 1-4 3-4 6z';
const CLASSIC =
  'M8 40h7a7 7 0 0 1 14 0h40a7 7 0 0 1 14 0h8v-5c0-4-3-6-8-7l-10-2c-4-6-10-10-20-10H44c-8 0-13 4-17 10l-11 2c-5 1-8 4-8 7z';

export function CarArt(p: { classic?: boolean }) {
  return (
    <svg class="pw-car-art" viewBox="0 0 100 50" aria-hidden="true">
      <path d={p.classic ? CLASSIC : SPORT} />
      <circle cx={p.classic ? 22 : 21} cy="40" r="5" />
      <circle cx={p.classic ? 76 : 79} cy="40" r="5" />
      <path class="pw-car-road" d="M2 46h96" />
    </svg>
  );
}
