// Your bank in The Weekly Ledger (SIMULATION §24, priority 1): stories from
// your company's events (branches, loans, defaults, the central bank window,
// fines, incidents, partnerships, launches). The weekly close's stories are
// in newsWeek.ts.
import { NEWS_PRIORITY as P } from '../config/balance';
import { COUNTRIES } from '../data/countries';
import { LEDGER_TEMPLATES, type TemplateKey } from '../data/ledgerTemplates';
import { LOAN_SECTORS } from '../data/loanSectors';
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
  const loans = loanStory(ctx);
  if (loans) out.push(loans);
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
        tokens: { bank, name: str(p.name, 'the new branch'), address: address ?? 'Main Street' },
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
          name: str(p.name, 'a branch'),
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
    case 'BIG_DEFAULT': {
      const sector = LOAN_SECTORS.find((x) => x.id === str(p.sector))?.name.toLowerCase();
      return business({
        key: 'BIG_DEFAULT',
        subject: str(p.business),
        icon: 'alert',
        priority: P.company,
        tokens: {
          bank,
          business: str(p.business, 'A borrower'),
          sector: sector ?? 'local',
          amount: m(p.amount),
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
          branch: str(p.branchName, 'its local branch'),
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
        tokens: { bank, scope: str(p.scopeName, 'a branch') },
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
        tokens: { bank, scope: str(p.branchName, 'a branch') },
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
    default:
      return undefined;
  }
}

/** One story for the issue's booked loans, however many there were. */
function loanStory(ctx: NewsContext): Story | undefined {
  const loans = ctx.events.filter((e) => e.type === 'LOAN_BOOKED');
  if (loans.length === 0) return undefined;
  const total = loans.reduce((sum, e) => sum + num(e.payload.amount), 0);
  const largest = loans.reduce((a, b) => (num(b.payload.amount) > num(a.payload.amount) ? b : a));
  return business({
    key: loans.length === 1 ? 'LOAN_ONE' : 'LOAN_MANY',
    subject: 'you',
    icon: 'coin',
    priority: P.companyRoutine,
    group: 'youRoutine',
    tokens: {
      bank: ctx.bank,
      n: String(loans.length),
      total: newsMoney(total, ctx.sym),
      lead: str(largest.payload.business, 'A local firm'),
      leadAmount: newsMoney(num(largest.payload.amount), ctx.sym),
      rate: newsRate(num(largest.payload.rate)),
    },
  });
}
