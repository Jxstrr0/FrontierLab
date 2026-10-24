// Menu sheet (SCREENS §0.3). Stage 2 has Company, Branches, Settings, Save game
// and Exit to title; the rest arrive with their stages.
import { Sheet } from '../components';
import { stopLoop } from '../loop';
import { saveToSlot } from '../saves';
import { openPanel, peekGame, screen, setGame, sheet, toast } from '../store';

export function MenuSheet() {
  const close = () => (sheet.value = null);
  const exit = () => {
    const s = peekGame();
    if (s) {
      const err = saveToSlot('auto', s);
      if (err) toast(err, 'bad');
    }
    stopLoop();
    setGame(null);
    screen.value = 'title';
  };
  const items: { label: string; onClick: () => void }[] = [
    { label: 'Company', onClick: () => openPanel({ type: 'company' }) },
    { label: 'Branches', onClick: () => openPanel({ type: 'branches' }) },
    { label: 'Settings', onClick: () => openPanel({ type: 'settings' }) },
    { label: 'Save game', onClick: () => openPanel({ type: 'saves' }) },
    { label: 'Exit to title', onClick: exit },
  ];
  return (
    <Sheet title="Menu" onClose={close}>
      <nav class="menu-list">
        {items.map((it) => (
          <button type="button" class="menu-item" onClick={it.onClick}>
            {it.label}
          </button>
        ))}
      </nav>
    </Sheet>
  );
}
