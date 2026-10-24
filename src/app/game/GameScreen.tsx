// The in-game screen: the city view (a list until the Stage 3 map), the HUD,
// and the overlay layers for panels, modals, the menu sheet and toasts.
import { useEffect } from 'preact/hooks';
import { BranchPanel } from '../branch/BranchPanel';
import { BuildPanel } from '../build/BuildPanel';
import { CityList } from '../city/CityList';
import { BranchesPanel } from '../company/BranchesPanel';
import { CompanyPanel } from '../company/CompanyPanel';
import { ToastHost } from '../components';
import { startLoop, stopLoop } from '../loop';
import { SavesScreen } from '../saves/SavesScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { modal, panel, sheet } from '../store';
import { StorefrontPanel } from '../storefront/StorefrontPanel';
import { GameOverModal } from '../weekly/GameOverModal';
import { WeeklyResults } from '../weekly/WeeklyResults';
import { Hud } from './Hud';
import { MenuSheet } from './MenuSheet';
import './game.css';

export function GameScreen() {
  useEffect(() => {
    startLoop();
    return stopLoop;
  }, []);
  return (
    <div class="game">
      <main class="game-view">
        <CityList />
      </main>
      <Hud />
      <PanelHost />
      {sheet.value === 'menu' && <MenuSheet />}
      <ModalHost />
      <ToastHost />
    </div>
  );
}

function PanelHost() {
  const p = panel.value;
  if (!p) return null;
  switch (p.type) {
    case 'storefront':
      return <StorefrontPanel key={p.lotId} lotId={p.lotId} />;
    case 'build':
      return <BuildPanel key={p.lotId} lotId={p.lotId} />;
    case 'branch':
      return <BranchPanel key={p.branchId} branchId={p.branchId} tab={p.tab ?? 'service'} />;
    case 'company':
      return <CompanyPanel />;
    case 'branches':
      return <BranchesPanel />;
    case 'settings':
      return <SettingsScreen inGame />;
    case 'saves':
      return <SavesScreen inGame />;
  }
}

function ModalHost() {
  const m = modal.value;
  if (!m) return null;
  if (m.type === 'weekly') return <WeeklyResults week={m.week} />;
  return <GameOverModal />;
}
