import React from 'react';
import { SectionResult } from '../types';
import { PERSONA_CONFIGS } from '../data/presets';

interface DivergenceGaugeProps {
  section: SectionResult;
  compact?: boolean;
}

export const DivergenceGauge: React.FC<DivergenceGaugeProps> = ({ section, compact = false }) => {
  const scores = section.personas.map((p) => p.score);
  const sum = scores.reduce((a, b) => a + b, 0);
  const meanScore = sum / (scores.length || 1);
  const meanPct = Math.min(100, Math.max(0, ((meanScore - 1) / 4) * 100));

  // Map scores to percentages on track (score 1 = 0%, score 5 = 100%)
  const getPct = (score: number) => Math.min(100, Math.max(0, ((score - 1) / 4) * 100));

  return (
    <div className="w-full space-y-1.5 font-mono">
      {/* Dimension & Range Header */}
      {!compact && (
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">SPEC DIVERGENCE</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-800 font-semibold">{section.dimensions.join(' · ')}</span>
          </div>
          <div>
            μ <span className="text-slate-900 font-bold">{meanScore.toFixed(1)}</span>
          </div>
        </div>
      )}

      {/* Oscilloscope Track Container */}
      <div className="relative h-10 bg-[#F0F4F8] neu-inset rounded-xl px-3 flex items-center select-none overflow-hidden border border-slate-200/60">
        {/* Baseline track */}
        <div className="relative w-full h-[3px] bg-slate-300 rounded-full">
          {/* Ticks at 1, 2, 3, 4, 5 */}
          {[1, 2, 3, 4, 5].map((val) => {
            const pct = getPct(val);
            return (
              <div
                key={val}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[1.5px] h-3 bg-slate-400"
                style={{ left: `${pct}%` }}
              />
            );
          })}

          {/* Mean vertical indicator line */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[2px] h-5 bg-slate-500 border-l border-dashed border-slate-600"
            style={{ left: `${meanPct}%` }}
            title={`Mean Score: ${meanScore.toFixed(2)}`}
          />

          {/* Persona Needle Markers */}
          {PERSONA_CONFIGS.map((pConfig) => {
            const fb = section.personas.find((p) => p.id === pConfig.id);
            if (!fb) return null;

            const pct = getPct(fb.score);

            return (
              <div
                key={pConfig.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group transition-all duration-300 z-10"
                style={{ left: `${pct}%` }}
              >
                {/* Triangular Needle Top */}
                <div
                  className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] mx-auto cursor-pointer filter drop-shadow-sm"
                  style={{ borderTopColor: pConfig.color }}
                />

                {/* Micro Label / Tooltip on Hover */}
                <div
                  className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-md shadow-md whitespace-nowrap z-20 pointer-events-none"
                  style={{ borderLeftColor: pConfig.color, borderLeftWidth: '3px', borderLeftStyle: 'solid' }}
                >
                  <span style={{ color: pConfig.color }} className="font-bold uppercase">
                    {pConfig.name.substring(0, 3)}
                  </span>
                  : {fb.score}/5
                </div>

                {/* Needle Base Line */}
                <div
                  className="w-[2.5px] h-3.5 mx-auto rounded-full"
                  style={{ backgroundColor: pConfig.color }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Axis Scale Labels */}
      <div className="flex justify-between px-3 text-[10px] text-slate-400 font-mono select-none font-semibold">
        <span>1.0</span>
        <span>2.0</span>
        <span>3.0</span>
        <span>4.0</span>
        <span>5.0</span>
      </div>
    </div>
  );
};
