// The HQ bottom tabs' labels and icons (SCREENS §10), shared by the HQ panel
// and the Office sheet's tab order list.
import type { IconName } from '../../art/icons';
import type { DeptId } from '../../sim/state';

/** Short tab labels (SCREENS §10 bottom tabs). */
export const TAB_LABEL: Record<DeptId, string> = {
  finance: 'Finance',
  hr: 'HR',
  products: 'Products',
  treasury: 'Compute',
  marketing: 'Marketing',
  it: 'Platform',
  risk: 'Safety',
  executive: 'Executive',
  investment: 'Investment',
};

/** Each floor's icon in the bottom bar (src/art/icons.ts). */
export const TAB_ICON: Record<DeptId, IconName> = {
  finance: 'ledger',
  hr: 'people',
  products: 'model',
  treasury: 'gpu',
  marketing: 'agency',
  it: 'monitor',
  risk: 'shield',
  executive: 'briefcase',
  investment: 'investmentBank',
};
