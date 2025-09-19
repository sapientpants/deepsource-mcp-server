---
'deepsource-mcp-server': minor
---

feat: add automatic retry mechanism with exponential backoff and circuit breaker

- Implements comprehensive retry infrastructure for resilient API calls
- Adds exponential backoff with configurable jitter to prevent thundering herd
- Introduces circuit breaker pattern with three states (CLOSED, OPEN, HALF_OPEN)
- Implements retry budget to prevent retry exhaustion
- Provides per-endpoint retry policies for optimized handling
- Supports Retry-After header parsing for intelligent delays
- Adds configuration via environment variables for all retry parameters
- Integrates retry mechanism transparently into existing clients
- Includes comprehensive test coverage for all retry components
