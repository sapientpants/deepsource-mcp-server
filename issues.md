# DeepSource Issues Todo List

## Branch: add-recent-run-issues-tool
**Run Date:** 2025-05-19T17:46:41.811701+00:00  
**Status:** RESOLVED  
**Total Issues:** 1 (resolved)

---

## Critical Issues

### JS-0323: Detected usage of the `any` type

**Severity:** CRITICAL  
**Category:** ANTI_PATTERN

#### Occurrences:
- [x] **File:** `src/__tests__/deepsource-find-most-recent-run.test.ts`
  - **Line:** 46
  - **Description:** The `any` type is used, which disables TypeScript's type checking and creates potential safety holes and bugs.
  - **Recommendation:** Replace the `any` type with more specific types like `unknown`, `never`, or properly typed interfaces.
  - **Fix Applied:** Replaced `Promise<any>` with `Promise<Record<string, unknown>>` in the type definition for `findMostRecentRun` method.

#### Issue Description:
The `any` type can sometimes leak into your codebase. TypeScript compiler skips the type checking of the `any` typed variables, so it creates a potential safety hole, and source of bugs in your codebase. We recommend using `unknown` or `never` type variable.

In TypeScript, every type is assignable to `any`. This makes `any` a top type (also known as a universal supertype) of the type system. The `any` type is essentially an escape hatch from the type system. As developers, this gives us a ton of freedom: TypeScript lets us perform any operation we want on values of type `any` without having to perform any checking beforehand.

#### Bad Practice Example:
```typescript
const age: any = 'seventeen';
const ages: any[] = ['seventeen'];
const ages: Array<any> = ['seventeen'];
function greet(): any {}
function greet(): any[] {}
function greet(): Array<any> {}
function greet(): Array<Array<any>> {}
function greet(param: Array<any>): string {}
function greet(param: Array<any>): Array<any> {}
```

#### Recommended Practice:
```typescript
const age: number = 17;
const ages: number[] = [17];
const ages: Array<number> = [17];
function greet(): string {}
function greet(): string[] {}
function greet(): Array<string> {}
function greet(): Array<Array<string>> {}
function greet(param: Array<string>): string {}
function greet(param: Array<string>): Array<string> {}
```

---

## Summary

- **Issues Introduced:** 1
- **Issues Resolved:** 16 (15 previously + 1 just fixed)
- **Issues Suppressed:** 0
- **All Critical Issues:** RESOLVED ✅

## Distribution by Analyzer
- JavaScript: 1 issue introduced
- Test Coverage: 0 issues introduced

## Distribution by Category
- ANTI_PATTERN: 1 issue introduced