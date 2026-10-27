// Engraved line icons for development templates (SCREENS §10 New product
// "template icons"): one glyph per base product (src/data/products.ts), plus the
// two digital projects. Single-ink strokes in brass, drawn on a 24-unit grid.
import { DEV_TEMPLATES } from '../../../data/devTemplates';

const GLYPHS: Record<string, string> = {
  // Open hand / free tier: a small gift box.
  free_tier:
    'M4.5 10h15v9h-15zM4.5 13.5h15M12 10v9M12 10c-3 0-4.5-1.5-4.5-3a2 2 0 0 1 4-0.5zM12 10c3 0 4.5-1.5 4.5-3a2 2 0 0 0-4-0.5z',
  // Plus sign in a circle.
  plus: 'M12 4a8 8 0 1 0 0.01 0M12 8.5v7M8.5 12h7',
  // Star.
  pro: 'M12 4.5l2.2 4.8 5.2 0.6-3.9 3.6 1.1 5.2L12 16l-4.6 2.7 1.1-5.2-3.9-3.6 5.2-0.6z',
  // Three people.
  team: 'M12 8a2.5 2.5 0 1 0 0.01 0M6 10a2 2 0 1 0 0.01 0M18 10a2 2 0 1 0 0.01 0M8 19v-2.5a4 4 0 0 1 8 0V19M3.5 18.5v-2a2.5 2.5 0 0 1 3.5-2.3M20.5 18.5v-2a2.5 2.5 0 0 0-3.5-2.3',
  // Graduation cap.
  campus_plan: 'M3.5 10 12 6l8.5 4-8.5 4zM7 11.8V16c0 1.5 2.2 2.5 5 2.5s5-1 5-2.5v-4.2M20.5 10v5',
  // Angle brackets with a slash.
  api: 'M8 7.5 3.5 12 8 16.5M16 7.5l4.5 4.5-4.5 4.5M13.5 5.5l-3 13',
  // Stacked sheets with a clock.
  batch_api:
    'M5 6.5h10v12H5zM8 4h10v12M8.5 10h3M8.5 13h3M15.5 16.5a3 3 0 1 0 0.01 0M15.5 15v1.8l1.3 0.8',
  // Dial with a needle.
  fine_tuning: 'M4 16a8 8 0 0 1 16 0M4 16h16M12 16l3.5-5M7 12.5l-1-0.8M17 12.5l1-0.8M12 8.5V7',
  // Signed contract (enterprise deals).
  sbl: 'M7 4h7l4 4v12H7zM14 4v4h4M9.5 11h6M9.5 14h6M9.5 17.5c1-1.5 2-1.5 2.5 0s1.5 1.5 3 0',
  // Terminal window with a prompt.
  code_assistant: 'M3.5 5.5h17v13h-17zM3.5 8.5h17M7 11.5l3 2.5-3 2.5M12 16.5h5',
  // Robot head.
  agent_studio:
    'M6 9h12v9H6zM9 12.5h1.5M13.5 12.5H15M9.5 15.5h5M12 9V6M12 6a1 1 0 1 0 0.01 0M3.5 12v3M20.5 12v3',
  // Brush and palette.
  creative_suite:
    'M12 4.5a7.5 7.5 0 1 0 0 15c1.5 0 2-1 1.5-2s0-2.5 2-2.5h1a3 3 0 0 0 3-3A7.5 7.5 0 0 0 12 4.5zM8.5 10a1 1 0 1 0 0.01 0M12 7.5a1 1 0 1 0 0.01 0M15.5 10a1 1 0 1 0 0.01 0',
  // Headset.
  priority_support:
    'M5 14v-2a7 7 0 0 1 14 0v2M4 14h3v4.5H4zM17 14h3v4.5h-3zM18.5 18.5c0 1.5-1.5 2-4.5 2',
  // Phone.
  mobile_app_v2: 'M8 3.5h8v17H8zM8 6.5h8M8 17h8M11 18.8h2',
  // Lightning.
  instant_decisions: 'M13.5 3.5 6.5 13h5l-1 7.5 7-9.5h-5z',
};

export function TemplateIcon(p: { templateId: string; size?: number }) {
  const t = DEV_TEMPLATES[p.templateId];
  const key = t?.base ?? p.templateId;
  const d = GLYPHS[key] ?? GLYPHS.plus!;
  const size = p.size ?? 28;
  return (
    <svg class="pf-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
