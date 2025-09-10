# Spec a Chore

You are about to create a chore specification and turn it into a GitHub issue ready for implementation.

## Process

1. **Gather Requirements**
   - Ask the user for the chore name and description if not provided
   - Understand the maintenance goal and technical debt being addressed
   - Identify scope, constraints, and potential impacts

2. **Write Chore Specification**
   Create a comprehensive specification including:
   - **Chore** name and description
   - **Current State** (what's wrong/needs improvement)
   - **Desired State** (what success looks like)
   - **Implementation Steps** (clear, actionable tasks)
   - **Acceptance Criteria**
   - **Out of Scope** (what this chore won't address)
   - **Impact Analysis** (what might be affected)
   - **Technical Details**

3. **Format as GitHub Issue**
   Structure the issue with:
   - Clear title: `chore: [Chore Name]`
   - Labels: `chore`, `maintenance`, `technical-debt` (as appropriate)
   - Milestone (if applicable)
   - Complete specification in the body
   - Testing/validation requirements

4. **Create the Issue**
   Use the `gh` CLI to create the issue:
   ```bash
   gh issue create --title "chore: [Chore Name]" \
     --body "[Full specification]" \
     --label chore \
     --label maintenance
   ```

## Template for Issue Body

```markdown
## Chore: [Chore Name]

### Motivation

[Explain why this chore is needed - technical debt, maintenance, performance, etc.]

### Current State

[Describe the current situation that needs improvement]

- Problem 1: [specific issue]
- Problem 2: [specific issue]
- Technical debt: [if applicable]

### Desired State

[Describe what the codebase should look like after this chore]

- Improvement 1: [specific outcome]
- Improvement 2: [specific outcome]
- Resolved debt: [if applicable]

### Implementation Steps

1. **Step 1**: [Clear action]
   - Sub-task 1.1
   - Sub-task 1.2

2. **Step 2**: [Clear action]
   - Sub-task 2.1
   - Sub-task 2.2

3. **Step 3**: [Clear action]
   - Sub-task 3.1
   - Sub-task 3.2

### Acceptance Criteria

- [ ] All deprecated dependencies updated
- [ ] All obsolete code removed
- [ ] Documentation updated to reflect changes
- [ ] No functionality broken (all tests pass)
- [ ] Performance metrics maintained or improved
- [ ] Code quality metrics improved

### Out of Scope

- This chore will NOT [explicitly excluded work]
- Future improvements: [related but deferred work]

### Impact Analysis

#### Systems Affected

- Component A: [impact description]
- Component B: [impact description]

#### Risk Assessment

- **Low Risk**: [areas with minimal impact]
- **Medium Risk**: [areas needing careful testing]
- **High Risk**: [critical areas requiring extra attention]

### Technical Details

#### Dependencies to Update

- Package A: from version X to Y
- Package B: from version X to Y

#### Files to Modify

- `path/to/file1.ts`: [change description]
- `path/to/file2.ts`: [change description]

#### Configuration Changes

- Config A: [change description]
- Config B: [change description]

### Validation Requirements

- [ ] All existing tests pass
- [ ] Build succeeds without warnings
- [ ] Linting passes without errors
- [ ] Performance benchmarks show no regression
- [ ] Manual testing of affected areas
- [ ] Security scan shows no new vulnerabilities

### Rollback Plan

If issues are discovered:

1. [Step to revert changes]
2. [Step to restore previous state]
3. [Verification steps]

### Definition of Done

- [ ] All acceptance criteria met
- [ ] Code changes reviewed and approved
- [ ] Documentation updated where necessary
- [ ] No increase in technical debt
- [ ] Changeset added (if applicable)
- [ ] CI/CD pipeline passes
```

## Important Notes

1. **Be Specific**: Define clear, measurable improvements
2. **Focus on Value**: Explain WHY this maintenance is important
3. **Minimize Risk**: Include thorough impact analysis
4. **Keep it Atomic**: One chore should address one concern
5. **Make it Trackable**: Provide clear steps and criteria

## Common Chore Types

### Dependency Updates

```markdown
## Chore: Update Node.js to v22 LTS

### Motivation

Node.js 20 is approaching end-of-life. Updating to v22 LTS ensures continued security updates and access to performance improvements.

### Current State

- Running Node.js 20.x
- Missing performance improvements from v22
- Security patches will end in [date]
```

### Code Refactoring

```markdown
## Chore: Refactor authentication module to use dependency injection

### Motivation

Current authentication module has tight coupling making it difficult to test and maintain. Refactoring to use DI will improve testability and maintainability.

### Current State

- Direct instantiation of dependencies
- Difficult to mock for testing
- Hard to swap implementations
```

### Technical Debt Reduction

```markdown
## Chore: Remove deprecated API endpoints

### Motivation

Legacy API endpoints marked for deprecation 6 months ago are still present, adding maintenance burden and confusion.

### Current State

- 5 deprecated endpoints still active
- Duplicate code paths
- Increased maintenance overhead
```

### Build/CI Improvements

```markdown
## Chore: Optimize CI pipeline for faster feedback

### Motivation

Current CI pipeline takes 15+ minutes, slowing down development feedback loop.

### Current State

- Serial test execution
- No caching of dependencies
- Redundant build steps
```

## Example Output

After gathering requirements, create an issue like:

```bash
gh issue create --title "chore: migrate from jest to vitest" \
  --body "## Chore: Migrate from Jest to Vitest

### Motivation
Jest has become slow for our test suite (5+ minutes). Vitest offers 3-5x faster test execution and better TypeScript support.

### Current State
- Test suite takes 5+ minutes to run
- Jest configuration is complex
- Type checking requires separate step

### Desired State
- Test suite runs in under 2 minutes
- Simplified test configuration
- Integrated type checking

[... full specification ...]" \
  --label chore \
  --label maintenance \
  --label testing
```

The created issue will be ready for implementation using the `/implement-github-issue` command.
