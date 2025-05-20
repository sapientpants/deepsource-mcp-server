# DeepSource Issues Todo List

## Code Coverage - TCV-001 (Lines not covered in tests)

DeepSource has identified multiple lines in the codebase that are not covered by tests. Each line is flagged as CRITICAL severity.

### What is TCV-001?
A source line is considered covered when at least one instruction assigned to this line has been executed by a test case. These lines were not executed during any of the test cases.

### Coverage Report Summary
Based on the latest coverage report:

| File | % Stmts | % Branch | % Funcs | % Lines | Priority Areas |
|------|---------|----------|---------|---------|----------------|
| Overall | 75.51 | 64.42 | 75.56 | 75.64 | - |
| src/index.new.ts | 0 | 100 | 0 | 0 | Highest priority - completely untested |
| src/utils/graphql/queries.ts | 1.78 | 0 | 0 | 1.92 | Highest priority - almost no coverage |
| src/utils/graphql/processor.ts | 0 | 0 | 0 | 0 | Highest priority - no coverage |
| src/client/base-client.ts | 20.83 | 25 | 33.33 | 20.83 | High priority |
| src/utils/logging/logger.ts | 29.62 | 30.76 | 66.66 | 29.62 | High priority |
| src/utils/pagination/helpers.ts | 0 | 0 | 0 | 0 | High priority |
| src/utils/errors/factory.ts | 35.71 | 0 | 10 | 35.71 | High priority |
| src/models/* | 0 | 0 | 0 | 0 | High priority |
| src/handlers/* | 0 | 0 | 0 | 0 | High priority |

### High Priority Coverage Gaps

#### 1. GraphQL Module (src/utils/graphql/) - ✅ COMPLETED
- ~~**processor.ts**: Lines 57-107 (0% coverage)~~ → **Now 100% coverage**
- ~~**queries.ts**: Lines 14-45, 92-537 (1.92% coverage)~~ → **Now 96.15% coverage**
- Added comprehensive tests for query generation and response processing

#### 2. Pagination Module (src/utils/pagination/)
- **helpers.ts**: Lines 10-145 (0% coverage)
- Pagination is a core functionality for API responses

#### 3. Client Base Module (src/client/)
- **base-client.ts**: Lines 60, 86-124 (20.83% coverage)
- This file likely contains core client functionality

#### 4. Logging Module (src/utils/logging/)
- **logger.ts**: Lines 59-89, 116-118, 143-148, 159-180, 194-212 (29.62% coverage)
- Proper logging is essential for debugging and monitoring

#### 5. Error Factory (src/utils/errors/)
- **factory.ts**: Lines 51-219 (35.71% coverage)
- Error handling is critical for the application's stability

### Medium Priority Coverage Gaps

#### 1. Main Application File (src/deepsource.ts)
- Lines 2111-2112, 2121-2124, 2134-2135, 2200, 2505, 2591, 3203, 3212, 3221
- This file has high coverage (97.9%) but still has a few gaps

#### 2. Index File (src/index.ts)
- Lines 469-470, 569-758, 1087-1089, 1097-1124
- Has good coverage but complex areas may need more testing

### Uncovered Files
The following files have 0% test coverage:
- src/index.new.ts
- src/examples/discriminated-unions-usage.ts
- src/handlers/projects.ts
- src/models/metrics.ts
- src/models/security.ts
- src/utils/errors/types.ts (one line)
- src/utils/graphql/processor.ts
- src/utils/pagination/helpers.ts

## Todo Tasks

1. **Add tests for GraphQL module**
   - [ ] Create tests for GraphQL query processor (processor.ts)
   - [ ] Test the different types of GraphQL queries in queries.ts
   - [ ] Mock GraphQL responses for comprehensive testing

2. **Test pagination functionality**
   - [ ] Add tests for pagination helpers
   - [ ] Test cursor-based pagination edge cases
   - [ ] Verify forward and backward pagination functionality

3. **Improve base client coverage**
   - [ ] Add tests for client initialization and configuration
   - [ ] Test client error handling scenarios
   - [ ] Mock HTTP responses for comprehensive testing

4. **Test logging functionality**
   - [ ] Add tests for different log levels
   - [ ] Test log formatting and output
   - [ ] Verify error logging paths

5. **Add tests for error factory**
   - [ ] Test creation of various error types
   - [ ] Verify error handling and propagation
   - [ ] Test error message formatting

6. **Test models**
   - [ ] Add tests for metrics models
   - [ ] Test security models
   - [ ] Verify model serialization/deserialization

7. **Test handlers**
   - [ ] Add tests for project handlers
   - [ ] Test request/response cycle
   - [ ] Verify error handling in handlers

8. **Address specific gaps in well-tested files**
   - [ ] Create tests for the specific uncovered lines in deepsource.ts
   - [ ] Add tests for complex conditional branches in index.ts

## Priority Test Plan

1. **Highest Priority (Target: 1 week)**
   - Add tests for GraphQL module (processor.ts, queries.ts)
   - Test pagination functionality (helpers.ts)
   - Test base client functionality (base-client.ts)

2. **High Priority (Target: 2 weeks)**
   - Test models and handlers
   - Improve error factory test coverage
   - Add tests for logging functionality

3. **Medium Priority (Target: 3 weeks)**
   - Address remaining gaps in well-tested files
   - Improve branch coverage across the codebase
   - Ensure all public APIs have comprehensive tests

## Implementation Strategy

1. **For each untested file:**
   - Review the file's purpose and functionality
   - Identify the key components and code paths
   - Create test fixtures and mocks as needed
   - Write tests that cover the main functionality
   - Add edge case tests for error conditions
   - Verify coverage with `pnpm run test:coverage`

2. **For files with partial coverage:**
   - Run coverage with `--covereage-reporter=html` for visual coverage gaps
   - Focus on untested branches and functions
   - Add targeted tests for specific uncovered lines

3. **Overall approach:**
   - Start with unit tests for individual functions
   - Add integration tests for components working together
   - Create end-to-end tests for complete workflows
   - Use mocks and fixtures to isolate tests
   - Ensure tests are maintainable and focused