import React from 'react';
import { OverallSummary } from '../types';
import { PERSONA_CONFIGS } from '../data/presets';
import { UserCheck, Award, ShieldAlert, HeartHandshake, Terminal } from 'lucide-react';

interface OverallSummaryCardProps {
  summary: OverallSummary;
}

const PERSONA_ICONS = {
  novice: UserCheck,
  expert: Award,
  skeptic: ShieldAlert,
  emotional: HeartHandshake,
};

export const OverallSummaryCard: React.FC<OverallSummaryCardProps> = ({ summary }) => {
  return (
    <div className="neu-card rounded-3xl p-6 space-y-4">
      <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
          <Terminal className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 font-sans tracking-tight">
            Holistic Macro Persona Summaries
          </h3>
          <p className="text-xs text-slate-500 font-sans">
            Executive 1-2 sentence overall synthesis per independent lens
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PERSONA_CONFIGS.map((persona) => {
          const Icon = PERSONA_ICONS[persona.id];
          const text = summary[persona.id];

          return (
            <div
              key={persona.id}
              className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3 flex flex-col justify-between hover:bg-white hover:shadow-[4px_4px_16px_rgba(180,195,215,0.35)] transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs" style={{ color: persona.color }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                </div>
                <div>
                  <div className="font-mono text-xs font-extrabold uppercase" style={{ color: persona.color }}>
                    {persona.name} Macro Verdict
                  </div>
                  <div className="text-xs text-slate-500 font-medium font-sans">
                    {persona.role}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-800 leading-relaxed italic font-sans bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-inner">
                "{text}"
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
