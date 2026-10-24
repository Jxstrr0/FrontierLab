// Boot: load bundled fonts and global styles, then mount <App/>.
import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/700.css';
import '@fontsource/bodoni-moda/900.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';
import './app/styles/tokens.css';
import './app/styles/base.css';
import './app/styles/buttons.css';
import { render } from 'preact';
import { App } from './app/App';

const root = document.getElementById('app');
if (root) render(<App />, root);
