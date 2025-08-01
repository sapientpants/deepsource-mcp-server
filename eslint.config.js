import js from '@eslint/js';
import * as tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'jest.config.js', 'examples/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      // Allow export of enums and types without using them directly in the file
      'no-unused-vars': ['error', { 
        vars: 'all', 
        args: 'after-used', 
        ignoreRestSiblings: false,
        varsIgnorePattern: '^(MetricShortcode|MetricKey|MetricThresholdStatus|MetricDirection|ReportType|ReportStatus|LogLevel|ErrorCategory|VulnerabilitySeverity|PackageVersionType|VulnerabilityReachability|VulnerabilityFixability|AnalysisRunStatus|MCPErrorCode|MCPErrorCategory|ToolCategory|z)$',
        argsIgnorePattern: '^_'
      }]
    },
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        beforeAll: 'readonly',
        afterEach: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        setTimeout: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      // Allow jest import in test files even if not directly used
      'no-unused-vars': ['error', { 
        vars: 'all', 
        args: 'after-used', 
        ignoreRestSiblings: false,
        varsIgnorePattern: '^(jest)$'
      }]
    }
  },
]; 