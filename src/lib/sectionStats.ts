import type { SectionResult } from '../types';

export interface SectionStats {
  sectionId: number;
  range: number;
  avgScore: number;
  stdDev: number;
  isHighFriction: boolean;
}

/**
 * Computes disagreement metrics for a single section.
 * Used by both DisagreementMatrix and blindSpotProfile so the formula stays in one place.
 */
export function computeSectionStats(section: SectionResult): SectionStats {
  const scores = section.personas.map((p) => p.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((acc, val) => acc + Math.pow(val - avgScore, 2), 0) / scores.length;
  const stdDev = Number(Math.sqrt(variance).toFixed(2));

  return {
    sectionId: section.id,
    range,
    avgScore: Number(avgScore.toFixed(1)),
    stdDev,
    isHighFriction: range >= 2,
  };
}
