// Spot illustrations (ART_DIRECTION §3, "Products, campaigns and benefits"):
// one single-ink line drawing per product, branch campaign and brand campaign,
// on the 80 × 80 plate that src/app/components/SpotArt.tsx frames with a
// double ring. Keyed by the ids in src/data/products.ts, campaigns.ts and
// brandCampaigns.ts; unknown ids fall back to a coin.

const COIN = 'M40 22a18 18 0 1 0 .1 0M40 28a12 12 0 1 0 .1 0M40 33v14M36 37h8';

export const PRODUCT_SPOTS: Record<string, string> = {
  // A speech bubble with an open door: try it free.
  free_tier: 'M14 22h52v28H34l-10 10V50H14zM24 30h32M24 38h20M50 34h8v12h-8z',
  // A speech bubble with a plus.
  plus: 'M14 22h52v28H34l-10 10V50H14zM40 28v16M32 36h16',
  // A speech bubble with a star.
  pro: 'M14 22h52v28H34l-10 10V50H14zM40 26l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z',
  // Three people under one roof.
  team: 'M14 34 40 18l26 16M28 44a5 5 0 1 0 .1 0M40 40a5 5 0 1 0 .1 0M52 44a5 5 0 1 0 .1 0M20 62c0-8 16-8 16 0M32 58c0-8 16-8 16 0M44 62c0-8 16-8 16 0',
  // A mortarboard over a chat bubble.
  campus_plan: 'M16 28 40 18l24 10-24 10zM26 32v8c8 5 20 5 28 0v-8M20 46h40v14H34l-6 6v-6h-8z',
  // Angle brackets around a slash: code calls.
  api: 'M28 26 14 40l14 14M52 26l14 14-14 14M46 22 34 58',
  // Stacked trays of requests.
  batch_api: 'M16 24h48v10H16zM16 38h48v10H16zM16 52h48v10H16zM22 29h14M22 43h14M22 57h14',
  // A dial being tuned.
  fine_tuning: 'M40 40a18 18 0 1 0 .1 0M40 40l10-10M40 22v4M58 40h-4M22 40h4M40 58v-4M60 20l6-6',
  // A shop front and a coin.
  sbl: 'M16 34h40v24H16zM14 34l6-10h32l6 10M24 58V44h10v14M40 42h10v8H40zM64 50a8 8 0 1 0 .1 0M64 46v8',
  // A code window with a cursor.
  code_assistant: 'M14 20h52v40H14zM14 28h52M22 38l6 5-6 5M34 50h12M58 24h2',
  // Linked nodes: an agent's steps.
  agent_studio:
    'M22 24a6 6 0 1 0 .1 0M58 24a6 6 0 1 0 .1 0M40 56a6 6 0 1 0 .1 0M28 24h24M26 29l10 22M54 29 44 51',
  // A brush over a frame.
  creative_suite: 'M14 22h40v36H14zM20 52l10-12 8 8 6-6 6 10M60 18 44 40l-2 6 6-2 16-22z',
  // A headset.
  priority_support:
    'M20 46v-8a20 20 0 0 1 40 0v8M16 44h8v14h-8zM56 44h8v14h-8zM60 58c0 4-6 6-14 6h-4',
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
