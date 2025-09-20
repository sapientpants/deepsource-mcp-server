/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RetryPolicyType,
  RETRY_POLICIES,
  ENDPOINT_POLICIES,
  getRetryPolicyForEndpoint,
  isRetriableByPolicy,
  createCustomPolicy,
} from '../../../utils/retry/retry-policy.js';
import { ErrorCategory } from '../../../utils/errors/categories.js';

describe('Retry Policy', () => {
  describe('RETRY_POLICIES', () => {
    it('should have all policy types defined', () => {
      expect(RETRY_POLICIES[RetryPolicyType.AGGRESSIVE]).toBeDefined();
      expect(RETRY_POLICIES[RetryPolicyType.STANDARD]).toBeDefined();
      expect(RETRY_POLICIES[RetryPolicyType.CAUTIOUS]).toBeDefined();
      expect(RETRY_POLICIES[RetryPolicyType.NONE]).toBeDefined();
    });

    it('should have correct aggressive policy settings', () => {
      const policy = RETRY_POLICIES[RetryPolicyType.AGGRESSIVE];
      expect(policy.maxAttempts).toBe(5);
      expect(policy.name).toBe('aggressive');
      expect(policy.respectRetryAfter).toBe(true);
      expect(policy.retriableErrors).toContain(ErrorCategory.RATE_LIMIT);
      expect(policy.retriableErrors).toContain(ErrorCategory.NETWORK);
      expect(policy.retriableErrors).toContain(ErrorCategory.SERVER);
      expect(policy.retriableErrors).toContain(ErrorCategory.TIMEOUT);
    });

    it('should have correct standard policy settings', () => {
      const policy = RETRY_POLICIES[RetryPolicyType.STANDARD];
      expect(policy.maxAttempts).toBe(3);
      expect(policy.name).toBe('standard');
      expect(policy.respectRetryAfter).toBe(true);
    });

    it('should have correct cautious policy settings', () => {
      const policy = RETRY_POLICIES[RetryPolicyType.CAUTIOUS];
      expect(policy.maxAttempts).toBe(1);
      expect(policy.name).toBe('cautious');
      expect(policy.baseDelay).toBeGreaterThan(RETRY_POLICIES[RetryPolicyType.STANDARD].baseDelay);
    });

    it('should have correct none policy settings', () => {
      const policy = RETRY_POLICIES[RetryPolicyType.NONE];
      expect(policy.maxAttempts).toBe(0);
      expect(policy.name).toBe('none');
      expect(policy.retriableErrors).toHaveLength(0);
      expect(policy.respectRetryAfter).toBe(false);
    });
  });

  describe('ENDPOINT_POLICIES', () => {
    it('should map read operations to appropriate policies', () => {
      expect(ENDPOINT_POLICIES.get('projects')).toBe(RetryPolicyType.AGGRESSIVE);
      expect(ENDPOINT_POLICIES.get('project_issues')).toBe(RetryPolicyType.AGGRESSIVE);
      expect(ENDPOINT_POLICIES.get('quality_metrics')).toBe(RetryPolicyType.STANDARD);
      expect(ENDPOINT_POLICIES.get('runs')).toBe(RetryPolicyType.STANDARD);
    });

    it('should map mutation operations to none policy', () => {
      expect(ENDPOINT_POLICIES.get('update_metric_threshold')).toBe(RetryPolicyType.NONE);
      expect(ENDPOINT_POLICIES.get('update_metric_setting')).toBe(RetryPolicyType.NONE);
    });
  });

  describe('getRetryPolicyForEndpoint', () => {
    it('should return correct policy for known endpoints', () => {
      const projectsPolicy = getRetryPolicyForEndpoint('projects');
      expect(projectsPolicy.name).toBe('aggressive');

      const updatePolicy = getRetryPolicyForEndpoint('update_metric_threshold');
      expect(updatePolicy.name).toBe('none');
    });

    it('should return standard policy for unknown endpoints', () => {
      const unknownPolicy = getRetryPolicyForEndpoint('unknown_endpoint');
      expect(unknownPolicy.name).toBe('standard');
    });
  });

  describe('isRetriableByPolicy', () => {
    const policy = RETRY_POLICIES[RetryPolicyType.STANDARD];

    it('should return true for retriable error categories', () => {
      expect(isRetriableByPolicy(ErrorCategory.RATE_LIMIT, policy)).toBe(true);
      expect(isRetriableByPolicy(ErrorCategory.NETWORK, policy)).toBe(true);
      expect(isRetriableByPolicy(ErrorCategory.SERVER, policy)).toBe(true);
      expect(isRetriableByPolicy(ErrorCategory.TIMEOUT, policy)).toBe(true);
    });

    it('should return false for non-retriable error categories', () => {
      expect(isRetriableByPolicy(ErrorCategory.AUTH, policy)).toBe(false);
      expect(isRetriableByPolicy(ErrorCategory.CLIENT, policy)).toBe(false);
      expect(isRetriableByPolicy(ErrorCategory.NOT_FOUND, policy)).toBe(false);
    });

    it('should respect the policy retriable errors list', () => {
      const nonePolicy = RETRY_POLICIES[RetryPolicyType.NONE];
      expect(isRetriableByPolicy(ErrorCategory.RATE_LIMIT, nonePolicy)).toBe(false);
      expect(isRetriableByPolicy(ErrorCategory.NETWORK, nonePolicy)).toBe(false);
    });
  });

  describe('createCustomPolicy', () => {
    it('should create a custom policy with overrides', () => {
      const customPolicy = createCustomPolicy({
        maxAttempts: 10,
        baseDelay: 500,
        name: 'custom-test',
      });

      expect(customPolicy.maxAttempts).toBe(10);
      expect(customPolicy.baseDelay).toBe(500);
      expect(customPolicy.name).toBe('custom-test');
      // Should inherit other properties from standard
      expect(customPolicy.respectRetryAfter).toBe(true);
      expect(customPolicy.retriableErrors).toEqual(
        RETRY_POLICIES[RetryPolicyType.STANDARD].retriableErrors
      );
    });

    it('should use default name if not provided', () => {
      const customPolicy = createCustomPolicy({
        maxAttempts: 7,
      });

      expect(customPolicy.name).toBe('custom');
      expect(customPolicy.maxAttempts).toBe(7);
    });

    it('should allow overriding all properties', () => {
      const customPolicy = createCustomPolicy({
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 10000,
        jitterFactor: 0.5,
        retriableErrors: [ErrorCategory.NETWORK],
        respectRetryAfter: false,
        name: 'minimal',
      });

      expect(customPolicy.maxAttempts).toBe(2);
      expect(customPolicy.baseDelay).toBe(2000);
      expect(customPolicy.maxDelay).toBe(10000);
      expect(customPolicy.jitterFactor).toBe(0.5);
      expect(customPolicy.retriableErrors).toEqual([ErrorCategory.NETWORK]);
      expect(customPolicy.respectRetryAfter).toBe(false);
      expect(customPolicy.name).toBe('minimal');
    });
  });

  describe('Environment variable configuration', () => {
    beforeEach(() => {
      // Store original env values
      vi.stubEnv('RETRY_MAX_ATTEMPTS', '');
      vi.stubEnv('RETRY_BASE_DELAY_MS', '');
      vi.stubEnv('RETRY_MAX_DELAY_MS', '');
    });

    it('should use environment variables when set', () => {
      vi.stubEnv('RETRY_MAX_ATTEMPTS', '7');
      vi.stubEnv('RETRY_BASE_DELAY_MS', '2000');
      vi.stubEnv('RETRY_MAX_DELAY_MS', '60000');

      // Need to re-import to pick up env changes
      vi.resetModules();
      import('../../../utils/retry/retry-policy.js').then((module) => {
        const policy = module.RETRY_POLICIES[module.RetryPolicyType.STANDARD];
        expect(policy.maxAttempts).toBe(7);
        expect(policy.baseDelay).toBe(2000);
        expect(policy.maxDelay).toBe(60000);
      });
    });
  });
});
