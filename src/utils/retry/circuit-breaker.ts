/**
 * @fileoverview Circuit breaker implementation for preventing cascade failures
 * Implements the circuit breaker pattern with three states: CLOSED, OPEN, HALF_OPEN
 */

import { createLogger } from '../logging/logger.js';

const logger = createLogger('CircuitBreaker');

/**
 * Circuit breaker states
 */
export enum CircuitState {
  /** Normal operation, requests pass through */
  CLOSED = 'CLOSED',
  /** Circuit is open, requests fail immediately */
  OPEN = 'OPEN',
  /** Testing phase, limited requests allowed */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures to trip the circuit */
  failureThreshold: number;
  /** Time window in milliseconds for counting failures */
  failureWindow: number;
  /** Timeout in milliseconds before attempting to close the circuit */
  recoveryTimeout: number;
  /** Number of successful requests needed to close from half-open */
  successThreshold: number;
  /** Maximum number of test requests in half-open state */
  halfOpenMaxAttempts: number;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureWindow: 60000, // 1 minute
  recoveryTimeout: 30000, // 30 seconds
  successThreshold: 3,
  halfOpenMaxAttempts: 5,
};

/**
 * Circuit breaker statistics
 */
export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  totalRequests: number;
  stateChanges: number;
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: { timestamp: number }[] = [];
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;
  private lastStateChange = Date.now();
  private halfOpenAttempts = 0;
  private totalRequests = 0;
  private stateChanges = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
  ) {
    logger.debug('Circuit breaker created', { name, config });
  }

  /**
   * Check if the circuit allows a request to pass through
   * @returns True if the request can proceed
   */
  public canAttempt(): boolean {
    this.updateState();
    this.totalRequests++;

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        logger.debug('Circuit breaker is OPEN, rejecting request', {
          name: this.name,
          failures: this.getRecentFailureCount(),
        });
        return false;

      case CircuitState.HALF_OPEN:
        if (this.halfOpenAttempts < this.config.halfOpenMaxAttempts) {
          this.halfOpenAttempts++;
          logger.debug('Circuit breaker is HALF_OPEN, allowing test request', {
            name: this.name,
            attempt: this.halfOpenAttempts,
            maxAttempts: this.config.halfOpenMaxAttempts,
          });
          return true;
        }
        logger.debug('Circuit breaker is HALF_OPEN, max attempts reached', {
          name: this.name,
          halfOpenAttempts: this.halfOpenAttempts,
        });
        return false;

      default:
        return false;
    }
  }

  /**
   * Record a successful request
   */
  public recordSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;

    logger.debug('Circuit breaker recorded success', {
      name: this.name,
      state: this.state,
      consecutiveSuccesses: this.consecutiveSuccesses,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Record a failed request
   */
  public recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failures.push({ timestamp: now });
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    // Clean up old failures outside the window
    this.cleanupOldFailures();

    const recentFailures = this.getRecentFailureCount();

    logger.debug('Circuit breaker recorded failure', {
      name: this.name,
      state: this.state,
      recentFailures,
      threshold: this.config.failureThreshold,
    });

    if (this.state === CircuitState.CLOSED) {
      if (recentFailures >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state trips the circuit again
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Get the current circuit state
   * @returns Current circuit state
   */
  public getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  /**
   * Get circuit statistics
   * @returns Circuit breaker statistics
   */
  public getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.getRecentFailureCount(),
      successes: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      totalRequests: this.totalRequests,
      stateChanges: this.stateChanges,
    };
  }

  /**
   * Reset the circuit breaker to closed state
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.halfOpenAttempts = 0;
    this.lastStateChange = Date.now();
    this.stateChanges = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.totalRequests = 0;

    logger.info('Circuit breaker reset', { name: this.name });
  }

  /**
   * Update circuit state based on time and conditions
   */
  private updateState(): void {
    if (this.state === CircuitState.OPEN) {
      const timeSinceOpen = Date.now() - this.lastStateChange;
      if (timeSinceOpen >= this.config.recoveryTimeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   * @param newState The new circuit state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState === newState) {
      return;
    }

    this.state = newState;
    this.lastStateChange = Date.now();
    this.stateChanges++;

    // Reset half-open attempts when entering half-open state
    if (newState === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts = 0;
      this.consecutiveSuccesses = 0;
    }

    // Clear failures when closing the circuit
    if (newState === CircuitState.CLOSED) {
      this.failures = [];
      this.consecutiveFailures = 0;
    }

    logger.info('Circuit breaker state transition', {
      name: this.name,
      oldState,
      newState,
      failures: this.getRecentFailureCount(),
      consecutiveSuccesses: this.consecutiveSuccesses,
    });
  }

  /**
   * Clean up failures outside the time window
   */
  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.config.failureWindow;
    this.failures = this.failures.filter((f) => f.timestamp > cutoff);
  }

  /**
   * Get the count of recent failures within the time window
   * @returns Number of recent failures
   */
  private getRecentFailureCount(): number {
    this.cleanupOldFailures();
    return this.failures.length;
  }
}

/**
 * Circuit breaker manager for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(private readonly defaultConfig: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG) {}

  /**
   * Get or create a circuit breaker for an endpoint
   * @param endpoint The endpoint name
   * @param config Optional custom configuration
   * @returns Circuit breaker instance
   */
  public getBreaker(endpoint: string, config?: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(endpoint);

    if (!breaker) {
      breaker = new CircuitBreaker(endpoint, config ?? this.defaultConfig);
      this.breakers.set(endpoint, breaker);
      logger.debug('Created new circuit breaker', { endpoint });
    }

    return breaker;
  }

  /**
   * Get all circuit breaker statistics
   * @returns Map of endpoint to statistics
   */
  public getAllStats(): Map<string, CircuitStats> {
    const stats = new Map<string, CircuitStats>();

    for (const [endpoint, breaker] of this.breakers) {
      stats.set(endpoint, breaker.getStats());
    }

    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('All circuit breakers reset');
  }

  /**
   * Reset a specific circuit breaker
   * @param endpoint The endpoint name
   */
  public reset(endpoint: string): void {
    const breaker = this.breakers.get(endpoint);
    if (breaker) {
      breaker.reset();
    }
  }
}
