// Public bodies that post tenders (CONTENT §21c, SIMULATION §11.7, owner's
// review A4): a city's transit, health, courts and other services buying AI
// under one long contract. Names are generic civic titles with the city's name
// in front; `budgetMult` scales TENDER.budget for the body.

export interface PublicBodySpec {
  id: string;
  /** Shown after the city's name: "Calgary Transit Commission". */
  title: string;
  /** What the contract is for, in a few words. */
  scope: string;
  budgetMult: number;
}

export const PUBLIC_BODIES: PublicBodySpec[] = [
  {
    id: 'transit',
    title: 'Transit Commission',
    scope: 'route planning and rider help',
    budgetMult: 1,
  },
  { id: 'health', title: 'Health Authority', scope: 'clinical notes and triage', budgetMult: 1.4 },
  { id: 'courts', title: 'Courts Service', scope: 'case records and transcripts', budgetMult: 0.9 },
  { id: 'schools', title: 'School Board', scope: 'tutoring and marking help', budgetMult: 1.1 },
  { id: 'water', title: 'Water Board', scope: 'leak detection and billing', budgetMult: 0.7 },
  {
    id: 'permits',
    title: 'Permits Office',
    scope: 'applications and inspections',
    budgetMult: 0.8,
  },
  {
    id: 'emergency',
    title: 'Emergency Services',
    scope: 'dispatch and call handling',
    budgetMult: 1.2,
  },
  { id: 'revenue', title: 'Revenue Office', scope: 'tax queries and audits', budgetMult: 1.3 },
];
