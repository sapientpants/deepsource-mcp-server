---
'deepsource-mcp-server': patch
---

chore: remove unused dependencies and Jest configuration

- Removed unused production dependencies: cors, express, pino, pino-roll, pino-syslog
- Removed unused dev dependencies related to Jest (project uses Vitest): @eslint/js, @fast-check/vitest, @jest/globals, @types/cors, @types/express, @types/jest, @types/supertest, fast-check, jest, pino-pretty, supertest, ts-jest, ts-node, ts-node-dev
- Removed jest.config.js as the project uses Vitest for testing
