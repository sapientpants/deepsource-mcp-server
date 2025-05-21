# DeepSource Issues to Fix

## Style Issues

1. [x] **Multiple imports from the same path in src/handlers/quality-metrics.ts (2 instances)**
   - Problem: The file has multiple import statements from '../types/metrics.js'
   - Fix: Consolidated these imports into a single import statement
   - Fixed in commit: efa37ca

## Coverage Issues (30 instances)

2. [x] **Lines not covered in tests in src/utils/graphql/queries.ts**
   - Added comprehensive tests for all query functions
   - Enhanced existing test cases
   - Fixed missing import in the test file
   - Fixed in commit: efa37ca

3. [ ] **Lines not covered in tests in src/utils/errors/handlers.ts**
   - Add tests for error handler edge cases

4. [x] **Lines not covered in tests in src/index.ts**
   - Added comprehensive tests for server initialization and tool registration
   - Created mocks for required dependencies
   - Fixed in commit: efa37ca

5. [ ] **Lines not covered in tests in src/examples/discriminated-unions-usage.ts**
   - Add tests for this example code or document why it's exempt

6. [ ] **Lines not covered in tests in src/deepsource.ts**
   - Add tests for DeepSource client methods

## Progress

- Total issues: 32
- Fixed: 3
- Remaining: 29
- Next files to work on: src/examples/discriminated-unions-usage.ts, src/utils/errors/handlers.ts