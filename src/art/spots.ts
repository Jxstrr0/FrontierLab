// Spot illustrations (ART_DIRECTION §3, "Products, campaigns and benefits"):
// one single-ink line drawing per product, branch campaign and brand campaign,
// on the 80 × 80 plate that src/app/components/SpotArt.tsx frames with a
// double ring. Keyed by the ids in src/data/products.ts, campaigns.ts and
// brandCampaigns.ts; unknown ids fall back to a coin.

const COIN = 'M40 22a18 18 0 1 0 .1 0M40 28a12 12 0 1 0 .1 0M40 33v14M36 37h8';

export const PRODUCT_SPOTS: Record<string, string> = {
  // A cheque with a signature.
  chequing: 'M14 28h52v26H14zM14 28l4-4h44l4 4M20 36h18M20 42h28M44 48c3-4 5-4 7 0s4 4 7 0M52 34h8',
  // Stacked coins and a rising arrow.
  savings:
    'M18 58c0 3 9 5 20 5s20-2 20-5M18 51c0 3 9 5 20 5s20-2 20-5M18 44c0 3 9 5 20 5s20-2 20-5M18 37c0-3 9-5 20-5s20 2 20 5-9 5-20 5-20-2-20-5zM18 37v21M58 37v21M54 30l10-10M56 20h8v8',
  // A certificate with a clock.
  gic1y: 'M14 20h40v34H14zM20 28h28M20 34h20M20 40h24M58 48a10 10 0 1 0 .1 0M58 42v6l4 3',
  // A mortarboard.
  student: 'M14 32 40 20l26 12-26 12zM24 38v10c9 6 23 6 32 0V38M66 32v14',
  // A briefcase.
  business_acct: 'M16 32h48v26H16zM30 32v-6h20v6M16 42h48M37 40v6h6v-6',
  // An open hand under a coin.
  personal_loan:
    'M14 50c6 0 10 2 14 6h16c3 0 3-4 0-4H34M66 46l-10 4-12 6M40 30a8 8 0 1 0 .1 0M40 26v8',
  // A saloon car.
  auto_loan:
    'M14 52v-6l6-10h28l10 10h8v6zM24 56a4 4 0 1 0 .1 0M56 56a4 4 0 1 0 .1 0M22 46h44M32 36l-2 10M46 36v10',
  // A house with a door.
  mortgage: 'M14 40 40 18l26 22M20 35v25h40V35M34 60V46h12v14M50 26v-6h5v10',
  // A dial: credit you can draw on.
  loc: 'M18 54a22 22 0 0 1 44 0M40 54l12-14M22 54h36M26 40l3 3M40 32v4M54 40l-3 3',
  // A shop front and a coin.
  sbl: 'M16 34h40v24H16zM14 34l6-10h32l6 10M24 58V44h10v14M40 42h10v8H40zM64 50a8 8 0 1 0 .1 0M64 46v8',
  // A card with a chip.
  credit_card: 'M14 26h52v32H14zM14 34h52M20 48h14M48 48h10M20 40h8v4h-8z',
  // A rising chart.
  wealth: 'M16 60h48M16 60V20M22 52l10-12 8 6 14-16M48 30h6v6',
  // A safe-deposit box.
  safe_box:
    'M18 22h44v38H18zM24 28h32v26H24zM40 41a6 6 0 1 0 .1 0M40 35v2M40 45v2M34 41h2M44 41h2M22 60v4M58 60v4',
  // Two coins and exchange arrows.
  fx: 'M28 30a10 10 0 1 0 .1 0M52 50a10 10 0 1 0 .1 0M38 22h12l-3-3M42 58H30l3 3M28 26v8M52 46v8',
};

export const CAMPAIGN_SPOTS: Record<string, string> = {
  // A cup with steam.
  lobby_coffee:
    'M22 38h30v10a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12zM52 42h4a5 5 0 0 1 0 10h-5M30 32c-3-4 3-6 0-10M38 32c-3-4 3-6 0-10M18 64h40',
  // A plug and a bolt.
  charging: 'M28 20v10M40 20v10M24 30h20v8a10 10 0 0 1-20 0zM34 48v14M58 28l-6 10h6l-4 10',
  // A calendar with a tick on the weekend.
  saturday:
    'M18 24h44v38H18zM18 34h44M28 20v8M52 20v8M26 42h6M38 42h6M26 52h6M38 52h6M50 50l3 3 5-7',
  // A gift box.
  signup_bonus: 'M18 36h44v24H18zM16 28h48v8H16zM40 28v32M40 28c-6-8-16-6-12 0M40 28c6-8 16-6 12 0',
  // A phone with a leaf.
  paperless:
    'M28 16h24v48H28zM28 22h24M28 56h24M40 50c-6 0-8-5-8-10 6 0 8 4 8 10M40 50c5 0 7-4 7-8-5 0-7 3-7 8',
  // An envelope.
  direct_mail: 'M14 26h52v32H14zM14 26l26 18 26-18M14 58l20-16M66 58 46 42',
  // An easel with a chart.
  workshops: 'M20 18h40v26H20zM26 38l8-8 6 4 12-12M40 44v8M30 62l10-10 10 10',
  // A pennant.
  sponsors: 'M22 64V16M22 18h36l-8 10 8 10H22M30 24h10',
  // Two speech bubbles.
  social: 'M14 20h32v20H26l-8 6v-6h-4zM34 44h32v16h-4v6l-8-6H34zM22 30h16M42 52h16',
  // A magnifier.
  search: 'M36 20a14 14 0 1 0 .1 0M46 44l14 14M30 34h12',
};

export const BRAND_SPOTS: Record<string, string> = {
  // A television set.
  tv: 'M14 24h52v32H14zM18 28h44v24H18zM32 64h16M40 56v8M30 16l10 8 10-8',
  // A billboard on legs.
  billboards: 'M12 20h56v26H12zM24 46v18M56 46v18M18 30h20M18 36h28M16 64h48',
  // A microphone.
  podcasts: 'M32 16h16v26a8 8 0 0 1-16 0zM24 38a16 16 0 0 0 32 0M40 54v10M30 64h20',
  // A camera.
  creators: 'M14 28h40v26H14zM54 34l12-6v26l-12-6M34 41a7 7 0 1 0 .1 0M20 24h10',
  // An arena with a name banner.
  naming: 'M12 46c0-10 12-16 28-16s28 6 28 16v16H12zM12 46h56M24 38h32v8H24zM28 62v-8M52 62v-8',
};

export type SpotGroup = 'product' | 'campaign' | 'brand';

const GROUPS: Record<SpotGroup, Record<string, string>> = {
  product: PRODUCT_SPOTS,
  campaign: CAMPAIGN_SPOTS,
  brand: BRAND_SPOTS,
};

/** The drawing for an id in a group, or a coin. */
export function spotPath(group: SpotGroup, id: string): string {
  return GROUPS[group][id] ?? COIN;
}
