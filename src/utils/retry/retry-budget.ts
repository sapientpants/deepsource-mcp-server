/**
 * @fileoverview Retry budget implementation to prevent resource exhaustion
 * Tracks and limits retry attempts within a time window
 */

import { createLogger } from '../logging/logger.js';

const logger = createLogger('RetryBudget');

/**
 * Retry budget configuration
 */
export interface RetryBudgetConfig {
  /** Maximum number of retries allowed per time window */
  maxRetries: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Default retry budget configuration
 */
export const DEFAULT_BUDGET_CONFIG: RetryBudgetConfig = {
  maxRetries: 10,
  windowMs: 60000, // 1 minute
};

/**
 * Retry budget statistics
 */
export interface BudgetStats {
  /** Current number of retries in the window */
  currentRetries: number;
  /** Maximum retries allowed */
  maxRetries: number;
  /** Remaining budget */
  remainingBudget: number;
  /** Number of times budget was exhausted */
  exhaustionCount: number;
  /** Last time budget was exhausted */
  lastExhaustedAt: number | null;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Retry attempt record
 */
interface RetryAttempt {
  timestamp: number;
  endpoint: string;
}

/**
 * Retry budget tracker to prevent resource exhaustion
 */
export class RetryBudget {
  private attempts: RetryAttempt[] = [];
  private exhaustionCount = 0;
  private lastExhaustedAt: number | null = null;

  constructor(private readonly config: RetryBudgetConfig = DEFAULT_BUDGET_CONFIG) {
    logger.debug('Retry budget created', { config });
  }

  /**
   * Check if a retry is allowed within the budget
   * @param endpoint Optional endpoint name for logging
   * @returns True if retry is allowed
   */
  public canRetry(endpoint?: string): boolean {
    this.cleanupOldAttempts();

    const currentCount = this.attempts.length;
    const allowed = currentCount < this.config.maxRetries;

    if (!allowed) {
      this.exhaustionCount++;
      this.lastExhaustedAt = Date.now();
      logger.warn('Retry budget exhausted', {
        endpoint,
        currentCount,
        maxRetries: this.config.maxRetries,
        exhaustionCount: this.exhaustionCount,
      });
    }

    return allowed;
  }

  /**
   * Consume retry budget
   * @param endpoint Optional endpoint name for tracking
   * @returns True if budget was consumed, false if exhausted
   */
  public consume(endpoint?: string): boolean {
    if (!this.canRetry(endpoint)) {
      return false;
    }

    const attempt: RetryAttempt = {
      timestamp: Date.now(),
      endpoint: endpoint ?? '',
    };

    this.attempts.push(attempt);

    logger.debug('Retry budget consumed', {
      endpoint,
      currentCount: this.attempts.length,
      maxRetries: this.config.maxRetries,
      remaining: this.config.maxRetries - this.attempts.length,
    });

    return true;
  }

  /**
   * Get the remaining budget
   * @returns Number of retries remaining in the current window
   */
  public getRemaining(): number {
    this.cleanupOldAttempts();
    return Math.max(0, this.config.maxRetries - this.attempts.length);
  }

  /**
   * Get budget statistics
   * @returns Current budget statistics
   */
  public getStats(): BudgetStats {
    this.cleanupOldAttempts();
    const currentRetries = this.attempts.length;

    return {
      currentRetries,
      maxRetries: this.config.maxRetries,
      remainingBudget: this.config.maxRetries - currentRetries,
      exhaustionCount: this.exhaustionCount,
      lastExhaustedAt: this.lastExhaustedAt,
      windowMs: this.config.windowMs,
    };
  }

  /**
   * Reset the budget
   */
  public reset(): void {
    this.attempts = [];
    this.exhaustionCount = 0;
    this.lastExhaustedAt = null;
    logger.info('Retry budget reset');
  }

  /**
   * Clean up attempts outside the time window
   */
  private cleanupOldAttempts(): void {
    const cutoff = Date.now() - this.config.windowMs;
    const oldCount = this.attempts.length;
    this.attempts = this.attempts.filter((a) => a.timestamp > cutoff);

    const removed = oldCount - this.attempts.length;
    if (removed > 0) {
      logger.debug('Cleaned up old retry attempts', {
        removed,
        remaining: this.attempts.length,
      });
    }
  }
}

/**
 * Global retry budget manager for managing budgets across endpoints
 */
export class RetryBudgetManager {
  private readonly budgets = new Map<string, RetryBudget>();
  private readonly globalBudget: RetryBudget;

  constructor(
    private readonly defaultConfig: RetryBudgetConfig = DEFAULT_BUDGET_CONFIG,
    globalConfig?: RetryBudgetConfig
  ) {
    // Create a global budget with higher limits
    this.globalBudget = new RetryBudget(
      globalConfig ?? {
        maxRetries: defaultConfig.maxRetries * 3,
        windowMs: defaultConfig.windowMs,
      }
    );
  }

  /**
   * Check if retry is allowed for an endpoint
   * @param endpoint The endpoint name
   * @returns True if retry is allowed
   */
  public canRetry(endpoint: string): boolean {
    // Check global budget first
    if (!this.globalBudget.canRetry(endpoint)) {
      return false;
    }

    // Check endpoint-specific budget
    const budget = this.getBudget(endpoint);
    return budget.canRetry();
  }

  /**
   * Consume retry budget for an endpoint
   * @param endpoint The endpoint name
   * @returns True if budget was consumed
   */
  public consume(endpoint: string): boolean {
    // Check and consume global budget
    if (!this.globalBudget.consume(endpoint)) {
      return false;
    }

    // Consume endpoint-specific budget
    const budget = this.getBudget(endpoint);
    if (!budget.consume()) {
      // If endpoint budget fails but global succeeded, we need to track this
      logger.warn('Endpoint budget exhausted but global budget available', { endpoint });
      return false;
    }

    return true;
  }

  /**
   * Get or create a budget for an endpoint
   * @param endpoint The endpoint name
   * @param config Optional custom configuration
   * @returns Retry budget instance
   */
  public getBudget(endpoint: string, config?: RetryBudgetConfig): RetryBudget {
    let budget = this.budgets.get(endpoint);

    if (!budget) {
      budget = new RetryBudget(config ?? this.defaultConfig);
      this.budgets.set(endpoint, budget);
      logger.debug('Created new retry budget', { endpoint });
    }

    return budget;
  }

  /**
   * Get statistics for all budgets
   * @returns Map of endpoint to budget statistics
   */
  public getAllStats(): Map<string, BudgetStats> {
    const stats = new Map<string, BudgetStats>();

    // Add global budget stats
    stats.set('_global', this.globalBudget.getStats());

    // Add endpoint-specific stats
    for (const [endpoint, budget] of this.budgets) {
      stats.set(endpoint, budget.getStats());
    }

    return stats;
  }

  /**
   * Reset all budgets
   */
  public resetAll(): void {
    this.globalBudget.reset();
    for (const budget of this.budgets.values()) {
      budget.reset();
    }
    logger.info('All retry budgets reset');
  }

  /**
   * Reset a specific endpoint's budget
   * @param endpoint The endpoint name
   */
  public reset(endpoint: string): void {
    const budget = this.budgets.get(endpoint);
    if (budget) {
      budget.reset();
    }
  }
}
