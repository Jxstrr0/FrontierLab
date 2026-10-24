// The in-game screen: the city view (the Stage 3 map, or the Stage 2 list when
// FEATURES.cityMap is off), the HUD, and the overlay layers for panels,
// modals, the menu and layers sheets, and toasts.
import { BoardMeetingModal } from '../executive/BoardMeetingModal';
import { InvestmentBankPanel } from '../investmentBank/InvestmentBankPanel';
import { useEffect } from 'preact/hooks';
import { FEATURES } from '../../config/balance';
import { BranchPanel } from '../branch/BranchPanel';
import { BuildPanel } from '../build/BuildPanel';
import { CityList } from '../city/CityList';
import { BranchesPanel } from '../company/BranchesPanel';
import { CompanyPanel } from '../company/CompanyPanel';
import { HqPanel } from '../hq/HqPanel';
import { ToastHost } from '../components';
import { startLoop, stopLoop } from '../loop';
import { CityListPanel } from '../map/CityListPanel';
import { LayersSheet } from '../map/LayersSheet';
import { MapView } from '../map/MapView';
import { OfficePanel } from '../office/OfficePanel';
import { SavesScreen } from '../saves/SavesScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { SitePanel } from '../sites/SitePanel';
import { modal, panel, sheet } from '../store';
import { StorefrontPanel } from '../storefront/StorefrontPanel';
import { GameOverModal } from '../weekly/GameOverModal';
import { WeeklyResults } from '../weekly/WeeklyResults';
import { CentralBankPanel } from '../centralbank/CentralBankPanel';
import { IncidentModal } from '../incidents/IncidentModal';
import { LedgerArchivePanel } from '../ledger/LedgerArchivePanel';
import { EmployerPanel } from '../partners/EmployerPanel';
import { UniversityPanel } from '../partners/UniversityPanel';
import { RivalBranchPanel } from '../rivals/RivalBranchPanel';
import { RivalHqPanel } from '../rivals/RivalHqPanel';
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
      {FEATURES.cityMap ? (
        <main class="game-map">
          <MapView />
        </main>
      ) : (
        <main class="game-view">
          <CityList />
        </main>
      )}
      <Hud />
      <PanelHost />
      {sheet.value === 'menu' && <MenuSheet />}
      {sheet.value === 'layers' && <LayersSheet />}
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
    // Stage 4 (FEATURES.hq): offices, HQ and the bureau and agency sites.
    case 'office':
      return FEATURES.hq ? <OfficePanel key={p.listingId} listingId={p.listingId} /> : null;
    case 'hq':
      return FEATURES.hq ? <HqPanel officeId={p.officeId} dept={p.dept} /> : null;
    case 'bureau':
    case 'agency':
      return FEATURES.hq ? <SitePanel key={p.siteId} siteId={p.siteId} kind={p.type} /> : null;
    // Stage 5 (FEATURES.competition): rivals, the central bank, employers, the Ledger archive.
    case 'rivalBranch':
      return FEATURES.competition ? <RivalBranchPanel key={p.lotId} lotId={p.lotId} /> : null;
    case 'rivalHq':
      return FEATURES.competition ? (
        <RivalHqPanel key={p.siteId} siteId={p.siteId} tab={p.tab ?? 'overview'} />
      ) : null;
    case 'centralBank':
      return FEATURES.competition ? <CentralBankPanel countryId={p.countryId} /> : null;
    case 'employer':
      return FEATURES.competition ? <EmployerPanel key={p.siteId} siteId={p.siteId} /> : null;
    case 'university':
      return FEATURES.competition ? <UniversityPanel key={p.siteId} siteId={p.siteId} /> : null;
    case 'ledger':
      return FEATURES.competition ? <LedgerArchivePanel week={p.week} /> : null;
    // Stage 6 (FEATURES.capitalMarkets): investment banks.
    case 'investmentBank':
      return FEATURES.capitalMarkets ? (
        <InvestmentBankPanel key={p.siteId} siteId={p.siteId} tab={p.tab ?? 'market'} />
      ) : null;
    case 'company':
      return <CompanyPanel />;
    case 'branches':
      return <BranchesPanel />;
    case 'cityList':
      return <CityListPanel />;
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
  if (m.type === 'incident') return FEATURES.competition ? <IncidentModal /> : null;
  if (m.type === 'boardMeeting') return FEATURES.capitalMarkets ? <BoardMeetingModal /> : null;
  return <GameOverModal />;
}
