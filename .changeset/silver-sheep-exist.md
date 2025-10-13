---
---

Updated dependencies to their latest compatible versions while keeping zod at v3:

**Production Dependencies:**

- @modelcontextprotocol/sdk: 1.18.1 → 1.20.0

**Development Dependencies:**

- @commitlint/cli: 19.8.1 → 20.1.0
- @commitlint/config-conventional: 19.8.1 → 20.0.0
- @cyclonedx/cdxgen: 11.8.0 → 11.9.0
- @types/node: 24.5.2 → 24.7.2
- @typescript-eslint/eslint-plugin: 8.44.1 → 8.46.0
- @typescript-eslint/parser: 8.44.1 → 8.46.0
- eslint: 9.36.0 → 9.37.0
- eslint-plugin-jsonc: 2.20.1 → 2.21.0
- lint-staged: 16.2.0 → 16.2.4
- typescript: 5.9.2 → 5.9.3
- vite: 7.1.7 → 7.1.9

**Kept at v3:**

- zod: 3.25.76 (v4 available but not upgraded per project requirements)

All tests passing with 80%+ coverage maintained.
