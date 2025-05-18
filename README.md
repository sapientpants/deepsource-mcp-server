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

The DeepSource MCP Server enables AI assistants to interact with DeepSource's code quality analysis capabilities through the Model Context Protocol. This integration allows AI assistants to:

* Retrieve code metrics and analysis results
* Access and filter issues
* Check quality status
* Analyze project quality over time

## Features

* **DeepSource API Integration**: Connects to DeepSource via GraphQL API
* **MCP Protocol Support**: Implements the Model Context Protocol for AI assistant integration
* **Quality Metrics & Thresholds**: Retrieve and manage code quality metrics with thresholds
* **Security Compliance Reports**: Access OWASP Top 10, SANS Top 25, and MISRA-C compliance reports
* **Dependency Vulnerabilities**: Access security vulnerability information about dependencies
* **TypeScript/Node.js**: Built with TypeScript for type safety and modern JavaScript features
* **Cross-Platform**: Works on Linux, macOS, and Windows
* **Robust Error Handling**: Comprehensive error handling for network, authentication, and parsing issues

## Usage with Claude Desktop

1. Edit `claude_desktop_config.json`:
   - Open Claude Desktop
   - Go to `Settings` -> `Developer` -> `Edit Config`
   - Add the one of the configurations below to the `mcpServers` section

2. Restart Claude Desktop to apply the changes

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
### Docker

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
        "sapientpants/deepsource-mcp-server"
      ],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key"
      }
    }
  }
}
```

### NPX

```json
{
  "mcpServers": {
    "deepsource": {
      "command": "npx",
      "args": [
        "-y",
        "deepsource-mcp-server@1.1.0"
      ],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key"
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
       * `offset` (optional) - Number of items to skip for pagination
       * `first` (optional) - Number of items to return (defaults to 10)
       * `after` (optional) - Cursor for forward pagination
       * `before` (optional) - Cursor for backward pagination
       * `last` (optional) - Number of items to return before the 'before' cursor (default: 10)
     * Filtering parameters:
       * `path` (optional) - Filter issues by specific file path
       * `analyzerIn` (optional) - Filter issues by specific analyzers (e.g., ["python", "javascript"])
       * `tags` (optional) - Filter issues by tags

3. `project_runs`: List analysis runs for a DeepSource project with filtering
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * Pagination parameters:
       * `offset` (optional) - Number of items to skip for pagination
       * `first` (optional) - Number of items to return (defaults to 10)
       * `after` (optional) - Cursor for forward pagination
       * `before` (optional) - Cursor for backward pagination
       * `last` (optional) - Number of items to return before the 'before' cursor (default: 10)
     * Filtering parameters:
       * `analyzerIn` (optional) - Filter runs by specific analyzers (e.g., ["python", "javascript"])

4. `run`: Get a specific analysis run by its runUid or commitOid
   * Parameters:
     * `runIdentifier` (required) - The runUid (UUID) or commitOid (commit hash) to identify the run

5. `recent_run_issues`: Get issues from the most recent analysis run on a specific branch
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * `branchName` (required) - The branch name to get the most recent run from
   * Returns:
     * Information about the most recent run on the branch
     * Current issues in the project (note: issues are repository-level, not run-specific)
     * Metadata about the run and branch

6. `dependency_vulnerabilities`: Get dependency vulnerabilities from a DeepSource project
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * Pagination parameters:
       * `offset` (optional) - Number of items to skip for pagination
       * `first` (optional) - Number of items to return (defaults to 10)
       * `after` (optional) - Cursor for forward pagination
       * `before` (optional) - Cursor for backward pagination
       * `last` (optional) - Number of items to return before the 'before' cursor (default: 10)

7. `quality_metrics`: Get quality metrics from a DeepSource project with filtering
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * `shortcodeIn` (optional) - Filter metrics by specific shortcodes (e.g., ["LCV", "BCV"])
   * Returns metrics such as:
     * Line Coverage (LCV)
     * Branch Coverage (BCV)
     * Documentation Coverage (DCV)
     * Duplicate Code Percentage (DDP)
     * Each metric includes current values, thresholds, and pass/fail status

8. `update_metric_threshold`: Update the threshold for a specific quality metric
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * `repositoryId` (required) - The GraphQL repository ID
     * `metricShortcode` (required) - The shortcode of the metric to update
     * `metricKey` (required) - The language or context key for the metric
     * `thresholdValue` (optional) - The new threshold value, or null to remove the threshold
   * Example: Set 80% line coverage threshold: metricShortcode="LCV", metricKey="AGGREGATE", thresholdValue=80

9. `update_metric_setting`: Update the settings for a quality metric
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * `repositoryId` (required) - The GraphQL repository ID
     * `metricShortcode` (required) - The shortcode of the metric to update
     * `isReported` (required) - Whether the metric should be reported
     * `isThresholdEnforced` (required) - Whether the threshold should be enforced (can fail checks)

10. `compliance_report`: Get security compliance reports from a DeepSource project
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * `reportType` (required) - The type of compliance report to fetch ([OWASP Top 10](https://owasp.org/www-project-top-ten/), [SANS Top 25](https://cwe.mitre.org/top25/), or [MISRA-C](https://www.misra.org.uk/))
   * Returns comprehensive security compliance data including:
     * Security issue statistics by category and severity
     * Compliance status (passing/failing)
     * Trend data showing changes over time
     * Analysis and recommendations for improving security posture

## Development

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

4. Configure Claude Desktop
```json
{
  "mcpServers": {
    "deepsource": {
      "command": "node",
      "args": [
        "/path/to/deepsource-mcp-server/dist/index.js"
      ],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key"
      }
    }
  }
}
```

### Prerequisites

* Node.js 20 or higher
* pnpm 10.7.0 or higher
* Docker (for container builds)

### Scripts

* `pnpm run build` - Build the TypeScript code
* `pnpm run start` - Start the server
* `pnpm run dev` - Start the server in development mode
* `pnpm run test` - Run tests
* `pnpm run lint` - Run ESLint
* `pnpm run format` - Format code with Prettier

## License

MIT 