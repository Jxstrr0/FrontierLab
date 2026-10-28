// Menu sheet (SCREENS §0.3): every screen that isn't on the map, from Company
// and HQ to Portfolio, Milestones, Settings, Save game and Exit to title.
// Entries for a system whose FEATURES flag is off are hidden.
import { FEATURES } from '../../config/balance';
import { Sheet } from '../components';
import { stopLoop } from '../loop';
import { saveToSlot } from '../saves';
import { openPanel, peekGame, screen, setGame, sheet, toast } from '../store';

export function MenuSheet() {
  const close = () => (sheet.value = null);
  const exit = async () => {
    const s = peekGame();
    stopLoop();
    if (s) {
      // Wait for the save so the title's Continue card shows it.
      const err = await saveToSlot('auto', s);
      if (err) toast(err, 'bad');
    }
    setGame(null);
    screen.value = 'title';
  };
  const items: { label: string; onClick: () => void }[] = [
    { label: 'Company', onClick: () => openPanel({ type: 'company' }) },
    // Opens your HQ, or explains how to lease an office when you have none.
    ...(FEATURES.hq ? [{ label: 'HQ', onClick: () => openPanel({ type: 'hq' }) }] : []),
    { label: 'Sales offices', onClick: () => openPanel({ type: 'branches' }) },
    ...(FEATURES.personalEmpire
      ? [{ label: 'Personal wealth', onClick: () => openPanel({ type: 'wealth' }) }]
      : []),
    ...(FEATURES.investments
      ? [{ label: 'Portfolio', onClick: () => openPanel({ type: 'portfolio' }) }]
      : []),
    ...(FEATURES.competition
      ? [{ label: 'The Inference', onClick: () => openPanel({ type: 'ledger' }) }]
      : []),
    { label: 'Frontier projects', onClick: () => openPanel({ type: 'projects' }) },
    { label: 'Milestones', onClick: () => openPanel({ type: 'milestones' }) },
    { label: 'Settings', onClick: () => openPanel({ type: 'settings' }) },
    { label: 'Save game', onClick: () => openPanel({ type: 'saves' }) },
    { label: 'Exit to title', onClick: exit },
  ];
  return (
    <Sheet title="Menu" onClose={close}>
      <nav class="menu-list">
        {items.map((it) => (
          <button
            type="button"
            class="menu-item"
            data-tutorial={`menu-${it.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}
            onClick={it.onClick}
          >
            {it.label}
          </button>
        ))}
      </nav>
    </Sheet>
  );
}
