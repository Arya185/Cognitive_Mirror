import React from 'react';
import { PRESET_SAMPLES } from '../data/presets';
import { PresetSample } from '../types';
import { Sparkles, FileText, ArrowRight, RefreshCw, Terminal, Sliders, Layers } from 'lucide-react';

interface InputPanelProps {
  inputText: string;
  setInputText: (val: string) => void;
  onEvaluate: () => void;
  isLoading: boolean;
  onSelectPreset: (preset: PresetSample) => void;
  activePresetId?: string;
  error?: string | null;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  inputText,
  setInputText,
  onEvaluate,
  isLoading,
  onSelectPreset,
  activePresetId,
  error,
}) => {
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const paragraphCount = inputText.trim() ? inputText.split(/\n\s*\n/).filter(Boolean).length : 0;

  return (
    <div className="neu-card rounded-3xl p-6 sm:p-8 space-y-6">
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center space-x-2 font-mono text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>INPUT SPECIFICATION</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 font-sans tracking-tight">
            Submit Draft for Multi-Persona Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Story openings, pitches, lyrics, or taglines evaluated across 4 non-overlapping cognitive heuristics.
          </p>
        </div>

        {/* Word / Paragraph stats pill */}
        <div className="flex items-center space-x-3 font-mono text-xs text-slate-600 bg-slate-100/70 px-4 py-2 rounded-2xl border border-slate-200/50 shadow-inner">
          <div className="flex items-center space-x-1">
            <span className="text-slate-900 font-bold">{wordCount}</span>
            <span className="text-slate-400">WORDS</span>
          </div>
          <div className="w-px h-3 bg-slate-300" />
          <div className="flex items-center space-x-1">
            <span className="text-slate-900 font-bold">{paragraphCount || 1}</span>
            <span className="text-slate-400">SECTIONS</span>
          </div>
        </div>
      </div>

      {/* Preset selector */}
      <div className="space-y-3">
        <label className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-600" />
          <span>REFERENCE TEST SAMPLE PRESETS</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_SAMPLES.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`p-4 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between h-full font-sans ${
                  isSelected
                    ? 'bg-blue-50/80 border-2 border-blue-500 shadow-[inset_2px_2px_5px_rgba(37,99,235,0.1)] text-slate-900'
                    : 'neu-button text-slate-600 hover:text-slate-900'
                }`}
              >
                <div>
                  <span className={`inline-block font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {preset.category}
                  </span>
                  <div className="font-bold text-xs text-slate-900 line-clamp-1">{preset.title}</div>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 line-clamp-2 font-sans leading-relaxed">
                  {preset.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Text Area */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold text-slate-600 font-mono">
          <label htmlFor="writing-input" className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>PRIMARY TEXT STREAM</span>
          </label>
          {inputText && (
            <button
              onClick={() => setInputText('')}
              className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer font-mono text-xs font-semibold"
            >
              [CLEAR]
            </button>
          )}
        </div>

        <div className="relative">
          <textarea
            id="writing-input"
            rows={7}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste creative writing sample here..."
            className="w-full p-4 rounded-2xl neu-inset text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-y leading-relaxed font-sans"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-mono text-rose-600 flex items-center justify-between">
          <span>[ERR]: {error}</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <div className="font-mono text-xs text-slate-500 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <span>PARAGRAPH / CLAUSE DISSECTION ALGORITHM</span>
        </div>

        <button
          type="button"
          onClick={onEvaluate}
          disabled={isLoading || !inputText.trim()}
          className={`w-full sm:w-auto px-7 py-3 rounded-2xl font-sans font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            isLoading || !inputText.trim()
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              : 'neu-button-primary hover:scale-[1.02] active:scale-[0.99]'
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Executing Engine...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Run Cognitive Evaluation</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
