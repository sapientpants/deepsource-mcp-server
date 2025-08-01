/**
 * @fileoverview Dependency vulnerabilities handler for the DeepSource MCP server
 * This module provides MCP tool handlers for fetching dependency vulnerabilities.
 */

import { DeepSourceClient } from '../deepsource.js';
import { ApiResponse } from '../models/common.js';
import { VulnerabilityOccurrence } from '../models/security.js';
import { createLogger } from '../utils/logging/logger.js';
import { PaginationParams } from '../utils/pagination/types.js';
import { BaseHandlerDeps } from './base/handler.interface.js';
import {
  createBaseHandlerFactory,
  wrapInApiResponse,
  createDefaultHandlerDeps,
} from './base/handler.factory.js';

// Logger for the dependency vulnerabilities handler
const logger = createLogger('DependencyVulnerabilitiesHandler');

/**
 * Interface for parameters for fetching dependency vulnerabilities
 * @public
 */
export interface DeepsourceDependencyVulnerabilitiesParams extends PaginationParams {
  /** DeepSource project key to fetch vulnerabilities for */
  projectKey: string;
}

/**
 * Creates a dependency vulnerabilities handler with injected dependencies
 * @param deps - The dependencies for the handler
 * @returns The configured handler factory
 */
export const createDependencyVulnerabilitiesHandler = createBaseHandlerFactory(
  'dependency_vulnerabilities',
  async (
    deps: BaseHandlerDeps,
    { projectKey, first, after, last, before }: DeepsourceDependencyVulnerabilitiesParams
  ) => {
    const apiKey = deps.getApiKey();
    deps.logger.debug('API key retrieved from config', {
      length: apiKey.length,
      prefix: `${apiKey.substring(0, 5)}...`,
    });

    const client = new DeepSourceClient(apiKey);

    deps.logger.info('Fetching dependency vulnerabilities', {
      projectKey,
    });

    const vulnerabilities = await client.getDependencyVulnerabilities(projectKey, {
      first,
      after,
      last,
      before,
    });

    deps.logger.info('Successfully fetched dependency vulnerabilities', {
      count: vulnerabilities.items.length,
      totalCount: vulnerabilities.totalCount,
      hasNextPage: vulnerabilities.pageInfo?.hasNextPage,
      hasPreviousPage: vulnerabilities.pageInfo?.hasPreviousPage,
    });

    const vulnerabilitiesData = {
      vulnerabilities: vulnerabilities.items.map((vulnerability: VulnerabilityOccurrence) => ({
        id: vulnerability.id,
        title: vulnerability.vulnerability.summary || vulnerability.vulnerability.identifier,
        severity: vulnerability.vulnerability.severity,
        cvssScore:
          vulnerability.vulnerability.cvssV3BaseScore ||
          vulnerability.vulnerability.cvssV2BaseScore,
        packageName: vulnerability.package.name,
        packageVersion: vulnerability.packageVersion.version,
        fixedIn:
          vulnerability.vulnerability.fixedVersions.length > 0
            ? vulnerability.vulnerability.fixedVersions[0]
            : null,
        description:
          vulnerability.vulnerability.details || vulnerability.vulnerability.summary || '',
        identifiers: [
          vulnerability.vulnerability.identifier,
          ...vulnerability.vulnerability.aliases,
        ],
        references: vulnerability.vulnerability.referenceUrls,
        // Add metadata to help with risk assessment
        risk_assessment: {
          severity_level: getSeverityLevel(vulnerability.vulnerability.severity),
          cvss_description: describeCvssScore(
            vulnerability.vulnerability.cvssV3BaseScore ||
              vulnerability.vulnerability.cvssV2BaseScore ||
              null
          ),
          fixed_version_available: vulnerability.vulnerability.fixedVersions.length > 0,
          remediation_advice: getRemediationAdvice(vulnerability),
        },
      })),
      pageInfo: {
        hasNextPage: vulnerabilities.pageInfo?.hasNextPage || false,
        hasPreviousPage: vulnerabilities.pageInfo?.hasPreviousPage || false,
        startCursor: vulnerabilities.pageInfo?.startCursor || null,
        endCursor: vulnerabilities.pageInfo?.endCursor || null,
      },
      totalCount: vulnerabilities.totalCount,
      // Provide helpful information and guidance
      usage_examples: {
        pagination: {
          next_page: 'For forward pagination, use first and after parameters',
          previous_page: 'For backward pagination, use last and before parameters',
        },
        related_tools: {
          issues: 'Use the project_issues tool to get code issues in the project',
          compliance: 'Use the compliance_report tool to get security compliance reports',
        },
      },
    };

    return wrapInApiResponse(vulnerabilitiesData);
  }
);

/**
 * Fetches and returns dependency vulnerabilities from a DeepSource project
 * @param params - Parameters for fetching vulnerabilities, including project key and pagination
 * @returns A response containing the vulnerabilities data
 * @throws Error if the DEEPSOURCE_API_KEY environment variable is not set
 * @public
 */
export async function handleDeepsourceDependencyVulnerabilities(
  params: DeepsourceDependencyVulnerabilitiesParams
): Promise<ApiResponse> {
  const deps = createDefaultHandlerDeps({ logger });
  const handler = createDependencyVulnerabilitiesHandler(deps);
  return handler(params);
}

/**
 * Helper function to get human-readable severity level
 * @param severity The raw severity value
 * @returns A detailed description of the severity level
 * @private
 */
function getSeverityLevel(severity: string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return 'Critical - Requires immediate attention. Represents a serious vulnerability that could be exploited with significant impact.';
    case 'HIGH':
      return 'High - Should be addressed promptly. Represents a vulnerability with substantial impact if exploited.';
    case 'MEDIUM':
      return 'Medium - Should be planned for remediation. Represents a vulnerability that could have moderate impact if exploited.';
    case 'LOW':
      return 'Low - Fix when possible. Represents a vulnerability with limited impact even if exploited.';
    default:
      return `Unknown severity level: ${severity}`;
  }
}

/**
 * Helper function to describe CVSS score
 * @param cvssScore The CVSS score
 * @returns A description of the CVSS score
 * @private
 */
function describeCvssScore(cvssScore: number | null): string {
  if (cvssScore === null || cvssScore === undefined) {
    return 'No CVSS score available';
  }

  if (cvssScore >= 9.0) {
    return `Critical (${cvssScore}/10) - Extremely severe vulnerability with highly likely exploitation and severe impact`;
  } else if (cvssScore >= 7.0) {
    return `High (${cvssScore}/10) - Severe vulnerability with likely exploitation and significant impact`;
  } else if (cvssScore >= 4.0) {
    return `Medium (${cvssScore}/10) - Moderate vulnerability with possible exploitation and moderate impact`;
  } else {
    return `Low (${cvssScore}/10) - Minor vulnerability with limited exploitation potential and impact`;
  }
}

/**
 * Helper function to generate remediation advice
 * @param vulnerability The vulnerability occurrence data
 * @returns Remediation advice for the vulnerability
 * @private
 */
function getRemediationAdvice(vulnerability: VulnerabilityOccurrence): string {
  const fixedVersions = vulnerability.vulnerability.fixedVersions;
  const packageName = vulnerability.package.name;

  if (fixedVersions && fixedVersions.length > 0) {
    return `Update ${packageName} to version ${fixedVersions[0]} or later to resolve this vulnerability.`;
  } else if (packageName) {
    return `Consider replacing ${packageName} with a secure alternative, as no fixed version is currently available.`;
  } else {
    return 'Review the vulnerability details and take appropriate mitigation measures based on your application context.';
  }
}
