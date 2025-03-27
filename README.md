# DeepSource MCP Server

A TypeScript-based server implementation for DeepSource MCP (Mission Control Panel).

## Prerequisites

- Node.js (v16 or higher recommended)
- pnpm (v10.7.0 or higher)

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

## Project Structure

```
deepsource-mcp-server/
├── src/              # Source files
├── dist/             # Compiled files (generated)
├── node_modules/     # Dependencies
├── package.json      # Project configuration
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

## Scripts

- `pnpm run dev` - Run the TypeScript code directly using ts-node
- `pnpm run build` - Compile TypeScript to JavaScript
- `pnpm run start` - Run the compiled JavaScript
- `pnpm run watch` - Watch for changes and recompile automatically

## License

ISC 