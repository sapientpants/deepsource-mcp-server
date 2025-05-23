# DeepSource MCP Server

[![CI](https://github.com/sapientpants/deepsource-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/sapientpants/deepsource-mcp-server/actions/workflows/ci.yml)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server.svg/?label=code+coverage&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server/)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server.svg/?label=active+issues&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server/)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server.svg/?label=resolved+issues&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server/)
[![npm version](https://img.shields.io/npm/v/deepsource-mcp-server.svg)](https://www.npmjs.com/package/deepsource-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/deepsource-mcp-server.svg)](https://www.npmjs.com/package/deepsource-mcp-server)
[![License](https://img.shields.io/npm/l/deepsource-mcp-server.svg)](https://github.com/sapientpants/deepsource-mcp-server/blob/main/LICENSE)

A Model Context Protocol (MCP) server that integrates with DeepSource to provide AI assistants with access to code quality metrics, issues, and analysis results.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [License](#license)
- [External Resources](#external-resources)

## Overview

The DeepSource MCP Server enables AI assistants like Claude to interact with DeepSource's code quality analysis capabilities through the Model Context Protocol. This integration allows AI assistants to:

* Retrieve code metrics and analysis results
* Access and filter issues by analyzer, path, or tags
* Check quality status and set thresholds
* Analyze project quality over time
* Access security compliance reports (OWASP, SANS, MISRA-C)
* Monitor dependency vulnerabilities
* Manage quality gates and thresholds

## Quick Start

### 1. Get Your DeepSource API Key

1. Log in to your [DeepSource account](https://app.deepsource.com)
2. Navigate to **Settings** → **API Access**
3. Click **Generate New Token**
4. Copy your API key and keep it secure

### 2. Install in Claude Desktop

1. Open Claude Desktop
2. Go to **Settings** → **Developer** → **Edit Config**
3. Add this configuration to the `mcpServers` section:

```json
{
  "mcpServers": {
    "deepsource": {
      "command": "npx",
      "args": ["-y", "deepsource-mcp-server@latest"],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key"
      }
    }
  }
}
```

4. Restart Claude Desktop

### 3. Test Your Connection

Ask Claude: "What DeepSource projects do I have access to?"

If configured correctly, Claude will list your available projects.

## Installation

### NPX (Recommended)

The simplest way to use the DeepSource MCP Server:

```json
{
  "mcpServers": {
    "deepsource": {
      "command": "npx",
      "args": ["-y", "deepsource-mcp-server@latest"],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key",
        "LOG_FILE": "/tmp/deepsource-mcp.log",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### Docker

For containerized environments:

```json
{
  "mcpServers": {
    "deepsource": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "DEEPSOURCE_API_KEY",
        "-e", "LOG_FILE=/tmp/deepsource-mcp.log",
        "-v", "/tmp:/tmp",
        "sapientpants/deepsource-mcp-server"
      ],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key"
      }
    }
  }
}
```

### Local Development

For development or customization:

```json
{
  "mcpServers": {
    "deepsource": {
      "command": "node",
      "args": ["/path/to/deepsource-mcp-server/dist/index.js"],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key",
        "LOG_FILE": "/tmp/deepsource-mcp.log",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPSOURCE_API_KEY` | Yes | - | Your DeepSource API key for authentication |
| `LOG_FILE` | No | - | Path to log file. If not set, no logs are written |
| `LOG_LEVEL` | No | `DEBUG` | Minimum log level: `DEBUG`, `INFO`, `WARN`, `ERROR` |

### Performance Considerations

- **Pagination**: Use appropriate page sizes (10-50 items) to balance response time and data completeness
- **Rate Limits**: DeepSource API has rate limits. The server implements automatic retry with exponential backoff
- **Caching**: Results are not cached. Consider implementing caching for frequently accessed data

## Available Tools

### 1. projects

List all available DeepSource projects.

**Parameters**: None

**Example Response**:
```json
[
  {
    "key": "https://api-key@app.deepsource.com",
    "name": "my-python-project"
  }
]
```

### 2. project_issues

Get issues from a DeepSource project with filtering and pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | The unique identifier for the DeepSource project |
| `first` | number | No | Number of items to return (forward pagination) |
| `after` | string | No | Cursor for forward pagination |
| `last` | number | No | Number of items to return (backward pagination) |
| `before` | string | No | Cursor for backward pagination |
| `path` | string | No | Filter issues by file path |
| `analyzerIn` | string[] | No | Filter by analyzers (e.g., ["python", "javascript"]) |
| `tags` | string[] | No | Filter by issue tags |

**Example Response**:
```json
{
  "issues": [{
    "id": "T2NjdXJyZW5jZTpnZHlqdnlxZ2E=",
    "title": "Avoid using hardcoded credentials",
    "shortcode": "PY-D100",
    "category": "SECURITY",
    "severity": "CRITICAL",
    "file_path": "src/config.py",
    "line_number": 42
  }],
  "totalCount": 15,
  "pageInfo": {
    "hasNextPage": true,
    "endCursor": "YXJyYXljb25uZWN0aW9uOjQ="
  }
}
```

### 3. runs

List analysis runs for a project with filtering.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | The unique identifier for the DeepSource project |
| `first` | number | No | Number of items to return (forward pagination) |
| `after` | string | No | Cursor for forward pagination |
| `last` | number | No | Number of items to return (backward pagination) |
| `before` | string | No | Cursor for backward pagination |
| `analyzerIn` | string[] | No | Filter by analyzers |

### 4. run

Get details of a specific analysis run.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | The unique identifier for the DeepSource project |
| `runIdentifier` | string | Yes | The runUid (UUID) or commitOid (commit hash) |
| `isCommitOid` | boolean | No | Whether runIdentifier is a commit hash (default: false) |

### 5. recent_run_issues

Get issues from the most recent analysis run on a branch.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | The unique identifier for the DeepSource project |
| `branchName` | string | Yes | The branch name |
| `first` | number | No | Number of items to return |
| `after` | string | No | Cursor for forward pagination |

### 6. dependency_vulnerabilities

Get security vulnerabilities in project dependencies.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | The unique identifier for the DeepSource project |
| `first` | number | No | Number of items to return |
| `after` | string | No | Cursor for forward pagination |

**Example Response**:
```json
{
  "vulnerabilities": [{
    "id": "VUL-001",
    "package": "requests",
    "version": "2.25.0",
    "severity": "HIGH",
    "cve": "CVE-2021-12345",
    "description": "Remote code execution vulnerability"
  }],
  "totalCount": 3
}
```

### 7. quality_metrics

Get code quality metrics with optional filtering.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | The unique identifier for the DeepSource project |
| `shortcodeIn` | string[] | No | Filter by metric codes (see below) |

**Available Metrics**:
- `LCV` - Line Coverage
- `BCV` - Branch Coverage
- `DCV` - Documentation Coverage
- `DDP` - Duplicate Code Percentage
- `SCV` - Statement Coverage
- `TCV` - Total Coverage
- `CMP` - Code Maturity

### 8. update_metric_threshold

Update the threshold for a quality metric.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | The unique identifier for the DeepSource project |
| `repositoryId` | string | Yes | The GraphQL repository ID |
| `metricShortcode` | string | Yes | The metric shortcode (e.g., "LCV") |
| `metricKey` | string | Yes | The language or context key |
| `thresholdValue` | number\|null | No | New threshold value, or null to remove |

### 9. update_metric_setting

Update metric reporting and enforcement settings.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | The unique identifier for the DeepSource project |
| `repositoryId` | string | Yes | The GraphQL repository ID |
| `metricShortcode` | string | Yes | The metric shortcode |
| `isReported` | boolean | Yes | Whether to report this metric |
| `isThresholdEnforced` | boolean | Yes | Whether to enforce thresholds |

### 10. compliance_report

Get security compliance reports.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | The unique identifier for the DeepSource project |
| `reportType` | string | Yes | Type of report (see below) |

**Available Report Types**:
- `OWASP_TOP_10` - Web application security vulnerabilities
- `SANS_TOP_25` - Most dangerous software errors
- `MISRA_C` - Guidelines for safety-critical C code
- `CODE_COVERAGE` - Code coverage report
- `CODE_HEALTH_TREND` - Quality trends over time
- `ISSUE_DISTRIBUTION` - Issue categorization
- `ISSUES_PREVENTED` - Prevented issues count
- `ISSUES_AUTOFIXED` - Auto-fixed issues count

## Usage Examples

### Monitor Code Quality Trends

Track your project's quality metrics over time:

```
"Show me the code coverage trend for my main branch"
```

This combines multiple tools to:
1. Get recent runs for the main branch
2. Retrieve coverage metrics for each run
3. Display the trend

### Set Up Quality Gates

Implement quality gates for CI/CD:

```
"Set up quality gates: 80% line coverage, 0 critical security issues"
```

This will:
1. Update the line coverage threshold to 80%
2. Configure enforcement for the threshold
3. Check current critical security issues

### Investigate Security Vulnerabilities

Comprehensive security analysis:

```
"Analyze all security vulnerabilities in my project including dependencies"
```

This performs:
1. Dependency vulnerability scan
2. Code security issue analysis
3. OWASP Top 10 compliance check
4. Prioritized remediation suggestions

### Code Review Assistance

Get AI-powered code review insights:

```
"What are the most critical issues in the recent commits to feature/new-api?"
```

This will:
1. Find the most recent run on the branch
2. Filter for critical and high severity issues
3. Group by file and issue type
4. Suggest fixes

### Team Productivity Metrics

Track team code quality metrics:

```
"Show me code quality metrics across all our Python projects"
```

This aggregates:
1. Coverage metrics per project
2. Issue counts by severity
3. Trends over the last month
4. Team performance insights

## Architecture

The DeepSource MCP Server uses modern TypeScript patterns for maintainability and type safety.

### Key Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude/AI      │────▶│   MCP Server     │────▶│  DeepSource API │
│  Assistant      │◀────│  (TypeScript)    │◀────│   (GraphQL)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

1. **MCP Server Integration** (`src/index.ts`)
   - Registers and implements tool handlers
   - Manages MCP protocol communication
   - Handles errors and logging

2. **DeepSource Client** (`src/deepsource.ts`)
   - GraphQL API communication
   - Authentication and retry logic
   - Response parsing and validation

3. **Type System** (`src/types/`)
   - Branded types for type safety
   - Discriminated unions for state management
   - Zod schemas for runtime validation

### Type Safety Features

#### Branded Types
```typescript
// Prevent mixing different ID types
type ProjectKey = string & { readonly __brand: 'ProjectKey' };
type RunId = string & { readonly __brand: 'RunId' };
```

#### Discriminated Unions
```typescript
type RunState =
  | { status: 'PENDING'; queuePosition?: number }
  | { status: 'SUCCESS'; finishedAt: string }
  | { status: 'FAILURE'; error?: { message: string } };
```

## Development

### Prerequisites

* Node.js 20 or higher
* pnpm 10.7.0 or higher
* Docker (optional, for container builds)

### Setup

```bash
# Clone the repository
git clone https://github.com/sapientpants/deepsource-mcp-server.git
cd deepsource-mcp-server

# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run tests
pnpm test
```

### Development Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm run build` | Build TypeScript code |
| `pnpm run dev` | Start with auto-reload |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Generate coverage report |
| `pnpm run lint` | Run ESLint |
| `pnpm run format` | Format with Prettier |
| `pnpm run check-types` | TypeScript type checking |
| `pnpm run ci` | Run full CI pipeline |

## Troubleshooting & FAQ

### Common Issues

#### Authentication Error
```
Error: Invalid API key or unauthorized access
```
**Solution**: Verify your `DEEPSOURCE_API_KEY` is correct and has necessary permissions.

#### No Projects Found
```
Error: No projects found
```
**Solution**: Ensure your API key has access to at least one project in DeepSource.

#### Rate Limit Exceeded
```
Error: API rate limit exceeded
```
**Solution**: The server implements automatic retry. Wait a moment or reduce request frequency.

#### Pagination Cursor Invalid
```
Error: Invalid cursor for pagination
```
**Solution**: Cursors expire. Start a new pagination sequence from the beginning.

### FAQ

**Q: Which DeepSource plan do I need?**
A: The MCP server works with all DeepSource plans. Some features like security compliance reports may require specific plan features.

**Q: Can I use this with self-hosted DeepSource?**
A: Yes, configure the API endpoint in your environment variables (feature coming in v1.3.0).

**Q: How do I debug issues?**
A: Enable debug logging by setting `LOG_LEVEL=DEBUG` and check the log file specified in `LOG_FILE`.

**Q: Is my API key secure?**
A: The API key is only stored in your local Claude Desktop configuration and is never transmitted except to DeepSource's API.

**Q: Can I contribute custom tools?**
A: Yes! See the [Contributing](#contributing) section for guidelines.

## Changelog

### [1.2.0] - 2024-01-XX

#### Added
- Table of contents for better navigation
- Quick Start guide with API key instructions
- Comprehensive tool parameter tables
- Real-world usage scenarios
- Example responses for all tools
- FAQ section
- Performance considerations
- External resources section

#### Changed
- Reorganized documentation structure for better flow
- Improved tool documentation with parameter tables
- Enhanced troubleshooting with specific error cases
- Updated all code examples for clarity

#### Fixed
- Documentation inconsistencies
- Missing parameter descriptions
- Unclear error messages

### [1.1.0] - 2024-01-XX

#### Added
- Support for security compliance reports
- Dependency vulnerability scanning
- Metric threshold management
- Enhanced error handling

### [1.0.0] - 2024-01-XX

#### Added
- Initial release
- Basic DeepSource integration
- Core MCP tools implementation

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Maintain test coverage above 80%
- Use meaningful commit messages
- Update documentation for new features

## License

MIT - see [LICENSE](LICENSE) file for details.

## External Resources

- [Model Context Protocol Specification](https://github.com/anthropics/model-context-protocol)
- [DeepSource Documentation](https://docs.deepsource.com)
- [DeepSource API Reference](https://docs.deepsource.com/docs/api-reference)
- [MCP Servers Registry](https://github.com/anthropics/model-context-protocol/blob/main/servers.md)
- [Claude Desktop Documentation](https://claude.ai/docs/desktop)

---

Made with ❤️ by the DeepSource MCP Server community