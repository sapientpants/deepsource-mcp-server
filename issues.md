# DeepSource Issues - Branch: add-recent-run-issues-tool

## Run Details
- Run ID: 54d89a15-a4c7-4974-b965-a9a0978546a4
- Commit: e790c565a47b43722eb4e4213b3c644fc901fec9
- Created: 2025-05-19T17:00:53.133596+00:00
- Status: PENDING
- Issues Introduced: 9
- Issues Resolved: 12

## Issues to Fix

### 1. Function with cyclomatic complexity higher than threshold (JS-R1005) ✅
- **File**: src/deepsource.ts:1363
- **Severity**: MINOR
- **Category**: ANTI_PATTERN
- **Status**: RESOLVED

**Resolution**: Refactored the `getRecentRunIssues` method by breaking it down into smaller, focused functions:
- Created `validateProject` method for project validation logic
- Extracted GraphQL queries as static properties
- Created `fetchAllChecks` to handle check pagination
- Created `createIssueFromOccurrence` to convert occurrence data
- Created `fetchOccurrencesForCheck` to handle occurrence pagination
- Simplified the main method to orchestrate sub-methods

**Commit**: 6e66308

---

### 2. Detected usage of the `any` type (JS-0323) ✅
- **File**: src/__tests__/logger.test.ts:304
- **Severity**: CRITICAL
- **Category**: ANTI_PATTERN
- **Status**: RESOLVED

**Resolution**: Replaced `any` type with `Record<string, unknown>` for the circular reference object in the test.

**Commit**: bc24015

---

### 3. Detected usage of the `any` type (JS-0323) ✅
- **File**: src/__tests__/deepsource-recent-run-issues.test.ts:261
- **Severity**: CRITICAL
- **Category**: ANTI_PATTERN
- **Status**: RESOLVED

**Resolution**: Replaced `client as any` with type-safe unknown casting.

**Commit**: ee844e4

---

### 4. Detected usage of the `any` type (JS-0323) ✅
- **File**: src/__tests__/deepsource-recent-run-issues.test.ts:220
- **Severity**: CRITICAL
- **Category**: ANTI_PATTERN
- **Status**: RESOLVED

**Resolution**: Replaced `client as any` with type-safe unknown casting.

**Commit**: ee844e4

---

### 5. Detected usage of the `any` type (JS-0323) ✅
- **File**: src/__tests__/deepsource-recent-run-issues.test.ts:207
- **Severity**: CRITICAL
- **Category**: ANTI_PATTERN
- **Status**: RESOLVED

**Resolution**: Replaced `client as any` with type-safe unknown casting.

**Commit**: ee844e4

---

### 6. Detected usage of the `any` type (JS-0323) ✅
- **File**: src/__tests__/deepsource-recent-run-issues.test.ts:84
- **Severity**: CRITICAL
- **Category**: ANTI_PATTERN
- **Status**: RESOLVED

**Resolution**: Replaced `client as any` with type-safe unknown casting.

**Commit**: ee844e4

---

### 7. Detected usage of the `any` type (JS-0323) ✅
- **File**: src/__tests__/deepsource-recent-run-issues.test.ts:46
- **Severity**: CRITICAL
- **Category**: ANTI_PATTERN
- **Status**: RESOLVED

**Resolution**: Replaced `mockAxiosInstance: any` with `Record<string, unknown>`.

**Commit**: ee844e4

---

### 8. Found multiple import of the same path (JS-R1000) ✅
- **File**: src/__tests__/deepsource-recent-run-issues.test.ts:6
- **Severity**: MINOR
- **Category**: STYLE
- **Status**: RESOLVED

**Resolution**: Consolidated imports from '@jest/globals' into a single import statement.

**Commit**: d901378

---

### 9. Found multiple import of the same path (JS-R1000) ✅
- **File**: src/__tests__/deepsource-recent-run-issues.test.ts:5
- **Severity**: MINOR
- **Category**: STYLE
- **Status**: RESOLVED

**Resolution**: Consolidated imports from '@jest/globals' into a single import statement.

**Commit**: d901378

---

## Summary

This DeepSource run has identified 9 issues to be resolved:
- 6 critical issues related to `any` type usage - **ALL RESOLVED** ✅
- 1 minor issue related to high cyclomatic complexity - **RESOLVED** ✅
- 2 minor style issues for duplicate imports - **ALL RESOLVED** ✅

**All 9 issues have been resolved!** 🎉

## Resolution Summary by Commit

- **6e66308**: Refactored getRecentRunIssues to reduce cyclomatic complexity (1 issue)
- **bc24015**: Fixed any type in logger.test.ts (1 issue)
- **ee844e4**: Fixed multiple any types in deepsource-recent-run-issues.test.ts (5 issues)
- **d901378**: Consolidated duplicate imports (2 issues)