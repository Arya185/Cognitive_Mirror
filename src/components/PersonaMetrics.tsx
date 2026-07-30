import React from 'react';
import { EvaluationResult } from '../types';
import { PERSONA_CONFIGS } from '../data/presets';
import { Gauge } from 'lucide-react';

interface PersonaMetricsProps {
  result: EvaluationResult;
}

export const PersonaMetrics: React.FC<PersonaMetricsProps> = ({ result }) => {
  const personaStats = PERSONA_CONFIGS.map((p) => {
    let totalScore = 0;
    let totalConf = 0;
    let count = 0;

    result.sections.forEach((sec) => {
      const fb = sec.personas.find((item) => item.id === p.id);
      if (fb) {
        totalScore += fb.score;
        totalConf += fb.confidence;
        count++;
      }
    });

    const avgScore = count > 0 ? Number((totalScore / count).toFixed(1)) : 0;
    const avgConf = count > 0 ? Math.round((totalConf / count) * 100) : 0;

    return {
      id: p.id,
      name: p.name,
      role: p.role,
      color: p.color,
      avgScore,
      avgConf,
    };
  });

  return (
    <div className="neu-card rounded-3xl p-6 space-y-5 h-full flex flex-col justify-between">
      <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
          <Gauge className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 font-sans tracking-tight">
            Persona Mean Telemetry
          </h3>
          <p className="text-xs text-slate-500 font-sans">
            Aggregate ratings across all sections per lens
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1">
        {personaStats.map((stat) => (
          <div
            key={stat.id}
            className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.8)] space-y-3 flex flex-col justify-between hover:bg-white hover:shadow-[4px_4px_12px_rgba(180,195,215,0.3)] transition-all duration-200"
          >
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="font-bold uppercase tracking-wider" style={{ color: stat.color }}>
                {stat.name}
              </span>
              <span className="text-slate-400 font-semibold">
                {stat.avgConf}% CONF
              </span>
            </div>

            <div className="flex items-baseline space-x-1 font-mono">
              <span className="text-3xl font-extrabold text-slate-900">
                {stat.avgScore.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
            </div>

            {/* Instrument Track Bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(stat.avgScore / 5) * 100}%`,
                  backgroundColor: stat.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
