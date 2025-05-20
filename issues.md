# DeepSource Issues

This document tracks the active issues identified by DeepSource in the latest analysis run on the `fix/deepsource-active-issues` branch.

## Summary

- Total Issues: 5
- Run Date: 2025-05-20
- Commit: a7560dc3d96562cc9c5f0d960da6198102cb3d4b
- Status: FAILURE

## Issues Breakdown

- Critical Issues: 2 (TCV-001 - Lines not covered in tests)
- Minor Issues: 3 (JS-R1004 - Useless template literal, JS-0242 - Use const declarations)

## Detailed Issues

### 1. Lines not covered in tests (TCV-001)

**File:** `src/__tests__/utils/test-utils.ts`  
**Line:** 68  
**Severity:** CRITICAL  
**Category:** COVERAGE  
**Status:** OPEN  

**Description:** A source line is considered covered when at least one instruction that is assigned to this line has been executed by a test case. These lines were not executed during any of the test cases.

**Context:**
```typescript
// Line 68 in test-utils.ts is part of the testProcessRegularMetricHistory method:
return this.processRegularMetricHistory(params);
```

**Action Required:** Write or enhance tests that execute the `testProcessRegularMetricHistory` method properly. The current test in `deepsource-test-utils.test.ts` only verifies that the method exists but doesn't actually call through to it.

### 2. Lines not covered in tests (TCV-001)

**File:** `src/__tests__/utils/test-utils.ts`  
**Line:** 55  
**Severity:** CRITICAL  
**Category:** COVERAGE  
**Status:** OPEN  

**Description:** A source line is considered covered when at least one instruction that is assigned to this line has been executed by a test case. These lines were not executed during any of the test cases.

**Context:**
```typescript
// Line 55 in test-utils.ts is part of the testValidateAndGetMetricInfo method:
return this.validateAndGetMetricInfo(params);
```

**Action Required:** Write or enhance tests that execute the `testValidateAndGetMetricInfo` method. The current test in `deepsource-test-utils.test.ts` only verifies that the method exists but doesn't actually invoke it with arguments.

### 3. Useless template literal found (JS-R1004)

**File:** `src/__tests__/deepsource-test-utils.test.ts`  
**Line:** 164  
**Severity:** MINOR  
**Category:** ANTI_PATTERN  
**Status:** OPEN  

**Description:** Template literals are useful when you need interpolated strings, strings with unescaped quotes, or multi-line strings. If none of these conditions are met, a regular string literal should be used instead.

**Context:**
```typescript
// Line 164 in deepsource-test-utils.test.ts:
}).toThrow(`Invalid repository information for project 'test-project-key'`);
```

**Action Required:** Replace the template literal with a regular string literal since it doesn't use any interpolation:
```typescript
}).toThrow("Invalid repository information for project 'test-project-key'");
```

### 4. Useless template literal found (JS-R1004)

**File:** `src/__tests__/deepsource-test-utils.test.ts`  
**Line:** 149  
**Severity:** MINOR  
**Category:** ANTI_PATTERN  
**Status:** OPEN  

**Description:** Template literals are useful when you need interpolated strings, strings with unescaped quotes, or multi-line strings. If none of these conditions are met, a regular string literal should be used instead.

**Context:**
```typescript
// Line 149 in deepsource-test-utils.test.ts:
}).toThrow(`Invalid repository information for project 'test-project-key'`);
```

**Action Required:** Replace the template literal with a regular string literal since it doesn't use any interpolation:
```typescript
}).toThrow("Invalid repository information for project 'test-project-key'");
```

### 5. Use `const` declarations for variables that are never reassigned (JS-0242)

**File:** `src/__tests__/deepsource-test-utils.test.ts`  
**Line:** 107  
**Severity:** MINOR  
**Category:** ANTI_PATTERN  
**Status:** OPEN  

**Description:** Variables that are never re-assigned a new value after their initial declaration should be declared with the `const` keyword. This prevents accidental reassignment and indicates the variable is a constant value.

**Context:**
```typescript
// Line 107 in deepsource-test-utils.test.ts:
let result = await TestableDeepSourceClient.testNoneTypeErrorHandler();
```

**Action Required:** Change the `let` declaration to `const` since it's not reassigned in the same scope:
```typescript
const result = await TestableDeepSourceClient.testNoneTypeErrorHandler();
```

## Resolution Tracking

- [x] Issue 1: Lines not covered in tests (line 68) - Resolved in commit 6d55a15 with a test that properly executes the testProcessRegularMetricHistory method
- [ ] Issue 2: Lines not covered in tests (line 55) - Need to write a test that properly executes the testValidateAndGetMetricInfo method
- [ ] Issue 3: Useless template literal (line 164) - Replace with regular string literal
- [ ] Issue 4: Useless template literal (line 149) - Replace with regular string literal
- [ ] Issue 5: Use const declarations (line 107) - Change let to const