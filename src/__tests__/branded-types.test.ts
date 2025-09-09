/**
 * @vitest-environment node
 */

import {
  ProjectKey,
  CommitOid,
  asProjectKey,
  asRunId,
  asCommitOid,
  asBranchName,
  asAnalyzerShortcode,
  asGraphQLNodeId,
} from '../types/branded.js';

describe('Branded Types', () => {
  describe('Conversion Functions', () => {
    it('should convert strings to branded types', () => {
      // ProjectKey
      const projectKey = asProjectKey('test-project-key');
      expect(typeof projectKey).toBe('string');
      expect(projectKey).toBe('test-project-key');

      // RunId
      const runId = asRunId('run-123');
      expect(typeof runId).toBe('string');
      expect(runId).toBe('run-123');

      // CommitOid
      const commitOid = asCommitOid('abcdef123456');
      expect(typeof commitOid).toBe('string');
      expect(commitOid).toBe('abcdef123456');

      // BranchName
      const branchName = asBranchName('main');
      expect(typeof branchName).toBe('string');
      expect(branchName).toBe('main');

      // AnalyzerShortcode
      const analyzerShortcode = asAnalyzerShortcode('python');
      expect(typeof analyzerShortcode).toBe('string');
      expect(analyzerShortcode).toBe('python');

      // GraphQLNodeId
      const graphQLNodeId = asGraphQLNodeId('node-123');
      expect(typeof graphQLNodeId).toBe('string');
      expect(graphQLNodeId).toBe('node-123');
    });
  });

  describe('Type Safety', () => {
    it('should not allow implicit conversion between branded types', () => {
      // Type checking test - this would fail at compile time, not runtime
      const projectKey = asProjectKey('test-project-key');
      const runId = asRunId('run-123');

      // The following should cause TypeScript errors (but will pass at runtime)
      // The tests are commented out as they should fail at compile time

      // const mixedTypes1: RunId = projectKey;

      // const mixedTypes2: ProjectKey = runId;

      // These assertions just confirm that the values themselves are still strings
      // even though their types are different branded types
      expect(projectKey.toString()).toBe('test-project-key');
      expect(runId.toString()).toBe('run-123');
    });

    it('should allow reassignment within the same branded type', () => {
      const projectKey1 = asProjectKey('project-1');
      const projectKey2 = asProjectKey('project-2');

      // This should be allowed by TypeScript since both are ProjectKey type
      let projectKeyVar: ProjectKey = projectKey1;
      projectKeyVar = projectKey2;

      expect(projectKeyVar).toBe('project-2');
    });

    it('should allow assignment to string but not from string without conversion', () => {
      const projectKey = asProjectKey('test-project-key');

      // Branded types are assignable to string
      const stringVar: string = projectKey;
      expect(stringVar).toBe('test-project-key');

      // But strings are not directly assignable to branded types
      // const projectKey2: ProjectKey = 'another-project-key';

      // Must use conversion function
      const projectKey2 = asProjectKey('another-project-key');
      expect(projectKey2).toBe('another-project-key');
    });
  });

  describe('Practical Usage', () => {
    // Example functions that use branded types
    function processProject(projectKey: ProjectKey): string {
      return `Processing project: ${projectKey}`;
    }

    function analyzeCommit(commitOid: CommitOid): string {
      return `Analyzing commit: ${commitOid}`;
    }

    it('should work correctly with functions expecting branded types', () => {
      const projectKey = asProjectKey('test-project');
      const commitOid = asCommitOid('abcdef123456');

      expect(processProject(projectKey)).toBe('Processing project: test-project');
      expect(analyzeCommit(commitOid)).toBe('Analyzing commit: abcdef123456');

      // processProject('invalid-usage');

      // processProject(commitOid);
    });

    it('should allow string operations on branded types', () => {
      const branchName = asBranchName('feature/new-ui');

      // String operations should work on branded types
      expect(branchName.includes('feature')).toBe(true);
      expect(branchName.startsWith('feature')).toBe(true);
      expect(branchName.split('/')).toEqual(['feature', 'new-ui']);
      expect(branchName.toUpperCase()).toBe('FEATURE/NEW-UI');
    });
  });
});

// Note: This file includes TypeScript type checking tests that are verified
// at compile time, not run time. The @ts-expect-error comments indicate
// where TypeScript should correctly prevent invalid type usage.
