import React from 'react';
import { SectionResult, PersonaId } from '../types';
import { PERSONA_CONFIGS, DIMENSION_LABELS } from '../data/presets';
import {
  UserCheck,
  Award,
  ShieldAlert,
  HeartHandshake,
  Tag,
  Smile,
  Sliders
} from 'lucide-react';

interface SectionViewerProps {
  sections: SectionResult[];
  selectedSectionId: number | null;
  onSelectSection: (id: number) => void;
  activePersonaFilter: PersonaId | 'all';
  setActivePersonaFilter: (persona: PersonaId | 'all') => void;
}

const PERSONA_ICONS: Record<PersonaId, React.ElementType> = {
  novice: UserCheck,
  expert: Award,
  skeptic: ShieldAlert,
  emotional: HeartHandshake,
};

export const SectionViewer: React.FC<SectionViewerProps> = ({
  sections,
  selectedSectionId,
  onSelectSection,
  activePersonaFilter,
  setActivePersonaFilter,
}) => {
  return (
    <div className="space-y-6">
      {/* Filter and Section Selector Header */}
      <div className="neu-card rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900 font-sans tracking-tight">
            Sectional Deep-Dive Telemetry
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-sans">
            Detailed heuristic notes and confidence metrics per section
          </p>
        </div>

        {/* Persona Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1 md:pb-0 font-mono text-xs">
          <button
            onClick={() => setActivePersonaFilter('all')}
            className={`px-3.5 py-2 rounded-2xl transition-all cursor-pointer font-bold ${
              activePersonaFilter === 'all'
                ? 'neu-button-active'
                : 'neu-button text-slate-600 hover:text-slate-900'
            }`}
          >
            [ALL LENSES]
          </button>
          {PERSONA_CONFIGS.map((p) => {
            const isActive = activePersonaFilter === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePersonaFilter(p.id)}
                className={`px-3.5 py-2 rounded-2xl transition-all cursor-pointer font-bold flex items-center space-x-1.5 ${
                  isActive
                    ? 'neu-button-active'
                    : 'neu-button text-slate-600 hover:text-slate-900'
                }`}
                style={isActive ? { borderColor: p.color, color: p.color } : {}}
              >
                <span>{p.name.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List of Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const isFocused = selectedSectionId === section.id;
          const filteredPersonas =
            activePersonaFilter === 'all'
              ? section.personas
              : section.personas.filter((p) => p.id === activePersonaFilter);

          return (
            <div
              key={section.id}
              id={`section-${section.id}`}
              className={`neu-card rounded-3xl transition-all overflow-hidden ${
                isFocused
                  ? 'ring-2 ring-blue-500 shadow-[12px_12px_28px_rgba(180,195,215,0.6)]'
                  : ''
              }`}
            >
              {/* Section Header */}
              <div
                onClick={() => onSelectSection(section.id)}
                className="p-5 bg-slate-50/90 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                      §0{section.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">
                      EXCERPT:
                    </span>
                    <span className="text-sm italic font-semibold text-slate-900 line-clamp-1 font-sans">
                      "{section.excerpt}"
                    </span>
                  </div>

                  {/* Dimensions Tagged */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 font-mono text-[11px]">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    {section.dimensions.map((dim) => {
                      const meta = DIMENSION_LABELS[dim] || { label: dim, desc: '' };
                      return (
                        <span
                          key={dim}
                          title={meta.desc}
                          className="px-2.5 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200/80 font-medium uppercase shadow-2xs"
                        >
                          {meta.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Section Importance Score */}
                <div className="flex items-center space-x-3 self-end md:self-auto font-mono text-xs">
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                    <Sliders className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-slate-500 font-medium">IMPACT:</span>
                    <span className="font-extrabold text-slate-900">
                      {section.importance}/5
                    </span>
                  </div>
                </div>
              </div>

              {/* Persona Feedback Grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredPersonas.map((persona) => {
                  const cfg = PERSONA_CONFIGS.find((p) => p.id === persona.id)!;
                  const IconComponent = PERSONA_ICONS[persona.id];
                  const confidencePct = Math.round(persona.confidence * 100);

                  return (
                    <div
                      key={persona.id}
                      className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 flex flex-col justify-between space-y-3 hover:bg-white hover:shadow-[4px_4px_14px_rgba(180,195,215,0.3)] transition-all duration-200"
                    >
                      {/* Persona Header */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs" style={{ color: cfg.color }}>
                              <IconComponent className="w-4 h-4 flex-shrink-0" />
                            </div>
                            <div>
                              <div className="font-mono text-xs font-bold uppercase" style={{ color: cfg.color }}>
                                {cfg.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-sans">
                                {cfg.role}
                              </div>
                            </div>
                          </div>

                          {/* Numeric Score Badge */}
                          <div className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-2xs">
                            {persona.score}/5
                          </div>
                        </div>

                        {/* Emotion tag for Emotional Reader */}
                        {persona.id === 'emotional' && persona.emotion && (
                          <div className="pt-1">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Smile className="w-3 h-3 text-rose-600" />
                              <span>FEELING: "{persona.emotion}"</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <p className="text-xs text-slate-800 leading-relaxed font-sans bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-inner">
                        "{persona.note}"
                      </p>

                      {/* Confidence Meter */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-semibold">
                          <span>CERTAINTY:</span>
                          <span className="font-extrabold text-slate-900">
                            {confidencePct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${confidencePct}%`,
                              backgroundColor: cfg.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
