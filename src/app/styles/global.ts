// Global styles for every screen: the bundled fonts (only the weights in
// ART_DIRECTION §1.2; @fontsource sets font-display: swap), design tokens,
// element defaults and buttons. Imported first by components/index.ts as well
// as main.tsx, so with code splitting this CSS still lands ahead of every
// component's CSS (components.css overrides parts of buttons.css).
import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/700.css';
import '@fontsource/bodoni-moda/900.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';
import './tokens.css';
import './base.css';
import './buttons.css';
