// Stage 7 Ledger templates: ventures and conventions, real estate, lobbying,
// each in its own file, merged here into one table for LEDGER_TEMPLATES.
import { LOBBYING_TEMPLATES } from './ledgerTemplatesLobbying';
import { REAL_ESTATE_TEMPLATES } from './ledgerTemplatesRealEstate';
import { VENTURES_TEMPLATES } from './ledgerTemplatesVentures';

export const INVESTMENTS_TEMPLATES = {
  ...VENTURES_TEMPLATES,
  ...REAL_ESTATE_TEMPLATES,
  ...LOBBYING_TEMPLATES,
};
