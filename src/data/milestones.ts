// Milestones (DESIGN §5.18): the goals the Milestones screen lists. `news`
// marks those that get their own Ledger story; the rest already make the paper
// through their own events (the IPO, a merger, the rich list).
export interface MilestoneSpec {
  id: string;
  title: string;
  /** How to reach it, shown while it's still ahead. */
  goal: string;
  /** Ledger body when reached ({bank} is filled in). */
  line: string;
  news: boolean;
}

export const MILESTONES: MilestoneSpec[] = [
  {
    id: 'first_branch',
    title: 'First branch',
    goal: 'Open your first branch.',
    line: 'The doors are open and the first deposits are in.',
    news: false,
  },
  {
    id: 'first_loan',
    title: 'First loan',
    goal: 'Lend to your first customer.',
    line: 'The first loan is on the books.',
    news: false,
  },
  {
    id: 'first_profit',
    title: 'First profitable quarter',
    goal: 'Close a quarter with positive net income.',
    line: '{bank} closed its first profitable quarter.',
    news: true,
  },
  {
    id: 'ten_branches',
    title: '10 branches',
    goal: 'Run 10 open branches.',
    line: '{bank} now runs ten branches.',
    news: true,
  },
  {
    id: 'hq_staffed',
    title: 'HQ fully staffed',
    goal: 'Staff all seven operating departments to full coverage.',
    line: 'Every department at {bank} headquarters is fully staffed.',
    news: false,
  },
  {
    id: 'ipo',
    title: 'Public company',
    goal: 'List your bank on the stock exchange.',
    line: '{bank} is a public company.',
    news: false,
  },
  {
    id: 'first_acquisition',
    title: 'First acquisition',
    goal: 'Buy a rival bank.',
    line: '{bank} closed its first acquisition.',
    news: false,
  },
  {
    id: 'deposits_1b',
    title: 'A billion in deposits',
    goal: 'Hold a billion in customer deposits.',
    line: 'Customer deposits at {bank} passed the billion mark.',
    news: true,
  },
  {
    id: 'five_countries',
    title: 'Five countries',
    goal: 'Run branches in five countries.',
    line: '{bank} now banks customers in five countries.',
    news: true,
  },
  {
    id: 'billionaire',
    title: 'Billionaire founder',
    goal: 'Reach a personal net worth of a billion.',
    line: 'The founder of {bank} is now a billionaire on paper.',
    news: true,
  },
  {
    id: 'rich_list_1',
    title: 'Top of the rich list',
    goal: 'Rank first on the annual rich list.',
    line: 'The founder of {bank} tops the rich list.',
    news: false,
  },
];
