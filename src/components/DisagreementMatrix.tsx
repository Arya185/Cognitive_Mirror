import React from 'react';
import { EvaluationResult } from '../types';
import { PERSONA_CONFIGS } from '../data/presets';
import { computeSectionStats } from '../lib/sectionStats';
import { DivergenceGauge } from './DivergenceGauge';
import { Zap, Scale, Flame } from 'lucide-react';

interface DisagreementMatrixProps {
  result: EvaluationResult;
  selectedSectionId: number | null;
  onSelectSection: (id: number) => void;
}

export const DisagreementMatrix: React.FC<DisagreementMatrixProps> = ({
  result,
  selectedSectionId,
  onSelectSection,
}) => {
  // Compute disagreement metric per section using shared helper
  const sectionMetrics = result.sections.map((section) => ({
    ...computeSectionStats(section),
    excerpt: section.excerpt,
  }));

  const highFrictionCount = sectionMetrics.filter((m) => m.isHighFriction).length;
  const overallAvgDivergence = Number(
    (sectionMetrics.reduce((acc, m) => acc + m.stdDev, 0) / (sectionMetrics.length || 1)).toFixed(2)
  );

  return (
    <div className="neu-card rounded-3xl p-6 space-y-6 h-full flex flex-col justify-between">
      {/* Header telemetry info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-900 font-sans tracking-tight">
              Cognitive Divergence Spectrogram
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Measures perspective spread across personas. Clustered needles = consensus; wide needles = cognitive friction.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 font-mono text-xs">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/60 shadow-inner">
            <Scale className="w-3.5 h-3.5 text-blue-600" />
            <span>AVG DIVERGENCE: <strong className="text-slate-900">σ {overallAvgDivergence}</strong></span>
          </div>

          {highFrictionCount > 0 && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-sm font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span><strong>{highFrictionCount}</strong> FRICTION HOTSPOT(S)</span>
            </div>
          )}
        </div>
      </div>

      {/* Section Gauge Rows */}
      <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
        {result.sections.map((section) => {
          const metric = sectionMetrics.find((m) => m.sectionId === section.id)!;
          const isSelected = selectedSectionId === section.id;

          return (
            <div
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              className={`p-4 rounded-2xl transition-all cursor-pointer space-y-3 ${
                isSelected
                  ? 'bg-blue-50/60 border-2 border-blue-500 shadow-[inset_2px_2px_5px_rgba(37,99,235,0.08)]'
                  : 'bg-slate-50/80 border border-slate-200/80 hover:bg-white hover:shadow-[4px_4px_12px_rgba(180,195,215,0.3)]'
              }`}
            >
              {/* Row Header: Section ID, Excerpt, Metrics */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    §{String(section.id).padStart(2, '0')}
                  </span>
                  <span className="text-xs italic font-medium text-slate-800 line-clamp-1 font-sans">
                    "{section.excerpt}"
                  </span>
                </div>

                <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-500 self-end sm:self-auto">
                  <span>SPREAD: <strong className="text-slate-900">Δ {metric.range} PTS</strong></span>
                  <span>STD DEV: <strong className="text-slate-900">σ {metric.stdDev}</strong></span>
                  {metric.isHighFriction ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] uppercase">
                      HIGH FRICTION
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium text-[10px]">
                      ALIGNED
                    </span>
                  )}
                </div>
              </div>

              {/* The Oscilloscope Divergence Gauge */}
              <DivergenceGauge section={section} />

              {/* Inline Small Numeric Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px] font-mono">
                <div className="flex items-center space-x-3">
                  <span className="text-slate-400 uppercase font-semibold">Ratings:</span>
                  {PERSONA_CONFIGS.map((persona) => {
                    const fb = section.personas.find((p) => p.id === persona.id);
                    const score = fb ? fb.score : 0;
                    return (
                      <div key={persona.id} className="flex items-center space-x-1">
                        <span style={{ color: persona.color }} className="font-bold">
                          {persona.name.substring(0, 3).toUpperCase()}:
                        </span>
                        <span className="text-slate-900 font-extrabold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 shadow-xs">
                          {score}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-slate-500 font-medium">
                  IMPACT IMPORTANCE: <span className="text-slate-900 font-bold">{section.importance}/5</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
