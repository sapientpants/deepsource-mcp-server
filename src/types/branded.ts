/**
 * @fileoverview Branded types for the DeepSource MCP server
 *
 * This module defines branded types to enforce type safety for string-based identifiers.
 * Branded types help prevent mixing different string identifiers that share the same primitive type.
 * For example, a ProjectKey and RunId are both strings, but they represent different concepts.
 * Using branded types ensures that functions expecting a ProjectKey cannot accept a RunId.
 */

/**
 * A branded type for DeepSource project keys
 */
export type ProjectKey = string & { readonly __brand: 'ProjectKey' };

/**
 * A branded type for DeepSource run identifiers (UUID)
 */
export type RunId = string & { readonly __brand: 'RunId' };

/**
 * A branded type for commit hashes (SHA)
 */
export type CommitOid = string & { readonly __brand: 'CommitOid' };

/**
 * A branded type for repository branch names
 */
export type BranchName = string & { readonly __brand: 'BranchName' };

/**
 * A branded type for analyzer shortcodes
 */
export type AnalyzerShortcode = string & { readonly __brand: 'AnalyzerShortcode' };

/**
 * A branded type for internal GraphQL node IDs
 */
export type GraphQLNodeId = string & { readonly __brand: 'GraphQLNodeId' };

/**
 * Type guard functions to safely assert branded types
 */

/**
 * Converts a string to a ProjectKey branded type
 *
 * This helper function safely converts a regular string to the ProjectKey branded type.
 * ProjectKey is used to type-safely represent DeepSource project identifiers throughout
 * the codebase, ensuring they cannot be accidentally mixed with other string identifiers.
 *
 * @example
 * ```typescript
 * // Convert a project ID string to a branded type
 * const projectKey = asProjectKey('abc123');
 *
 * // Use with a function requiring ProjectKey parameter
 * const project = getProjectDetails(projectKey); // Type-safe
 *
 * // This would cause a compile error:
 * const runId = asRunId('xyz789');
 * getProjectDetails(runId); // Error: Type 'RunId' is not assignable to type 'ProjectKey'
 * ```
 *
 * @param value - The string to convert to a ProjectKey
 * @returns The same string, but with the ProjectKey branded type
 * @public
 */
export function asProjectKey(value: string): ProjectKey {
  return value as ProjectKey;
}

/**
 * Converts a string to a RunId branded type
 *
 * This helper function safely converts a regular string to the RunId branded type.
 * RunId is used to type-safely represent DeepSource analysis run identifiers (UUIDs)
 * throughout the codebase, ensuring they cannot be accidentally mixed with other identifiers.
 *
 * @example
 * ```typescript
 * // Convert a run UUID string to a branded type
 * const runId = asRunId('61c38bcc-c546-4694-be79-123456789abc');
 *
 * // Use with a function requiring RunId parameter
 * const run = getRunDetails(runId); // Type-safe
 * ```
 *
 * @param value - The string to convert to a RunId
 * @returns The same string, but with the RunId branded type
 * @public
 */
export function asRunId(value: string): RunId {
  return value as RunId;
}

/**
 * Converts a string to a CommitOid branded type
 *
 * This helper function safely converts a regular string to the CommitOid branded type.
 * CommitOid is used to type-safely represent git commit hashes throughout the codebase,
 * ensuring they cannot be accidentally mixed with other string identifiers.
 *
 * @example
 * ```typescript
 * // Convert a commit hash string to a branded type
 * const commitOid = asCommitOid('6a8e94c82f948d6f2932e905e83fe60166a1c70a');
 *
 * // Use with a function requiring CommitOid parameter
 * const commitDetails = getCommitDetails(commitOid); // Type-safe
 * ```
 *
 * @param value - The string to convert to a CommitOid
 * @returns The same string, but with the CommitOid branded type
 * @public
 */
export function asCommitOid(value: string): CommitOid {
  return value as CommitOid;
}

/**
 * Converts a string to a BranchName branded type
 *
 * This helper function safely converts a regular string to the BranchName branded type.
 * BranchName is used to type-safely represent git branch names throughout the codebase,
 * ensuring they cannot be accidentally mixed with other string identifiers.
 *
 * @example
 * ```typescript
 * // Convert a branch name string to a branded type
 * const branchName = asBranchName('feature/add-new-metrics');
 *
 * // Use with a function requiring BranchName parameter
 * const branchDetails = getBranchDetails(branchName); // Type-safe
 * ```
 *
 * @param value - The string to convert to a BranchName
 * @returns The same string, but with the BranchName branded type
 * @public
 */
export function asBranchName(value: string): BranchName {
  return value as BranchName;
}

/**
 * Converts a string to an AnalyzerShortcode branded type
 *
 * This helper function safely converts a regular string to the AnalyzerShortcode branded type.
 * AnalyzerShortcode is used to type-safely represent DeepSource analyzer identifiers
 * (like "python", "javascript", etc.) throughout the codebase, ensuring they cannot
 * be accidentally mixed with other string identifiers.
 *
 * @example
 * ```typescript
 * // Convert an analyzer code string to a branded type
 * const analyzerCode = asAnalyzerShortcode('python');
 *
 * // Use with a function requiring AnalyzerShortcode parameter
 * const analyzerDetails = getAnalyzerDetails(analyzerCode); // Type-safe
 * ```
 *
 * @param value - The string to convert to an AnalyzerShortcode
 * @returns The same string, but with the AnalyzerShortcode branded type
 * @public
 */
export function asAnalyzerShortcode(value: string): AnalyzerShortcode {
  return value as AnalyzerShortcode;
}

/**
 * Converts a string to a GraphQLNodeId branded type
 *
 * This helper function safely converts a regular string to the GraphQLNodeId branded type.
 * GraphQLNodeId is used to type-safely represent internal GraphQL node identifiers
 * throughout the codebase, ensuring they cannot be accidentally mixed with other identifiers.
 * These IDs are typically used with the Relay-style GraphQL interface.
 *
 * @example
 * ```typescript
 * // Convert a GraphQL node ID string to a branded type
 * const nodeId = asGraphQLNodeId('QWNjb3VudDoxMjM0NQ==');
 *
 * // Use with a function requiring GraphQLNodeId parameter
 * const node = getNodeById(nodeId); // Type-safe
 * ```
 *
 * @param value - The string to convert to a GraphQLNodeId
 * @returns The same string, but with the GraphQLNodeId branded type
 * @public
 */
export function asGraphQLNodeId(value: string): GraphQLNodeId {
  return value as GraphQLNodeId;
}
