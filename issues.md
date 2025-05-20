# DeepSource Issues Todo List

## Latest DeepSource Analysis (May 20, 2025)

**Total Issues:** 36  
**Issues by Severity:**
- CRITICAL: 24
- MAJOR: 3
- MINOR: 9

**Issues by Category:**
- ANTI_PATTERN: 33
- BUG_RISK: 1
- PERFORMANCE: 2

---

## Current Active Issues

### 1. JS-0016: Function declarations in nested blocks
**Severity:** MAJOR  
**Category:** BUG_RISK  
**File:** src/__tests__/deepsource-vulnerability-processing.test.ts (multiple occurrences, originally line 445)

✅ **RESOLVED**

Function declarations (with the `function` keyword) and variable declarations should preferably be in the root of a program or the body of a function. Having nested function declarations inside blocks may have unexpected results at runtime due to hoisting.

**Completed fixes:**
- [x] Converted all nested function declarations to function expressions
- [x] Fixed 5 instances of nested generator function declarations:
  - `maxIterationsTestFunction` (line 445)
  - `testGenerator` (line 236)
  - `testNonArrayFunction` (line 412)
  - `errorHandlingTestFunction` (line 496)
  - `nullSkippingTestFunction` (line 537)

### 2. JS-0323: Using the `any` type (24 issues)
**Severity:** CRITICAL  
**Category:** ANTI_PATTERN  
**Affected Files:**
- ✅ src/__tests__/deepsource-vulnerability-processing.test.ts (lines 372, 374)
- ✅ src/__tests__/deepsource-metric-validation.test.ts (lines 16, 129)
- ✅ src/__tests__/deepsource-internal-utils.test.ts (lines 505, 506, 507)
- ✅ src/__tests__/deepsource-historical-data-processing.test.ts (lines 15, 20, 26, 27, 28, 29, 40, 108, 115, 130, 249, 390)
- Other test files to be checked

The `any` type can leak into your codebase. TypeScript compiler skips type checking of `any` typed variables, creating a potential safety hole and source of bugs.

**Todo:**
- [x] Replace all `any` types with more specific types in 4 identified test files
- [x] Use `unknown` when the type is truly unknown
- [x] Use `Record<string, unknown>` for objects with unknown structure
- [x] Create proper type interfaces for test data
- [x] Consider using generic types where appropriate
- [ ] Check and update remaining files

### 3. JS-0321: Empty functions (9 issues)
**Severity:** MINOR  
**Category:** ANTI_PATTERN  
**Affected Files:**
- src/__tests__/deepsource-metrics-history.test.ts (lines 621, 654)
- src/__tests__/deepsource-metric-validation.test.ts (lines 70, 138, 191)
- src/__tests__/deepsource-compliance-reports.test.ts (lines 181, 201)

Having empty functions hurts readability and is considered a code smell. There's almost always a way to avoid using them.

**Todo:**
- [ ] Add implementation to empty functions or add comments explaining their purpose
- [ ] Consider refactoring tests to avoid empty functions
- [ ] For mock functions, use jest.fn() with appropriate implementation instead of empty functions

### 4. JS-0105: Class methods should utilize `this` (2 issues)
**Severity:** MINOR  
**Category:** ANTI_PATTERN  
**Affected Files:**
- src/__tests__/deepsource-quality-metrics.test.ts (line 391)
- src/__tests__/deepsource-nonetype-error.test.ts (line 21)

If a class method does not use `this`, it can be made into a static function.

**Todo:**
- [ ] Convert methods that don't use `this` to static methods
- [ ] Update any instance references to static calls (MyClass.staticMethod())

### 5. JS-0356: Unused variables in TypeScript code (2 issues)
**Severity:** MAJOR  
**Category:** PERFORMANCE  
**Affected Files:**
- src/__tests__/deepsource-quality-metrics.test.ts (line 2)
- src/__tests__/deepsource-nonetype-error.test.ts (line 5)

Unused variables are generally considered a code smell and should be avoided.

**Todo:**
- [ ] Remove unused imports or variables
- [ ] If needed for type definitions, prefix with underscore to indicate intentional non-use

---

## Test Coverage Issues (Resolved)

The previous test coverage issues (TCV-001) have been successfully addressed. All 49 previously uncovered lines now have adequate test coverage.

### Progress Summary
- Issues fixed: 49/49 (100%)
- Methods covered:
  - ✅ isAxiosErrorWithCriteria (line 657)
  - ✅ handleNetworkError (lines 706, 714)
  - ✅ handleHttpStatusError (lines 732, 740)
  - ✅ handleGraphQLError (lines 811, 815, 819, 829)
  - ✅ normalizePaginationParams (line 918)
  - ✅ validateNumber (line 1810)
  - ✅ processVulnerabilityEdge (lines 1966, 1974, 1983)
  - ✅ iterateVulnerabilities (lines 2010, 2020, 2023, 2033)
  - ✅ processVulnerabilityResponse (lines 2067, 2091, 2097, 2103, 2111, 2138)
  - ✅ validateProjectKey (line 2250)
  - ✅ getDependencyVulnerabilities error fallback (line 2366)
  - ✅ getQualityMetrics error handling (line 2416)
  - ✅ getQualityMetrics NoneType error handler (line 2452)
  - ✅ setMetricThreshold error handling (line 2488)
  - ✅ updateMetricSetting error handling (line 2530)
  - ✅ getComplianceReport error handling (line 2655)
  - ✅ fetchHistoricalValues (line 2687)
  - ✅ createMetricHistoryResponse (line 2690)
  - ✅ getMetricHistory error handling (line 2715)
  - ✅ handleTestEnvironment non-test mode (line 2732)
  - ✅ validateAndGetMetricInfo (lines 2931, 2934, 2939, 2942, 2946, 2952, 2959)
  - ✅ fetchHistoricalValues GraphQL query and API call (lines 2986, 3018, 3029, 3035)
  - ✅ createMetricHistoryResponse trend calculation (line 3123)
  - ✅ createMetricHistoryResponse return object (line 3129)
  - ✅ extractReportData fieldName handling (line 3277)

---

## Action Plan for Current Issues

### 1. Fix Critical Issues First
- [ ] Replace all `any` types with proper types in test files
- [ ] Create interfaces for common test data structures

### 2. Address Major Issues
- [ ] Fix function declarations in nested blocks
- [ ] Remove unused variables/imports

### 3. Address Minor Issues
- [ ] Convert instance methods to static when appropriate
- [ ] Add implementations or explanatory comments to empty functions

### 4. Verification
- [ ] Run DeepSource analysis again to confirm issues are resolved
- [ ] Ensure no new issues are introduced

---

## Progress Tracking

- [ ] Fix Critical Issues (8/24 completed)
- [x] Fix Major Issues (1/3 completed)
- [ ] Fix Minor Issues (0/9 completed)
- [ ] Verify all issues resolved