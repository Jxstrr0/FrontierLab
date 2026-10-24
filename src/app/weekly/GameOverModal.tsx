// STUB — to be built in Stage 2. See docs/DESIGN.md §5.18.
import { Modal } from '../components';
import { useGame } from '../store';

export function GameOverModal() {
  const s = useGame();
  return (
    <Modal title="Game over">
      <p>
        {s.flags.gameOver === 'takeover'
          ? 'The regulator has taken over the bank.'
          : 'The bank is insolvent.'}
      </p>
    </Modal>
  );
}
