# cleanup-issues

Clean up GitHub issues by aligning prefixes with commitlint conventions and adding appropriate labels based on content.

## Steps to Execute

1. **List all open issues to review:**

   ```bash
   gh issue list --state open --limit 100 --json number,title,labels
   ```

2. **Check the commitlint configuration for valid prefixes:**
   - Read `commitlint.config.js` to see allowed types
   - Valid prefixes: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

3. **Create missing labels if needed:**

   ```bash
   gh label create "performance" --description "Performance improvements" --color "1d76db"
   gh label create "refactoring" --description "Code refactoring" --color "d4c5f9"
   gh label create "security" --description "Security improvements" --color "d73a4a"
   gh label create "technical-debt" --description "Technical debt" --color "fef2c0"
   gh label create "reliability" --description "Reliability improvements" --color "0e8a16"
   ```

4. **For each issue, analyze the content and update if needed:**

   **Prefix Mapping Rules:**

   | Issue Content                                         | Correct Prefix | Labels to Add                            |
   | ----------------------------------------------------- | -------------- | ---------------------------------------- |
   | New feature, pagination, retry mechanism              | `feat:`        | enhancement, reliability (if resilience) |
   | Bug fix, security fix, validation fix                 | `fix:`         | bug, security (if security-related)      |
   | Performance optimization, caching, query optimization | `perf:`        | performance                              |
   | Code restructuring, normalization, consolidation      | `refactor:`    | refactoring, technical-debt              |
   | Dependency management, versioning, cleanup            | `chore:`       | dependencies, technical-debt             |
   | Documentation updates                                 | `docs:`        | documentation                            |
   | Test additions or changes                             | `test:`        | testing                                  |

5. **Update issues with correct prefixes and labels:**

   ```bash
   # Example: Update issue with wrong prefix
   gh issue edit 158 --title "fix: Tighten logging defaults for security and traceability"
   gh issue edit 158 --add-label "security"

   # Example: Change from feat to perf
   gh issue edit 154 --title "perf: Introduce lightweight caching with TTL for hot paths"
   gh issue edit 154 --add-label "performance"

   # Example: Change from feat to refactor
   gh issue edit 155 --title "refactor: Consolidate to single canonical entrypoint and registry"
   gh issue edit 155 --add-label "refactoring,technical-debt"
   ```

6. **Verify all updates:**
   ```bash
   gh issue list --state open --json number,title,labels --jq '.[] | "\(.number): \(.title)\n  Labels: \(.labels | map(.name) | join(", "))"'
   ```

## Automated Process

When running this command, I will:

1. First check `commitlint.config.js` to confirm valid prefixes
2. List all open issues to analyze
3. Create any missing labels needed
4. For each issue:
   - Check if the current prefix is valid
   - Analyze the title/content to determine the correct prefix
   - Update the title if the prefix is wrong
   - Add appropriate labels based on the issue type
5. Provide a summary of all changes made

## Example Output

```
Reviewing 10 open issues...

✅ Updated #154: "perf: Introduce lightweight caching with TTL"
   - Changed prefix from 'feat:' to 'perf:'
   - Added labels: performance

✅ Updated #155: "refactor: Consolidate to single canonical entrypoint"
   - Changed prefix from 'feat:' to 'refactor:'
   - Added labels: refactoring, technical-debt

✅ Updated #158: "fix: Tighten logging defaults for security"
   - Changed prefix from 'security:' to 'fix:' (invalid prefix)
   - Added labels: security

Summary:
- 3 issues updated
- 7 issues already correct
- 4 new labels created
```

## Notes

- Issue titles can use uppercase after the prefix (unlike commit messages)
- The command preserves existing valid labels
- Only updates issues that need changes
- Creates a summary report of all modifications
