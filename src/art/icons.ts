// The icon set (ART_DIRECTION §7): one path per icon on a 24 px grid, drawn
// with a 1.5 px stroke and rounded caps and joins, in brass on navy or ink on
// ivory. Map layers, Ledger articles, pins and panel chrome all draw from
// here (src/app/components/Icon.tsx renders them).
//
// The place glyphs are drawn to read at 18–24 px inside a map medallion, and
// each has its own silhouette: a credit score dial for bureaus, a megaphone for
// agencies, a podium and microphone for lobbying firms, a name badge on a lanyard
// for conventions, a gavel on its block for auction houses, a palm on its
// island for vacation homes. Closely related ideas never share an outline.

export const ICON_PATHS = {
  // Buildings and places
  branch: 'M3 9.5 12 4l9 5.5M4 20h16M5 18h14M6.5 11v6M10 11v6M14 11v6M17.5 11v6M4 9.5h16',
  office:
    'M6 21V3.5h12V21M4 21h16M9 6.5h2M13 6.5h2M9 10h2M13 10h2M9 13.5h2M13 13.5h2M10.5 21v-3.5h3V21',
  realEstate: 'M3.5 11.5 12 4.5l8.5 7M6 10v10h12V10M10 20v-5h4v5M15.5 7.4V4.5h2v4.5',
  // A palm tree on its island, waves lapping (vacation homes).
  villa:
    'M11 21c.3-4-.2-7.5-1.5-10.5M9.5 10.5C8 8.5 5.5 8 3.5 9.2M9.5 10.5C9.2 8 10.8 6 13.5 5.5M9.5 10.5c2.3-1.3 5-1 7 .8M9.5 10.5c-2.2.2-4 1.6-4.8 3.8M9.5 10.5c1.8.6 3.2 2 3.8 4M4 21h11M15 18.5c1-.7 2-.7 3 0s2 .7 3 0',
  // A credit score dial: needle swinging across a graduated arc.
  bureau:
    'M3.5 17a8.5 8.5 0 0 1 17 0M12 8.5v2M6 11l1.4 1.4M18 11l-1.4 1.4M12 17l4-4.6M13.1 17a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0M4 20.5h16',
  bank: 'M5 21V9h14v12M3 21h18M4 9h16M12 9V3l4 1.5L12 6M8 12v6M12 12v6M16 12v6',
  investmentBank: 'M3 20.5h18M4 16.5l5-5 4 3 7-8M15.5 6.5H20V11M6 20.5v-2M10 20.5v-4M14 20.5v-3',
  agency: 'M4 10v4h3l8 4V6l-8 4H4M7 14l1.5 5h2L9.5 15M18 9.5a3 3 0 0 1 0 5M20.5 7.5a6 6 0 0 1 0 9',
  // A name badge on its lanyard (conventions).
  convention:
    'M8 3l4 5 4-5M6 8h12v13H6zM12 10.5a1.9 1.9 0 1 0 .01 0M8.8 18.5c.6-1.8 1.8-2.7 3.2-2.7s2.6.9 3.2 2.7',
  // A speaker's podium with its microphone (lobbying firms: making the case).
  lobby:
    'M5.5 10h13l-1.2 2.6H6.7zM8 12.6l.8 7.4h6.4l.8-7.4M6 20.5h12M12 10V6.2M12 2.6a1.8 1.8 0 1 0 .01 0M10.6 15.6h2.8',
  stadium:
    'M3 9c0-2 4-3.5 9-3.5S21 7 21 9v7c0 2-4 3.5-9 3.5S3 18 3 16zM3 9c0 2 4 3.5 9 3.5S21 11 21 9M6 4v3M18 4v3M12 12.5v7',
  car: 'M3 16.5v-3c0-.6.4-1 1-1.1l2.4-.5 2.3-3.3c.3-.4.8-.6 1.3-.6h4.4c.5 0 1 .3 1.3.7l2.1 3.2 2.2.5c.6.1 1 .6 1 1.1v3M9.4 17h5.2M3 16.5h2.6M18.4 16.5H21M7.5 15.2a1.8 1.8 0 1 0 .01 0M16.5 15.2a1.8 1.8 0 1 0 .01 0M8.6 11.8h7',
  // A gavel striking its block (auction houses; law and rulings in the Ledger).
  gavel: 'M5.5 9.5l5-5 3.5 3.5-5 5zM8 7l3.5 3.5M12.2 11.2 19.5 18.5M3.5 21h10M5 21v-2.5h7V21',
  university: 'M2.5 9 12 5l9.5 4L12 13zM6.5 11v4.5c3 2 8 2 11 0V11M21.5 9v5',
  employer: 'M4 8h16v11H4zM9 8V5.5h6V8M4 12.5h16M11 12v2h2v-2',
  airport: 'M4 20h16M6 20v-8h12v8M9 12V8h6v4M12 8V4M10 4h4M8.5 15.5h2M13.5 15.5h2',
  plane:
    'M21 12c0-.8-.7-1.3-1.5-1.3H14.6L10.4 4H8.6l2.2 6.7H6.1L4.4 8.6H3l1 3.4-1 3.4h1.4l1.7-2.1h4.7L8.6 20h1.8l4.2-6.7h4.9c.8 0 1.5-.5 1.5-1.3z',
  dome: 'M5 12a7 6 0 0 1 14 0M12 4v2M4 12h16M6 12v7M10 12v7M14 12v7M18 12v7M3 20h18',
  // Money and banking
  coin: 'M12 4a8 8 0 1 0 .01 0zM12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.3-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5',
  vault: 'M4 4h16v16H4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 10v4M10 12h4M6 20v1.5M18 20v1.5',
  atm: 'M6 3h12v18H6zM8 6h8v5H8zM9 15h6M9 18h6',
  teller: 'M3 20h18M4 20V9h16v11M8 9V5h8v4M8 13h3v3H8zM13 13h3v3h-3z',
  chart: 'M4 4v16h16M7 15l4-5 3 3 5-7',
  shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4',
  // HQ floors: an open ledger (Finance), a bank card (Products), a screen with
  // its rating line (IT) and a briefcase (Executive suite).
  ledger:
    'M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6zM6.5 9h3M6.5 12h3M14.5 9h3M14.5 12h3',
  card: 'M3 6h18v12H3zM3 10h18M6 14.5h4M14 14.5h4',
  monitor: 'M4 5h16v11H4zM9 20h6M12 16v4M8 12.5l2.5-3 2 2 3.5-4',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16M11 12.5v2h2v-2',
  warning: 'M12 4l9 16H3zM12 10v4.5M12 17.5h.01',
  trade: 'M4 8h13l-3-3M20 16H7l3 3',
  handshake: 'M3 11l4-4 3 2 3-2 4 0 4 4M3 11l5 5 2-1 2 2 2-1 2 1 5-6M10 9l3 3M13 12l2 2',
  key: 'M8 14a4 4 0 1 0 .01 0zM11 11l9-9M16 6l2 2M18 4l2 2',
  leaf: 'M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l8-8',
  trophy:
    'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3',
  ballot: 'M5 10h14v10H5zM8 10V4h8v6M10 7l1.5 1.5L14 6M9 15h6',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
  // People
  person: 'M12 4a3.5 3.5 0 1 0 .01 0zM5 20c1-4 4-6 7-6s6 2 7 6',
  people:
    'M9 5a3 3 0 1 0 .01 0zM3 19c.8-3.4 3.2-5 6-5s5.2 1.6 6 5M16 6a2.6 2.6 0 1 0 .01 0M15.5 13c2.6 0 4.6 1.4 5.5 4.5',
  // Interface
  settings:
    'M12 9a3 3 0 1 0 .01 0zM12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  layers: 'M12 4 3 9l9 5 9-5zM3 13.5l9 5 9-5',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronUp: 'M5 15l7-7 7 7',
  chevronDown: 'M5 9l7 7 7-7',
  pause: 'M8.5 5v14M15.5 5v14',
  play: 'M7 5l12 7-12 7z',
  fast: 'M4 6l8 6-8 6zM12 6l8 6-8 6z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];
