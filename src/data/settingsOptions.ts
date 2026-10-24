// The values each player setting can take (SCREENS §26). The settings command
// validates against these and the settings screen builds its controls from them.
export const CURRENCY_SYMBOLS = ['$', 'C$', '£', '€', '¥'] as const;
export const DISTANCE_UNITS = ['km', 'mi'] as const;
export const WEEKLY_RESULTS_MODES = ['weekly', 'quarterly', 'off'] as const;
export const DEFAULT_SPEEDS = [1, 2, 4] as const;
export const TEXT_SCALES = [1, 1.15, 1.3] as const;
