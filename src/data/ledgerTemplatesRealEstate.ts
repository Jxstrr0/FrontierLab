// The Weekly Ledger's templates for real estate stories (Stage 7, CONTENT §23):
// big building deals by the bank or its founder, and foreclosed homes sold off
// city by city. Merged into LEDGER_TEMPLATES in ledgerTemplates.ts.
import type { LedgerTemplate } from './ledgerTemplates';

export const REAL_ESTATE_TEMPLATES = {
  PROPERTY_BOUGHT: [
    {
      h: '{bank} buys {address} for {price}',
      b: 'The lab adds the {city} building to its books and says the tenants stay put.',
    },
    {
      h: 'Landlord {bank}: lab snaps up {address}',
      b: 'A {price} purchase in {city}. Rent from the building will now flow to the lab.',
    },
  ],
  PROPERTY_BOUGHT_PERSONAL: [
    {
      h: '{founder} buys {address} privately',
      b: 'The {bank} founder paid {price} for the {city} building out of their own pocket.',
    },
    {
      h: 'Founder turns landlord: {founder} pays {price} for {city} block',
      b: '{address} changes hands. The lab says the deal has nothing to do with it.',
    },
  ],
  PROPERTY_SOLD: [
    {
      h: '{bank} sells {address} for {price}',
      b: 'The lab cashes in on the {city} building. Brokers say the buyer was quick to sign.',
    },
    {
      h: '{bank} lets go of {city} building',
      b: '{address} fetched {price}. The proceeds go straight to corporate cash.',
    },
  ],
  PROPERTY_SOLD_PERSONAL: [
    {
      h: '{founder} sells {address}',
      b: 'The {bank} founder banked {price} on the {city} building.',
    },
    {
      h: '{founder} cashes out of {city} property',
      b: '{address} sold for {price} in a private deal.',
    },
  ],
} satisfies Record<string, LedgerTemplate[]>;
