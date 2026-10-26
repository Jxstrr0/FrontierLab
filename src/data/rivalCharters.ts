// Names and inks for newly founded rival labs (CONTENT §15, SIMULATION
// §18.7). A charter draws a stem and a strategy suffix (disruptors take a
// one-word brand instead); every part is invented, with no real company names.
import type { Strategy } from './rivals';

/** Place-style stems for incumbents, premium and community banks. */
export const CHARTER_STEMS = [
  'Ashcombe',
  'Brackenford',
  'Copperleaf',
  'Dunmere',
  'Elmhollow',
  'Fernwick',
  'Glenhaven',
  'Hollinsby',
  'Juniper Vale',
  'Larkmoor',
  'Marlowe Cross',
  'Northwold',
  'Pembridge',
  'Quarrystone',
  'Redgable',
  'Saltmere',
  'Thistledown',
  'Underfell',
  'Wrenfield',
  'Yarrowby',
  'Silverbeck',
  'Kestrel Point',
  'Lanternhill',
  'Brightwater',
] as const;

/** Suffixes by strategy (disruptors use CHARTER_BRANDS). */
export const CHARTER_SUFFIXES: Record<Exclude<Strategy, 'disruptor'>, readonly string[]> = {
  incumbent: ['AI', 'Labs', 'Intelligence'],
  premium: ['Research', 'Institute', '& Partners'],
  community: ['Collective', 'Open Models', 'Open Lab'],
};

/** One-word app-first brands for disruptors. */
export const CHARTER_BRANDS = [
  'Zephly',
  'Pocketwell',
  'Quillo',
  'Lumio',
  'Nuvra',
  'Sprigly',
  'Taffel',
  'Glimmr',
  'Vantlo',
  'Ottery',
  'Brisko',
  'Pennyloop',
] as const;

/** Brand inks a chartered bank picks from. */
export const CHARTER_INKS = [
  '#3B5B7A',
  '#7A3B4F',
  '#3F6E4E',
  '#8A6A2F',
  '#4E3F7A',
  '#2F6F73',
  '#9A4A2E',
  '#5A5F66',
  '#C0507A',
  '#3E8FB0',
] as const;
