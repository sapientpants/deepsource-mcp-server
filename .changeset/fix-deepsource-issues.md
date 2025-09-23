---
'deepsource-mcp-server': patch
---

Fix all DeepSource code quality issues

- JS-0356: Remove unused import in exponential-backoff test file
- JS-0339: Replace non-null assertions with proper null checks and error handling in circuit-breaker and retry-budget modules
- JS-0054: Fix lexical declaration scoping in switch case statements by adding block scope braces
- JS-0105: Make isAxiosError method static in base-client.ts since it doesn't use 'this'
- JS-0047: Add default cases to switch statements in recordSuccess and recordFailure methods
- JS-0045: Add explicit return statement in extractRetryAfter arrow function for consistency
- Update test expectations to match corrected circuit breaker behavior
- Fix unhandled promise rejection in retry-executor test
