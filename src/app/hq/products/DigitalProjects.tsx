// Digital projects on the IT floor (SCREENS §10, DESIGN §5.8.6): the digital
// templates (Mobile App 2.0, Fast Inference, the Model Playground…) with their effect and status:
// available with Start (opens the New product form on that template), running
// with progress, or done. They run as developments, so the Products team
// builds them and a Products floor is needed to start one.
import { useState } from 'preact/hooks';
import { DEV_TEMPLATE_IDS, DEV_TEMPLATES, isDigital } from '../../../data/devTemplates';
import { devWeeksLeft } from '../../../sim/development';
import { Badge, Card } from '../../components';
import { useGame } from '../../store';
import { NewProductSheet } from './NewProductSheet';
import { digitalEffectText, digitalStatus } from './productSelectors';
import { TemplateIcon } from './TemplateIcon';
import './products.css';

const DIGITAL_IDS = DEV_TEMPLATE_IDS.filter((id) => isDigital(DEV_TEMPLATES[id]!));

export function DigitalProjects() {
  const s = useGame();
  const [starting, setStarting] = useState<string | null>(null);
  const hasProducts = !!s.departments.products;
  return (
    <div class="stack">
      {DIGITAL_IDS.map((id) => {
        const t = DEV_TEMPLATES[id]!;
        const st = digitalStatus(s, id);
        const share = st.status === 'running' ? st.dev.progress / st.dev.weeks : 0;
        return (
          <Card class="pf-dev">
            <div class="pf-dev-head">
              <TemplateIcon templateId={id} />
              <div class="pf-dev-title">
                <span class="pf-dev-name">{t.name}</span>
                <span class="muted small">{digitalEffectText(t)}</span>
              </div>
              {st.status === 'done' && <Badge tone="good">Done</Badge>}
              {st.status === 'running' && <Badge tone="info">Running</Badge>}
            </div>
            {st.status === 'running' && (
              <>
                <div
                  class="pf-progress"
                  role="progressbar"
                  aria-label={`${t.name} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(share * 100)}
                >
                  <span class="pf-progress-fill" style={{ width: `${share * 100}%` }} />
                </div>
                <div class="pf-dev-meta small">
                  <span>{Math.round(share * 100)}% done</span>
                  <span>
                    {hasProducts
                      ? `${devWeeksLeft(s, st.dev)} weeks left`
                      : 'Paused: no Products floor'}
                  </span>
                </div>
              </>
            )}
            {st.status === 'available' && (
              <>
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  disabled={!hasProducts}
                  onClick={() => setStarting(id)}
                >
                  Start
                </button>
                {!hasProducts && (
                  <p class="muted small hq-note">
                    The Products team builds digital projects: add a Products floor first.
                  </p>
                )}
              </>
            )}
          </Card>
        );
      })}
      {starting && <NewProductSheet initialTemplate={starting} onClose={() => setStarting(null)} />}
    </div>
  );
}
