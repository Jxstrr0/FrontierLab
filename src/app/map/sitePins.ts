// Site pins for the map (SCREENS §2): bureaus, agencies, rival head offices,
// employers and energy sites, universities, investment banks and the Stage 7–9
// places, with their names, layers, partner and owned seals, and which site
// kinds each stage switches on.
import type { CityMap } from '../../art/citygen';
import { FEATURES, type FeatureId } from '../../config/balance';
import { AGENCIES } from '../../data/brandCampaigns';
import { CITIES, isRegional } from '../../data/cities';
import { AUCTION_HOUSES } from '../../data/collectibles';
import { HOMES } from '../../data/homes';
import { CONVENTIONS_CALENDAR, DEFAULT_VENUE } from '../../data/conventions';
import { INVESTMENT_BANKS } from '../../data/investmentBanks';
import { LOBBY_FIRMS } from '../../data/lobbying';
import type { MapLayerId } from '../../data/mapLayers';
import type { GameState, Site } from '../../sim/state';
import { auctionPinInfo } from '../auction/auctionPin';
import { conventionPinInfo } from '../convention/conventionPin';
import { personalPinInfo } from '../personal/personalPins';
import { propertyPinInfo } from '../realEstate/propertyPin';
import { rivalShortName } from './markers';
import { pinAnchor, type PinSpec } from './pinTypes';
import type { SitePinInfo } from './sitePinInfo';

/** A site's display name: the bureau's, agency's, rival head office's, employer's or university's. */
export function siteName(s: GameState | undefined, site: Site): string {
  switch (site.kind) {
    case 'agency':
      return AGENCIES[site.refId]?.name ?? 'Marketing agency';
    case 'bureau':
      return `${site.refId} data vendor`;
    case 'rivalHq':
      return `${s?.rivals[site.refId]?.name ?? 'Rival lab'} head office`;
    case 'investmentBank':
      return INVESTMENT_BANKS[site.refId]?.name ?? 'Investment bank';
    case 'property':
      return `Building at ${site.address}`;
    case 'conventionCenter':
      return (
        CONVENTIONS_CALENDAR.find((c) => c.id === site.refId)?.venue ??
        DEFAULT_VENUE(CITIES[site.cityId]?.name ?? 'City')
      );
    case 'lobbyingFirm':
      return LOBBY_FIRMS[site.refId]?.name ?? 'Lobbying firm';
    case 'auctionHouse':
      return AUCTION_HOUSES[site.refId]?.name ?? 'Auction house';
    case 'vacationHome':
      return HOMES[site.refId]?.name ?? 'Vacation home';
    default:
      return site.employer?.name ?? site.refId;
  }
}

const SITE_ICON: Record<Site['kind'], MapLayerId> = {
  bureau: 'creditBureaus',
  agency: 'marketingAgencies',
  rivalHq: 'banks',
  employer: 'employers',
  university: 'universities',
  investmentBank: 'investmentBanks',
  property: 'realEstate',
  conventionCenter: 'conventions',
  lobbyingFirm: 'lobbyingFirms',
  autoDealer: 'autoDealers',
  auctionHouse: 'auctionHouses',
  vacationHome: 'realEstate',
};

/** A regional site's employer is an energy site (C2d): data centers can go there. */
const isEnergySite = (site: Site): boolean => site.kind === 'employer' && isRegional(site.cityId);

export const siteLayer = (site: Site): MapLayerId =>
  isEnergySite(site) ? 'energySites' : SITE_ICON[site.kind];

/** You hold a partnership (or the graduate program) at this employer or university. */
export function isPartnerSite(s: GameState, site: Site): boolean {
  if (site.kind !== 'employer' && site.kind !== 'university') return false;
  if (s.company.gradProgram?.siteId === site.id) return true;
  return Object.values(s.partnerships).some((p) => p.siteId === site.id && p.status === 'active');
}

/** Visibility, label, tag and owned seal for Stage 7 sites; undefined for other kinds. */
export function stage7Info(s: GameState, site: Site): SitePinInfo | undefined {
  if (site.kind === 'property') return propertyPinInfo(s, site);
  if (site.kind === 'conventionCenter') return conventionPinInfo(s, site);
  if (site.kind === 'lobbyingFirm') return { visible: true, suffix: ', lobbying firm' };
  // Stage 9: per-kind rules live with each system.
  if (site.kind === 'auctionHouse') return auctionPinInfo(s, site);
  return personalPinInfo(s, site);
}

export function sitePin(s: GameState, map: CityMap, site: Site, info?: SitePinInfo): PinSpec {
  const at = pinAnchor(map, site.tile);
  // Property and homes you own become your crests; a car dealer deal is a partnership.
  const owned = !!info?.owned && (site.kind === 'property' || site.kind === 'vacationHome');
  const partner = isPartnerSite(s, site) || (!!info?.owned && !owned);
  const suffix =
    (info
      ? info.suffix
      : site.kind === 'agency'
        ? ', marketing agency'
        : isEnergySite(site)
          ? ', energy site'
          : site.kind === 'employer'
            ? ', employer'
            : site.kind === 'investmentBank'
              ? ', investment bank'
              : site.kind === 'rivalHq' && s.rivals[site.refId]?.status === 'distressed'
                ? ', seized by regulators'
                : '') + (partner && !info?.owned ? ', your partner' : '');
  const rival = site.kind === 'rivalHq' ? s.rivals[site.refId] : undefined;
  const pin: PinSpec = {
    id: site.id,
    kind: isEnergySite(site) ? 'energySite' : site.kind,
    x: at.x,
    y: at.y,
    label: `${siteName(s, site)}${suffix}, ${site.address}`,
    ink: rival?.ink ?? (partner || owned ? s.meta.brandInk : ''),
    monogram: rival?.monogram ?? '',
    badge: false,
    icon: siteLayer(site),
    ...(rival && rival.status !== 'active' ? { muted: true } : {}),
    ...(rival ? { caption: `${rivalShortName(rival.name)} HQ` } : {}),
  };
  if (partner) pin.partner = true;
  if (owned) pin.owned = true;
  if (info?.tag) pin.tag = info.tag;
  return pin;
}

/** Whether a site kind's stage is switched on (bureaus and agencies come with the HQ stage). */
export function siteEnabled(
  kind: Site['kind'],
  features: Record<FeatureId, boolean> = FEATURES,
): boolean {
  if (kind === 'bureau' || kind === 'agency') return features.hq;
  if (kind === 'investmentBank') return features.capitalMarkets;
  if (kind === 'property' || kind === 'conventionCenter' || kind === 'lobbyingFirm')
    return features.investments;
  if (kind === 'autoDealer' || kind === 'auctionHouse' || kind === 'vacationHome')
    return features.personalEmpire;
  return features.competition;
}
