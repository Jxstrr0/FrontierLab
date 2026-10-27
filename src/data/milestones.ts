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
    title: 'First sales office',
    goal: 'Open your first sales office.',
    line: 'The doors are open and the first customers are in.',
    news: false,
  },
  {
    id: 'first_loan',
    title: 'First contract',
    goal: 'Win your first business contract on the Deal Desk.',
    line: 'The first business contract is signed.',
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
    title: 'First Flagship',
    goal: 'Grow a sales office to Flagship size.',
    line: '{bank} now runs a Flagship sales office.',
    news: true,
  },
  {
    id: 'first_data_center',
    title: 'First data center',
    goal: 'Build a data center and switch it on.',
    line: '{bank} runs its own GPUs now.',
    news: false,
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
    goal: 'List your lab on the stock exchange.',
    line: '{bank} is a public company.',
    news: false,
  },
  {
    id: 'first_acquisition',
    title: 'First acquisition',
    goal: 'Buy a rival lab.',
    line: '{bank} closed its first acquisition.',
    news: false,
  },
  {
    id: 'hundred_branches',
    title: 'Five Flagships',
    goal: 'Run five Flagship sales offices.',
    line: '{bank} now runs five Flagship sales offices.',
    news: true,
  },
  {
    id: 'three_data_centers',
    title: 'Three data centers',
    goal: 'Run three data centers.',
    line: '{bank} now runs three data centers.',
    news: true,
  },
  {
    id: 'ten_cities',
    title: 'Ten cities',
    goal: 'Run sales offices in ten cities.',
    line: '{bank} now has sales offices in ten cities.',
    news: true,
  },
  {
    // C8f: id kept for saves; once a billion in deposits, now a billion in ARR.
    id: 'deposits_1b',
    title: 'A billion in ARR',
    goal: 'Reach a billion in annual recurring revenue.',
    line: 'Annual recurring revenue at {bank} passed the billion mark.',
    news: true,
  },
  {
    id: 'five_countries',
    title: 'Five countries',
    goal: 'Run sales offices in five countries.',
    line: '{bank} now sells in five countries.',
    news: true,
  },
  {
    // 2026-10-27: id kept for saves; once total assets, now the company's valuation.
    id: 'assets_10b',
    title: 'A ten-billion lab',
    goal: 'Grow the lab to a valuation of ten billion.',
    line: '{bank} is now valued at ten billion.',
    news: true,
  },
  {
    id: 'five_acquisitions',
    title: 'Five acquisitions',
    goal: 'Buy five rival labs.',
    line: '{bank} closed its fifth acquisition.',
    news: false,
  },
  {
    id: 'club_owner',
    title: 'Club owner',
    goal: 'Buy a sports club, for the lab or for yourself.',
    line: 'The founder of {bank} now owns a sports club.',
    news: false,
  },
  {
    id: 'twenty_cities',
    title: 'Twenty cities',
    goal: 'Run sales offices in twenty cities.',
    line: '{bank} now has sales offices in twenty cities.',
    news: true,
  },
  {
    id: 'ten_countries',
    title: 'Ten countries',
    goal: 'Run sales offices in ten countries.',
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
    goal: 'Buy ten rival labs.',
    line: '{bank} closed its tenth acquisition.',
    news: false,
  },
  {
    // 2026-10-27: id kept for saves; now a valuation of a hundred billion.
    id: 'assets_100b',
    title: 'A hundred-billion lab',
    goal: 'Grow the lab to a valuation of a hundred billion.',
    line: '{bank} is now valued at a hundred billion.',
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
    // 2026-10-27: id kept for saves; now a valuation of a trillion.
    id: 'assets_1t',
    title: 'A trillion-dollar lab',
    goal: 'Grow the lab to a valuation of a trillion.',
    line: '{bank} is now valued at a trillion. Few companies ever get here.',
    news: true,
  },
  // ─── AI milestones (2026-10-27): the research side of the lab ──────────────
  {
    id: 'first_model',
    title: 'First trained model',
    goal: 'Finish a training run and ship your first model generation.',
    line: '{bank} shipped its first trained model.',
    news: true,
  },
  {
    id: 'big_contract',
    title: 'A million-dollar contract',
    goal: 'Sign an enterprise contract worth a million a year.',
    line: '{bank} signed its first million-a-year enterprise contract.',
    news: false,
  },
  {
    id: 'full_research_team',
    title: 'A full research team',
    goal: 'Employ eight researchers at once.',
    line: 'Every desk in the research wing at {bank} is taken.',
    news: false,
  },
  {
    id: 'leaderboard_top',
    title: 'Top of the leaderboard',
    goal: 'Beat every rival model on the benchmark leaderboard.',
    line: '{bank} holds the best model on the benchmark leaderboard.',
    news: true,
  },
  {
    id: 'owned_compute_quarter',
    title: 'Compute independence',
    goal: 'Serve every GPU-week of demand from your own GPUs for a full quarter.',
    line: '{bank} ran a whole quarter without buying a GPU-week at spot.',
    news: true,
  },
  {
    id: 'model_gen_5',
    title: 'Fifth generation',
    goal: 'Train a fifth generation of your model.',
    line: 'The fifth generation of the {bank} model is live.',
    news: true,
  },
  {
    id: 'safety_strong_2y',
    title: 'Two years of Strong safety',
    goal: 'Hold the Strong safety tier for 104 weeks in a row.',
    line: '{bank} has held the regulator’s Strong safety tier for two years running.',
    news: true,
  },
];
