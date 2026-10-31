// The board meeting's voice (SCREENS §10.2, 2026-10-31): the quarter-start
// reminder notice (loop.ts), the outcome lines after the vote and a remark on how the
// room split. Each has a few versions, picked by the meeting's week so a
// meeting reads the same while it is open. Tokens: {quarter}, {amount} (a
// dividend per share), {salary} (a yearly salary).

export const BOARD_LINES = {
  reminder: [
    'A new quarter has begun and the board is ready to meet for {quarter}. Set this quarter’s dividend and your pay, then put them to a vote.',
    'The directors are in the boardroom for {quarter}, coffee poured. Propose a dividend and your pay, then call the vote.',
    'Board papers for {quarter} are out. Two items on the agenda: the dividend and your salary.',
    'The chair has called the {quarter} meeting. The board wants your numbers on the dividend and your pay.',
  ],
  dividendRejected: [
    'The board voted the dividend down. Nothing will be paid.',
    'No dividend: the directors want the cash kept in the lab.',
    'The dividend failed. The chair suggested a smaller number next time.',
  ],
  dividendNone: [
    'No dividend this quarter.',
    'No payout proposed, none paid. The board moved on quickly.',
  ],
  dividendApproved: [
    'Approved: {amount} a share, paid in three weeks.',
    'The board backs {amount} a share. It goes out in three weeks.',
    'Dividend passed: {amount} a share, payable in three weeks.',
  ],
  salaryRejected: [
    'The board turned down your pay proposal. Your salary is unchanged.',
    'Pay rise refused. One director called it “ambitious”.',
    'The directors said no to the new salary. Your pay stays where it was.',
  ],
  salarySame: [
    'Your salary stays at {salary} a year.',
    'Pay held at {salary} a year. Nobody objected.',
  ],
  salaryChanged: [
    'Your salary is now {salary} a year.',
    'Approved: your pay moves to {salary} a year.',
    'The board signs off on {salary} a year for you.',
  ],
  /** Both items passed with at least BOARD_ROOM.unanimous of the vote. */
  roomWarm: [
    'Hands went up all round the table.',
    'A short meeting. The board is happy.',
    'The chair thanked you for a good quarter.',
  ],
  /** Either item was decided within BOARD_ROOM.closeBand of half. */
  roomSplit: [
    'It came down to the last vote.',
    'A long meeting. Two directors left without speaking.',
    'The room was split. Expect questions next quarter.',
  ],
  /** Both items failed. */
  roomCold: [
    'A frosty meeting. The board wants a better quarter.',
    'The directors left early. Nobody stayed for lunch.',
    'The chair asked for a word in private afterwards.',
  ],
} as const;

/** Version `n` of a line set (wraps), with {tokens} filled. */
export function boardLine(
  lines: readonly string[],
  n: number,
  tokens: Record<string, string> = {},
): string {
  const t = lines[Math.abs(Math.trunc(n)) % lines.length]!;
  return t.replace(/\{(\w+)\}/g, (whole, k: string) => tokens[k] ?? whole);
}
