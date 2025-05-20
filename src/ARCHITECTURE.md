# DeepSource MCP Server Architecture

This document outlines the architectural structure of the DeepSource MCP Server application after refactoring.

## Folder Structure

```
src/
├── client/                 # DeepSource API client
│   ├── factory.ts          # Factory for creating client instances
│   ├── base-client.ts      # Base client with core functionality
│   ├── issues-client.ts    # Client module for issues endpoints
│   ├── metrics-client.ts   # Client module for metrics endpoints
│   ├── projects-client.ts  # Client module for projects endpoints
│   ├── runs-client.ts      # Client module for runs endpoints
│   ├── security-client.ts  # Client module for security vulnerability endpoints
│   └── index.ts            # Public API exports
│
├── handlers/               # MCP tool handlers
│   ├── projects.ts         # Projects handler
│   ├── issues.ts           # Issues handler
│   ├── runs.ts             # Runs handler
│   ├── metrics.ts          # Metrics handlers
│   ├── security.ts         # Security handlers
│   └── index.ts            # Handler exports
│
├── models/                 # Data models and schemas
│   ├── common.ts           # Common model interfaces
│   ├── issues.ts           # Issue-related models
│   ├── metrics.ts          # Metrics-related models
│   ├── pagination.ts       # Pagination-related models
│   ├── projects.ts         # Project-related models
│   ├── runs.ts             # Run-related models
│   ├── security.ts         # Security-related models
│   └── index.ts            # Model exports
│
├── utils/                  # Utility functions and helpers
│   ├── errors/             # Error utilities
│   │   ├── categories.ts   # Error categories
│   │   ├── factory.ts      # Error creation factory
│   │   ├── handlers.ts     # Error handlers
│   │   └── index.ts        # Error utility exports
│   │
│   ├── pagination/         # Pagination utilities
│   │   ├── params.ts       # Pagination parameter handling
│   │   ├── cursor.ts       # Cursor-based pagination helpers
│   │   └── index.ts        # Pagination utility exports
│   │
│   ├── graphql/            # GraphQL utilities
│   │   ├── queries.ts      # GraphQL query strings
│   │   ├── processor.ts    # Response processors
│   │   └── index.ts        # GraphQL utility exports
│   │
│   ├── logging/            # Logging utilities
│   │   ├── logger.ts       # Logger implementation
│   │   └── index.ts        # Logging utility exports
│   │
│   └── index.ts            # General utility exports
│
├── types/                  # TypeScript type definitions
│   └── index.ts            # Type exports
│
└── index.ts                # Main entry point
```

## Components

### Client

The client layer is responsible for communication with the DeepSource API. It's divided into domain-specific modules:

- **Base Client**: Provides core HTTP request functionality and error handling.
- **Domain-Specific Clients**: Handle specific DeepSource API domains (issues, metrics, etc.).
- **Client Factory**: Creates and configures client instances.

### Handlers

The handlers layer implements MCP tools that expose DeepSource functionality to AI assistants:

- Each handler corresponds to a specific MCP tool.
- Handlers use the client layer to fetch data and transform responses.
- Response formatting follows MCP protocol requirements.

### Models

The models layer defines shared data structures and schemas:

- **Domain Models**: Data structures for different API domains.
- **Request/Response Models**: Structures for API requests and responses.
- **Schema Validation**: Zod schemas for data validation.

### Utils

The utilities layer provides shared functionality:

- **Error Utilities**: Consistent error handling and classification.
- **Pagination Utilities**: Helpers for cursor-based pagination.
- **GraphQL Utilities**: Query management and response processing.
- **Logging Utilities**: Structured logging capabilities.

## Design Principles

1. **Separation of Concerns**: Each component has a single responsibility.
2. **Domain-Driven Design**: Organization around business domains.
3. **Dependency Inversion**: Higher-level modules depend on abstractions.
4. **Interface Segregation**: Clients expose focused interfaces for specific domains.
5. **Error Handling**: Consistent approach to error handling and reporting.
6. **Type Safety**: Strong TypeScript types throughout the codebase.

## Key Patterns

1. **Factory Pattern**: For creating and configuring client instances.
2. **Repository Pattern**: For encapsulating data access.
3. **Module Pattern**: For organizing code into cohesive units.
4. **Builder Pattern**: For constructing complex query objects.
5. **Strategy Pattern**: For applying different error handling strategies.