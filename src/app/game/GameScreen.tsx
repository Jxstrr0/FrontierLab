// The in-game screen: the city map, the HUD, and the overlay layers for panels,
// modals, the menu and layers sheets, and toasts.
import { AuctionHousePanel } from '../auction/AuctionHousePanel';
import { FranchisePanel } from '../franchise/FranchisePanel';
import { CarDealerPanel } from '../personal/CarDealerPanel';
import { VacationHomePanel } from '../personal/VacationHomePanel';
import { WealthPanel } from '../personal/WealthPanel';
import { PortfolioPanel } from '../investment/PortfolioPanel';
import { MilestonesPanel } from '../milestones/MilestonesPanel';
import { ProjectsPanel } from '../projects/ProjectsPanel';
import { AirportPanel } from '../airport/AirportPanel';
import { FlightOverlay } from '../airport/FlightOverlay';
import { TravelSheet } from '../airport/TravelSheet';
import { BoardMeetingModal } from '../executive/BoardMeetingModal';
import { InvestmentBankPanel } from '../investmentBank/InvestmentBankPanel';
import { ConventionPanel } from '../convention/ConventionPanel';
import { LobbyingFirmPanel } from '../lobbying/LobbyingFirmPanel';
import { PropertyPanel } from '../realEstate/PropertyPanel';
import { StartupPanel } from '../startup/StartupPanel';
import { useEffect } from 'preact/hooks';
import { BranchPanel } from '../branch/BranchPanel';
import { BuildPanel } from '../build/BuildPanel';
import { BuildDataCenterPanel } from '../dataCenter/BuildDataCenterPanel';
import { DataCenterPanel } from '../dataCenter/DataCenterPanel';
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
import { AnnualReport } from '../weekly/AnnualReport';
import { WeeklyResults } from '../weekly/WeeklyResults';
import { CentralBankPanel } from '../centralbank/CentralBankPanel';
import { IncidentModal } from '../incidents/IncidentModal';
import { LedgerArchivePanel } from '../ledger/LedgerArchivePanel';
import { EmployerPanel } from '../partners/EmployerPanel';
import { BusinessPanel } from '../business/BusinessPanel';
import { UniversityPanel } from '../partners/UniversityPanel';
import { RivalBranchPanel } from '../rivals/RivalBranchPanel';
import { RivalHqPanel } from '../rivals/RivalHqPanel';
import { watchSoundCues } from '../sound/cues';
import { watchTutorial } from '../tutorial/controller';
import { TutorialOverlay } from '../tutorial/TutorialOverlay';
import { CreditsScreen } from '../credits/CreditsScreen';
import { Hud } from './Hud';
import { MenuSheet } from './MenuSheet';
import './game.css';

export function GameScreen() {
  useEffect(() => {
    startLoop();
    const stopTutorial = watchTutorial();
    const stopSounds = watchSoundCues();
    return () => {
      stopLoop();
      stopTutorial();
      stopSounds();
    };
  }, []);
  return (
    <div class="game">
      <main class="game-map">
        <MapView />
      </main>
      <Hud />
      <PanelHost />
      {sheet.value === 'menu' && <MenuSheet />}
      {sheet.value === 'layers' && <LayersSheet />}
      {sheet.value === 'travel' && <TravelSheet />}
      <ModalHost />
      <TutorialOverlay />
      <FlightOverlay />
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
    case 'buildDataCenter':
      return <BuildDataCenterPanel key={p.lotId ?? p.siteId} lotId={p.lotId} siteId={p.siteId} />;
    case 'dataCenter':
      return <DataCenterPanel key={p.dataCenterId} dataCenterId={p.dataCenterId} />;
    case 'branch':
      return <BranchPanel key={p.branchId} branchId={p.branchId} tab={p.tab ?? 'service'} />;
    case 'office':
      return <OfficePanel key={p.listingId} listingId={p.listingId} />;
    case 'hq':
      return <HqPanel officeId={p.officeId} dept={p.dept} />;
    case 'bureau':
    case 'agency':
      return <SitePanel key={p.siteId} siteId={p.siteId} kind={p.type} />;
    case 'rivalBranch':
      return <RivalBranchPanel key={p.lotId} lotId={p.lotId} />;
    case 'rivalHq':
      return <RivalHqPanel key={p.siteId} siteId={p.siteId} />;
    case 'centralBank':
      return <CentralBankPanel countryId={p.countryId} />;
    case 'employer':
      return <EmployerPanel key={p.siteId} siteId={p.siteId} />;
    case 'business':
      return <BusinessPanel key={p.businessId} businessId={p.businessId} />;
    case 'university':
      return <UniversityPanel key={p.siteId} siteId={p.siteId} />;
    case 'ledger':
      return <LedgerArchivePanel week={p.week} />;
    case 'investmentBank':
      return <InvestmentBankPanel key={p.siteId} siteId={p.siteId} tab={p.tab ?? 'market'} />;
    case 'startup':
      return <StartupPanel key={p.startupId} startupId={p.startupId} />;
    case 'property':
      return <PropertyPanel key={p.siteId} siteId={p.siteId} />;
    case 'convention':
      return <ConventionPanel key={p.siteId} siteId={p.siteId} />;
    case 'lobbyingFirm':
      return <LobbyingFirmPanel key={p.siteId} siteId={p.siteId} />;
    case 'wealth':
      return <WealthPanel />;
    case 'vacationHome':
      return <VacationHomePanel key={p.siteId} siteId={p.siteId} />;
    case 'carDealer':
      return <CarDealerPanel key={p.siteId} siteId={p.siteId} />;
    case 'auctionHouse':
      return <AuctionHousePanel key={p.siteId} siteId={p.siteId} tab={p.tab} />;
    case 'franchise':
      return <FranchisePanel key={p.clubId} clubId={p.clubId} />;
    case 'airport':
      return <AirportPanel key={p.jet ? 'jet' : 'ap'} jet={p.jet} />;
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
    case 'portfolio':
      return <PortfolioPanel />;
    case 'milestones':
      return <MilestonesPanel />;
    case 'projects':
      return <ProjectsPanel />;
    case 'credits':
      return <CreditsScreen inGame />;
  }
}

function ModalHost() {
  const m = modal.value;
  if (!m) return null;
  if (m.type === 'weekly') return <WeeklyResults week={m.week} period={m.period} />;
  if (m.type === 'incident') return <IncidentModal />;
  if (m.type === 'boardMeeting') return <BoardMeetingModal />;
  if (m.type === 'annual') return <AnnualReport year={m.year} />;
  return <GameOverModal />;
}
