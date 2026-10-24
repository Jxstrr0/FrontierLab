// Engraved line icons for development templates (SCREENS §10 New product
// "template icons"): one glyph per base product family, plus the two digital
// projects. Single-ink strokes in brass, drawn on a 24-unit grid.
import { DEV_TEMPLATES } from '../../../data/devTemplates';

const GLYPHS: Record<string, string> = {
  // Coin stack: savings and term deposits.
  savings: 'M5 17h14M5 13.5h14M5 10h14M7 17v-7M17 17v-7M12 6.5a5 1.8 0 1 0 0.01 0',
  gic1y: 'M5 17h14M5 13.5h14M5 10h14M7 17v-7M17 17v-7M12 6.5a5 1.8 0 1 0 0.01 0',
  // House.
  mortgage: 'M4 11.5 12 5l8 6.5M6.5 10v9h11v-9M10.5 19v-5h3v5',
  // Car.
  auto_loan:
    'M4 15.5v-3l2-4h12l2 4v3zM4 15.5h16M7.5 18.5a1.5 1.5 0 1 0 0.01 0M16.5 18.5a1.5 1.5 0 1 0 0.01 0M6 12.5h12',
  // Signed agreement.
  loc: 'M7 4h7l4 4v12H7zM14 4v4h4M9.5 11h6M9.5 14h6M9.5 17.5c1-1.5 2-1.5 2.5 0s1.5 1.5 3 0',
  personal_loan:
    'M7 4h7l4 4v12H7zM14 4v4h4M9.5 11h6M9.5 14h6M9.5 17.5c1-1.5 2-1.5 2.5 0s1.5 1.5 3 0',
  // Card.
  credit_card: 'M3.5 7h17v10h-17zM3.5 10h17M6 14h4M14.5 14h3',
  // Rising chart.
  wealth: 'M4 19h16M4 19V5M6.5 16l4-4.5 3 2.5 5-6M15 8h3.5v3.5',
  // Cheque.
  chequing: 'M3.5 7.5h17v9h-17zM6 11h6M6 13.5h9M15.5 10.5h2.5',
  // Phone.
  mobile_app_v2: 'M8 3.5h8v17H8zM8 6.5h8M8 17h8M11 18.8h2',
  // Lightning.
  instant_decisions: 'M13.5 3.5 6.5 13h5l-1 7.5 7-9.5h-5z',
};

export function TemplateIcon(p: { templateId: string; size?: number }) {
  const t = DEV_TEMPLATES[p.templateId];
  const key = t?.base ?? p.templateId;
  const d = GLYPHS[key] ?? GLYPHS.savings!;
  const size = p.size ?? 28;
  return (
    <svg class="pf-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
