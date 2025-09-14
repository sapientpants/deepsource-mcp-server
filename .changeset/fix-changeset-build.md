---
'deepsource-mcp-server': patch
---

fix: add build step before changeset versioning in ci

- Build TypeScript before running changeset version command to ensure custom changelog generator is available
- Clean build directory before final release build to ensure SBOM reflects exact release artifacts
- Fixes CI pipeline failure when using custom changelog generator
