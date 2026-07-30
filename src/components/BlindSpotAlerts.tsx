import React from 'react';
import { EvaluationResult } from '../types';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface BlindSpotAlertsProps {
  result: EvaluationResult;
}

export const BlindSpotAlerts: React.FC<BlindSpotAlertsProps> = ({ result }) => {
  const alerts: {
    type: 'warning' | 'danger' | 'info';
    title: string;
    description: string;
    sectionIds: number[];
  }[] = [];

  result.sections.forEach((section) => {
    const novice = section.personas.find((p) => p.id === 'novice');
    const expert = section.personas.find((p) => p.id === 'expert');
    const skeptic = section.personas.find((p) => p.id === 'skeptic');
    const emotional = section.personas.find((p) => p.id === 'emotional');

    if (!novice || !expert || !skeptic || !emotional) return;

    // 1. Assumed Knowledge Gap (Expert high, Novice low)
    if (expert.score >= 4 && novice.score <= 2) {
      alerts.push({
        type: 'danger',
        title: `ASSUMED KNOWLEDGE GAP (§0${section.id})`,
        description: `Expert rates this highly (${expert.score}/5), but Novice is confused (${novice.score}/5). Unexplained domain context or insider jargon creates friction.`,
        sectionIds: [section.id],
      });
    }

    // 2. Style Over Substance (Expert high, Skeptic low)
    if (expert.score >= 4 && skeptic.score <= 2) {
      alerts.push({
        type: 'warning',
        title: `UNEARNED POLISH / LOGICAL GAP (§0${section.id})`,
        description: `Expert appreciates craft technique (${expert.score}/5), but Skeptic flags unearned emotional beats or logical flaws (${skeptic.score}/5).`,
        sectionIds: [section.id],
      });
    }

    // 3. Flat Emotional Spark (Novice high, Emotional bored/flat/low)
    if (
      novice.score >= 4 &&
      (emotional.emotion === 'bored' || emotional.emotion === 'flat' || emotional.score <= 2)
    ) {
      const emotionLabel = emotional.emotion ?? 'neutral';
      alerts.push({
        type: 'info',
        title: `CLEAR BUT VISCERALLY FLAT (§0${section.id})`,
        description: `Novice finds this readable (${novice.score}/5), but Emotional Reader reports a "${emotionLabel}" reaction (${emotional.score}/5).`,
        sectionIds: [section.id],
      });
    }
  });

  return (
    <div className="neu-card rounded-3xl p-6 space-y-4">
      <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
        <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 font-sans tracking-tight">
            Cognitive Blind Spot Detection
          </h3>
          <p className="text-xs text-slate-500 font-sans">
            Automated synthesis flagging strategic disconnects between reader lenses
          </p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs font-mono text-emerald-800 flex items-center space-x-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">
            [SYSTEM HARMONY]: No critical blind spot disconnects detected across evaluated sections.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border text-xs space-y-2 flex flex-col justify-between shadow-xs ${
                alert.type === 'danger'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                  : alert.type === 'warning'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-blue-50/80 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  alert.type === 'danger' ? 'text-rose-600' : alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                }`} />
                <div>
                  <div className="font-mono font-bold text-xs uppercase tracking-wider">{alert.title}</div>
                  <div className="mt-1.5 font-sans text-xs leading-relaxed opacity-90">{alert.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
