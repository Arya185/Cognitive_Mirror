/**
 * Unit tests for src/lib/blindSpotProfile.ts
 */

import { describe, it, expect } from 'vitest';
import { computeBlindSpotProfile } from '../lib/blindSpotProfile';
import type { EvaluationResult } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSection(
  id: number,
  dimensions: import('../types').DimensionType[],
  scores: [number, number, number, number] // [novice, expert, skeptic, emotional]
): import('../types').SectionResult {
  const [n, e, s, em] = scores;
  return {
    id,
    excerpt: `Section ${id}`,
    dimensions,
    importance: 3,
    personas: [
      { id: 'novice',    score: n,  confidence: 0.8, note: 'note' },
      { id: 'expert',    score: e,  confidence: 0.8, note: 'note' },
      { id: 'skeptic',   score: s,  confidence: 0.8, note: 'note' },
      { id: 'emotional', score: em, confidence: 0.8, note: 'note', emotion: 'curious' as const },
    ],
  };
}

function makeResult(sections: import('../types').SectionResult[]): EvaluationResult {
  return {
    sections,
    overall_summary: { novice: '', expert: '', skeptic: '', emotional: '' },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeBlindSpotProfile', () => {
  it('returns null severity for a dimension that has no tagged sections', () => {
    // Only tag "clarity" — all other dimensions have no signal
    const result = makeResult([
      makeSection(1, ['clarity'], [3, 3, 3, 3]),
    ]);

    const profile = computeBlindSpotProfile(result);

    const noSignalDims = profile.filter((d) => d.dimension !== 'clarity');
    for (const dim of noSignalDims) {
      expect(dim.severity).toBeNull();
      expect(dim.sectionCount).toBe(0);
      expect(dim.avgStdDev).toBeNull();
    }
  });

  it('returns 0% severity for a dimension where all personas fully agree (std-dev = 0)', () => {
    // All four personas score exactly 3 → σ = 0 → severity = 0%
    const result = makeResult([
      makeSection(1, ['logical_coherence'], [3, 3, 3, 3]),
    ]);

    const profile = computeBlindSpotProfile(result);
    const lc = profile.find((d) => d.dimension === 'logical_coherence')!;

    expect(lc.severity).toBe(0);
    expect(lc.sectionCount).toBe(1);
    expect(lc.avgStdDev).toBe(0);
  });

  it('returns 100% severity for maximum possible disagreement (σ = 2.0)', () => {
    // Scores 1, 1, 5, 5 → σ = 2.0 → severity = 100%
    const result = makeResult([
      makeSection(1, ['assumed_knowledge'], [1, 5, 1, 5]),
    ]);

    const profile = computeBlindSpotProfile(result);
    const ak = profile.find((d) => d.dimension === 'assumed_knowledge')!;

    expect(ak.severity).toBe(100);
  });

  it('averages std-dev across multiple sections tagged with the same dimension', () => {
    // Section 1: full consensus on clarity (σ = 0)
    // Section 2: maximum disagreement on clarity (σ = 2)
    // Average σ = 1.0 → severity = 50%
    const result = makeResult([
      makeSection(1, ['clarity'], [3, 3, 3, 3]),
      makeSection(2, ['clarity'], [1, 5, 1, 5]),
    ]);

    const profile = computeBlindSpotProfile(result);
    const cl = profile.find((d) => d.dimension === 'clarity')!;

    expect(cl.sectionCount).toBe(2);
    expect(cl.severity).toBe(50);
    expect(cl.avgStdDev).toBe(1);
  });

  it('a section tagged with two dimensions contributes to both', () => {
    // Tag one section with both 'clarity' AND 'originality'
    const result = makeResult([
      makeSection(1, ['clarity', 'originality'], [2, 4, 2, 4]),
    ]);

    const profile = computeBlindSpotProfile(result);
    const cl = profile.find((d) => d.dimension === 'clarity')!;
    const or = profile.find((d) => d.dimension === 'originality')!;

    // Both should reflect the same section's std-dev
    expect(cl.severity).not.toBeNull();
    expect(or.severity).not.toBeNull();
    expect(cl.severity).toBe(or.severity);
    expect(cl.sectionCount).toBe(1);
    expect(or.sectionCount).toBe(1);
  });

  it('severity is clamped to [0, 100] and never exceeds bounds', () => {
    const result = makeResult([
      makeSection(1, ['emotional_calibration'], [1, 5, 1, 5]),
      makeSection(2, ['emotional_calibration'], [1, 5, 1, 5]),
    ]);

    const profile = computeBlindSpotProfile(result);
    for (const dim of profile) {
      if (dim.severity !== null) {
        expect(dim.severity).toBeGreaterThanOrEqual(0);
        expect(dim.severity).toBeLessThanOrEqual(100);
      }
    }
  });

  it('always returns exactly 5 dimension entries', () => {
    const result = makeResult([makeSection(1, ['clarity'], [3, 4, 2, 3])]);
    const profile = computeBlindSpotProfile(result);
    expect(profile).toHaveLength(5);
  });
});
