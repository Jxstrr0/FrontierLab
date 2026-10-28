// Sports franchise commands (SCREENS §20, DESIGN §5.16–5.17): buy a club in its
// city as the company or privately, sell it from anywhere, put your bank on the
// shirt and choose the kit colours, and sign or release star players. A company
// club is an asset at its value: buying and selling move investing cash, and
// any change in its marked value goes through withAssetMarks.
import { FRANCHISE } from '../../config/balance';
import { BRAND_CAMPAIGNS } from '../../data/brandCampaigns';
import { CITIES } from '../../data/cities';
import { FRANCHISES, KIT_COLOURS } from '../../data/franchises';
import { pushEvent } from '../events';
import { isYours, ownsClubIn } from '../franchise';
import { emptySeason, openWindow, clubWeek } from '../franchiseMath';
import { ownerName } from '../franchisePlayers';
import { postCash, spend } from '../ledger';
import { withAssetMarks } from '../portfolio';
import { stream } from '../rng';
import type { ClubState, GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';
import { ventureTierBlock } from './ventures';

export type ClubAccount = 'company' | 'personal';

const F = FRANCHISE;

const ownerCash = (state: GameState, owner: ClubAccount) =>
  owner === 'company' ? state.company.cash : state.personal.cash;

const cashWord = (owner: ClubAccount) => (owner === 'company' ? 'corporate' : 'personal');

/** Your club, or why not. */
function yourClub(state: GameState, clubId: string): ClubState | string {
  const club = state.clubs[clubId];
  const spec = FRANCHISES[clubId];
  if (!club || !spec) return 'That club does not exist.';
  if (!isYours(club)) return `You don't own the ${spec.name}.`;
  return club;
}

/** Pays a club cost from its owner's money (company: franchiseCosts). */
function payFromOwner(state: GameState, club: ClubState, amount: number): void {
  if (club.owner === 'company') spend(state, 'franchiseCosts', amount);
  else state.personal.cash -= amount;
  club.season.transfers = (club.season.transfers ?? 0) + amount;
}

/**
 * Offers to buy a club. You must be in its city. Offers of at least
 * FRANCHISE.offerMin × value are accepted at once (a flat threshold); the club
 * then carries the price you paid as its value.
 */
export function buyClub(
  state: GameState,
  clubId: string,
  offer: number,
  account: ClubAccount,
): CommandResult {
  const club = state.clubs[clubId];
  const spec = FRANCHISES[clubId];
  if (!club || !spec) return fail('That club does not exist.');
  if (isYours(club)) return fail(`You already own the ${spec.name}.`);
  if (state.world.currentCityId !== spec.cityId)
    return fail(`You need to be in ${CITIES[spec.cityId]?.name ?? 'its city'} to buy this club.`);
  if (account !== 'company' && account !== 'personal') return fail('Choose an account.');
  if (!Number.isFinite(offer) || offer <= 0) return fail('Enter an offer above zero.');
  if (account === 'company') {
    const block = ventureTierBlock(state);
    if (block) return fail(block);
  }
  if (offer > ownerCash(state, account))
    return fail(`You need ${money(state, offer)} in ${cashWord(account)} cash.`);
  if (offer < F.offerMin * club.value)
    return fail(
      `${capital(club.ownerName)} turned the offer down: they won't sell for less than ${money(state, F.offerMin * club.value)}.`,
    );

  if (account === 'company') postCash(state, -offer, 'investing');
  else state.personal.cash -= offer;
  club.value = offer;
  club.owner = account;
  club.price = offer;
  club.boughtWeek = state.clock.week;
  club.kit.sponsor = 'outside';
  club.season = emptySeason();
  pushEvent(
    state,
    'CLUB_BOUGHT',
    { clubId, club: spec.name, owner: account, price: offer, league: spec.league },
    account === 'company' ? 3 : 5,
    clubId,
  );
  return ok();
}

/** Sells your club from anywhere at value less FRANCHISE.saleFee, to a new outside owner. */
export function sellClub(state: GameState, clubId: string): CommandResult<{ proceeds: number }> {
  const club = yourClub(state, clubId);
  if (typeof club === 'string') return fail(club);
  const spec = FRANCHISES[clubId]!;
  const value = club.value;
  const seller = club.owner;
  const proceeds = Math.round(value * (1 - F.saleFee));
  if (club.owner === 'company') {
    // The fee is a loss on the mark; the sale itself swaps the club for cash.
    withAssetMarks(state, () => (club.value = proceeds));
    postCash(state, proceeds, 'investing');
  } else {
    state.personal.cash += proceeds;
  }
  club.owner = 'outside';
  club.value = value;
  club.ownerName = ownerName(stream(state, 'franchise'));
  delete club.price;
  delete club.boughtWeek;
  club.kit.sponsor = 'outside';
  club.season = emptySeason();
  endNamingRights(state, spec.cityId);
  pushEvent(
    state,
    'CLUB_SOLD',
    { clubId, club: spec.name, price: proceeds, owner: seller },
    4,
    clubId,
  );
  return ok({ proceeds });
}

/** Arena Naming Rights needs a club you own in the city; selling the last one ends it. */
function endNamingRights(state: GameState, cityId: string): void {
  if (ownsClubIn(state, cityId)) return;
  const m = state.marketing;
  const ending = m.campaigns.filter(
    (c) => BRAND_CAMPAIGNS[c.campaignId]?.needsFranchise && c.targetId === cityId,
  );
  for (const c of ending)
    pushEvent(state, 'BRAND_CAMPAIGN_ENDED', { campaignId: c.campaignId, reason: 'noClub' }, 4);
  m.campaigns = m.campaigns.filter((c) => !ending.includes(c));
}

/** Puts your bank on the shirt (or back to the outside sponsor). Works from anywhere. */
export function setKitSponsor(state: GameState, clubId: string, on: boolean): CommandResult {
  const club = yourClub(state, clubId);
  if (typeof club === 'string') return fail(club);
  const sponsor = on ? 'bank' : 'outside';
  if (club.kit.sponsor === sponsor) return ok();
  club.kit.sponsor = sponsor;
  pushEvent(state, 'KIT_SPONSOR', { clubId, club: FRANCHISES[clubId]!.name, on }, 5, clubId);
  return ok();
}

/** Kit colours from the palette (KIT_COLOURS); the two must differ. */
export function setKit(
  state: GameState,
  clubId: string,
  primary: string,
  secondary: string,
): CommandResult {
  const club = yourClub(state, clubId);
  if (typeof club === 'string') return fail(club);
  if (!KIT_COLOURS[primary] || !KIT_COLOURS[secondary])
    return fail('Choose colours from the palette.');
  if (primary === secondary) return fail('Pick two different colours.');
  club.kit.primary = primary;
  club.kit.secondary = secondary;
  return ok();
}

/** Signs a transfer-market player while a window is open: the fee is paid now, the salary weekly. */
export function signPlayer(state: GameState, clubId: string, playerId: string): CommandResult {
  const club = yourClub(state, clubId);
  if (typeof club === 'string') return fail(club);
  if (!openWindow(clubWeek(state))) return fail('The transfer window is closed.');
  const player = club.market.find((p) => p.id === playerId);
  if (!player) return fail('That player has already moved on.');
  if (club.stars.length >= F.maxStars)
    return fail(`A squad carries ${F.maxStars} stars. Release one first.`);
  const fee = player.fee ?? 0;
  const owner = club.owner as ClubAccount;
  if (fee > ownerCash(state, owner))
    return fail(`You need ${money(state, fee)} in ${cashWord(owner)} cash for the fee.`);
  payFromOwner(state, club, fee);
  club.market = club.market.filter((p) => p !== player);
  delete player.fee;
  club.stars.push(player);
  const spec = FRANCHISES[clubId]!;
  pushEvent(
    state,
    'CLUB_SIGNED',
    { clubId, club: spec.name, player: player.name, position: player.position, fee },
    5,
    clubId,
  );
  return ok();
}

/** Cost of releasing a star: releaseShare of the salary left on the contract. */
export const releaseCost = (p: { salary: number; years: number }): number =>
  Math.round(p.salary * p.years * F.releaseShare);

/** Releases a star at any time, paying off part of the contract. */
export function releasePlayer(state: GameState, clubId: string, playerId: string): CommandResult {
  const club = yourClub(state, clubId);
  if (typeof club === 'string') return fail(club);
  const player = club.stars.find((p) => p.id === playerId);
  if (!player) return fail('That player is not in your squad.');
  const cost = releaseCost(player);
  const owner = club.owner as ClubAccount;
  if (cost > ownerCash(state, owner))
    return fail(
      `You need ${money(state, cost)} in ${cashWord(owner)} cash to pay off the contract.`,
    );
  payFromOwner(state, club, cost);
  club.stars = club.stars.filter((p) => p !== player);
  return ok();
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
