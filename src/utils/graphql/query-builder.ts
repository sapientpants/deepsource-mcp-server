/**
 * @fileoverview GraphQL Query Builder for constructing type-safe queries
 *
 * This module provides a fluent API for building GraphQL queries with:
 * - Type safety for fields and arguments
 * - Automatic fragment generation
 * - Query optimization
 * - Reusable field selections
 */

import { ProjectKey, RunId } from '../../types/branded.js';

/**
 * GraphQL field selection
 */
export interface FieldSelection {
  name: string;
  alias?: string;
  args?: Record<string, unknown>;
  fields?: FieldSelection[];
}

/**
 * GraphQL fragment definition
 */
export interface Fragment {
  name: string;
  type: string;
  fields: FieldSelection[];
}

/**
 * Query operation type
 */
export type OperationType = 'query' | 'mutation' | 'subscription';

/**
 * GraphQL query builder for constructing type-safe queries
 */
export class GraphQLQueryBuilder {
  private operation: OperationType = 'query';
  private operationName?: string;
  private variables: Map<string, { type: string; value: unknown }> = new Map();
  private selections: FieldSelection[] = [];
  private fragments: Map<string, Fragment> = new Map();

  /**
   * Creates a new query builder
   * @param operation - The operation type (default: 'query')
   */
  constructor(operation: OperationType = 'query') {
    this.operation = operation;
  }

  /**
   * Sets the operation name
   */
  withName(name: string): this {
    this.operationName = name;
    return this;
  }

  /**
   * Adds a variable to the query
   */
  withVariable(name: string, type: string, value: unknown): this {
    this.variables.set(name, { type, value });
    return this;
  }

  /**
   * Adds a field selection
   */
  select(field: string | FieldSelection): this {
    if (typeof field === 'string') {
      this.selections.push({ name: field });
    } else {
      this.selections.push(field);
    }
    return this;
  }

  /**
   * Adds multiple field selections
   */
  selectMany(...fields: (string | FieldSelection)[]): this {
    fields.forEach((field) => this.select(field));
    return this;
  }

  /**
   * Adds a nested field selection
   */
  selectNested(
    name: string,
    fields: (string | FieldSelection)[],
    args?: Record<string, unknown>
  ): this {
    const nestedFields = fields.map((f) => (typeof f === 'string' ? { name: f } : f));
    this.selections.push({ name, fields: nestedFields, args });
    return this;
  }

  /**
   * Adds a fragment
   */
  withFragment(fragment: Fragment): this {
    this.fragments.set(fragment.name, fragment);
    return this;
  }

  /**
   * Uses a fragment in the selection
   */
  useFragment(fragmentName: string): this {
    this.selections.push({ name: `...${fragmentName}` });
    return this;
  }

  /**
   * Builds the query string
   */
  build(): { query: string; variables: Record<string, unknown> } {
    const variableDeclarations = this.buildVariableDeclarations();
    const selectionSet = this.buildSelectionSet(this.selections);
    const fragmentDefinitions = this.buildFragments();

    const operationDef = this.operationName
      ? `${this.operation} ${this.operationName}`
      : this.operation;

    const queryParts = [
      variableDeclarations ? `${operationDef}(${variableDeclarations})` : operationDef,
      `{${selectionSet}\n}`,
    ];

    if (fragmentDefinitions) {
      queryParts.push(fragmentDefinitions);
    }

    const query = queryParts.join(' ');
    const variables: Record<string, unknown> = {};

    this.variables.forEach((varDef, name) => {
      variables[name] = varDef.value;
    });

    return { query, variables };
  }

  /**
   * Builds variable declarations
   */
  private buildVariableDeclarations(): string {
    if (this.variables.size === 0) return '';

    const declarations: string[] = [];
    this.variables.forEach((varDef, name) => {
      declarations.push(`$${name}: ${varDef.type}`);
    });

    return declarations.join(', ');
  }

  /**
   * Builds a selection set
   */
  private buildSelectionSet(selections: FieldSelection[], indent = 1): string {
    const indentStr = '  '.repeat(indent);
    const fields = selections.map((sel) => {
      // Handle fragment spreads
      if (sel.name && sel.name.startsWith('...')) {
        return `${indentStr}${sel.name}`;
      }

      // Handle string selections that get converted to FieldSelection
      if (!sel.name) {
        return `${indentStr}${sel}`;
      }

      let field = sel.alias ? `${sel.alias}: ${sel.name}` : sel.name;

      if (sel.args && Object.keys(sel.args).length > 0) {
        const args = this.buildArguments(sel.args);
        field += `(${args})`;
      }

      if (sel.fields && sel.fields.length > 0) {
        const nestedFields = this.buildSelectionSet(sel.fields, indent + 1);
        field += ` {${nestedFields}\n${indentStr}}`;
      }

      return `${indentStr}${field}`;
    });

    return fields.length > 0 ? `\n${fields.join('\n')}` : '';
  }

  /**
   * Builds argument string
   */
  private buildArguments(args: Record<string, unknown>): string {
    return Object.entries(args)
      .map(([key, value]) => {
        if (typeof value === 'string' && value.startsWith('$')) {
          // Variable reference
          return `${key}: ${value}`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join(', ');
  }

  /**
   * Builds fragment definitions
   */
  private buildFragments(): string {
    if (this.fragments.size === 0) return '';

    const fragmentDefs: string[] = [];
    this.fragments.forEach((fragment) => {
      const fields = this.buildSelectionSet(fragment.fields);
      fragmentDefs.push(`fragment ${fragment.name} on ${fragment.type} {${fields}\n}`);
    });

    return '\n' + fragmentDefs.join('\n');
  }

  /**
   * Static factory methods for common queries
   */

  /**
   * Creates a query builder for fetching projects
   */
  static projects(): GraphQLQueryBuilder {
    return new GraphQLQueryBuilder().withName('GetProjects').selectNested('viewer', [
      {
        name: 'accounts',
        fields: [
          { name: 'id' },
          { name: 'name' },
          {
            name: 'repositories',
            fields: [{ name: 'edges' }],
          },
        ],
      },
    ]);
  }

  /**
   * Creates a query builder for fetching a specific run
   */
  static run(projectKey: ProjectKey, runId: RunId): GraphQLQueryBuilder {
    return new GraphQLQueryBuilder()
      .withName('GetRun')
      .withVariable('projectKey', 'String!', projectKey)
      .withVariable('runId', 'ID!', runId)
      .selectNested(
        'run',
        [
          { name: 'id' },
          { name: 'commitOid' },
          { name: 'createdAt' },
          { name: 'updatedAt' },
          { name: 'status' },
          {
            name: 'checks',
            fields: [{ name: 'analyzer' }, { name: 'status' }, { name: 'summary' }],
          },
        ],
        { projectKey: '$projectKey', runUid: '$runId' }
      );
  }

  /**
   * Creates a query builder for fetching quality metrics
   */
  static qualityMetrics(projectKey: ProjectKey): GraphQLQueryBuilder {
    return new GraphQLQueryBuilder()
      .withName('GetQualityMetrics')
      .withVariable('projectKey', 'String!', projectKey)
      .selectNested(
        'repository',
        [
          {
            name: 'metrics',
            fields: [
              { name: 'name' },
              { name: 'shortcode' },
              { name: 'description' },
              { name: 'positiveDirection' },
              { name: 'unit' },
              { name: 'minValueAllowed' },
              { name: 'maxValueAllowed' },
              { name: 'isReported' },
              { name: 'isThresholdEnforced' },
              {
                name: 'items',
                fields: [
                  { name: 'id' },
                  { name: 'key' },
                  { name: 'threshold' },
                  { name: 'latestValue' },
                  { name: 'latestValueDisplay' },
                  { name: 'thresholdStatus' },
                ],
              },
            ],
          },
        ],
        { key: '$projectKey' }
      );
  }

  /**
   * Creates a reusable fragment for issue fields
   */
  static issueFieldsFragment(): Fragment {
    return {
      name: 'IssueFields',
      type: 'Issue',
      fields: [
        { name: 'id' },
        { name: 'title' },
        { name: 'category' },
        { name: 'issueCode' },
        { name: 'issuePriority' },
        { name: 'shortDescription' },
        { name: 'beginLine' },
        { name: 'endLine' },
        { name: 'beginColumn' },
        { name: 'endColumn' },
        { name: 'path' },
        { name: 'analyzer' },
        { name: 'tags' },
      ],
    };
  }

  /**
   * Creates a reusable fragment for run fields
   */
  static runFieldsFragment(): Fragment {
    return {
      name: 'RunFields',
      type: 'Run',
      fields: [
        { name: 'runUid' },
        { name: 'commitOid' },
        { name: 'createdAt' },
        { name: 'updatedAt' },
        { name: 'status' },
        { name: 'summary' },
        { name: 'triggeredVia' },
        { name: 'branch' },
      ],
    };
  }
}
