# DeepSource MCP Server

[![CI](https://github.com/sapientpants/deepsource-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/sapientpants/deepsource-mcp-server/actions/workflows/ci.yml)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server.svg/?label=code+coverage&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server/)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server.svg/?label=active+issues&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server/)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server.svg/?label=resolved+issues&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server/)
[![npm version](https://img.shields.io/npm/v/deepsource-mcp-server.svg)](https://www.npmjs.com/package/deepsource-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/deepsource-mcp-server.svg)](https://www.npmjs.com/package/deepsource-mcp-server)
[![License](https://img.shields.io/npm/l/deepsource-mcp-server.svg)](https://github.com/sapientpants/deepsource-mcp-server/blob/main/LICENSE)

A Model Context Protocol (MCP) server that integrates with DeepSource to provide AI assistants with access to code quality metrics, issues, and analysis results.

## Overview

The DeepSource MCP Server enables AI assistants like Claude to interact with DeepSource's code quality analysis capabilities through the Model Context Protocol. This integration allows AI assistants to:

* Retrieve code metrics and analysis results
* Access and filter issues
* Check quality status and set thresholds
* Analyze project quality over time
* Access security compliance reports
* Monitor dependency vulnerabilities

## Features

* **DeepSource API Integration**: Connects to DeepSource via GraphQL API
* **MCP Protocol Support**: Implements the Model Context Protocol for AI assistant integration
* **Quality Metrics & Thresholds**: Retrieve and manage code quality metrics with thresholds
* **Security Compliance Reports**: Access OWASP Top 10, SANS Top 25, and MISRA-C compliance reports
* **Dependency Vulnerabilities**: Access security vulnerability information about dependencies
* **TypeScript/Node.js**: Built with TypeScript for type safety and modern JavaScript features
* **Cross-Platform**: Works on Linux, macOS, and Windows
* **Robust Error Handling**: Comprehensive error handling for network, authentication, and parsing issues
* **Pagination Support**: Implements Relay-style cursor-based pagination for efficient data access

## Usage with Claude Desktop

1. Edit `claude_desktop_config.json`:
   - Open Claude Desktop
   - Go to `Settings` -> `Developer` -> `Edit Config`
   - Add one of the configurations below to the `mcpServers` section

2. Restart Claude Desktop to apply the changes

3. Once connected, you can query DeepSource data directly through Claude

### Example Queries

Once connected, your AI assistant can use DeepSource data with queries like:

```
What issues are in the JavaScript files of my project?
```

This would use the `project_issues` tool with filters:
```
{
  "projectKey": "your-project-key",
  "path": "src/",
  "analyzerIn": ["javascript"],
  "first": 10
}
```

To filter analysis runs:
```
Show me the most recent Python analysis runs
```

This would use the `project_runs` tool with filters:
```
{
  "projectKey": "your-project-key",
  "analyzerIn": ["python"],
  "first": 5
}
```

For code quality metrics:
```
What's my code coverage percentage? Is it meeting our thresholds?
```

This would use the `quality_metrics` tool:
```
{
  "projectKey": "your-project-key",
  "shortcodeIn": ["LCV", "BCV", "CCV"]
}
```

For security compliance reports:
```
Are we compliant with OWASP Top 10 security standards?
```

This would use the `compliance_report` tool:
```
{
  "projectKey": "your-project-key",
  "reportType": "OWASP_TOP_10"
}
```

For setting thresholds:
```
Update our line coverage threshold to 80%
```

This would use the `update_metric_threshold` tool:
```
{
  "projectKey": "your-project-key",
  "repositoryId": "repo-id",
  "metricShortcode": "LCV",
  "metricKey": "AGGREGATE",
  "thresholdValue": 80
}
```

### Environment Variables

The server supports the following environment variables:

* `DEEPSOURCE_API_KEY` (required): Your DeepSource API key for authentication
* `LOG_FILE` (optional): Path to a file where logs should be written. If not set, no logs will be written
* `LOG_LEVEL` (optional): Minimum log level to write (DEBUG, INFO, WARN, ERROR). Defaults to DEBUG

### Configuration Options

#### NPX (Recommended)

```json
{
  "mcpServers": {
    "deepsource": {
      "command": "npx",
      "args": [
        "-y",
        "deepsource-mcp-server@latest"
      ],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key",
        "LOG_FILE": "/tmp/deepsource-mcp.log",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

#### Docker

```json
{
  "mcpServers": {
    "deepsource": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "DEEPSOURCE_API_KEY",
        "-e",
        "LOG_FILE=/tmp/deepsource-mcp.log",
        "-v",
        "/tmp:/tmp",
        "sapientpants/deepsource-mcp-server"
      ],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key",
        "LOG_FILE": "/tmp/deepsource-mcp.log"
      }
    }
  }
}
```

#### Local Development

```json
{
  "mcpServers": {
    "deepsource": {
      "command": "node",
      "args": [
        "/path/to/deepsource-mcp-server/dist/index.js"
      ],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key",
        "LOG_FILE": "/tmp/deepsource-mcp.log",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

## Available Tools

The DeepSource MCP Server provides the following tools:

1. `projects`: List all available DeepSource projects
   * Parameters:
     * No required parameters

2. `project_issues`: Get issues from a DeepSource project with filtering
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * Pagination parameters:
       * `first` (optional) - Number of items to return after the "after" cursor (default: 10)
       * `after` (optional) - Cursor to fetch records after this position
       * `last` (optional) - Number of items to return before the "before" cursor (default: 10)
       * `before` (optional) - Cursor to fetch records before this position
     * Filtering parameters:
       * `path` (optional) - Filter issues by specific file path
       * `analyzerIn` (optional) - Filter issues by specific analyzers (e.g., ["python", "javascript"])
       * `tags` (optional) - Filter issues by tags

3. `project_runs`: List analysis runs for a DeepSource project with filtering
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * Pagination parameters (same as above)
     * Filtering parameters:
       * `analyzerIn` (optional) - Filter runs by specific analyzers (e.g., ["python", "javascript"])

4. `run`: Get a specific analysis run by its runUid or commitOid
   * Parameters:
     * `runIdentifier` (required) - The runUid (UUID) or commitOid (commit hash)

5. `recent_run_issues`: Get issues from the most recent analysis run on a specific branch
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * `branchName` (required) - The branch name to get the most recent run from
     * Pagination parameters (same as above)

6. `dependency_vulnerabilities`: Get dependency vulnerabilities from a DeepSource project
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * Pagination parameters (same as above)

7. `quality_metrics`: Get quality metrics from a DeepSource project with filtering
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * `shortcodeIn` (optional) - Filter metrics by specific shortcodes (e.g., ["LCV", "BCV"])
   * Available metrics:
     * Line Coverage (LCV)
     * Branch Coverage (BCV)
     * Documentation Coverage (DCV)
     * Duplicate Code Percentage (DDP)
     * Statement Coverage (SCV)
     * Total Coverage (TCV)
     * Code Maturity (CMP)

8. `update_metric_threshold`: Update the threshold for a specific quality metric
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * `repositoryId` (required) - The GraphQL repository ID
     * `metricShortcode` (required) - The shortcode of the metric to update
     * `metricKey` (required) - The language or context key for the metric
     * `thresholdValue` (optional) - The new threshold value, or null to remove the threshold

9. `update_metric_setting`: Update the settings for a quality metric
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * `repositoryId` (required) - The GraphQL repository ID
     * `metricShortcode` (required) - The shortcode of the metric to update
     * `isReported` (required) - Whether the metric should be reported
     * `isThresholdEnforced` (required) - Whether the threshold should be enforced

10. `compliance_report`: Get security compliance reports from a DeepSource project
    * Parameters:
      * `projectKey` (required) - The unique identifier for the DeepSource project
      * `reportType` (required) - The type of compliance report to fetch:
        * `OWASP_TOP_10` - Web application security vulnerabilities
        * `SANS_TOP_25` - Most dangerous software errors
        * `MISRA_C` - Guidelines for safety-critical software in C
        * Other report types: `CODE_COVERAGE`, `CODE_HEALTH_TREND`, `ISSUE_DISTRIBUTION`, `ISSUES_PREVENTED`, `ISSUES_AUTOFIXED`

## Architecture

The DeepSource MCP Server is built with modern TypeScript patterns to ensure maintainability, type safety, and robustness.

### Key Components

1. **MCP Server Integration** (`src/index.ts`):
   - Sets up the Model Context Protocol server
   - Registers and implements tool handlers
   - Processes commands and returns results in the MCP format

2. **DeepSource Client** (`src/deepsource.ts`):
   - Implements communication with DeepSource's GraphQL API
   - Handles authentication, error handling, and response parsing
   - Provides methods for retrieving and manipulating DeepSource data

### Type System Highlights

#### Branded Types

We use branded types to ensure type safety for string-based identifiers:

```typescript
// Definition of branded types
export type ProjectKey = string & { readonly __brand: 'ProjectKey' };
export type RunId = string & { readonly __brand: 'RunId' };

// Helper functions to safely convert strings to branded types
export function asProjectKey(value: string): ProjectKey {
  return value as ProjectKey;
}

// Type safety in action
function getProjectDetails(projectKey: ProjectKey) { /* ... */ }
```

#### Discriminated Unions

For complex state management, we use discriminated unions:

```typescript
// Define a union with a discriminant field
export type RunState =
  | { status: 'PENDING'; queuePosition?: number; /* pending-specific fields */ }
  | { status: 'SUCCESS'; finishedAt: string; /* success-specific fields */ }
  | { status: 'FAILURE'; error?: { message: string }; /* failure-specific fields */ };

// Usage with type narrowing
function processRun(run: RunState) {
  if (run.status === 'SUCCESS') {
    // TypeScript knows this is a successful run with finishedAt
    console.log(`Run completed at ${run.finishedAt}`);
  }
}
```

## Development

### Prerequisites

* Node.js 20 or higher
* pnpm 10.7.0 or higher
* Docker (for container builds)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/sapientpants/deepsource-mcp-server.git
cd deepsource-mcp-server
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the project:
```bash
pnpm run build
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Build the TypeScript code
pnpm run build

# Start the server
pnpm run start

# Start the server in development mode (with auto-reload)
pnpm run dev

# Run all tests
pnpm run test

# Run tests with watching
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Run ESLint
pnpm run lint

# Fix linting issues automatically
pnpm run lint:fix

# Format code with Prettier
pnpm run format

# Check code formatting
pnpm run format:check

# Type check without emitting files
pnpm run check-types

# Run the full CI check (format, lint, type check, build, test)
pnpm run ci

# Validate codebase (type check, lint, test)
pnpm run validate

# Inspect MCP server with inspector
pnpm run inspect

# Clean build artifacts
pnpm run clean
```

## Troubleshooting

### Enable Debug Logging

If you're experiencing issues, enable debug logging to see detailed information:

1. Set the `LOG_FILE` environment variable to a file path where logs should be written
2. Set `LOG_LEVEL` to `DEBUG` (this is the default)
3. Check the log file for detailed error information

Example configuration with logging:
```json
{
  "mcpServers": {
    "deepsource": {
      "command": "npx",
      "args": ["-y", "deepsource-mcp-server@latest"],
      "env": {
        "DEEPSOURCE_API_KEY": "your-api-key",
        "LOG_FILE": "/tmp/deepsource-mcp.log",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

Then check the log file:
```bash
tail -f /tmp/deepsource-mcp.log
```

### Common Issues

1. **Authentication Error**: Ensure your `DEEPSOURCE_API_KEY` is correct and has the necessary permissions
2. **No logs appearing**: Verify that the `LOG_FILE` path is writable and the parent directory exists
3. **Tool errors**: Check the log file for detailed error messages and stack traces
4. **Connection issues**: Verify your network connectivity and that you can access the DeepSource API
5. **Pagination errors**: When using cursor-based pagination, ensure cursors are valid and pagination parameters are correctly specified

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT