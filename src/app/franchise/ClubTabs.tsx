// SCREENS §20 owned club, Club and Kit tabs. Club: position, record, fan mood,
// stadium, owner and valuation, with Sell. Kit: the shirt, colour pickers from
// the palette and the shirt sponsor ("Your bank" raises brand awareness across
// the country and forgoes the outside sponsor's money).
import { useState } from 'preact/hooks';
import { FRANCHISE } from '../../config/balance';
import { KIT_COLOURS } from '../../data/franchises';
import * as cmd from '../../sim/commands';
import { finishFor, recordText, winPct } from '../../sim/franchiseMath';
import { ordinal } from '../../sim/newsFormat';
import { Card, Confirm, Row, SectionTitle, Segmented, StatBar } from '../components';
import { money, moneyFull, pct } from '../format/format';
import { act, toast, useGame } from '../store';
import { moodWord, type ClubView } from './franchiseView';
import { KitShirt } from './KitShirt';

export function ClubTab({ view }: { view: ClubView }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { club, spec } = view;
  const [confirm, setConfirm] = useState(false);
  const played = club.record[0] + club.record[1] + club.record[2];
  const proceeds = club.value * (1 - FRANCHISE.saleFee);
  const sell = () => {
    setConfirm(false);
    const r = act(cmd.sellClub, spec.id);
    if (r.ok) toast(`Sold the ${spec.name} for ${money(r.proceeds, sym)}.`, 'good');
  };
  return (
    <div class="stack">
      <div class="fr-hero">
        <KitShirt {...club.kit} monogram={s.meta.monogram} ink={s.meta.brandInk} size={96} />
      </div>
      <Card>
        <Row
          label="Position"
          value={played > 0 ? `${ordinal(finishFor(winPct(club.record)))} on pace` : 'Off-season'}
          strong
        />
        <Row label="Record" value={played > 0 ? recordText(spec.id, club.record) : '—'} />
        <Row
          label="Last season"
          value={club.lastFinish ? `${ordinal(club.lastFinish)} of ${FRANCHISE.leagueSize}` : '—'}
        />
        <StatBar label={`Fans: ${moodWord(club.fanMood)}`} value={club.fanMood} />
        <Row label="Stadium" value={`${spec.stadium}, ${view.city}`} />
        <Row label="League" value={spec.league} />
      </Card>
      <Card>
        <Row label="Owner" value={view.ownerLabel} />
        {club.price !== undefined && <Row label="Bought for" value={moneyFull(club.price, sym)} />}
        <Row label="Valuation" value={moneyFull(club.value, sym)} strong />
        <button type="button" class="btn btn-secondary btn-block" onClick={() => setConfirm(true)}>
          Sell club
        </button>
        <p class="muted small fr-center">
          Sells from anywhere at the valuation less a {pct(FRANCHISE.saleFee, 0)} fee.
        </p>
      </Card>
      {confirm && (
        <Confirm
          title={`Sell the ${spec.name}?`}
          body={`A buyer pays ${moneyFull(proceeds, sym)} (the valuation less the ${pct(FRANCHISE.saleFee, 0)} fee).`}
          confirmLabel="Sell"
          danger
          onConfirm={sell}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

export function KitTab({ view }: { view: ClubView }) {
  const s = useGame();
  const { club, spec } = view;
  const setColour = (which: 'primary' | 'secondary', id: string) => {
    const kit = { ...club.kit, [which]: id };
    if (kit.primary === kit.secondary) {
      // Swap rather than refuse: the other colour takes the old value.
      if (which === 'primary') kit.secondary = club.kit.primary;
      else kit.primary = club.kit.secondary;
    }
    act(cmd.setKit, spec.id, kit.primary, kit.secondary);
  };
  const setSponsor = (v: 'outside' | 'bank') => {
    const r = act(cmd.setKitSponsor, spec.id, v === 'bank');
    if (r.ok && v === 'bank') toast(`${s.meta.bankName} is on the shirt.`, 'good');
  };
  return (
    <div class="stack">
      <div class="fr-hero">
        <KitShirt {...club.kit} monogram={s.meta.monogram} ink={s.meta.brandInk} size={120} />
      </div>
      <SectionTitle>Colours</SectionTitle>
      <Card>
        <Swatches
          label="Primary"
          value={club.kit.primary}
          onPick={(id) => setColour('primary', id)}
        />
        <Swatches
          label="Trim"
          value={club.kit.secondary}
          onPick={(id) => setColour('secondary', id)}
        />
      </Card>
      <SectionTitle>Shirt sponsor</SectionTitle>
      <Card>
        <Segmented
          label="Shirt sponsor"
          options={[
            { value: 'outside', label: 'Outside sponsor' },
            { value: 'bank', label: 'Your bank' },
          ]}
          value={club.kit.sponsor}
          onChange={setSponsor}
        />
        <p class="muted small fr-note">
          Putting {s.meta.bankName} on the shirt raises brand awareness in {view.country}, but the
          club forgoes its sponsorship income.
        </p>
      </Card>
    </div>
  );
}

function Swatches(p: { label: string; value: string; onPick: (id: string) => void }) {
  return (
    <div class="fr-swatch-row">
      <span class="fr-swatch-label">{p.label}</span>
      <div class="fr-swatches" role="radiogroup" aria-label={`${p.label} colour`}>
        {Object.entries(KIT_COLOURS).map(([id, c]) => (
          <button
            type="button"
            role="radio"
            aria-checked={id === p.value}
            aria-label={c.name}
            class={`fr-swatch${id === p.value ? ' is-active' : ''}`}
            style={{ background: c.hex }}
            onClick={() => p.onPick(id)}
          />
        ))}
      </div>
    </div>
  );
}
