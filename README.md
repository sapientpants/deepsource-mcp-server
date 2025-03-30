# DeepSource MCP Server

[![CI](https://github.com/sapientpants/deepsource-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/sapientpants/deepsource-mcp-server/actions/workflows/ci.yml)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server.svg/?label=code+coverage&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server/)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server.svg/?label=active+issues&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server/)
[![DeepSource](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server.svg/?label=resolved+issues&show_trend=true&token=9XrIHVVGs9oZ-6fFSOPah2Ws)](https://app.deepsource.com/gh/sapientpants/deepsource-mcp-server/)

A Model Context Protocol (MCP) server that integrates with DeepSource to provide AI assistants with access to code quality metrics, issues, and analysis results.

## Overview

The DeepSource MCP Server enables AI assistants to interact with DeepSource's code quality analysis capabilities through the Model Context Protocol. This integration allows AI assistants to:

* Retrieve code metrics and analysis results
* Access and filter issues
* Check quality status
* Analyze project quality over time

## Features

* **DeepSource API Integration**: Connects to DeepSource via REST API
* **MCP Protocol Support**: Implements the Model Context Protocol for AI assistant integration
* **TypeScript/Node.js**: Built with TypeScript for type safety and modern JavaScript features
* **Cross-Platform**: Works on Linux, macOS, and Windows
* **Robust Error Handling**: Comprehensive error handling for network, authentication, and parsing issues

## Usage with Claude Desktop

1. Edit `claude_desktop_config.json`:
   - Open Claude Desktop
   - Go to `Settings` -> `Developer` -> `Edit Config`
   - Add the one of the configurations below to the `mcpServers` section

2. Restart Claude Desktop to apply the changes

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
        "deepsource-mcp-server"
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

1. `deepsource_projects`: List all available DeepSource projects
   * Parameters:
     * No required parameters

2. `deepsource_project_issues`: Get issues from a DeepSource project
   * Parameters:
     * `projectKey` (required) - The unique identifier for the DeepSource project
     * `offset` (optional) - Number of items to skip for pagination
     * `first` (optional) - Number of items to return (defaults to 10)
     * `after` (optional) - Cursor for forward pagination
     * `before` (optional) - Cursor for backward pagination

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