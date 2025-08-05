/**
 * @fileoverview Domain layer exports
 *
 * This module exports all domain components including aggregates,
 * value objects, and shared building blocks.
 */

// Shared domain building blocks
export * from './shared/index.js';

// Value objects
export * from './value-objects/index.js';

// Aggregates
export * from './aggregates/project/index.js';
export * from './aggregates/analysis-run/index.js';
export * from './aggregates/quality-metrics/index.js';
export * from './aggregates/compliance-report/index.js';
