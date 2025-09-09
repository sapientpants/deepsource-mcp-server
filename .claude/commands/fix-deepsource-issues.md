# Fix DeepSource Issues

Analyze and fix all open issues reported by DeepSource for this project using the DeepSource MCP server.

## Steps

1. **Identify Project and Check for Issues**
   - Use MCP tool `projects` to list available projects
   - Find the project key matching this repository
   - **For branch-specific issues**: Use `recent_run_issues` with the current branch name
   - **For overall project issues**: Use `project_issues` to query all open issues
   - **Note**: `recent_run_issues` may return very large responses - use `runs` to check issue counts first
   - **If no issues found**: Report "✅ No DeepSource issues found!" and exit

2. **Get Detailed Issue Analysis**
   - When working on a specific branch (e.g., for a PR):
     - Use `runs` to find the latest run for your branch and check issue counts
     - Use `run` with the run ID to get summary information
     - **Note**: `recent_run_issues` responses can exceed token limits even with `first: 1`
     - If API responses are too large, check the DeepSource dashboard directly
   - For main branch or overall project:
     - Use `project_issues` with pagination (default branch is main)
   - Use `quality_metrics` to understand overall code health
   - Check `dependency_vulnerabilities` for security issues in dependencies

3. **Analyze Retrieved Issues**
   - Group by severity: BLOCKER, CRITICAL, MAJOR, MINOR, INFO
   - Categorize by analyzer:
     - **JavaScript/TypeScript**: JS-\* issues
     - **Test Coverage**: TCV-\* issues
     - **Security**: SEC-\* issues
     - **Dependencies**: DEP-\* issues
   - Note issue occurrences (how many times each issue appears)
   - Report detailed summary with issue codes and descriptions

4. **Create Feature Branch** (only if issues exist)

   ```bash
   git checkout -b fix/deepsource-issues-$(date +%Y%m%d)
   ```

5. **Fix Issues by Priority**
   - Start with BLOCKER severity
   - Then CRITICAL
   - Then MAJOR
   - Then MINOR
   - Finally INFO
   - Group similar issues to fix them together efficiently

6. **For Each Issue Type**
   - Read the affected files
   - Understand the specific DeepSource rule violated
   - Apply the recommended fix pattern
   - Verify the fix doesn't break existing functionality

7. **Common DeepSource Issues and Fixes**

   **JavaScript/TypeScript (JS-\*)**
   - **JS-0323** (No any type): Replace `any` with `unknown` or specific types
   - **JS-0331** (Redundant type annotations): Remove unnecessary type declarations
   - **JS-R1004** (Template literals): Use regular strings when no interpolation
   - **JS-0105** (Static methods): Make non-instance methods static
   - **JS-W1044** (Optional chaining): Use `?.` for nested property access
   - **JS-C1003** (Wildcard imports): Use named imports instead
   - **JS-0097** (Variable shadowing): Rename inner variables
   - **JS-0125** (Unused variables): Remove or use underscore prefix

   **Test Coverage (TCV-\*)**
   - **TCV-001**: Add tests for uncovered code paths
   - Focus on critical business logic first
   - Aim for >80% coverage as per project requirements

   **Security (SEC-\*)**
   - **SEC-001**: Sanitize user inputs
   - **SEC-002**: Use secure random generators
   - Validate all external data

   **Dependencies (DEP-\*)**
   - Use `dependency_vulnerabilities` tool to identify issues
   - Update vulnerable packages to secure versions
   - Check for breaking changes in updates

8. **Validation After Each Fix Group**
   - Run `pnpm test` to ensure tests pass
   - Run `pnpm lint` to check for new linting issues
   - Run `pnpm typecheck` to verify TypeScript compilation
   - Run `pnpm check-types` for additional type checking

9. **Monitor Progress with MCP Tools**
   - After significant fixes, use `runs` to check if a new analysis is available
   - Use `run` with the latest run ID to get updated results
   - Track improvement in `quality_metrics` scores

10. **Create Changeset**

    ```bash
    pnpm changeset
    ```

    - Type: patch (for bug fixes and minor improvements)
    - Summary: "Fix DeepSource code quality issues"
    - Detailed description of fixed issue categories

11. **Commit Changes**

    ```bash
    git add -A
    git commit -m "fix: resolve DeepSource code quality issues

    - Fixed [X] JavaScript/TypeScript issues
    - Fixed [X] test coverage issues
    - Fixed [X] security issues
    - Fixed [X] dependency vulnerabilities

    Issues resolved by severity:
    - BLOCKER: [X]
    - CRITICAL: [X]
    - MAJOR: [X]
    - MINOR: [X]
    - INFO: [X]"
    ```

12. **Push Branch and Monitor**

    ```bash
    git push origin fix/deepsource-issues-$(date +%Y%m%d)
    ```

    - Wait for DeepSource to analyze the branch
    - Use `runs` to find the new analysis run
    - Use `run` to verify issues are resolved

13. **Create Pull Request with Metrics**

    ```bash
    gh pr create --title "fix: resolve DeepSource code quality issues" \
      --body "## Summary
    Resolved DeepSource issues identified in the latest analysis run.

    ## DeepSource Metrics Improvement
    - Issues Fixed: [X] total
    - Code Coverage: [before]% → [after]%
    - Maintainability Score: [improvement]
    - Reliability Score: [improvement]
    - Security Score: [improvement]

    ## Fixed Issues by Category

    ### JavaScript/TypeScript Issues
    - JS-0323 (No any): [X] occurrences fixed
    - JS-0331 (Type annotations): [X] occurrences fixed
    - JS-R1004 (Template literals): [X] occurrences fixed
    - [Other issues...]

    ### Test Coverage
    - Improved coverage for [modules]
    - Added [X] new test cases

    ### Security & Dependencies
    - Fixed [X] vulnerabilities
    - Updated [X] dependencies

    ## Testing
    - ✅ All tests passing (\`pnpm test\`)
    - ✅ Linting checks pass (\`pnpm lint\`)
    - ✅ TypeScript compilation successful (\`pnpm typecheck\`)
    - ✅ Type checking passed (\`pnpm check-types\`)
    - ✅ CI pipeline passing

    ## DeepSource Analysis
    - Branch analysis run ID: [run_id]
    - Issues remaining: [X] (if any, explain why not fixed)
    - Link to DeepSource dashboard: [project_url]"
    ```

## Example MCP Tool Usage

```typescript
// List projects to find project key
mcp_tool: projects

// Check runs for a specific branch to see issue counts
mcp_tool: runs
args: {
  projectKey: "deepsource-mcp-server",
  first: 5
}

// Get details of a specific run
mcp_tool: run
args: {
  projectKey: "deepsource-mcp-server",
  runIdentifier: "run-id-here",
  isCommitOid: false
}

// Get issues from most recent run on a branch (WARNING: may exceed token limits)
mcp_tool: recent_run_issues
args: {
  projectKey: "deepsource-mcp-server",
  branchName: "feature/my-branch",  // Specify the actual branch name
  first: 1  // Even with 1, response may be too large
}

// Get all open issues (defaults to main branch)
mcp_tool: project_issues
args: {
  projectKey: "deepsource-mcp-server",
  analyzerIn: ["javascript"],  // Filter by analyzer if needed
  first: 50
}

// Check quality metrics
mcp_tool: quality_metrics
args: {
  projectKey: "deepsource-mcp-server"
}

// Check for dependency vulnerabilities
mcp_tool: dependency_vulnerabilities
args: {
  projectKey: "deepsource-mcp-server"
}
```

## Notes

- The MCP server provides real-time access to DeepSource data
- **API Limitations**: `recent_run_issues` can return very large responses (>70K tokens) even with `first: 1` due to large code snippets in issue details
- **Branch-specific queries**: `project_issues` defaults to main branch; use `recent_run_issues` for other branches but be aware of size limitations
- **Workaround for large responses**: Use `runs` and `run` tools to get issue counts and summaries, then check the DeepSource dashboard for details
- Use pagination for large issue sets (>50 issues)
- Some issues may be false positives - document them in code comments using `skipcq` directives
- Complex refactoring should preserve existing functionality
- Monitor the DeepSource dashboard for analysis progress
- If no issues are found, celebrate with "✅ No DeepSource issues found!"
- Consider updating metric thresholds with `update_metric_threshold` if needed
- Use `compliance_report` for regulatory compliance checks (OWASP, SANS, etc.)
