// Governance stories in The Daily Ledger (Stage 6, SIMULATION §24, business
// tab): dividends declared, board votes that went against you (a rejected
// dividend or CEO pay rise; routine approvals make no news), and executives
// hired, resigned or fired. Your company's events lead the paper (priority 1).
import { NEWS_PRIORITY as P } from '../config/balance';
import { EXEC_SEATS } from '../data/executives';
import { newsMoney, newsPct } from './newsFormat';
import { num, str, type NewsContext, type Story } from './newsStory';
import type { ExecSeat, GameEvent } from './state';

const business = (s: Omit<Story, 'tab'>): Story => ({ ...s, tab: 'business' });

export function governanceStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) out.push(...fromEvent(ctx, e));
  return out;
}

const dps = (ctx: NewsContext, x: unknown) => `${ctx.sym}${num(x).toFixed(2)}`;
const shortOf = (seat: unknown) => EXEC_SEATS[str(seat) as ExecSeat]?.short ?? 'executive';

function fromEvent(ctx: NewsContext, e: GameEvent): Story[] {
  const p = e.payload;
  const bank = ctx.bank;
  const m = (x: unknown) => newsMoney(num(x), ctx.sym);
  switch (e.type) {
    case 'DIVIDEND_DECLARED': {
      const prev = num(p.prevDps);
      const now = num(p.dps);
      const change =
        prev <= 0
          ? ' It is the first payout in a while.'
          : now > prev
            ? ` That is up from ${dps(ctx, prev)}.`
            : now < prev
              ? ` That is down from ${dps(ctx, prev)}.`
              : '';
      return [
        business({
          key: 'DIVIDEND_DECLARED',
          subject: `${e.week}`,
          icon: 'coin',
          priority: P.company,
          tokens: { bank, dps: dps(ctx, now), total: m(p.total), change },
        }),
      ];
    }
    case 'BOARD_MEETING': {
      const out: Story[] = [];
      const meeting = ctx.state.governance.meetings.find((x) => x.week === e.week);
      if (!p.dividendPassed && num(p.dps) > 0) {
        out.push(
          business({
            key: 'BOARD_DIVIDEND_VOTE',
            subject: str(p.quarter),
            icon: 'gavel',
            priority: P.company,
            tokens: {
              bank,
              dps: dps(ctx, p.dps),
              forPct: newsPct((meeting?.dividend.forShare ?? 0) * 100, 0),
            },
          }),
        );
      }
      if (!p.salaryPassed) {
        out.push(
          business({
            key: 'BOARD_SALARY_VOTE',
            subject: str(p.quarter),
            icon: 'gavel',
            priority: P.company,
            tokens: {
              bank,
              founder: ctx.state.meta.founderName,
              salary: m(p.salary),
              current: m(ctx.state.governance.ceoSalary),
              forPct: newsPct((meeting?.salary.forShare ?? 0) * 100, 0),
            },
          }),
        );
      }
      return out;
    }
    case 'EXEC_HIRED':
    case 'EXEC_RESIGNED':
    case 'EXEC_FIRED':
      return [
        business({
          key: e.type,
          subject: `${str(p.seat)}:${str(p.name)}`,
          icon: 'person',
          priority: e.type === 'EXEC_HIRED' ? P.companyRoutine : P.company,
          group: 'exec',
          tokens: {
            bank,
            name: str(p.name, 'An executive'),
            title: str(p.title, 'executive'),
            short: shortOf(p.seat),
            severance: m(p.severance),
          },
        }),
      ];
    default:
      return [];
  }
}
