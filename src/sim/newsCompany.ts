// Your bank in The Weekly Ledger (SIMULATION §24, priority 1): stories from
// your company's events (branches, contracts won and lost, the central bank window,
// fines, incidents, partnerships, launches). The weekly close's stories are
// in newsWeek.ts.
import { NEWS_PRIORITY as P } from '../config/balance';
import { COUNTRIES } from '../data/countries';
import { LEDGER_TEMPLATES, type TemplateKey } from '../data/ledgerTemplates';
import { DEAL } from '../config/balance';
import { DEAL_SECTOR_BY_ID } from '../data/dealSectors';
import { MILESTONES } from '../data/milestones';
import { PARTNERSHIP_END_COPY } from '../data/newsWorld';
import { grouped, newsMoney, newsRate } from './newsFormat';
import { cityName, districtName, num, str, type NewsContext, type Story } from './newsStory';
import type { GameEvent } from './state';

const banking = (s: Omit<Story, 'tab'>): Story => ({ ...s, tab: 'banking' });
const business = (s: Omit<Story, 'tab'>): Story => ({ ...s, tab: 'business' });

/** Stories for your company's events this issue. */
export function companyStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) {
    const s = fromEvent(ctx, e);
    if (s) out.push(s);
  }
  const deals = contractStory(ctx);
  if (deals) out.push(deals);
  return out;
}

function fromEvent(ctx: NewsContext, e: GameEvent): Story | undefined {
  const p = e.payload;
  const m = (x: unknown) => newsMoney(num(x), ctx.sym);
  const bank = ctx.bank;
  switch (e.type) {
    case 'NEW_BRANCH':
      return banking({
        key: 'NEW_BRANCH',
        subject: str(p.branchId),
        icon: 'facade',
        priority: P.company,
        tokens: {
          bank,
          city: cityName(str(p.city)),
          district: districtName(str(p.district)),
          address: str(p.address, 'a storefront'),
        },
      });
    case 'BRANCH_OPENED': {
      const branch = ctx.state.branches[str(p.branchId)];
      const address = branch ? ctx.state.world.lots[branch.lotId]?.address : undefined;
      return banking({
        key: 'BRANCH_OPENED',
        subject: str(p.branchId),
        icon: 'facade',
        priority: P.company,
        tokens: {
          bank,
          name: str(p.name, 'the new sales office'),
          address: address ?? 'Main Street',
        },
      });
    }
    case 'OFFICE_GROWN': {
      const branch = ctx.state.branches[str(p.branchId)];
      return banking({
        key: 'OFFICE_GROWN',
        subject: str(p.branchId),
        icon: 'facade',
        priority: P.company,
        tokens: {
          bank,
          name: branch?.name ?? 'its office',
          city: cityName(str(p.city)),
          size: str(p.size, 'bigger').toLowerCase(),
        },
      });
    }
    case 'BRANCH_CLOSED': {
      const moved = str(p.movedTo);
      return banking({
        key: 'BRANCH_CLOSED',
        subject: str(p.branchId),
        icon: 'facade',
        priority: P.company,
        tokens: {
          bank,
          name: str(p.name, 'a sales office'),
          moved: moved ? ` Customers move to ${moved}.` : '',
        },
      });
    }
    case 'DATA_CENTER_STARTED':
      return business({
        key: 'DATA_CENTER_STARTED',
        subject: str(p.dataCenterId),
        icon: 'facade',
        priority: P.company,
        tokens: {
          bank,
          name: str(p.name, 'a data center'),
          city: cityName(str(p.city)),
          site: str(p.site, 'a new site'),
          weeks: String(num(p.weeks)),
        },
      });
    case 'DATA_CENTER_OPENED':
      // A refit reopening isn't news; the toast covers it.
      if (p.refit) return undefined;
      return business({
        key: 'DATA_CENTER_OPENED',
        subject: str(p.dataCenterId),
        icon: 'facade',
        priority: P.company,
        tokens: {
          bank,
          name: str(p.name, 'the data center'),
          city: cityName(str(p.city)),
          gpus: grouped(num(p.gpus)),
        },
      });
    case 'DATA_CENTER_CLOSED':
      return business({
        key: 'DATA_CENTER_CLOSED',
        subject: str(p.dataCenterId),
        icon: 'facade',
        priority: P.company,
        tokens: { bank, name: str(p.name, 'a data center'), city: cityName(str(p.city)) },
      });
    case 'CONTRACT_WON': {
      if (num(p.value) < DEAL.bigDeal || !p.from) return undefined;
      return business({
        key: 'CONTRACT_WON_BIG',
        subject: str(p.businessId),
        icon: 'coin',
        priority: P.company,
        tokens: {
          bank,
          business: str(p.business, 'A business'),
          sector: sectorWord(p.sector),
          amount: m(p.value),
          rival: str(p.from, 'a rival lab'),
        },
      });
    }
    case 'CONTRACT_LOST': {
      if (num(p.value) < DEAL.bigDeal) return undefined;
      return business({
        key: 'CONTRACT_LOST_BIG',
        subject: str(p.businessId),
        icon: 'alert',
        priority: P.company,
        tokens: {
          bank,
          business: str(p.business, 'A business'),
          sector: sectorWord(p.sector),
          amount: m(p.value),
          why: lossWhy(str(p.reason), str(p.to)),
        },
      });
    }
    case 'MILESTONE': {
      const spec = MILESTONES.find((m) => m.id === str(p.id));
      if (!spec?.news) return undefined;
      return business({
        key: 'MILESTONE',
        subject: spec.id,
        icon: 'spark',
        priority: P.companyRoutine,
        tokens: { bank, title: spec.title.toLowerCase(), line: spec.line.replace('{bank}', bank) },
      });
    }
    case 'WINDOW_USE':
      return banking({
        key: 'WINDOW_USE',
        subject: 'you',
        icon: 'alert',
        priority: P.companyAlarm,
        tokens: { bank, amount: m(p.amount), cb: COUNTRIES[ctx.home].centralBank },
      });
    case 'REGULATOR_AUDIT':
      return banking({
        key: 'REGULATOR_AUDIT',
        subject: 'you',
        icon: 'gavel',
        priority: P.company,
        tokens: { bank, fine: m(p.fine) },
      });
    case 'PRODUCT_DEVELOPED': {
      const stars = num(p.stars);
      return business({
        key: 'PRODUCT_DEVELOPED',
        subject: str(p.productId),
        icon: 'spark',
        priority: P.companyRoutine,
        tokens: {
          bank,
          name: str(p.name),
          stars: Number.isInteger(stars) ? String(stars) : stars.toFixed(1),
        },
      });
    }
    case 'MODEL_TRAINED':
      return business({
        key: p.leads ? 'MODEL_TRAINED_LEADS' : 'MODEL_TRAINED',
        subject: str(p.modelId),
        icon: 'spark',
        priority: p.leads ? P.company : P.companyRoutine,
        tokens: { bank, name: str(p.name), score: num(p.quality).toFixed(1) },
      });
    case 'RESEARCHER_HIRED':
      return business({
        key: p.from ? 'RESEARCHER_POACHED_FROM' : 'RESEARCHER_HIRED',
        subject: str(p.researcherId),
        icon: 'spark',
        priority: num(p.stars) >= 4 ? P.company : P.companyRoutine,
        tokens: { bank, name: str(p.name), rival: str(p.from, 'a rival lab') },
      });
    case 'RESEARCHER_LEFT':
      return business({
        key: 'RESEARCHER_LEFT',
        subject: str(p.researcherId),
        icon: 'spark',
        priority: num(p.stars) >= 4 ? P.company : P.companyRoutine,
        tokens: { bank, name: str(p.name), rival: str(p.rival, 'a rival lab') },
      });
    case 'DIGITAL_PROJECT_DONE':
      return business({
        key: 'DIGITAL_PROJECT_DONE',
        subject: str(p.templateId),
        icon: 'spark',
        priority: P.companyRoutine,
        tokens: { bank, name: str(p.name) },
      });
    case 'PARTNERSHIP_SIGNED':
      return business({
        key: 'PARTNERSHIP_SIGNED',
        subject: str(p.partnershipId),
        icon: 'handshake',
        priority: P.company,
        tokens: {
          bank,
          employer: str(p.employer),
          kind: p.kind === 'student' ? 'student accounts' : 'payroll accounts',
          branch: str(p.branchName, 'its local sales office'),
          fee: m(p.fee),
        },
      });
    case 'PARTNERSHIP_RENEWED':
      return business({
        key: 'PARTNERSHIP_RENEWED',
        subject: str(p.partnershipId),
        icon: 'handshake',
        priority: P.companyRoutine,
        tokens: { bank, employer: str(p.employer), fee: m(p.fee) },
      });
    case 'PARTNERSHIP_ENDED':
      return business({
        key: 'PARTNERSHIP_ENDED',
        subject: str(p.partnershipId),
        icon: 'handshake',
        priority: P.company,
        tokens: {
          bank,
          employer: str(p.employer),
          reason: PARTNERSHIP_END_COPY[str(p.reason)] ?? 'come to an end',
        },
      });
    case 'POWER_DEAL_SIGNED':
    case 'POWER_DEAL_RENEWED':
    case 'POWER_DEAL_ENDED':
      return business({
        key: e.type,
        subject: str(p.dealId),
        icon: 'handshake',
        priority: e.type === 'POWER_DEAL_RENEWED' ? P.companyRoutine : P.company,
        tokens: {
          bank,
          site: str(p.site),
          fee: m(p.fee),
          reason: PARTNERSHIP_END_COPY[str(p.reason)] ?? 'come to an end',
        },
      });
    case 'GRAD_PROGRAM':
      if (p.started !== true) return undefined;
      return business({
        key: 'GRAD_PROGRAM',
        subject: str(p.siteId),
        icon: 'person',
        priority: P.companyRoutine,
        tokens: { bank, university: str(p.university), cost: m(p.cost) },
      });
    case 'CORPORATE_LOAN':
      return business({
        key: 'CORPORATE_LOAN',
        subject: str(p.lenderId),
        icon: 'coin',
        priority: P.company,
        tokens: { bank, lender: str(p.lender), amount: m(p.amount), rate: newsRate(num(p.rate)) },
      });
    case 'INCIDENT_RAISED': {
      const key = `INCIDENT_${str(p.type)}`;
      if (!(key in LEDGER_TEMPLATES)) return undefined;
      return banking({
        key: key as TemplateKey,
        subject: str(p.scope),
        icon: 'alert',
        priority: P.companyRoutine,
        group: 'incident',
        tokens: { bank, scope: str(p.scopeName, 'a sales office') },
      });
    }
    case 'INCIDENT_NEWS': {
      const key = `INCIDENT_NEWS_${str(p.type)}`;
      if (!(key in LEDGER_TEMPLATES)) return undefined;
      return banking({
        key: key as TemplateKey,
        subject: str(p.branchName),
        icon: 'alert',
        priority: P.company,
        group: 'incident',
        tokens: { bank, scope: str(p.branchName, 'a sales office') },
      });
    }
    default:
      return bankNamed(ctx, e);
  }
}

/** Events that name a bank (yours or a rival's): fines, breaches, runs, rescues. */
function bankNamed(ctx: NewsContext, e: GameEvent): Story | undefined {
  const p = e.payload;
  const name = str(p.bank);
  const yours = name === ctx.bank;
  const priority = (alarm: boolean) =>
    yours ? (alarm ? P.companyAlarm : P.company) : P.rivalLocal;
  const tokens = { bank: name || ctx.bank };
  switch (e.type) {
    case 'REG_FINE':
      return banking({
        key: 'REG_FINE',
        subject: name,
        icon: 'gavel',
        priority: priority(false),
        tokens: {
          ...tokens,
          amount: newsMoney(num(p.amount), ctx.sym),
          reason: str(p.reason, 'a review'),
        },
      });
    case 'BREACH':
      return banking({
        key: 'BREACH',
        subject: name,
        icon: 'shield',
        priority: priority(true),
        tokens: { ...tokens, n: grouped(num(p.n)) },
      });
    case 'BANK_RUN':
      return banking({
        key: 'BANK_RUN',
        subject: name,
        icon: 'alert',
        priority: priority(true),
        tokens,
      });
    case 'BANK_RUN_ENDED':
      return banking({
        key: 'BANK_RUN_ENDED',
        subject: name,
        icon: 'shield',
        priority: priority(false),
        tokens,
      });
    case 'COMPUTE_BURST':
      return banking({
        key: 'COMPUTE_BURST',
        subject: name,
        icon: 'alert',
        priority: priority(true),
        tokens: { ...tokens, gpus: grouped(Math.round(num(p.gpus))) },
      });
    case 'COMPUTE_CRUNCH':
    case 'COMPUTE_OUTAGE':
      return banking({
        key: e.type,
        subject: name,
        icon: 'alert',
        priority: priority(true),
        tokens,
      });
    case 'COMPUTE_CRUNCH_ENDED':
      return banking({
        key: 'COMPUTE_CRUNCH_ENDED',
        subject: name,
        icon: 'shield',
        priority: priority(false),
        tokens,
      });
    case 'RECAP':
      return banking({
        key: 'RECAP',
        subject: name,
        icon: 'shield',
        priority: priority(true),
        tokens: {
          ...tokens,
          amount: newsMoney(num(p.amount), ctx.sym),
          shares: grouped(num(p.shares)),
        },
      });
    case 'SAFETY_PAUSE':
      return banking({
        key: 'SAFETY_PAUSE',
        subject: name,
        icon: 'alert',
        priority: priority(true),
        tokens: { ...tokens, weeks: String(num(p.weeks)), fee: newsMoney(num(p.fee), ctx.sym) },
      });
    case 'LICENCE_REVOKED':
      return banking({
        key: 'LICENCE_REVOKED',
        subject: name,
        icon: 'alert',
        priority: priority(true),
        tokens: { ...tokens, weeks: String(num(p.weeks)) },
      });
    case 'LICENCE_RESTORED':
      return banking({
        key: 'LICENCE_RESTORED',
        subject: name,
        icon: 'shield',
        priority: priority(false),
        tokens,
      });
    default:
      return undefined;
  }
}

/** The sector as a lower-case word for headlines. */
function sectorWord(id: unknown): string {
  return DEAL_SECTOR_BY_ID[str(id)]?.name.toLowerCase() ?? 'local';
}

/** Why a contract ended, as the end of a sentence. */
function lossWhy(reason: string, to: string): string {
  if (reason === 'failed') return 'ended when the business closed its doors';
  if (reason === 'outage')
    return to ? `walked to ${to} after this week’s outage` : 'walked after this week’s outage';
  if (reason === 'office') return 'ended when the local sales office closed';
  return to ? `went to ${to} at its renewal` : 'was not renewed';
}

/** One story for the issue's new contracts (not the big switches, which have their own), however many. */
function contractStory(ctx: NewsContext): Story | undefined {
  const won = ctx.events.filter((e) => e.type === 'CONTRACT_WON' && !e.payload.from);
  if (won.length === 0) return undefined;
  const total = won.reduce((sum, e) => sum + num(e.payload.value), 0);
  const largest = won.reduce((a, b) => (num(b.payload.value) > num(a.payload.value) ? b : a));
  return business({
    key: won.length === 1 ? 'CONTRACT_ONE' : 'CONTRACT_MANY',
    subject: 'you',
    icon: 'coin',
    priority: P.companyRoutine,
    group: 'youRoutine',
    tokens: {
      bank: ctx.bank,
      n: String(won.length),
      total: newsMoney(total, ctx.sym),
      lead: str(largest.payload.business, 'A local firm'),
      leadAmount: newsMoney(num(largest.payload.value), ctx.sym),
      sector: sectorWord(largest.payload.sector),
    },
  });
}
