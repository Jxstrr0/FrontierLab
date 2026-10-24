// Per-kind pin details for Stage 7 sites (property buildings and convention
// centres): each area module decides visibility, label text, a tag and the
// owned seal; pins.ts applies them.

export interface SitePinInfo {
  /** False hides the pin (e.g. a convention centre outside its event weeks). */
  visible: boolean;
  /** Appended to the pin's accessible label after the site name. */
  suffix: string;
  /** Short text under the medallion ("For sale", "Open now"). Never "For lease". */
  tag?: string;
  /** You own it: drawn with your brand-ink seal. */
  owned?: boolean;
}
