/**
 * @fileoverview Type definitions for accessing private methods in tests
 *
 * These types are used to safely access private methods of classes during testing
 * without using the `any` type. They provide type safety while allowing tests
 * to verify internal implementation details.
 */

/* global jest */

import { SecurityClient } from '../client/security-client.js';
import { MetricsClient } from '../client/metrics-client.js';
import { IssuesClient } from '../client/issues-client.js';
import { RunsClient } from '../client/runs-client.js';

/**
 * Type for accessing private methods of SecurityClient in tests
 */
export type SecurityClientTestable = SecurityClient & {
  buildComplianceReportQuery: () => string;
  buildVulnerabilitiesQuery: () => string;
  extractComplianceReportFromResponse: (
    _data: unknown,
    _reportType: string,
    _reportKey: string
  ) => unknown;
  extractVulnerabilitiesFromResponse: (_data: unknown) => unknown[];
};

/**
 * Type for accessing private methods of MetricsClient in tests
 */
export type MetricsClientTestable = MetricsClient & {
  buildQualityMetricsQuery: () => string;
  buildUpdateThresholdMutation: () => string;
  buildUpdateSettingMutation: () => string;
  buildMetricHistoryQuery: () => string;
  extractMetricsFromResponse: (_data: unknown) => unknown[];
  extractHistoryFromResponse: (_data: unknown, _params: unknown) => unknown;
  calculateTrend: (_values: unknown[]) => unknown;
  handleMetricsError: (_error: unknown) => never;
  handleTestEnvironment: (_params: unknown) => unknown;
};

/**
 * Type for accessing private methods of IssuesClient in tests
 */
export type IssuesClientTestable = IssuesClient & {
  buildIssuesQuery: () => string;
  extractIssuesFromResponse: (_data: unknown) => unknown[];
  handleIssuesError: (_error: unknown) => never;
};

/**
 * Type for accessing private methods of RunsClient in tests
 */
export type RunsClientTestable = RunsClient & {
  buildRunsQuery: () => string;
  buildRunByUidQuery: () => string;
  buildRunByCommitQuery: () => string;
  extractRunsFromResponse: (_data: unknown) => unknown[];
  extractSingleRunFromResponse: (_data: unknown) => unknown;
  mapRunNode: (_node: unknown) => unknown;
  handleRunsError: (_error: unknown) => never;
};

/**
 * Type for test mock with common DeepSource client methods
 */
export interface MockDeepSourceClient {
  findProjectByKey: ReturnType<typeof jest.fn>;
  executeGraphQL: ReturnType<typeof jest.fn>;
  createEmptyPaginatedResponse: ReturnType<typeof jest.fn>;
  normalizePaginationParams: ReturnType<typeof jest.fn>;
  logger: {
    info: ReturnType<typeof jest.fn>;
    error: ReturnType<typeof jest.fn>;
    debug: ReturnType<typeof jest.fn>;
    warn: ReturnType<typeof jest.fn>;
  };
}

/**
 * Type for accessing static methods of DeepSourceClient in tests
 */
export interface DeepSourceClientStatic {
  logger: {
    info: ReturnType<typeof jest.fn>;
    error: ReturnType<typeof jest.fn>;
    debug: ReturnType<typeof jest.fn>;
    warn: ReturnType<typeof jest.fn>;
  };
  iterateVulnerabilities: (_edges: unknown) => Generator<unknown>;
  MAX_ITERATIONS: number;
  isValidVulnerabilityNode: ReturnType<typeof jest.fn>;
  handleGraphQLError: ReturnType<typeof jest.fn>;
  isError: ReturnType<typeof jest.fn>;
}
