---
'deepsource-mcp-server': patch
---

Fix DeepSource code quality issues

- Remove unused import in exponential-backoff test file
- Replace non-null assertions with proper null checks and error handling in circuit-breaker and retry-budget modules
- Fix lexical declaration scoping in switch case statements by adding block scope braces
- Update test expectations to match corrected circuit breaker behavior
