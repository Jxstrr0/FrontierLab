// The in-game screen: the city view (the Stage 3 map, or the Stage 2 list when
// FEATURES.cityMap is off), the HUD, and the overlay layers for panels,
// modals, the menu and layers sheets, and toasts.
import { AuctionHousePanel } from '../auction/AuctionHousePanel';
import { FranchisePanel } from '../franchise/FranchisePanel';
import { CarDealerPanel } from '../personal/CarDealerPanel';
import { VacationHomePanel } from '../personal/VacationHomePanel';
import { WealthPanel } from '../personal/WealthPanel';
import { PortfolioPanel } from '../investment/PortfolioPanel';
import { MilestonesPanel } from '../milestones/MilestonesPanel';
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
import { FEATURES } from '../../config/balance';
import { BranchPanel } from '../branch/BranchPanel';
import { BuildPanel } from '../build/BuildPanel';
import { BuildDataCenterPanel } from '../dataCenter/BuildDataCenterPanel';
import { DataCenterPanel } from '../dataCenter/DataCenterPanel';
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
      {FEATURES.multiCity && sheet.value === 'travel' && <TravelSheet />}
      <ModalHost />
      <TutorialOverlay />
      {FEATURES.multiCity && <FlightOverlay />}
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
    case 'business':
      return FEATURES.competition ? (
        <BusinessPanel key={p.businessId} businessId={p.businessId} />
      ) : null;
    case 'university':
      return FEATURES.competition ? <UniversityPanel key={p.siteId} siteId={p.siteId} /> : null;
    case 'ledger':
      return FEATURES.competition ? <LedgerArchivePanel week={p.week} /> : null;
    // Stage 6 (FEATURES.capitalMarkets): investment banks.
    case 'investmentBank':
      return FEATURES.capitalMarkets ? (
        <InvestmentBankPanel key={p.siteId} siteId={p.siteId} tab={p.tab ?? 'market'} />
      ) : null;
    // Stage 7 (FEATURES.investments): startups, buildings, conventions, lobbyists.
    case 'startup':
      return FEATURES.investments ? (
        <StartupPanel key={p.startupId} startupId={p.startupId} />
      ) : null;
    case 'property':
      return FEATURES.investments ? <PropertyPanel key={p.siteId} siteId={p.siteId} /> : null;
    case 'convention':
      return FEATURES.investments ? <ConventionPanel key={p.siteId} siteId={p.siteId} /> : null;
    case 'lobbyingFirm':
      return FEATURES.investments ? <LobbyingFirmPanel key={p.siteId} siteId={p.siteId} /> : null;
    // Stage 8 (FEATURES.multiCity): airports and travel.
    // Stage 9 (FEATURES.personalEmpire): the founder's empire.
    case 'wealth':
      return FEATURES.personalEmpire ? <WealthPanel /> : null;
    case 'vacationHome':
      return FEATURES.personalEmpire ? (
        <VacationHomePanel key={p.siteId} siteId={p.siteId} />
      ) : null;
    case 'carDealer':
      return FEATURES.personalEmpire ? <CarDealerPanel key={p.siteId} siteId={p.siteId} /> : null;
    case 'auctionHouse':
      return FEATURES.personalEmpire ? (
        <AuctionHousePanel key={p.siteId} siteId={p.siteId} tab={p.tab} />
      ) : null;
    case 'franchise':
      return FEATURES.personalEmpire ? <FranchisePanel key={p.clubId} clubId={p.clubId} /> : null;
    case 'airport':
      return FEATURES.multiCity ? <AirportPanel key={p.jet ? 'jet' : 'ap'} jet={p.jet} /> : null;
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
      return FEATURES.investments ? <PortfolioPanel /> : null;
    case 'milestones':
      return <MilestonesPanel />;
    case 'credits':
      return <CreditsScreen inGame />;
  }
}

function ModalHost() {
  const m = modal.value;
  if (!m) return null;
  if (m.type === 'weekly') return <WeeklyResults week={m.week} period={m.period} />;
  if (m.type === 'incident') return FEATURES.competition ? <IncidentModal /> : null;
  if (m.type === 'boardMeeting') return FEATURES.capitalMarkets ? <BoardMeetingModal /> : null;
  return <GameOverModal />;
}
