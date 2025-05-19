# DeepSource Issues - TODO List

Run ID: fbc65da7-a938-4d4d-b643-401ba1eb190d
Branch: add-recent-run-issues-tool
Status: FAILURE
Created: 2025-05-19T17:37:09.793273+00:00
Total Issues: 9

## Anti-Pattern Issues (JS-0323)

All issues are of type "Detected usage of the `any` type" - The `any` type can sometimes leak into your codebase. TypeScript compiler skips the type checking of the `any` typed variables, so it creates a potential safety hole, and source of bugs in your codebase. We recommend using `unknown` or `never` type variable.

### src/__tests__/deepsource-process-run-checks.test.ts
- [x] **Line 314**: Remove usage of the `any` type (Fixed: replaced with DeepSourceClientWithPrivateStatics type)
- [x] **Line 234**: Remove usage of the `any` type (Fixed: replaced with DeepSourceClientWithPrivateStatics type)
- [x] **Line 177**: Remove usage of the `any` type (Fixed: replaced with DeepSourceClientWithPrivateStatics type)
- [x] **Line 136**: Remove usage of the `any` type (Fixed: replaced with DeepSourceClientWithPrivateStatics type)
- [x] **Line 88**: Remove usage of the `any` type (Fixed: replaced with DeepSourceClientWithPrivateStatics type)

### src/__tests__/deepsource-find-most-recent-run.test.ts
- [x] **Line 386**: Remove usage of the `any` type (Fixed: replaced with DeepSourceClientWithPrivateMethods type)
- [x] **Line 309**: Remove usage of the `any` type (Fixed: replaced with DeepSourceClientWithPrivateMethods type)
- [x] **Line 276**: Remove usage of the `any` type (Fixed: replaced with DeepSourceClientWithPrivateMethods type)
- [x] **Line 176**: Remove usage of the `any` type (Fixed: replaced with DeepSourceClientWithPrivateMethods type)

## Summary
- **Total issues introduced**: 9
- **All issues are anti-pattern related** (JS-0323)
- **Severity**: CRITICAL
- **Action required**: Replace all `any` types with more specific types

## Resolution Strategy
1. Identify each `any` type usage at the specified line numbers
2. Replace with appropriate specific types:
   - Use `unknown` for truly unknown types
   - Use type assertions with proper types like `Record<string, unknown>`
   - Use proper interfaces or types where the structure is known
3. Ensure tests still pass after replacing `any` types
4. Run `pnpm run lint` to verify no type errors
5. Run `pnpm run test` to ensure all tests still pass