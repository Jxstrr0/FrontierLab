// ESLint flat config: recommended JS + TypeScript rules, with Prettier owning formatting.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', '.claude'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // CLAUDE.md non-negotiable 4: the simulation is pure and deterministic.
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded RNG streams in src/sim/rng.ts.',
        },
        ...['exp', 'log', 'pow', 'sin', 'cos', 'tan', 'tanh', 'atan', 'atan2', 'hypot', 'cbrt']
          .concat(['log1p', 'log2', 'log10', 'expm1', 'sinh', 'cosh', 'asin', 'acos'])
          .map((property) => ({
            object: 'Math',
            property,
            message:
              'Engines differ here; use src/sim/detmath.ts so every browser gets the same game.',
          })),
        {
          object: 'Date',
          property: 'now',
          message: 'The sim has its own clock; never read wall time.',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/sim must not touch the DOM.' },
        { name: 'document', message: 'src/sim must not touch the DOM.' },
        { name: 'localStorage', message: 'localStorage lives in src/sim/save/ only.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "BinaryExpression[operator='**'], AssignmentExpression[operator='**=']",
          message: 'Engines differ on **; use dpow from src/sim/detmath.ts.',
        },
      ],
    },
  },
  prettier,
);
