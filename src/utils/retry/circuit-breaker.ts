/**
 * @fileoverview Circuit breaker implementation for fault tolerance
 * This module implements the circuit breaker pattern to prevent cascade failures.
 */

import { createLogger } from '../logging/logger.js';

const logger = createLogger('CircuitBreaker');

/**
 * Circuit breaker states
 * @enum
 * @public
 */
export enum CircuitState {
  /** Normal operation - requests pass through */
  CLOSED = 'closed',
  /** Circuit is open - requests fail immediately */
  OPEN = 'open',
  /** Testing if service has recovered */
  HALF_OPEN = 'half-open',
}

/**
 * Circuit breaker configuration
 * @interface
 * @public
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time window for counting failures (ms) */
  failureWindow: number;
  /** Time to wait before attempting recovery (ms) */
  recoveryTimeout: number;
  /** Number of successful requests needed to close from half-open */
  successThreshold: number;
  /** Maximum number of test requests in half-open state */
  halfOpenMaxAttempts: number;
}

/**
 * Circuit breaker statistics
 * @interface
 * @public
 */
export interface CircuitBreakerStats {
  /** Current circuit state */
  state: CircuitState;
  /** Number of failures in current window */
  failureCount: number;
  /** Number of successful requests */
  successCount: number;
  /** Total requests processed */
  totalRequests: number;
  /** Time when circuit was last opened */
  lastOpenTime?: number;
  /** Time when circuit was last closed */
  lastCloseTime?: number;
  /** Success rate percentage */
  successRate: number;
}

/**
 * Default circuit breaker configuration from environment
 * @private
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
  failureWindow: 60000, // 1 minute
  recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS || '30000', 10),
  successThreshold: 3,
  halfOpenMaxAttempts: 5,
};

/**
 * Circuit breaker implementation
 * @class
 * @public
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];
  private successes: number[] = [];
  private lastStateChange: number = Date.now();
  private halfOpenAttempts = 0;
  private totalRequests = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  /**
   * Creates a new circuit breaker instance
   * @param name The name of this circuit breaker (for logging)
   * @param config Optional configuration overrides
   */
  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.debug('Circuit breaker created', { name, config: this.config });
  }

  /**
   * Check if a request should be allowed through
   * @returns True if the request can proceed
   * @public
   */
  canRequest(): boolean {
    this.cleanupOldEntries();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if it's time to transition to half-open
        const timeSinceOpen = Date.now() - this.lastStateChange;
        if (timeSinceOpen >= this.config.recoveryTimeout) {
          this.transitionTo(CircuitState.HALF_OPEN);
          return true;
        }
        logger.debug('Circuit breaker is open, rejecting request', {
          name: this.name,
          timeSinceOpen,
          recoveryTimeout: this.config.recoveryTimeout,
        });
        return false;

      case CircuitState.HALF_OPEN:
        // Allow limited test requests
        if (this.halfOpenAttempts < this.config.halfOpenMaxAttempts) {
          this.halfOpenAttempts++;
          return true;
        }
        logger.debug('Circuit breaker half-open limit reached', {
          name: this.name,
          attempts: this.halfOpenAttempts,
          max: this.config.halfOpenMaxAttempts,
        });
        return false;

      default:
        return false;
    }
  }

  /**
   * Record a successful request
   * @public
   */
  recordSuccess(): void {
    this.totalRequests++;
    this.successes.push(Date.now());
    this.cleanupOldEntries();

    switch (this.state) {
      case CircuitState.HALF_OPEN:
        // Check if we have enough successes to close the circuit
        const recentSuccesses = this.getRecentSuccessCount();
        logger.debug('Success in half-open state', {
          name: this.name,
          recentSuccesses,
          threshold: this.config.successThreshold,
        });

        if (recentSuccesses >= this.config.successThreshold) {
          this.transitionTo(CircuitState.CLOSED);
        }
        break;

      case CircuitState.CLOSED:
        // Normal operation, nothing special to do
        break;

      case CircuitState.OPEN:
        // Shouldn't happen, but handle gracefully
        logger.warn('Success recorded while circuit is open', { name: this.name });
        break;
    }
  }

  /**
   * Record a failed request
   * @public
   */
  recordFailure(): void {
    this.totalRequests++;
    this.failures.push(Date.now());
    this.cleanupOldEntries();

    switch (this.state) {
      case CircuitState.CLOSED:
        // Check if we've exceeded the failure threshold
        const recentFailures = this.getRecentFailureCount();
        logger.debug('Failure in closed state', {
          name: this.name,
          recentFailures,
          threshold: this.config.failureThreshold,
        });

        if (recentFailures >= this.config.failureThreshold) {
          this.transitionTo(CircuitState.OPEN);
        }
        break;

      case CircuitState.HALF_OPEN:
        // Any failure in half-open state reopens the circuit
        logger.debug('Failure in half-open state, reopening circuit', { name: this.name });
        this.transitionTo(CircuitState.OPEN);
        break;

      case CircuitState.OPEN:
        // Already open, nothing to do
        break;
    }
  }

  /**
   * Get current circuit breaker statistics
   * @returns The current statistics
   * @public
   */
  getStats(): CircuitBreakerStats {
    this.cleanupOldEntries();
    const failureCount = this.getRecentFailureCount();
    const successCount = this.getRecentSuccessCount();
    const successRate =
      this.totalRequests > 0 ? (successCount / (successCount + failureCount)) * 100 : 0;

    const stats: CircuitBreakerStats = {
      state: this.state,
      failureCount,
      successCount,
      totalRequests: this.totalRequests,
      successRate: Math.round(successRate * 100) / 100,
    };

    if (this.state === CircuitState.OPEN) {
      stats.lastOpenTime = this.lastStateChange;
    }
    if (this.state === CircuitState.CLOSED) {
      stats.lastCloseTime = this.lastStateChange;
    }

    return stats;
  }

  /**
   * Reset the circuit breaker to closed state
   * @public
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = [];
    this.halfOpenAttempts = 0;
    this.lastStateChange = Date.now();
    logger.info('Circuit breaker reset', { name: this.name });
  }

  /**
   * Get the current state
   * @returns The current circuit state
   * @public
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Transition to a new state
   * @param newState The new state to transition to
   * @private
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts = 0;
    }

    logger.info('Circuit breaker state transition', {
      name: this.name,
      from: oldState,
      to: newState,
    });
  }

  /**
   * Clean up old entries outside the time window
   * @private
   */
  private cleanupOldEntries(): void {
    const cutoff = Date.now() - this.config.failureWindow;
    this.failures = this.failures.filter((time) => time > cutoff);
    this.successes = this.successes.filter((time) => time > cutoff);
  }

  /**
   * Get the count of recent failures within the time window
   * @returns The number of recent failures
   * @private
   */
  private getRecentFailureCount(): number {
    const cutoff = Date.now() - this.config.failureWindow;
    return this.failures.filter((time) => time > cutoff).length;
  }

  /**
   * Get the count of recent successes within the time window
   * @returns The number of recent successes
   * @private
   */
  private getRecentSuccessCount(): number {
    const cutoff = Date.now() - this.config.failureWindow;
    return this.successes.filter((time) => time > cutoff).length;
  }
}

/**
 * Circuit breaker manager for managing multiple circuit breakers
 * @class
 * @public
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get the singleton instance
   * @returns The circuit breaker manager instance
   * @public
   */
  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Get or create a circuit breaker for an endpoint
   * @param endpoint The endpoint name
   * @param config Optional configuration overrides
   * @returns The circuit breaker instance
   * @public
   */
  getBreaker(endpoint: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(endpoint)) {
      this.breakers.set(endpoint, new CircuitBreaker(endpoint, config));
    }
    return this.breakers.get(endpoint)!;
  }

  /**
   * Get statistics for all circuit breakers
   * @returns Map of endpoint to statistics
   * @public
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    for (const [endpoint, breaker] of this.breakers) {
      stats.set(endpoint, breaker.getStats());
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   * @public
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('All circuit breakers reset');
  }

  /**
   * Clear all circuit breakers (for testing)
   * @public
   */
  clear(): void {
    this.breakers.clear();
  }
}
