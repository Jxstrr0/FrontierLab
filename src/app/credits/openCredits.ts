// Opens the full-screen credits and remembers where they were opened from. Kept
// apart from CreditsScreen so the title screen can link to the credits without
// pulling the whole screen into the first download.
import { screen } from '../store';

let returnTo: 'title' | 'settings' = 'title';

/** Opens the full-screen credits from the title screen or the title's Settings. */
export function openCredits(from: 'title' | 'settings'): void {
  returnTo = from;
  screen.value = 'credits';
}

/** Where Back on the full-screen credits goes. */
export function creditsReturn(): 'title' | 'settings' {
  return returnTo;
}
