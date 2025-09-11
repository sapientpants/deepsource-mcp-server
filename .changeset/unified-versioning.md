---
'deepsource-mcp-server': minor
---

Add unified versioning system with single source of truth

- Created central `version.ts` module that reads from package.json
- Added CLI support for `--version` and `-v` flags to display version
- Added `--help` and `-h` flags with comprehensive help text
- Replaced all hardcoded version strings with VERSION constant
- Added version to startup logging for better debugging
- Created build script to inject version at build time
- Added comprehensive version utilities (parsing, validation, comparison)
- Exported VERSION constant and helper functions for programmatic access
- Added fallback to "0.0.0-dev" when package.json is unavailable

This ensures consistent version reporting across:

- CLI output
- Server metadata
- Startup logs
- Error messages
- MCP protocol responses
