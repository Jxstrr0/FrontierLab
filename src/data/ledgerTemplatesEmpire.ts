// Stage 9 Ledger templates: personal wealth, auctions and sports clubs, each in
// its own file, merged here into one table for LEDGER_TEMPLATES.
import { AUCTIONS_TEMPLATES } from './ledgerTemplatesAuctions';
import { FRANCHISE_TEMPLATES } from './ledgerTemplatesFranchise';
import { PERSONAL_TEMPLATES } from './ledgerTemplatesPersonal';

export const EMPIRE_TEMPLATES = {
  ...PERSONAL_TEMPLATES,
  ...AUCTIONS_TEMPLATES,
  ...FRANCHISE_TEMPLATES,
};
