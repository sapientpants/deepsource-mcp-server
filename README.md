# DeepSource MCP Server

A Model Context Protocol server implementation for DeepSource integration. This server allows AI models to interact with DeepSource's API to list projects and retrieve issues.

## Prerequisites

- Node.js (v16 or higher recommended)
- pnpm (v10.7.0 or higher)
- DeepSource API Key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/deepsource-mcp-server.git
cd deepsource-mcp-server
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up your environment variables:
```bash
export DEEPSOURCE_API_KEY=your_api_key_here
```

## Development

To start the development server with hot-reload:

```bash
pnpm run dev
```

To watch for changes and automatically recompile:

```bash
pnpm run watch
```

## Building

To build the project:

```bash
pnpm run build
```

This will create a `dist` directory with the compiled JavaScript files.

## Running in Production

To run the compiled version:

```bash
pnpm run start
```

## Server Endpoints

The server exposes two HTTP endpoints:

- `GET /sse` - Server-Sent Events endpoint for MCP clients to connect
- `POST /messages` - Endpoint for MCP clients to send messages

## Available Tools

### list-projects

Lists all DeepSource projects accessible with your API key.

Example usage:
```typescript
const result = await client.callTool({
  name: "list-projects",
  arguments: {}
});
```

### get-project-issues

Retrieves all issues for a specific DeepSource project.

Example usage:
```typescript
const result = await client.callTool({
  name: "get-project-issues",
  arguments: {
    projectKey: "your-project-key"
  }
});
```

## Available Prompts

- `list-projects` - Prompt for listing all projects
- `get-project-issues` - Prompt for getting issues from a specific project

## Project Structure

```
deepsource-mcp-server/
├── src/
│   ├── index.ts        # Main server implementation
│   └── deepsource.ts   # DeepSource API client
├── dist/               # Compiled files (generated)
├── node_modules/       # Dependencies
├── package.json        # Project configuration
├── tsconfig.json       # TypeScript configuration
└── README.md          # This file
```

## License

ISC 