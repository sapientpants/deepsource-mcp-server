# DeepSource JavaScript Issues

This document lists all JavaScript issues from the latest DeepSource run on the fix-quality-issues branch.
Run ID: QW5hbHlzaXNSdW46a2Frd25nbg==

Total JavaScript issues: 7 (introduced), 11 (resolved)
- ANTI_PATTERN: 6
- PERFORMANCE: 1

## Issue 1: JS-0323 - Detected usage of the `any` type

**Category**: ANTI_PATTERN
**Severity**: CRITICAL
**Description**: The `any` type creates potential safety holes. Use `unknown` or `never` instead.
**Status**: OPEN

### Occurrences (2 total)

1. **File**: src/__tests__/deepsource-metrics-response.test.ts
   - **Line 59**: Usage of `any` type
   - **Line 4**: Usage of `any` type

## Issue 2: JS-0099 - Found warning comments in code

**Category**: DOCUMENTATION
**Severity**: MINOR
**Description**: TODO, FIXME, XXX comments found in code
**Status**: OPEN

### Occurrences (1 total)

1. **File**: src/__tests__/deepsource-metric-threshold-updates.test.ts
   - **Line 29**: TODO comment found

## Issue 3: JS-0296 - Use of a banned type detected

**Category**: ANTI_PATTERN
**Severity**: MAJOR
**Description**: Avoid using `Object`, `object`, `Function`, and `{}` types
**Status**: OPEN

### Occurrences (10 total)

1. **File**: src/__tests__/deepsource-report-utils.test.ts
   - **Line 196**: Usage of banned type
   - **Line 146**: Usage of banned type
   - **Line 11**: Usage of banned type

2. **File**: src/__tests__/deepsource-metric-validation.test.ts
   - **Line 108**: Usage of banned type
   - **Line 76**: Usage of banned type
   - **Line 56**: Usage of banned type
   - **Line 8**: Usage of banned type

3. **File**: src/__tests__/deepsource-historical-data-processing.test.ts
   - **Line 267**: Usage of banned type
   - **Line 8**: Usage of banned type

## Summary

Total issues found in latest run: 7 JavaScript issues
Total occurrences: 13
- JS-0323 (Detected usage of `any` type): 2 occurrences
- JS-0099 (Found warning comments): 1 occurrence
- JS-0296 (Use of banned type): 10 occurrences

These issues need to be addressed to improve code quality and type safety across the codebase.