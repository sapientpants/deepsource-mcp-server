# Analyze GitHub Actions Build

Analyzes a GitHub Actions build to identify failures and their root causes. By default, examines the latest build on the main branch, but you can specify a different run.

## Usage

```
/analyze-build [options]
```

### Options

- `--run-id <id>`: Analyze a specific workflow run by ID
- `--branch <name>`: Analyze the latest run from a specific branch (default: main)
- `--workflow <name>`: Specify which workflow to analyze (default: checks all)
- `--pr <number>`: Analyze the latest run for a specific PR

## Process

1. **Identify Target Build**
   - Default: Latest workflow run on main branch
   - Or use provided run ID, branch, PR, or workflow name

2. **Gather Build Information**
   - Workflow run status and conclusion
   - Failed jobs and steps
   - Error logs and annotations
   - Timing information
   - Related commits and PRs

3. **Analyze Failures**
   - Parse error messages and stack traces
   - Identify failure patterns
   - Categorize error types
   - Determine root causes
   - Check for flaky test indicators

4. **Generate Report**
   - Executive summary
   - Detailed failure analysis
   - Root cause identification
   - Suggested fixes
   - Historical context (if available)

## Analysis Categories

### 1. Test Failures

- Unit test failures
- Integration test failures
- E2E test failures
- Flaky tests
- Timeout issues

### 2. Build Errors

- Compilation errors
- TypeScript errors
- Dependency resolution issues
- Missing dependencies
- Version conflicts

### 3. Linting/Formatting

- ESLint violations
- Prettier formatting issues
- Commit message format
- Markdown linting
- YAML validation

### 4. Infrastructure Issues

- Runner problems
- Network failures
- API rate limits
- Token/permission issues
- Resource exhaustion

### 5. Deployment Failures

- Docker build issues
- Registry push failures
- Security scan violations
- Release creation problems

## Implementation Steps

```bash
# 1. Get the target workflow run
echo "🔍 Identifying target build..."

# Default: latest run on main
if [ -z "$RUN_ID" ]; then
  if [ -n "$PR_NUMBER" ]; then
    # Get latest run for PR
    RUN_ID=$(gh pr checks $PR_NUMBER --json statusCheckRollup --jq '.statusCheckRollup[0].workflowRun.databaseId')
  elif [ -n "$WORKFLOW_NAME" ]; then
    # Get latest run for specific workflow
    RUN_ID=$(gh run list --workflow="$WORKFLOW_NAME" --branch="${BRANCH:-main}" --limit=1 --json databaseId --jq '.[0].databaseId')
  else
    # Get latest run on branch
    RUN_ID=$(gh run list --branch="${BRANCH:-main}" --limit=1 --json databaseId --jq '.[0].databaseId')
  fi
fi

# 2. Fetch run details
echo "📊 Fetching run details for #$RUN_ID..."
gh run view $RUN_ID --json status,conclusion,name,workflowName,event,headBranch,headSha

# 3. Get failed jobs
echo "❌ Identifying failed jobs..."
gh run view $RUN_ID --json jobs --jq '.jobs[] | select(.conclusion == "failure")'

# 4. Fetch logs for failed jobs
echo "📝 Analyzing failure logs..."
gh run view $RUN_ID --log-failed

# 5. Get annotations (errors/warnings)
echo "📌 Checking annotations..."
gh api /repos/{owner}/{repo}/check-runs --jq '.check_runs[].output.annotations[]'
```

## Report Template

```markdown
# Build Analysis Report

**Run ID**: #[RUN_ID]
**Workflow**: [WORKFLOW_NAME]
**Branch**: [BRANCH]
**Status**: [STATUS]
**Duration**: [DURATION]
**Triggered by**: [TRIGGER_EVENT]

## Executive Summary

[High-level summary of the build status and main issues]

## Failure Analysis

### Failed Jobs

1. **[Job Name]** (Duration: [TIME])
   - Step: [Failed Step]
   - Exit Code: [CODE]
   - Category: [Test/Build/Lint/Infrastructure/Deployment]

### Root Cause Analysis

#### Primary Cause

[Identified primary root cause with evidence]

#### Contributing Factors

- [Factor 1]
- [Factor 2]

### Error Details
```

[Relevant error output/stack trace]

````

## Pattern Recognition

### Similar Historical Failures
- [Previous occurrence 1]
- [Previous occurrence 2]

### Flaky Test Indicators
- [Test name if applicable]
- Failure rate: [X/Y runs]

## Recommended Actions

### Immediate Fixes
1. [Specific action to fix the issue]
2. [Additional required changes]

### Long-term Improvements
- [Suggested process improvement]
- [Infrastructure enhancement]

## Additional Context

### Related PRs/Issues
- PR #[NUMBER]: [Title]
- Issue #[NUMBER]: [Title]

### Recent Changes
- Commit [SHA]: [Message]
- Files modified: [List of relevant files]

## Commands to Reproduce/Fix

```bash
# To reproduce locally
[commands]

# To fix
[commands]

# To re-run the workflow
gh run rerun $RUN_ID
````

````

## Common Root Causes and Solutions

### Test Failures

**Pattern: `Cannot find module`**
**Root Cause**: Missing dependency or import path issue
**Solution**:
```bash
pnpm install
# or check import paths in affected files
````

**Pattern:** `Timeout of Xms exceeded`
**Root Cause**: Test timeout, possible performance issue
**Solution**:

- Increase timeout in test configuration
- Investigate performance regression
- Check for missing async/await

### Build Errors

**Pattern:** `Type error TS[NUMBER]`
**Root Cause**: TypeScript compilation error
**Solution**:

```bash
pnpm typecheck
# Fix type errors locally before pushing
```

**Pattern:** `ELIFECYCLE`
**Root Cause**: Script execution failure
**Solution**:

- Check script in package.json
- Verify all dependencies installed
- Check Node version compatibility

### Linting Issues

**Pattern:** `Unexpected var, use let or const`
**Root Cause**: ESLint rule violation
**Solution**:

```bash
pnpm lint:fix
```

**Pattern:** `Trailing spaces`
**Root Cause**: Formatting issue
**Solution**:

```bash
pnpm format:fix
```

### Infrastructure Issues

**Pattern:** `Rate limit exceeded`
**Root Cause**: GitHub API rate limit
**Solution**:

- Add delays between API calls
- Use authentication token
- Implement caching

**Pattern:** `Permission denied`
**Root Cause**: Token permissions insufficient
**Solution**:

- Check workflow permissions
- Update token scopes
- Verify repository settings

### Security/Vulnerability Issues

**Pattern:** `CRITICAL vulnerability found`
**Root Cause**: Dependency vulnerability
**Solution**:

```bash
# Update vulnerable dependency
pnpm update [package]
# or add to .trivyignore if false positive
```

## Example Usage

### Default (latest on main)

```
/analyze-build
```

### Specific run ID

```
/analyze-build --run-id 12345678
```

### Latest on a branch

```
/analyze-build --branch feature/new-feature
```

### For a specific PR

```
/analyze-build --pr 123
```

### Specific workflow

```
/analyze-build --workflow "CI"
```

## Output Example

```
🔍 Analyzing build #12345678...

Build Analysis Report
===================

Run ID: #12345678
Workflow: CI
Branch: main
Status: failure ❌
Duration: 5m 23s

Executive Summary:
The build failed due to TypeScript compilation errors introduced in commit abc123.
Two test files have type mismatches after the recent API client refactoring.

Root Cause:
Missing type exports from src/client/base-client.ts causing import failures in test files.

Immediate Fix:
1. Add missing exports to src/client/base-client.ts:
   export type { ClientOptions, ClientResponse }

2. Run locally to verify:
   pnpm typecheck

Failed Jobs:
- typecheck (failed after 45s)
  Error: TS2305: Module '"./base-client"' has no exported member 'ClientOptions'

Recommended Actions:
✅ Add missing type exports
✅ Run pnpm typecheck locally before pushing
📝 Consider adding pre-push hook to catch type errors

Re-run command:
gh run rerun 12345678
```

## Notes

- Requires `gh` CLI to be authenticated
- Works best with detailed CI logs and annotations
- Can analyze both passed and failed builds
- Provides actionable recommendations based on failure patterns
- Learns from historical patterns in the repository
