# DeepSource MCP Server

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

## Installation

### From Source

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

### From Docker

Pull and run the Docker image:
```bash
docker pull sapientpants/deepsource-mcp-server:latest
```

### Integration with Claude Desktop

1. Edit `claude_desktop_config.json`:
   - Open Claude Desktop
   - Go to `Settings` -> `Developer` -> `Edit Config`
   - Add the following configuration to the `mcpServers` section:

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
        "-p",
        "3000:3000",
        "sapientpants/deepsource-mcp-server"
      ],
      "env": {
        "DEEPSOURCE_API_KEY": "your-deepsource-api-key"
      }
    }
  }
}
```

2. Restart Claude Desktop to apply the changes

To check MCP logs, use:
```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

### Available Tools

The DeepSource MCP Server provides the following tools:

1. `mcp_sonarqube_sonarqube_get_metrics`: Retrieve code metrics for a project
   * Parameters:
     * `project_key` (required)
     * `metrics` (optional array of metric keys)

2. `mcp_sonarqube_sonarqube_get_issues`: Retrieve issues for a project
   * Parameters:
     * `project_key` (required)
     * `severities` (optional array)
     * `types` (optional array)
     * `statuses` (optional array)
     * `impact_severities` (optional array)
     * `impact_software_qualities` (optional array)
     * And many more filtering options...

3. `mcp_sonarqube_sonarqube_get_quality_gate`: Retrieve quality gate status for a project
   * Parameters:
     * `project_key` (required)

4. `mcp_sonarqube_sonarqube_list_projects`: List all projects
   * Parameters:
     * `page` (optional)
     * `page_size` (optional)

## Development

### Prerequisites

* Node.js 20 or higher
* pnpm 10.7.0 or higher
* Docker (for container builds)

### Environment Variables

* `DEEPSOURCE_API_KEY`: Your DeepSource API key

### Scripts

* `pnpm run build` - Build the TypeScript code
* `pnpm run start` - Start the server
* `pnpm run dev` - Start the server in development mode
* `pnpm run test` - Run tests
* `pnpm run lint` - Run ESLint
* `pnpm run format` - Format code with Prettier

## License

MIT 