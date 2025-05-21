Please fix the deepsource issues on this branch.

Follow these steps:

1. Delete tmp/issues.md if it exists
2. Use the `projects` tool to retrieve the `projectKey` for this project
3. Use the `recent_run_issues` tool to retrieve the issues for the most recent deepsource run
4. Write detailed todos (including the filename(s) and line number(s) of each occurance) to tmp/issues.md
5. Resolve each todo in order following these steps
   a. Think deeply about the issue
   b. Implement the fix
   c. Commit the changes with a message like "fix: <issue description>"
   d. Update tmp/issues.md to indicate that the issue has been resolved
6. When all issues are resolved, delete tmp/issues.md
