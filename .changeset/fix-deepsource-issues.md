---
'deepsource-mcp-server': patch
---

Fix DeepSource code quality issues

Resolved 4 JavaScript/TypeScript issues identified by DeepSource:

- **JS-0327**: Converted PaginationManager from class with only static methods to regular functions
- **JS-0092**: Fixed potential infinite loop condition by ensuring loop variables are properly updated
- **JS-W1041**: Simplified complex boolean return to direct return statement
- **JS-0339**: Removed non-null assertion operator by adding proper type guard

These changes improve code quality, maintainability, and prevent potential runtime errors.
