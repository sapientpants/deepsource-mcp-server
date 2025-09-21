/**
 * @fileoverview Retry budget management to prevent resource exhaustion
 * This module implements retry budgets to limit the number of retries within a time window.
 */

import { createLogger } from '../logging/logger.js';

const logger = createLogger('RetryBudget');

/**
 * Retry budget configuration
 * @interface
 * @public
 */
export interface RetryBudgetConfig {
  /** Maximum number of retries allowed per time window */
  maxRetries: number;
  /** Time window in milliseconds */
  timeWindow: number;
  /** Name for logging purposes */
  name?: string;
}

/**
 * Retry budget statistics
 * @interface
 * @public
 */
export interface RetryBudgetStats {
  /** Current number of retries consumed */
  consumed: number;
  /** Maximum retries allowed */
  maximum: number;
  /** Remaining retries available */
  remaining: number;
  /** Time until budget resets (ms) */
  resetInMs: number;
  /** Whether budget is exhausted */
  isExhausted: boolean;
  /** Percentage of budget consumed */
  consumedPercentage: number;
}

/**
 * Default retry budget configuration from environment
 * @private
 */
const DEFAULT_CONFIG: RetryBudgetConfig = {
  maxRetries: parseInt(process.env.RETRY_BUDGET_PER_MINUTE || '10', 10),
  timeWindow: 60000, // 1 minute
};

/**
 * Retry budget implementation
 * @class
 * @public
 */
export class RetryBudget {
  private readonly config: RetryBudgetConfig;
  private readonly name: string;
  private retryTimestamps: number[] = [];

  /**
   * Creates a new retry budget
   * @param config Configuration for the retry budget
   */
  constructor(config: Partial<RetryBudgetConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.name = config.name || 'default';
    logger.debug('Retry budget created', { name: this.name, config: this.config });
  }

  /**
   * Check if a retry can be consumed from the budget
   * @returns True if a retry is available
   * @public
   */
  canRetry(): boolean {
    this.cleanup();
    const available = this.retryTimestamps.length < this.config.maxRetries;

    if (!available) {
      logger.warn('Retry budget exhausted', {
        name: this.name,
        consumed: this.retryTimestamps.length,
        max: this.config.maxRetries,
      });
    }

    return available;
  }

  /**
   * Consume a retry from the budget
   * @returns True if the retry was successfully consumed
   * @public
   */
  consumeRetry(): boolean {
    if (!this.canRetry()) {
      return false;
    }

    const now = Date.now();
    this.retryTimestamps.push(now);

    logger.debug('Retry consumed from budget', {
      name: this.name,
      consumed: this.retryTimestamps.length,
      max: this.config.maxRetries,
    });

    return true;
  }

  /**
   * Get current budget statistics
   * @returns The current budget statistics
   * @public
   */
  getStats(): RetryBudgetStats {
    this.cleanup();
    const consumed = this.retryTimestamps.length;
    const remaining = Math.max(0, this.config.maxRetries - consumed);

    // Calculate time until next reset
    let resetInMs = 0;
    if (this.retryTimestamps.length > 0) {
      const oldestTimestamp = this.retryTimestamps[0];
      const timeSinceOldest = Date.now() - oldestTimestamp;
      resetInMs = Math.max(0, this.config.timeWindow - timeSinceOldest);
    }

    const consumedPercentage = (consumed / this.config.maxRetries) * 100;

    return {
      consumed,
      maximum: this.config.maxRetries,
      remaining,
      resetInMs,
      isExhausted: remaining === 0,
      consumedPercentage: Math.round(consumedPercentage),
    };
  }

  /**
   * Reset the budget (clear all consumed retries)
   * @public
   */
  reset(): void {
    this.retryTimestamps = [];
    logger.info('Retry budget reset', { name: this.name });
  }

  /**
   * Clean up expired retry timestamps
   * @private
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.timeWindow;
    const before = this.retryTimestamps.length;
    this.retryTimestamps = this.retryTimestamps.filter((timestamp) => timestamp > cutoff);
    const after = this.retryTimestamps.length;

    if (before !== after) {
      logger.debug('Cleaned up expired retries', {
        name: this.name,
        removed: before - after,
        remaining: after,
      });
    }
  }
}

/**
 * Retry budget manager for managing multiple budgets
 * @class
 * @public
 */
export class RetryBudgetManager {
  private static instance: RetryBudgetManager;
  private budgets: Map<string, RetryBudget> = new Map();
  private globalBudget: RetryBudget;

  /**
   * Private constructor for singleton pattern
   * @private
   */
  private constructor() {
    this.globalBudget = new RetryBudget({ name: 'global' });
  }

  /**
   * Get the singleton instance
   * @returns The retry budget manager instance
   * @public
   */
  static getInstance(): RetryBudgetManager {
    if (!RetryBudgetManager.instance) {
      RetryBudgetManager.instance = new RetryBudgetManager();
    }
    return RetryBudgetManager.instance;
  }

  /**
   * Get or create a budget for an endpoint
   * @param endpoint The endpoint name
   * @param config Optional configuration overrides
   * @returns The retry budget instance
   * @public
   */
  getBudget(endpoint: string, config?: Partial<RetryBudgetConfig>): RetryBudget {
    let budget = this.budgets.get(endpoint);
    if (!budget) {
      budget = new RetryBudget({ ...config, name: endpoint });
      this.budgets.set(endpoint, budget);
    }
    return budget;
  }

  /**
   * Get the global retry budget
   * @returns The global retry budget instance
   * @public
   */
  getGlobalBudget(): RetryBudget {
    return this.globalBudget;
  }

  /**
   * Check if both endpoint and global budgets allow a retry
   * @param endpoint The endpoint to check
   * @returns True if both budgets allow a retry
   * @public
   */
  canRetry(endpoint: string): boolean {
    const endpointBudget = this.getBudget(endpoint);
    const globalAllows = this.globalBudget.canRetry();
    const endpointAllows = endpointBudget.canRetry();

    if (!globalAllows) {
      logger.warn('Global retry budget exhausted');
    }
    if (!endpointAllows) {
      logger.warn('Endpoint retry budget exhausted', { endpoint });
    }

    return globalAllows && endpointAllows;
  }

  /**
   * Consume a retry from both endpoint and global budgets
   * @param endpoint The endpoint to consume from
   * @returns True if the retry was successfully consumed from both budgets
   * @public
   */
  consumeRetry(endpoint: string): boolean {
    const endpointBudget = this.getBudget(endpoint);

    // Check both budgets first
    if (!this.globalBudget.canRetry() || !endpointBudget.canRetry()) {
      return false;
    }

    // Consume from both budgets
    const globalConsumed = this.globalBudget.consumeRetry();
    const endpointConsumed = endpointBudget.consumeRetry();

    return globalConsumed && endpointConsumed;
  }

  /**
   * Get statistics for all budgets
   * @returns Map of budget name to statistics
   * @public
   */
  getAllStats(): Map<string, RetryBudgetStats> {
    const stats = new Map<string, RetryBudgetStats>();
    stats.set('global', this.globalBudget.getStats());

    for (const [endpoint, budget] of this.budgets) {
      stats.set(endpoint, budget.getStats());
    }

    return stats;
  }

  /**
   * Reset all budgets
   * @public
   */
  resetAll(): void {
    this.globalBudget.reset();
    for (const budget of this.budgets.values()) {
      budget.reset();
    }
    logger.info('All retry budgets reset');
  }

  /**
   * Clear all budgets (for testing)
   * @public
   */
  clear(): void {
    this.budgets.clear();
    this.globalBudget.reset();
  }
}
