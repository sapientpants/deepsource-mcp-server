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
import { Logger } from '../utils/logging/logger.js';
import { ProjectKey } from '../types/branded.js';
import { PaginatedResponse, PaginationParams } from '../models/pagination.js';
import { Project } from '../types/graphql-responses.js';

/**
 * Type for accessing private methods of SecurityClient in tests
 */
export interface SecurityClientTestable {
  buildComplianceReportQuery(): string;
  buildVulnerabilitiesQuery(): string;
  extractComplianceReportFromResponse(
    data: unknown,
    reportType: string,
    reportKey: string
  ): unknown;
  extractVulnerabilitiesFromResponse(data: unknown): unknown[];
}

/**
 * Type for accessing private methods of MetricsClient in tests
 */
export interface MetricsClientTestable {
  buildQualityMetricsQuery(): string;
  buildUpdateThresholdMutation(): string;
  buildUpdateSettingMutation(): string;
  buildMetricHistoryQuery(): string;
  extractMetricsFromResponse(data: unknown): unknown[];
  extractHistoryFromResponse(data: unknown, params: unknown): unknown;
  calculateTrend(values: unknown[]): unknown;
  handleMetricsError(error: unknown): unknown[] | never;
  handleTestEnvironment(params: unknown): unknown;
}

/**
 * Type for accessing private methods of IssuesClient in tests
 */
export interface IssuesClientTestable {
  buildIssuesQuery(): string;
  extractIssuesFromResponse(data: unknown): unknown[];
  handleIssuesError(error: unknown):
    | {
        items: unknown[];
        totalCount: number;
        pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
      }
    | never;
}

/**
 * Type for accessing private methods of RunsClient in tests
 */
export interface RunsClientTestable {
  buildRunsQuery(): string;
  buildRunByUidQuery(): string;
  buildRunByCommitQuery(): string;
  extractRunsFromResponse(data: unknown): unknown[];
  extractSingleRunFromResponse(data: unknown): unknown;
  mapRunNode(node: unknown): unknown;
  handleRunsError(error: unknown):
    | {
        items: unknown[];
        totalCount: number;
        pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
      }
    | never;
}

/**
 * Type for test mock with common DeepSource client methods
 */
export interface MockDeepSourceClient {
  findProjectByKey: jest.MockedFunction<(projectKey: ProjectKey) => Promise<Project | null>>;
  executeGraphQL: jest.MockedFunction<
    (query: string, variables?: Record<string, unknown>) => Promise<unknown>
  >;
  createEmptyPaginatedResponse: jest.MockedFunction<() => PaginatedResponse<unknown>>;
  normalizePaginationParams: jest.MockedFunction<(params: unknown) => PaginationParams>;
  logger: {
    info: jest.MockedFunction<(message: string, data?: unknown) => void>;
    error: jest.MockedFunction<(message: string, error?: unknown) => void>;
    debug: jest.MockedFunction<(message: string, data?: unknown) => void>;
    warn: jest.MockedFunction<(message: string, data?: unknown) => void>;
  };
}

/**
 * Type for accessing static methods of DeepSourceClient in tests
 */
export interface DeepSourceClientStatic {
  logger: {
    info: jest.Mock;
    error: jest.Mock;
    debug: jest.Mock;
    warn: jest.Mock;
  };
  iterateVulnerabilities: (_edges: unknown) => Generator<unknown>;
  MAX_ITERATIONS: number;
  isValidVulnerabilityNode: jest.Mock;
  handleGraphQLError: jest.Mock;
  isError: jest.Mock;
}
