// Save codes from outside (DATA_MODEL §10): how big a pasted code or a backup
// file may be before the game refuses to read it. A ten-year game's code is
// about 1.1 million characters and unpacks to about 2.8 million, so these leave
// room to grow about tenfold while still turning away a code built to unpack
// to hundreds of megabytes and freeze the page.

/** The longest save code, or backup file text, the game will read (characters). */
export const SAVE_CODE_MAX_CHARS = 12_000_000;
/** The most text a save code may unpack to (characters). */
export const SAVE_JSON_MAX_CHARS = 32_000_000;
/** The largest backup file the game will open (bytes). A code is plain letters, one byte each. */
export const BACKUP_FILE_MAX_BYTES = SAVE_CODE_MAX_CHARS + 1024;
/** The crash screen's small line of detail for a bug report is cut to this (characters). */
export const CRASH_DETAIL_MAX_CHARS = 200;
