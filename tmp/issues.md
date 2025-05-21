# DeepSource Issues

## JavaScript Anti-Pattern Issues

1. **Useless template literal found (JS-R1004)** - src/__tests__/utils/graphql/queries.test.ts:430 - MINOR
   - **Description**: Template literals are useful for interpolated strings, strings with unescaped quotes, or strings with line breaks. If none of these conditions is met, a regular string literal should be used.
   - **Status**: Fixed in commit 7886446 - Replaced template literal with regular string

## Code Coverage Issues (TCV-001)

1. **Lines not covered in tests** - src/utils/errors/handlers.ts:245 - CRITICAL
   - **Description**: Line not executed during any test cases
   - **Status**: Fixed in commit 650821b - Added test for HTTP status codes outside handled ranges

2. **Lines not covered in tests** - src/index.ts:33 - CRITICAL
   - **Description**: Line not executed during any test cases
   - **Status**: Still showing as uncovered in coverage report after fix in commit 6c7a4ea. This will be resolved as part of another issue since improving the index.ts coverage would require restructuring of the code.

3. **Lines not covered in tests** - src/deepsource.ts:2200 - CRITICAL
   - **Description**: Line not executed during any test cases
   - **Status**: Still showing as uncovered in coverage report - line 2200 is an edge case in deeply nested code that will require refactoring to test properly. Will address in a separate issue.

4. **Lines not covered in tests** - src/deepsource.ts:3203 - CRITICAL
   - **Description**: Line not executed during any test cases
   - **Status**: Fixed in commit 4f7899c - Added tests for processHistoricalData error cases

5. **Lines not covered in tests** - src/deepsource.ts:3212 - CRITICAL
   - **Description**: Line not executed during any test cases
   - **Status**: Fixed in commit 4f7899c - Added tests for processHistoricalData error cases

6. **Lines not covered in tests** - src/deepsource.ts:3221 - CRITICAL
   - **Description**: Line not executed during any test cases
   - **Status**: Fixed in commit 4f7899c - Added tests for processHistoricalData error cases

7. **Lines not covered in tests** - src/examples/discriminated-unions-usage.ts:104-327 - CRITICAL
   - **Description**: Various lines not executed during any test cases in discriminated-unions-usage.ts
   - **Status**: Fixed - Added comprehensive tests for all functions in discriminated-unions-usage.ts, achieving 100% line coverage