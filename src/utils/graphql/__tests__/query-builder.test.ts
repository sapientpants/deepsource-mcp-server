/**
 * @fileoverview Tests for GraphQL Query Builder
 */

import { describe, it, expect } from '@jest/globals';
import { GraphQLQueryBuilder } from '../query-builder.js';
import { asProjectKey, asRunId } from '../../../types/branded.js';

describe('GraphQLQueryBuilder', () => {
  describe('Basic Query Building', () => {
    it('should build a simple query', () => {
      const builder = new GraphQLQueryBuilder();
      const { query, variables } = builder.select('id').select('name').build();

      expect(query).toBe('query {\n  id\n  name\n}');
      expect(variables).toEqual({});
    });

    it('should build a named query', () => {
      const builder = new GraphQLQueryBuilder();
      const { query } = builder.withName('GetUser').select('id').select('name').build();

      expect(query).toBe('query GetUser {\n  id\n  name\n}');
    });

    it('should build a mutation', () => {
      const builder = new GraphQLQueryBuilder('mutation');
      const { query } = builder.withName('UpdateUser').select('id').build();

      expect(query).toBe('mutation UpdateUser {\n  id\n}');
    });
  });

  describe('Variables', () => {
    it('should handle variables', () => {
      const builder = new GraphQLQueryBuilder();
      const { query, variables } = builder
        .withName('GetUser')
        .withVariable('id', 'ID!', '123')
        .selectNested('user', ['id', 'name'], { id: '$id' })
        .build();

      expect(query).toContain('query GetUser($id: ID!)');
      expect(query).toContain('user(id: $id)');
      expect(variables).toEqual({ id: '123' });
    });

    it('should handle multiple variables', () => {
      const builder = new GraphQLQueryBuilder();
      const { query, variables } = builder
        .withVariable('first', 'Int', 10)
        .withVariable('after', 'String', 'cursor123')
        .selectNested('items', ['id'], { first: '$first', after: '$after' })
        .build();

      expect(query).toContain('$first: Int, $after: String');
      expect(variables).toEqual({ first: 10, after: 'cursor123' });
    });
  });

  describe('Nested Fields', () => {
    it('should handle nested field selections', () => {
      const builder = new GraphQLQueryBuilder();
      const { query } = builder
        .selectNested('user', [
          'id',
          'name',
          {
            name: 'profile',
            fields: ['bio', 'avatar'],
          },
        ])
        .build();

      expect(query).toContain('user {');
      expect(query).toContain('id');
      expect(query).toContain('name');
      expect(query).toContain('profile {');
      expect(query).toContain('bio');
      expect(query).toContain('avatar');
    });

    it('should handle deeply nested fields', () => {
      const builder = new GraphQLQueryBuilder();
      const { query } = builder
        .selectNested('repository', [
          'id',
          {
            name: 'issues',
            args: { first: 10 },
            fields: [
              {
                name: 'edges',
                fields: [
                  {
                    name: 'node',
                    fields: ['id', 'title'],
                  },
                ],
              },
            ],
          },
        ])
        .build();

      expect(query).toContain('repository {');
      expect(query).toContain('issues(first: 10) {');
      expect(query).toContain('edges {');
      expect(query).toContain('node {');
      expect(query).toContain('title');
    });
  });

  describe('Field Aliases', () => {
    it('should handle field aliases', () => {
      const builder = new GraphQLQueryBuilder();
      const { query } = builder
        .select({ name: 'id', alias: 'userId' })
        .select({ name: 'name', alias: 'userName' })
        .build();

      expect(query).toContain('userId: id');
      expect(query).toContain('userName: name');
    });
  });

  describe('Fragments', () => {
    it('should handle fragment definitions and usage', () => {
      const fragment = {
        name: 'UserFields',
        type: 'User',
        fields: [{ name: 'id' }, { name: 'name' }, { name: 'email' }],
      };

      const builder = new GraphQLQueryBuilder();
      const { query } = builder
        .withFragment(fragment)
        .selectNested('user', [])
        .useFragment('UserFields')
        .build();

      expect(query).toContain('fragment UserFields on User {');
      expect(query).toContain('...UserFields');
    });
  });

  describe('selectMany', () => {
    it('should handle multiple selections at once', () => {
      const builder = new GraphQLQueryBuilder();
      const { query } = builder
        .selectMany('id', 'name', 'email', { name: 'age', alias: 'userAge' })
        .build();

      expect(query).toContain('id');
      expect(query).toContain('name');
      expect(query).toContain('email');
      expect(query).toContain('userAge: age');
    });
  });

  describe('Static Factory Methods', () => {
    it('should create a projects query', () => {
      const { query } = GraphQLQueryBuilder.projects().build();

      expect(query).toContain('query GetProjects');
      expect(query).toContain('viewer {');
      expect(query).toContain('accounts {');
      expect(query).toContain('repositories {');
    });

    it('should create a run query', () => {
      const projectKey = asProjectKey('test-project');
      const runId = asRunId('run-123');
      const { query, variables } = GraphQLQueryBuilder.run(projectKey, runId).build();

      expect(query).toContain('query GetRun($projectKey: String!, $runId: ID!)');
      expect(query).toContain('run(projectKey: $projectKey, runUid: $runId)');
      expect(variables).toEqual({
        projectKey: 'test-project',
        runId: 'run-123',
      });
    });

    it('should create a quality metrics query', () => {
      const projectKey = asProjectKey('test-project');
      const { query, variables } = GraphQLQueryBuilder.qualityMetrics(projectKey).build();

      expect(query).toContain('query GetQualityMetrics($projectKey: String!)');
      expect(query).toContain('repository(key: $projectKey)');
      expect(query).toContain('metrics {');
      expect(query).toContain('items {');
      expect(variables).toEqual({ projectKey: 'test-project' });
    });
  });

  describe('Fragments Factory Methods', () => {
    it('should create issue fields fragment', () => {
      const fragment = GraphQLQueryBuilder.issueFieldsFragment();

      expect(fragment.name).toBe('IssueFields');
      expect(fragment.type).toBe('Issue');
      expect(fragment.fields).toContainEqual({ name: 'id' });
      expect(fragment.fields).toContainEqual({ name: 'title' });
      expect(fragment.fields).toContainEqual({ name: 'issueCode' });
    });

    it('should create run fields fragment', () => {
      const fragment = GraphQLQueryBuilder.runFieldsFragment();

      expect(fragment.name).toBe('RunFields');
      expect(fragment.type).toBe('Run');
      expect(fragment.fields).toContainEqual({ name: 'runUid' });
      expect(fragment.fields).toContainEqual({ name: 'commitOid' });
      expect(fragment.fields).toContainEqual({ name: 'status' });
    });
  });

  describe('Complex Query Example', () => {
    it('should build a complex query with all features', () => {
      const issueFragment = GraphQLQueryBuilder.issueFieldsFragment();

      const builder = new GraphQLQueryBuilder();
      const { query, variables } = builder
        .withName('GetRepositoryData')
        .withVariable('projectKey', 'String!', 'my-project')
        .withVariable('first', 'Int', 50)
        .withFragment(issueFragment)
        .selectNested(
          'repository',
          [
            'id',
            'name',
            {
              name: 'issues',
              args: { first: '$first' },
              fields: [
                {
                  name: 'edges',
                  fields: [
                    {
                      name: 'node',
                      fields: ['...IssueFields'],
                    },
                  ],
                },
                {
                  name: 'pageInfo',
                  fields: ['hasNextPage', 'endCursor'],
                },
              ],
            },
          ],
          { key: '$projectKey' }
        )
        .build();

      expect(query).toContain('query GetRepositoryData($projectKey: String!, $first: Int)');
      expect(query).toContain('repository(key: $projectKey)');
      expect(query).toContain('issues(first: $first)');
      expect(query).toContain('...IssueFields');
      expect(query).toContain('fragment IssueFields on Issue');
      expect(variables).toEqual({
        projectKey: 'my-project',
        first: 50,
      });
    });
  });
});
