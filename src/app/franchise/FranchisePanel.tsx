// SCREENS §20 sports franchise: the For sale card while an outside group owns
// the club, then tabs Club · Kit · Squad · Transfers · Finance once it's yours
// (managing works from anywhere; buying needs you in the city).
import { useState } from 'preact/hooks';
import { SPORT_LABEL } from '../../data/franchises';
import { Panel, type Tab } from '../components';
import { LayerMedallion } from '../map/LayerIcon';
import { closePanel, useGame } from '../store';
import { ClubFinance } from './ClubFinance';
import { ClubForSale } from './ClubForSale';
import { ClubTab, KitTab } from './ClubTabs';
import { clubView, windowStatus } from './franchiseView';
import { SquadTab, TransfersTab } from './SquadTabs';
import './franchise.css';

type ClubTabId = 'club' | 'kit' | 'squad' | 'transfers' | 'finance';

export function FranchisePanel(p: { clubId?: string }) {
  const s = useGame();
  const [tab, setTab] = useState<ClubTabId>('club');
  const view = p.clubId ? clubView(s, p.clubId) : undefined;
  if (!view) {
    return (
      <Panel title="Sports club" onClose={closePanel}>
        <p class="muted">That club is not on the map.</p>
      </Panel>
    );
  }
  const { spec, owned } = view;
  const windowOpen = windowStatus(s).open;
  const tabs: Tab<ClubTabId>[] = [
    { id: 'club', label: 'Club' },
    { id: 'kit', label: 'Kit' },
    { id: 'squad', label: 'Squad' },
    { id: 'transfers', label: 'Transfers', badge: windowOpen && view.club.market.length > 0 },
    { id: 'finance', label: 'Finance' },
  ];
  return (
    <Panel
      title={spec.name}
      subtitle={`${SPORT_LABEL[spec.sport]} · ${spec.league}`}
      icon={<LayerMedallion id="sportsTeams" size={32} />}
      onClose={closePanel}
      advisor={{
        text: owned
          ? 'Winning fills the stadium and lifts the club’s value. Your bank on the shirt spreads the brand.'
          : 'Fans, a stadium, and a lot of payroll. Interested?',
      }}
      tabs={owned ? tabs : undefined}
      tab={owned ? tab : undefined}
      onTab={setTab}
    >
      {!owned && <ClubForSale view={view} />}
      {owned && tab === 'club' && <ClubTab view={view} />}
      {owned && tab === 'kit' && <KitTab view={view} />}
      {owned && tab === 'squad' && <SquadTab view={view} />}
      {owned && tab === 'transfers' && <TransfersTab view={view} />}
      {owned && tab === 'finance' && <ClubFinance view={view} />}
    </Panel>
  );
}
