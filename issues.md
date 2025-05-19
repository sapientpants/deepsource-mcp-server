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
- **Status**: ✅ All issues resolved!

## Resolution Details
All 9 `any` type issues have been resolved by creating proper type definitions:

### src/__tests__/deepsource-process-run-checks.test.ts (5 issues resolved)
- Lines 314, 234, 177, 136, 88: Created `DeepSourceClientWithPrivateStatics` type to properly access the private static method `processRunChecksResponse`

### src/__tests__/deepsource-find-most-recent-run.test.ts (4 issues resolved)
- Lines 386, 309, 276, 176: Created `DeepSourceClientWithPrivateMethods` type to properly access the private instance method `findMostRecentRun`

All tests continue to pass with the proper type assertions, eliminating the need for `any` type and improving type safety.