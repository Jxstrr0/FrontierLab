// Small single-ink spot illustrations for the HR benefits (ART_DIRECTION §3,
// "Products, campaigns and benefits"): engraved line art on an 80 × 80 plate
// with a guilloche-style double ring. One drawing per benefit id.
const ART: Record<string, string> = {
  // Mortarboard over an open book.
  tuition:
    'M14 30 40 19l26 11-26 11zM24 35v10c9 6 23 6 32 0V35M66 30v13M22 60c6-3 12-3 18 0 6-3 12-3 18 0M40 60v-7',
  // Stack of coins with a matching coin beside it.
  pension:
    'M18 54c0 3 8 5 16 5s16-2 16-5M18 47c0 3 8 5 16 5s16-2 16-5M18 40c0 3 8 5 16 5s16-2 16-5M18 33c0-3 8-5 16-5s16 2 16 5-8 5-16 5-16-2-16-5zM18 33v21M50 33v21M60 30a8 8 0 1 0 .1 0M60 34v8M57 38h6',
  // Share certificate with a rising line.
  espp: 'M16 20h48v40H16zM20 24h40v32H20zM24 48l8-8 6 4 12-12M46 32h4v4M28 30h10',
  // Building blocks and a ball.
  childcare:
    'M16 58h16V42H16zM34 58h16V42H34zM25 40h16V24H25zM20 54l8-8M38 46l8 8M33 28v8M60 52a6 6 0 1 0 .1 0M54 52h12',
  // Bowl with steam and a spoon.
  lunch:
    'M14 42h52c0 12-12 18-26 18S14 54 14 42zM30 60h20M30 34c-3-4 3-6 0-10M40 34c-3-4 3-6 0-10M50 34c-3-4 3-6 0-10M58 20l-8 20',
  // Two hands holding a sprig.
  volunteer:
    'M14 52c6 0 10 2 14 6h14c3 0 3-4 0-4H32M66 52c-6 0-10 2-14 6M40 46V26M40 34c-6 0-10-4-10-10 6 0 10 4 10 10M40 30c5 0 9-3 9-8-5 0-9 3-9 8',
  // House with a key in the door.
  mortgage_disc: 'M14 40 40 18l26 22M20 35v25h40V35M34 60V46h12v14M44 53h6M56 22v8',
  // Heart with a pulse line.
  wellness:
    'M40 60C24 49 16 40 16 31a10 10 0 0 1 24-5 10 10 0 0 1 24 5c0 9-8 18-24 29zM18 40h12l4-8 6 14 4-6h18',
  // House with a laptop inside.
  remote_fri: 'M14 38 40 18l26 20M20 33v27h40V33M28 52h24M30 52l3-12h14l3 12M38 46h4',
};

export function BenefitArt(p: { id: string }) {
  return (
    <svg class="hq-benefit-art" viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="38" class="hq-benefit-ring" />
      <circle cx="40" cy="40" r="34.5" class="hq-benefit-ring hq-benefit-ring-fine" />
      <path d={ART[p.id] ?? ART.wellness} class="hq-benefit-line" />
    </svg>
  );
}
