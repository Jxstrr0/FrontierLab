// Investing readout on the CFO's profile (SCREENS §10.1): for each Investing
// switch that is on, the stock and the startup the chief would buy next and
// when, or what is holding them back (SIMULATION §17.2).
import { investingOn, nextStartup, nextStock, weeksToInvest } from '../../sim/execInvesting';
import type { Account } from '../../sim/portfolio';
import type { GameState } from '../../sim/state';
import { money, pct } from '../format/format';

function lines(s: GameState, account: Account): string[] {
  const who = account === 'company' ? 'For the lab' : 'For you';
  const sym = s.settings.currency;
  const n = weeksToInvest(s);
  const when = `in ${n} ${n === 1 ? 'week' : 'weeks'}`;
  const stock = nextStock(s, account);
  const startup = nextStartup(s, account);
  return [
    stock.pick
      ? `${who}: next stock, ${stock.pick.name} for ${money(stock.pick.cost, sym)}, ${when}.`
      : `${who}, stocks: ${stock.blocker}`,
    startup.pick
      ? `${who}: next startup, ${pct(startup.pick.pct, 0)} of ${startup.pick.name} (scores ${startup.pick.score.toFixed(1)}) for ${money(startup.pick.price, sym)}, ${when}.`
      : `${who}, startups: ${startup.blocker}`,
  ];
}

export function InvestNote(p: { s: GameState }) {
  const accounts = (['company', 'personal'] as const).filter((a) => investingOn(p.s, a));
  return (
    <>
      {accounts.flatMap((a) =>
        lines(p.s, a).map((line, i) => (
          <p key={`${a}${i}`} class="muted small exec-note">
            {line}
          </p>
        )),
      )}
    </>
  );
}
