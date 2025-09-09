/**
 * @fileoverview Tests for repository index exports
 */

import { describe, it, expect } from 'vitest';

describe('Infrastructure Repositories Index', () => {
  it('should export ProjectRepository', async () => {
    const module = await import('../index.js');
    expect(module.ProjectRepository).toBeDefined();
  });

  it('should export AnalysisRunRepository', async () => {
    const module = await import('../index.js');
    expect(module.AnalysisRunRepository).toBeDefined();
  });

  it('should export QualityMetricsRepository', async () => {
    const module = await import('../index.js');
    expect(module.QualityMetricsRepository).toBeDefined();
  });

  it('should export ComplianceReportRepository', async () => {
    const module = await import('../index.js');
    expect(module.ComplianceReportRepository).toBeDefined();
  });

  it('should export all repository classes as constructors', async () => {
    const module = await import('../index.js');

    // Check that each export is a constructor function
    expect(typeof module.ProjectRepository).toBe('function');
    expect(typeof module.AnalysisRunRepository).toBe('function');
    expect(typeof module.QualityMetricsRepository).toBe('function');
    expect(typeof module.ComplianceReportRepository).toBe('function');

    // Verify they have prototype property (indicating they are classes/constructors)
    expect(module.ProjectRepository.prototype).toBeDefined();
    expect(module.AnalysisRunRepository.prototype).toBeDefined();
    expect(module.QualityMetricsRepository.prototype).toBeDefined();
    expect(module.ComplianceReportRepository.prototype).toBeDefined();
  });
});
