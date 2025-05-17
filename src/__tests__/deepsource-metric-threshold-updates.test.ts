import { MetricShortcode } from '../deepsource';
import { MetricKey } from '../types/metrics';

describe('DeepSourceClient Metric Threshold Updates', () => {
  it('should have the correct MetricShortcode enum values', () => {
    // Verify the MetricShortcode enum values are correctly defined
    expect(MetricShortcode.LCV).toBe('LCV');
    expect(MetricShortcode.BCV).toBe('BCV');
    expect(MetricShortcode.DCV).toBe('DCV');
    expect(MetricShortcode.DDP).toBe('DDP');
    expect(MetricShortcode.SCV).toBe('SCV');
    expect(MetricShortcode.TCV).toBe('TCV');
    expect(MetricShortcode.CMP).toBe('CMP');
  });

  it('should have the correct MetricKey enum values', () => {
    // Verify the MetricKey enum values are correctly defined
    expect(MetricKey.AGGREGATE).toBe('AGGREGATE');
    expect(MetricKey.PYTHON).toBe('PYTHON');
    expect(MetricKey.JAVASCRIPT).toBe('JAVASCRIPT');
    expect(MetricKey.TYPESCRIPT).toBe('TYPESCRIPT');
    expect(MetricKey.GO).toBe('GO');
    expect(MetricKey.JAVA).toBe('JAVA');
    expect(MetricKey.RUBY).toBe('RUBY');
    expect(MetricKey.RUST).toBe('RUST');
  });
});

/**
 * Note: The following related tests are in separate files:
 * - Integration tests for metric history: see deepsource-metrics-history.test.ts
 * - Threshold update error handling: see deepsource-metric-threshold-errors.test.ts
 */
