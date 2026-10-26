// Milestones (DESIGN §5.18): the goals the Milestones screen lists, in roughly
// the order a game reaches them. `news` marks those that get their own Ledger
// story; the rest already make the paper through their own events (the IPO, a
// merger, a club purchase, the rich list).
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
    id: 'hundred_branches',
    title: '100 branches',
    goal: 'Run 100 open branches.',
    line: '{bank} now runs a hundred branches.',
    news: true,
  },
  {
    id: 'ten_cities',
    title: 'Ten cities',
    goal: 'Run branches in ten cities.',
    line: '{bank} now has branches in ten cities.',
    news: true,
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
    id: 'assets_10b',
    title: 'Ten billion in assets',
    goal: 'Grow total assets past ten billion.',
    line: 'Total assets at {bank} passed ten billion.',
    news: true,
  },
  {
    id: 'five_acquisitions',
    title: 'Five acquisitions',
    goal: 'Buy five rival banks.',
    line: '{bank} closed its fifth acquisition.',
    news: false,
  },
  {
    id: 'club_owner',
    title: 'Club owner',
    goal: 'Buy a sports club, for the bank or for yourself.',
    line: 'The founder of {bank} now owns a sports club.',
    news: false,
  },
  {
    id: 'twenty_cities',
    title: 'Twenty cities',
    goal: 'Run branches in twenty cities.',
    line: '{bank} now has branches in twenty cities.',
    news: true,
  },
  {
    id: 'ten_countries',
    title: 'Ten countries',
    goal: 'Run branches in ten countries.',
    line: '{bank} now banks customers in ten countries.',
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
    id: 'rich_list',
    title: 'On the rich list',
    goal: 'Rank among the fifty largest fortunes at a year end.',
    line: 'The founder of {bank} has made the rich list.',
    news: false,
  },
  {
    id: 'ten_acquisitions',
    title: 'Ten acquisitions',
    goal: 'Buy ten rival banks.',
    line: '{bank} closed its tenth acquisition.',
    news: false,
  },
  {
    id: 'assets_100b',
    title: 'A hundred billion in assets',
    goal: 'Grow total assets past a hundred billion.',
    line: 'Total assets at {bank} passed a hundred billion.',
    news: true,
  },
  {
    id: 'rich_list_1',
    title: 'Top of the rich list',
    goal: 'Rank first on the annual rich list.',
    line: 'The founder of {bank} tops the rich list.',
    news: false,
  },
  {
    id: 'worth_10b',
    title: 'Ten-billion founder',
    goal: 'Reach a personal net worth of ten billion.',
    line: 'The founder of {bank} is now worth ten billion on paper.',
    news: true,
  },
  {
    id: 'assets_1t',
    title: 'A trillion in assets',
    goal: 'Grow total assets past a trillion.',
    line: 'Total assets at {bank} passed a trillion.',
    news: true,
  },
];
