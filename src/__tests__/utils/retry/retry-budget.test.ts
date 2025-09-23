/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RetryBudget, RetryBudgetManager } from '../../../utils/retry/retry-budget.js';

describe('RetryBudget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create a budget with default configuration', () => {
      const budget = new RetryBudget();
      const stats = budget.getStats();
      expect(stats.maximum).toBe(10); // Default from env or fallback
      expect(stats.consumed).toBe(0);
    });

    it('should create a budget with custom configuration', () => {
      const budget = new RetryBudget({ maxRetries: 5, timeWindow: 30000 });
      const stats = budget.getStats();
      expect(stats.maximum).toBe(5);
      expect(stats.consumed).toBe(0);
    });
  });

  describe('canRetry and consumeRetry', () => {
    it('should allow retries within budget', () => {
      const budget = new RetryBudget({ maxRetries: 3 });

      expect(budget.canRetry()).toBe(true);
      expect(budget.consumeRetry()).toBe(true);
      expect(budget.consumeRetry()).toBe(true);
      expect(budget.consumeRetry()).toBe(true);

      // Budget exhausted
      expect(budget.canRetry()).toBe(false);
      expect(budget.consumeRetry()).toBe(false);
    });

    it('should reset budget after time window', () => {
      const budget = new RetryBudget({ maxRetries: 2, timeWindow: 1000 });

      // Consume all retries
      expect(budget.consumeRetry()).toBe(true);
      expect(budget.consumeRetry()).toBe(true);
      expect(budget.canRetry()).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(1001);

      // Budget should be available again
      expect(budget.canRetry()).toBe(true);
      expect(budget.consumeRetry()).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const budget = new RetryBudget({ maxRetries: 5, timeWindow: 60000 });

      budget.consumeRetry();
      budget.consumeRetry();

      const stats = budget.getStats();
      expect(stats.consumed).toBe(2);
      expect(stats.maximum).toBe(5);
      expect(stats.remaining).toBe(3);
      expect(stats.isExhausted).toBe(false);
      expect(stats.consumedPercentage).toBe(40);
    });

    it('should calculate reset time correctly', () => {
      const budget = new RetryBudget({ maxRetries: 5, timeWindow: 10000 });

      budget.consumeRetry();

      const stats = budget.getStats();
      expect(stats.resetInMs).toBeGreaterThan(0);
      expect(stats.resetInMs).toBeLessThanOrEqual(10000);
    });

    it('should show exhausted state', () => {
      const budget = new RetryBudget({ maxRetries: 1 });
      budget.consumeRetry();

      const stats = budget.getStats();
      expect(stats.isExhausted).toBe(true);
      expect(stats.remaining).toBe(0);
      expect(stats.consumedPercentage).toBe(100);
    });
  });

  describe('reset', () => {
    it('should reset the budget', () => {
      const budget = new RetryBudget({ maxRetries: 3 });

      budget.consumeRetry();
      budget.consumeRetry();
      expect(budget.getStats().consumed).toBe(2);

      budget.reset();
      expect(budget.getStats().consumed).toBe(0);
      expect(budget.canRetry()).toBe(true);
    });
  });
});

describe('RetryBudgetManager', () => {
  let manager: RetryBudgetManager;

  beforeEach(() => {
    manager = RetryBudgetManager.getInstance();
    manager.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RetryBudgetManager.getInstance();
      const instance2 = RetryBudgetManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getBudget', () => {
    it('should create and retrieve budgets by endpoint', () => {
      const budget1 = manager.getBudget('endpoint1');
      const budget2 = manager.getBudget('endpoint2');
      const budget1Again = manager.getBudget('endpoint1');

      expect(budget1).toBe(budget1Again);
      expect(budget1).not.toBe(budget2);
    });

    it('should accept custom configuration', () => {
      const budget = manager.getBudget('custom', { maxRetries: 20 });
      const stats = budget.getStats();
      expect(stats.maximum).toBe(20);
    });
  });

  describe('getGlobalBudget', () => {
    it('should return the global budget', () => {
      const global1 = manager.getGlobalBudget();
      const global2 = manager.getGlobalBudget();
      expect(global1).toBe(global2);
    });
  });

  describe('canRetry and consumeRetry', () => {
    it('should check both endpoint and global budgets', () => {
      const endpoint = 'test-endpoint';

      // Both budgets have capacity
      expect(manager.canRetry(endpoint)).toBe(true);
      expect(manager.consumeRetry(endpoint)).toBe(true);
    });

    it('should block when global budget is exhausted', () => {
      const global = manager.getGlobalBudget();
      const endpoint = 'test-endpoint';

      // Exhaust global budget
      while (global.canRetry()) {
        global.consumeRetry();
      }

      // Should not allow retry even if endpoint budget has capacity
      expect(manager.canRetry(endpoint)).toBe(false);
      expect(manager.consumeRetry(endpoint)).toBe(false);
    });

    it('should block when endpoint budget is exhausted', () => {
      const endpoint = 'test-endpoint';
      const budget = manager.getBudget(endpoint, { maxRetries: 1 });

      // Exhaust endpoint budget
      budget.consumeRetry();

      // Should not allow retry even if global budget has capacity
      expect(manager.canRetry(endpoint)).toBe(false);
      expect(manager.consumeRetry(endpoint)).toBe(false);
    });
  });

  describe('getAllStats', () => {
    it('should return statistics for all budgets', () => {
      // Create some budgets
      manager.getBudget('endpoint1').consumeRetry();
      manager.getBudget('endpoint2').consumeRetry();
      manager.getBudget('endpoint2').consumeRetry();
      manager.getGlobalBudget().consumeRetry();

      const allStats = manager.getAllStats();

      // Should have global + 2 endpoint budgets
      expect(allStats.size).toBe(3);
      expect(allStats.has('global')).toBe(true);
      expect(allStats.has('endpoint1')).toBe(true);
      expect(allStats.has('endpoint2')).toBe(true);

      // Check consumed counts
      expect(allStats.get('global')?.consumed).toBe(1);
      expect(allStats.get('endpoint1')?.consumed).toBe(1);
      expect(allStats.get('endpoint2')?.consumed).toBe(2);
    });
  });

  describe('resetAll', () => {
    it('should reset all budgets', () => {
      // Create and consume from multiple budgets
      manager.getBudget('endpoint1').consumeRetry();
      manager.getBudget('endpoint2').consumeRetry();
      manager.getGlobalBudget().consumeRetry();

      // Verify they have consumed retries
      expect(manager.getAllStats().get('global')?.consumed).toBe(1);
      expect(manager.getAllStats().get('endpoint1')?.consumed).toBe(1);

      // Reset all
      manager.resetAll();

      // All should be reset
      const stats = manager.getAllStats();
      expect(stats.get('global')?.consumed).toBe(0);
      expect(stats.get('endpoint1')?.consumed).toBe(0);
      expect(stats.get('endpoint2')?.consumed).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all endpoint budgets and reset global', () => {
      // Create some budgets
      manager.getBudget('endpoint1');
      manager.getBudget('endpoint2');
      manager.getGlobalBudget().consumeRetry();

      // Clear
      manager.clear();

      // Should only have global budget
      const stats = manager.getAllStats();
      expect(stats.size).toBe(1);
      expect(stats.has('global')).toBe(true);
      expect(stats.get('global')?.consumed).toBe(0);
    });
  });
});
