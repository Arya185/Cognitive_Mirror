import type { EvaluationResult, DimensionType } from '../types';
import { computeSectionStats } from './sectionStats';

export const ALL_DIMENSIONS: DimensionType[] = [
  'assumed_knowledge',
  'clarity',
  'emotional_calibration',
  'logical_coherence',
  'originality',
];

export interface DimensionScore {
  dimension: DimensionType;
  /** 0–100 severity score: higher = more cross-persona disagreement on sections tagged with this dimension */
  severity: number | null;
  /** How many sections were tagged with this dimension */
  sectionCount: number;
  /** Average std-dev across tagged sections (before normalisation) */
  avgStdDev: number | null;
}

/**
 * Computes a 0–100 "blind spot severity" score for each of the 5 cognitive dimensions.
 *
 * Algorithm
 * ─────────
 * 1. For each dimension, collect every section tagged with it.
 * 2. Compute the average cross-persona std-dev across those sections
 *    (reusing `computeSectionStats` — single source of truth for the formula).
 * 3. Normalise to 0–100 using the theoretical max std-dev on a 1–5 scale:
 *    max possible std-dev is when two personas score 1 and two score 5 → σ = 2.0
 * 4. If no sections are tagged with a dimension, return null (not enough signal).
 */
export function computeBlindSpotProfile(result: EvaluationResult): DimensionScore[] {
  const MAX_STD_DEV = 2.0; // theoretical maximum on a 1–5 score range

  return ALL_DIMENSIONS.map((dimension) => {
    const taggedSections = result.sections.filter((s) =>
      s.dimensions.includes(dimension)
    );

    if (taggedSections.length === 0) {
      return { dimension, severity: null, sectionCount: 0, avgStdDev: null };
    }

    const stdDevs = taggedSections.map((s) => computeSectionStats(s).stdDev);
    const avg = stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length;
    const severity = Math.min(100, Math.round((avg / MAX_STD_DEV) * 100));

    return {
      dimension,
      severity,
      sectionCount: taggedSections.length,
      avgStdDev: Number(avg.toFixed(2)),
    };
  });
}
