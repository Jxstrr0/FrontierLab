// Stage 6 Ledger templates: governance, capital markets and M&A, each in its
// own file, merged here into one table for LEDGER_TEMPLATES.
import { GOVERNANCE_TEMPLATES } from './ledgerTemplatesGovernance';
import { MARKETS_TEMPLATES } from './ledgerTemplatesMarkets';
import { MERGERS_TEMPLATES } from './ledgerTemplatesMergers';

export const CAPITAL_TEMPLATES = {
  ...GOVERNANCE_TEMPLATES,
  ...MARKETS_TEMPLATES,
  ...MERGERS_TEMPLATES,
};
