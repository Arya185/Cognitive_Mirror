import React from 'react';
import { EvaluationResult } from '../types';
import { DIMENSION_LABELS } from '../data/presets';
import { computeBlindSpotProfile } from '../lib/blindSpotProfile';
import { Eye } from 'lucide-react';

interface BlindSpotProfileProps {
  result: EvaluationResult;
}

/** Severity → colour that matches the risk level */
function severityColor(severity: number): string {
  if (severity >= 70) return '#E11D48'; // rose — high friction
  if (severity >= 40) return '#D97706'; // amber — moderate
  return '#2563EB';                     // blue  — low
}

/** Severity → accessible text label */
function severityLabel(severity: number): string {
  if (severity >= 70) return 'HIGH';
  if (severity >= 40) return 'MOD';
  return 'LOW';
}

export const BlindSpotProfile: React.FC<BlindSpotProfileProps> = ({ result }) => {
  const scores = computeBlindSpotProfile(result);
  const hasAnySignal = scores.some((s) => s.severity !== null);

  return (
    <div className="neu-card rounded-3xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
          <Eye className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 font-sans tracking-tight">
            Blind Spot Profile
          </h3>
          <p className="text-xs text-slate-500 font-sans">
            Percentage disagreement severity per cognitive dimension — computed from persona spread on tagged sections
          </p>
        </div>
      </div>

      {/* Dimension bars */}
      {!hasAnySignal ? (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-500">
          No dimension data available.
        </div>
      ) : (
        <div className="space-y-3.5">
          {scores.map(({ dimension, severity, sectionCount }) => {
            const meta = DIMENSION_LABELS[dimension] ?? { label: dimension, desc: '' };
            const noSignal = severity === null;

            return (
              <div key={dimension} className="space-y-1.5">
                {/* Label row */}
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold uppercase tracking-wide text-slate-700">
                      {meta.label}
                    </span>
                    <span className="text-slate-400 font-medium">
                      ({noSignal ? 'no tagged sections' : `${sectionCount} section${sectionCount !== 1 ? 's' : ''}`})
                    </span>
                  </div>

                  {noSignal ? (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 text-[10px] font-semibold border border-slate-200">
                      NO SIGNAL
                    </span>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold text-slate-900">{severity}%</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{
                          color: severityColor(severity!),
                          backgroundColor: severityColor(severity!) + '18',
                          borderColor: severityColor(severity!) + '50',
                        }}
                      >
                        {severityLabel(severity!)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bar track */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  {noSignal ? (
                    <div className="h-full w-full bg-slate-200 rounded-full" />
                  ) : (
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${severity}%`,
                        backgroundColor: severityColor(severity!),
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-400 font-mono pt-1">
        Higher % = more cross-persona disagreement on sections tagged with that dimension.
        Computed deterministically from model output — no additional AI calls.
      </p>
    </div>
  );
};
