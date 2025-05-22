/**
 * @fileoverview GraphQL response processor for run checks queries
 * @packageDocumentation
 */

import { z } from 'zod';
import { DeepSourceIssue } from '../../../models/issues.js';
import { createLogger } from '../../logging/logger.js';

const logger = createLogger('DeepSource:RunChecksProcessor');

/**
 * Schema for issue data in GraphQL response
 */
const IssueSchema = z.object({
  shortcode: z.string().optional(),
  title: z.string().optional(),
  category: z.string().optional(),
  severity: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Schema for occurrence node in GraphQL response
 */
const OccurrenceNodeSchema = z.object({
  id: z.string().optional(),
  issue: IssueSchema.optional(),
  path: z.string().optional(),
  beginLine: z.number().optional(),
});

/**
 * Schema for page info
 */
const PageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  startCursor: z.string().optional(),
  endCursor: z.string().optional(),
});

/**
 * Schema for occurrences in check node
 */
const OccurrencesSchema = z.object({
  pageInfo: PageInfoSchema.optional(),
  totalCount: z.number().optional(),
  edges: z
    .array(
      z.object({
        node: OccurrenceNodeSchema.optional(),
      })
    )
    .optional(),
});

/**
 * Schema for check node
 */
const CheckNodeSchema = z.object({
  occurrences: OccurrencesSchema.optional(),
});

/**
 * Schema for run checks GraphQL response
 */
const RunChecksResponseSchema = z.object({
  data: z.object({
    data: z
      .object({
        run: z
          .object({
            checks: z
              .object({
                edges: z
                  .array(
                    z.object({
                      node: CheckNodeSchema,
                    })
                  )
                  .optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),
  }),
});

/**
 * Result type for processed run checks
 */
export interface ProcessedRunChecks {
  issues: DeepSourceIssue[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | undefined;
    endCursor: string | undefined;
  };
  totalCount: number;
}

/**
 * Processor for run checks GraphQL responses
 */
export class RunChecksProcessor {
  /**
   * Process a run checks GraphQL response
   * @param response - Raw GraphQL response
   * @returns Processed run checks data
   */
  static process(response: unknown): ProcessedRunChecks {
    try {
      // Validate response structure
      const validated = RunChecksResponseSchema.parse(response);

      // Extract and process data
      return this.extractIssues(validated);
    } catch (error) {
      logger.warn('Failed to parse run checks response', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty result on parse failure
      return {
        issues: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
      };
    }
  }

  /**
   * Extract issues from validated response data
   * @param validated - Validated response data
   * @returns Processed run checks data
   * @private
   */
  private static extractIssues(
    validated: z.infer<typeof RunChecksResponseSchema>
  ): ProcessedRunChecks {
    const issues: DeepSourceIssue[] = [];
    let pageInfo = {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: undefined as string | undefined,
      endCursor: undefined as string | undefined,
    };
    let totalCount = 0;

    const checks = validated.data.data?.run?.checks?.edges ?? [];

    for (const { node: check } of checks) {
      const occurrences = check.occurrences?.edges ?? [];
      const occurrencesPageInfo = check.occurrences?.pageInfo;
      const occurrencesTotalCount = check.occurrences?.totalCount ?? 0;

      // Aggregate page info (using the first check's pagination info for simplicity)
      if (occurrencesPageInfo) {
        pageInfo = {
          hasNextPage: occurrencesPageInfo.hasNextPage,
          hasPreviousPage: occurrencesPageInfo.hasPreviousPage,
          startCursor: occurrencesPageInfo.startCursor,
          endCursor: occurrencesPageInfo.endCursor,
        };
      }

      // Always aggregate the total count
      totalCount += occurrencesTotalCount;

      for (const { node: occurrence } of occurrences) {
        if (!occurrence || !occurrence.issue) continue;

        issues.push(this.createIssueFromOccurrence(occurrence));
      }
    }

    return { issues, pageInfo, totalCount };
  }

  /**
   * Create a DeepSourceIssue from an occurrence node
   * @param occurrence - Occurrence node from GraphQL response
   * @returns DeepSourceIssue object
   * @private
   */
  private static createIssueFromOccurrence(
    occurrence: z.infer<typeof OccurrenceNodeSchema>
  ): DeepSourceIssue {
    return {
      id: occurrence.id ?? 'unknown',
      shortcode: occurrence.issue?.shortcode ?? '',
      title: occurrence.issue?.title ?? 'Untitled Issue',
      category: occurrence.issue?.category ?? 'UNKNOWN',
      severity: occurrence.issue?.severity ?? 'UNKNOWN',
      status: 'OPEN',
      issue_text: occurrence.issue?.description ?? '',
      file_path: occurrence.path ?? 'N/A',
      line_number: occurrence.beginLine ?? 0,
      tags: occurrence.issue?.tags ?? [],
    };
  }
}
