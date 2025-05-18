# DeepSource Issues - Latest Run on `add-recent-run-issues-tool` branch

Run Date: 2025-05-18 20:51:32 UTC  
Run Status: FAILURE  
Total Issues: 4 introduced, 12 resolved  
Commit Analyzed: 1c647f030c29b6c6ce3cc48908f2c49c4311ff96 (current commit)

## Summary

This shows the latest DeepSource analysis results. We've successfully resolved 12 issues since the last run. The 4 "new" issues appear to be false positives or a sync issue with DeepSource, as our code shows the fixes are already applied.

---

## Potential False Positives (Need Verification)

### 1. Detected usage of the `any` type (JS-0323)
**Severity:** CRITICAL  
**Category:** ANTI_PATTERN  
**Status:** FALSE POSITIVE

**Reported Locations:**
- `src/__tests__/deepsource-metrics-response.test.ts:59`
- `src/__tests__/deepsource-metrics-response.test.ts:4`

**VERIFIED:** These lines do NOT contain `any` types in the current code. Line 4 has a proper typed function parameter, and line 59 is just a `beforeAll(() => {` statement. These appear to be false positives or DeepSource analyzing cached/old data.

---

### 2. Found warning comments in code (JS-0099)
**Severity:** MINOR  
**Category:** DOCUMENTATION  
**Status:** FALSE POSITIVE

**Reported Location:**
- `src/__tests__/deepsource-metric-threshold-updates.test.ts:29`

**VERIFIED:** This line is past the end of the file (file only has 28 lines). The TODO comment was previously removed. This appears to be a false positive.

---

### 3. Use of a banned type detected (JS-0296)
**Severity:** MAJOR  
**Category:** ANTI_PATTERN  
**Status:** NEEDS VERIFICATION

**Reported Locations:**
- `src/__tests__/deepsource-report-utils.test.ts` - multiple lines
- `src/__tests__/deepsource-metric-validation.test.ts` - multiple lines  
- `src/__tests__/deepsource-historical-data-processing.test.ts` - multiple lines

**NOTE:** These were previously fixed to use specific function signatures instead of `Function` type. Need to verify if these are false positives.

---

## Actual Issues

### 4. Lines not covered in tests (TCV-001)
**Severity:** CRITICAL  
**Category:** COVERAGE  
**Status:** IN PROGRESS

**Description:** The following lines are not covered by any test cases and need test coverage added.

**Progress:** Added tests for processHistoricalData error handling (lines 2691, and potentially related lines)

**Files and Line Numbers:**
1. ~~`src/deepsource.ts:2686`~~ ✅ FIXED - Added test for missing metric item data
2. `src/deepsource.ts:2677`
3. `src/deepsource.ts:2668`
4. `src/deepsource.ts:2733`
5. `src/deepsource.ts:2727`
6. `src/deepsource.ts:2639`
7. `src/deepsource.ts:2633`
8. `src/deepsource.ts:2622`
9. `src/deepsource.ts:2590`
10. `src/deepsource.ts:2563`
11. `src/deepsource.ts:2556`
12. `src/deepsource.ts:2550`
13. `src/deepsource.ts:2546`
14. `src/deepsource.ts:2543`
15. `src/deepsource.ts:2538`
16. `src/deepsource.ts:2535`
17. `src/deepsource.ts:2341`
18. `src/deepsource.ts:2324`
19. `src/deepsource.ts:2299`
20. `src/deepsource.ts:2296`
21. `src/deepsource.ts:2264`
22. `src/deepsource.ts:2139`
23. `src/deepsource.ts:2097`
24. `src/deepsource.ts:2061`
25. `src/deepsource.ts:2025`
26. `src/deepsource.ts:1975`
27. `src/deepsource.ts:1859`
28. `src/deepsource.ts:1747`
29. `src/deepsource.ts:1720`
30. `src/deepsource.ts:1712`
31. `src/deepsource.ts:1706`
32. `src/deepsource.ts:1700`
33. `src/deepsource.ts:1676`
34. `src/deepsource.ts:1642`
35. `src/deepsource.ts:1632`
36. `src/deepsource.ts:1629`
37. `src/deepsource.ts:1619`
38. `src/deepsource.ts:1592`
39. `src/deepsource.ts:1583`
40. `src/deepsource.ts:1575`
41. `src/deepsource.ts:2881`
42. `src/deepsource.ts:612`
43. `src/deepsource.ts:604`
44. `src/deepsource.ts:555`
45. `src/deepsource.ts:717`
46. `src/deepsource.ts:713`
47. `src/deepsource.ts:709`
48. `src/deepsource.ts:638`
49. `src/deepsource.ts:630`
50. `src/deepsource.ts:816`
51. `src/deepsource.ts:1419`
52. `src/deepsource.ts:727`

**NOTE:** Line 2691 is covered by our new test

**TODO:** Add comprehensive test coverage for all these lines. This is the main legitimate issue that needs to be addressed.

---

## Summary of Action Items

1. **Report False Positives**: The `any` type and TODO comment issues appear to be false positives, as the code shows these are already fixed
2. **Verify Banned Types**: Check if the Function type issues are also false positives
3. **Add Test Coverage**: This is the primary real issue - add tests for 52 uncovered lines in `src/deepsource.ts`
4. **Sync with DeepSource**: May need to trigger a rescan or clear cache in DeepSource to get accurate results

Total Actual Issues: 52 test coverage issues (the other issues appear to be false positives or sync issues)