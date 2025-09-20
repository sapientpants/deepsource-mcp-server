---
'deepsource-mcp-server': minor
---

Add automatic retry with exponential backoff and circuit breaker

Implements intelligent retry logic with the following features:

- Exponential backoff with jitter to prevent thundering herd
- Circuit breaker pattern per endpoint to prevent cascade failures
- Retry budget management to limit resource consumption
- Respect for Retry-After headers from the API
- Automatic handling of transient failures (network, 502, 503, 504)
- Rate-limited requests (429) are automatically retried with appropriate delays

Configuration via environment variables:

- `RETRY_MAX_ATTEMPTS`: Maximum retry attempts (default: 3)
- `RETRY_BASE_DELAY_MS`: Base delay for exponential backoff (default: 1000ms)
- `RETRY_MAX_DELAY_MS`: Maximum delay between retries (default: 30000ms)
- `RETRY_BUDGET_PER_MINUTE`: Max retries per minute (default: 10)
- `CIRCUIT_BREAKER_THRESHOLD`: Failures before opening circuit (default: 5)
- `CIRCUIT_BREAKER_TIMEOUT_MS`: Recovery timeout (default: 30000ms)

Safety features:

- Only retries idempotent operations (queries/GET requests)
- Never retries mutations (update operations)
- Transparent to MCP clients - no user-visible errors during transient failures
