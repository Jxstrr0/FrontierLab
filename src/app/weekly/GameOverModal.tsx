// Game over (DESIGN §5.18): a Ledger front page announcing insolvency or a
// regulator takeover, with the bank's final numbers in a short news story.
import { FAILURE } from '../../config/balance';
import { Medallion, Modal } from '../components';
import { gameDate, money, pct } from '../format/format';
import { Masthead } from './LedgerCard';
import { screen, setGame, useGame } from '../store';
import './weekly.css';

export function GameOverModal() {
  const s = useGame();
  const sym = s.settings.currency;
  const bank = s.meta.bankName;
  const takeover = s.flags.gameOver === 'takeover';
  const date = gameDate(s.meta.startDate, s.clock.day);
  const last = s.history.weekly.at(-1);
  const branches = Object.values(s.branches).filter((b) => b.status === 'open').length;
  const weeks = s.clock.week;

  const headline = takeover ? `Regulator seizes ${bank}` : `${bank} fails as the cash runs out`;
  const standfirst = takeover
    ? 'Capital stayed below the safety floor for too long, and supervisors stepped in.'
    : 'Depositors are told to expect delays as the doors close for good.';

  const leave = (to: 'saves' | 'title') => {
    setGame(null);
    screen.value = to;
  };

  return (
    <Modal
      title="Game over"
      class="weekly-modal gameover-modal"
      icon={<Medallion ink={s.meta.brandInk} monogram={s.meta.monogram} shape={s.meta.logoShape} size={30} />}
      footer={
        <div class="btn-row">
          <button type="button" class="btn btn-secondary" onClick={() => leave('title')}>
            Exit to title
          </button>
          <button type="button" class="btn btn-primary" onClick={() => leave('saves')}>
            Load a save
          </button>
        </div>
      }
    >
      <section class={`ledger ledger-press${s.settings.reducedMotion ? ' is-reduced' : ''}`}>
        <Masthead date={date} edition="Final edition" />
        <h4 class="frontpage-headline">{headline}</h4>
        <p class="frontpage-standfirst">{standfirst}</p>
        <div class="frontpage-story">
          <p>
            {bank} stopped trading on {date}, {weeks} weeks after its first day of business.{' '}
            {takeover
              ? `The regulator took control of the bank and its ${branches === 1 ? 'branch' : 'branches'}.`
              : 'The bank could not pay its way and has no credit left to draw on.'}
          </p>
          <p>
            At the end {bank} ran {branches} open {branches === 1 ? 'branch' : 'branches'}
            {last
              ? `, held ${money(last.totals.deposits, sym)} in deposits and had lent ${money(last.totals.loans, sym)}.`
              : '.'}
          </p>
          <p>
            {takeover
              ? `Its capital ratio had sat under ${pct(FAILURE.takeoverCr, 1)} for ${s.company.lowCapitalWeeks} weeks, at ${pct(s.company.capitalRatio, 1)} on the final count.`
              : `Corporate cash had been below zero for ${s.company.negativeCashWeeks} weeks, standing at ${money(s.company.cash, sym)} at the end.`}
          </p>
          <p>{s.meta.founderName} could not be reached for comment.</p>
        </div>
      </section>
    </Modal>
  );
}
