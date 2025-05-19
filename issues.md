# DeepSource Issues - TODO List

Run ID: 7cd9965c-8dd0-4c7b-8f5d-b5f5769e2470
Branch: add-recent-run-issues-tool
Status: FAILURE
Created: 2025-05-19T17:16:41.528891+00:00
Total Issues: 18

## Critical Coverage Issues (TCV-001)

All issues are of type "Lines not covered in tests" - A source line is considered covered when at least one instruction that is assigned to this line has been executed by a test case. These lines were not executed during any of the test cases.

### src/utils/logger.ts
- [x] **Line 71**: Add test coverage for this line (Fixed: added test for mkdirSync error handling in initialization)
- [x] **Line 64**: Add test coverage for this line (Fixed: added test for mkdirSync successful call when directory doesn't exist)

### src/deepsource.ts
- [x] **Line 1539**: Add test coverage for this line (Fixed: added test for null node data in occurrences response)
- [ ] **Line 1350**: Add test coverage for this line
- [ ] **Line 1345**: Add test coverage for this line
- [ ] **Line 1341**: Add test coverage for this line
- [ ] **Line 1334**: Add test coverage for this line
- [ ] **Line 1331**: Add test coverage for this line
- [ ] **Line 1324**: Add test coverage for this line
- [ ] **Line 1322**: Add test coverage for this line
- [ ] **Line 1320**: Add test coverage for this line
- [ ] **Line 613**: Add test coverage for this line
- [ ] **Line 598**: Add test coverage for this line
- [ ] **Line 595**: Add test coverage for this line
- [ ] **Line 590**: Add test coverage for this line
- [ ] **Line 583**: Add test coverage for this line
- [ ] **Line 581**: Add test coverage for this line
- [ ] **Line 574**: Add test coverage for this line

## Summary
- **Total issues introduced**: 18
- **All issues are coverage-related** (TCV-001)
- **Severity**: CRITICAL
- **Action required**: Add test cases to cover all the lines mentioned above

## Resolution Strategy
1. Identify the untested code at each line number
2. Write appropriate unit tests to exercise those code paths
3. Ensure the tests are meaningful and not just for coverage
4. Run `pnpm run test:coverage` to verify coverage improvements