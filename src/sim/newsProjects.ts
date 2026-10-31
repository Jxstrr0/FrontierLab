// The Weekly Ledger's stories for frontier projects (started, finished with a
// story of their own where one is written, stalled), public tenders lost or run
// to term, and the board's special dividend (SIMULATION §24, 2026-10-31).
// Templates in src/data/ledgerTemplatesProjects.ts.
import { NEWS_PRIORITY as P } from '../config/balance';
import { LEDGER_TEMPLATES, type TemplateKey } from '../data/ledgerTemplates';
import { newsMoney } from './newsFormat';
import { cityName, num, str, type NewsContext, type Story } from './newsStory';
import type { GameEvent } from './state';

export function projectStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) {
    const s = fromEvent(ctx, e);
    if (s) out.push(s);
  }
  return out;
}

/** PROJECT_DONE_{id} when the project has its own story, else the generic one. */
function doneKey(projectId: string): TemplateKey {
  const own = `PROJECT_DONE_${projectId}`;
  return (own in LEDGER_TEMPLATES ? own : 'PROJECT_DONE') as TemplateKey;
}

function fromEvent(ctx: NewsContext, e: GameEvent): Story | undefined {
  const p = e.payload;
  const m = (x: unknown) => newsMoney(num(x), ctx.sym);
  const bank = ctx.bank;
  const base = { tab: 'business' as const, icon: 'spark' as const };
  switch (e.type) {
    case 'PROJECT_STARTED':
      return {
        ...base,
        key: 'PROJECT_STARTED',
        subject: str(p.projectId),
        priority: P.company,
        tokens: { bank, name: str(p.name), cost: m(p.cost), weeks: String(num(p.weeks)) },
      };
    case 'PROJECT_DONE':
      return {
        ...base,
        key: doneKey(str(p.projectId)),
        subject: str(p.projectId),
        priority: P.company,
        tokens: { bank, name: str(p.name) },
      };
    case 'PROJECT_STALLED':
      return {
        ...base,
        key: 'PROJECT_STALLED',
        subject: str(p.projectId, str(p.name)),
        icon: 'alert',
        priority: P.company,
        tokens: { bank, name: str(p.name) },
      };
    case 'TENDER_LOST':
      return {
        ...base,
        key: p.reason === 'tier' ? 'TENDER_LOST_TIER' : 'TENDER_LOST',
        subject: str(p.tenderId),
        icon: 'alert',
        priority: P.companyRoutine,
        tokens: {
          bank,
          body: str(p.name, 'A public body'),
          city: cityName(str(p.city)),
          rival: str(p.rival, 'A rival lab'),
        },
      };
    case 'TENDER_ENDED':
      return {
        ...base,
        key: 'TENDER_ENDED',
        subject: str(p.tenderId),
        icon: 'coin',
        priority: P.companyRoutine,
        tokens: {
          bank,
          body: str(p.name, 'A public body'),
          city: cityName(str(p.city)),
          amount: m(p.value),
        },
      };
    case 'SPECIAL_DIVIDEND':
      return {
        ...base,
        key: 'SPECIAL_DIVIDEND',
        subject: 'special-dividend',
        tab: 'markets',
        icon: 'coin',
        priority: P.company,
        tokens: { bank, total: m(p.total) },
      };
    default:
      return undefined;
  }
}
