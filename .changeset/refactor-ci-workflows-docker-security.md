---
'deepsource-mcp-server': patch
---

Refactor CI/CD workflows and improve Docker security

### CI/CD Improvements

- **Unified Build Process**: Consolidated build into single job that creates reusable artifacts
- **Build Artifacts**: Generated once and reused throughout workflow for consistency
- **Build Manifest**: Added metadata tracking (SHA, timestamp, dependencies)
- **Tag Creation**: Tags now created before building artifacts for better traceability
- **Artifact Naming**: Include commit SHA for consistent naming across workflows

### Docker Support

- **Multi-Platform Builds**: Added support for linux/amd64 and linux/arm64
- **Docker Workflow**: New reusable workflow for container image builds
- **Configuration**: Docker releases controlled via `ENABLE_DOCKER_RELEASE` variable

### Security Enhancements

- **CodeQL Integration**: Added dedicated security scanning workflow
- **Consolidated Scanning**: Unified security checks in reusable workflow
- **Docker Security**: Container images run as non-root user (nodejs:1001)
- **Trivy Scanning**: Automated vulnerability detection in container images
- **Dependency Scanning**: Enhanced vulnerability reporting

### Developer Experience

- **Issue Templates**: Added bug report and feature request templates
- **PR Template**: Comprehensive pull request template with checklist
- **Workflow Documentation**: Enhanced comments for better maintainability
- **Better Validation**: Improved changeset validation in PR workflow

### Infrastructure

- **NPM Packaging**: Dedicated job for package preparation with attestations
- **SLSA Provenance**: Generate attestations for supply chain security
- **Improved Permissions**: Updated for container registry access
- **DeepSource Integration**: Maintained test coverage reporting

### Technical Details

- Removed redundant `reusable-setup.yml` (merged into other workflows)
- Better job dependency graph for parallel execution
- Consistent secret passing (DEEPSOURCE_DSN)
- Enhanced artifact retention strategies
