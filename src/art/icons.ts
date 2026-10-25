// The icon set (ART_DIRECTION §7): one path per icon on a 24 px grid, drawn
// with a 1.5 px stroke and rounded caps and joins, in brass on navy or ink on
// ivory. Map layers, Ledger articles, pins and panel chrome all draw from
// here (src/app/components/Icon.tsx renders them).

export const ICON_PATHS = {
  // Buildings and places
  branch: 'M3 9.5 12 4l9 5.5M4 20h16M5 18h14M6.5 11v6M10 11v6M14 11v6M17.5 11v6M4 9.5h16',
  office: 'M6 21V4h12v17M4 21h16M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M11 21v-3h2v3',
  realEstate: 'M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  bureau: 'M5 3.5h9l3 3V12M5 3.5V20h6M8 8h6M8 11h4M15.5 18.5a3 3 0 1 0 0-.01M17.6 20.6 20 23',
  bank: 'M5 21V8h14v13M3 21h18M12 8V3l4 1.5L12 6M8 11v7M12 11v7M16 11v7',
  investmentBank: 'M3 20h18M4 16l5-5 4 3 7-8M16 6h4v4',
  agency: 'M4 10v4h3l8 4V6l-8 4H4M7 14l1.5 5h2L9.5 15M18 9.5a3 3 0 0 1 0 5',
  convention: 'M3 10 12 4l9 6M5 10v10M19 10v10M3 20h18M5 10l2.3 2 2.3-2 2.4 2 2.3-2 2.4 2 2.3-2',
  lobby: 'M5 12a7 5 0 0 1 14 0M12 4v3M4 12h16M6 12v7M10 12v7M14 12v7M18 12v7M3 20h18',
  stadium:
    'M3 9c0-2 4-3.5 9-3.5S21 7 21 9v7c0 2-4 3.5-9 3.5S3 18 3 16zM3 9c0 2 4 3.5 9 3.5S21 11 21 9M6 4v3M18 4v3M12 12.5v7',
  car: 'M3 16v-3l2-4h10l3 4h2v3zM6.5 18.5a1.5 1.5 0 1 0 0-.01M16.5 18.5a1.5 1.5 0 1 0 0-.01M7 9l1 4M3 13h17',
  gavel: 'M5 9l5-5 3 3-5 5zM11.5 10.5 19 18M4 21h9M5.5 21v-2h6v2',
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
  pause: 'M8.5 5v14M15.5 5v14',
  play: 'M7 5l12 7-12 7z',
  fast: 'M4 6l8 6-8 6zM12 6l8 6-8 6z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];
