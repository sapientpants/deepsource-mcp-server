// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import * as jsonc from 'eslint-plugin-jsonc';
import jsoncParser from 'jsonc-eslint-parser';
// import { fileURLToPath } from 'node:url';
// import { dirname } from 'node:path';

// const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Ignore patterns
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'jest.config.js', 'examples/**'],
  },
  // Base configuration for all JS/TS files
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs['recommended'].rules,
      'no-console': 'warn',
      'no-debugger': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Relaxed rules for test files
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts', '**/test-types.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' in tests for mocking
      '@typescript-eslint/no-unsafe-assignment': 'off', // Allow unsafe assignments in tests
      '@typescript-eslint/no-unsafe-member-access': 'off', // Allow unsafe member access in tests
      '@typescript-eslint/no-unsafe-call': 'off', // Allow unsafe calls in tests
      '@typescript-eslint/no-unsafe-return': 'off', // Allow unsafe returns in tests
      '@typescript-eslint/no-unsafe-argument': 'off', // Allow unsafe arguments in tests
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern:
            '^_|jest|describe|it|expect|beforeEach|afterEach|MockedFunction|McpServer|SecurityClient|MetricsClient|IssuesClient|RunsClient|Logger',
        },
      ],
      '@typescript-eslint/no-unused-expressions': 'off', // Allow unused expressions in tests
      'no-console': 'off', // Allow console in tests for debugging
    },
  },
  // Disabled type-aware rules to avoid configuration complexity
  // {
  //   files: ['src/**/*.ts', '!src/**/__tests__/**', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
  //   languageOptions: {
  //     parser: tsParser,
  //     parserOptions: {
  //       ecmaVersion: 2024,
  //       sourceType: 'module',
  //       project: true,
  //       tsconfigRootDir: __dirname,
  //     },
  //   },
  //   plugins: { '@typescript-eslint': tseslint },
  //   rules: {
  //     ...tseslint.configs['recommended-type-checked'].rules,
  //   },
  // },
  // JSON/JSONC/JSON5 linting configuration
  {
    files: ['**/*.json', '**/*.json5', '**/*.jsonc'],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      jsonc,
    },
    rules: {
      ...jsonc.configs['recommended-with-json'].rules,
      'jsonc/sort-keys': 'off', // Keep keys in logical order, not alphabetical
      'jsonc/indent': ['error', 2], // Enforce 2-space indentation in JSON files
      'jsonc/key-spacing': 'error', // Enforce consistent spacing between keys and values
      'jsonc/comma-dangle': ['error', 'never'], // No trailing commas in JSON
      'jsonc/quotes': ['error', 'double'], // Enforce double quotes in JSON
      'jsonc/quote-props': ['error', 'always'], // Always quote property names
      'jsonc/no-comments': 'off', // Allow comments in JSONC files
    },
  },
  // Specific rules for package.json
  {
    files: ['**/package.json'],
    rules: {
      'jsonc/sort-keys': [
        'error',
        {
          pathPattern: '^$', // Root object
          order: [
            'name',
            'version',
            'description',
            'keywords',
            'author',
            'license',
            'repository',
            'bugs',
            'homepage',
            'private',
            'type',
            'main',
            'module',
            'exports',
            'files',
            'bin',
            'packageManager',
            'engines',
            'scripts',
            'lint-staged',
            'dependencies',
            'devDependencies',
            'peerDependencies',
            'optionalDependencies',
          ],
        },
      ],
    },
  },
  // Specific rules for tsconfig files
  {
    files: ['**/tsconfig*.json'],
    rules: {
      'jsonc/no-comments': 'off', // Allow comments in tsconfig files
    },
  },
  // Keep Prettier last
  eslintConfigPrettier,
];
