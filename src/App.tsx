import React, { useState } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { DisagreementMatrix } from './components/DisagreementMatrix';
import { BlindSpotAlerts } from './components/BlindSpotAlerts';
import { BlindSpotProfile } from './components/BlindSpotProfile';
import { PersonaMetrics } from './components/PersonaMetrics';
import { OverallSummaryCard } from './components/OverallSummaryCard';
import { SectionViewer } from './components/SectionViewer';
import { ExportModal } from './components/ExportModal';
import { PRESET_SAMPLES } from './data/presets';
import { EvaluationResult, PresetSample, PersonaId } from './types';
import { Sparkles, Download, ArrowLeft, RefreshCw, LayoutGrid } from 'lucide-react';

export default function App() {
  const [inputText, setInputText] = useState<string>(PRESET_SAMPLES[0].text);
  const [activePresetId, setActivePresetId] = useState<string>(PRESET_SAMPLES[0].id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [activePersonaFilter, setActivePersonaFilter] = useState<PersonaId | 'all'>('all');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const handleSelectPreset = (preset: PresetSample) => {
    setActivePresetId(preset.id);
    setInputText(preset.text);
    setError(null);
  };

  const handleEvaluate = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to evaluate writing sample.');
      }

      const data: EvaluationResult = await response.json();
      setResult(data);
      if (data.sections.length > 0) {
        setSelectedSectionId(data.sections[0].id);
      }
    } catch (err: unknown) {
      console.error('Cognitive Mirror error:', err);
      setResult(null);
      setSelectedSectionId(null);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedSectionId(null);
    setError(null);
    setIsExportOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 flex flex-col font-sans selection:bg-blue-200 selection:text-blue-900">
      <Header onReset={handleReset} hasResult={!!result} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {!result ? (
          /* Initial Input & Reflection Workspace */
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-3 pt-4">
              <span className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-blue-600 shadow-[4px_4px_10px_rgba(180,195,215,0.4),-4px_-4px_10px_#FFFFFF] border border-slate-100">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>COGNITIVE PERSONA ENGINE</span>
              </span>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 font-sans">
                Measure Cognitive Divergence
              </h2>
              <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed font-sans font-medium">
                Evaluates clarity, craft, logical scrutiny, and raw felt emotion across four non-overlapping reader heuristics.
              </p>
            </div>

            <InputPanel
              inputText={inputText}
              setInputText={setInputText}
              onEvaluate={handleEvaluate}
              isLoading={isLoading}
              onSelectPreset={handleSelectPreset}
              activePresetId={activePresetId}
              error={error}
            />
          </div>
        ) : (
          /* Bento Grid Results Dashboard */
          <div className="space-y-8">
            {/* Action Bar Header */}
            <div className="neu-card rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleReset}
                  className="neu-button p-2.5 rounded-2xl text-slate-500 hover:text-slate-900 cursor-pointer"
                  title="Return to Input"
                >
                  <ArrowLeft className="w-5 h-5 text-blue-600" />
                </button>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-black text-slate-900 font-sans tracking-tight">
                      Cognitive Reflection Assessment
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold font-mono border border-blue-100">
                      BENTO GRID
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    DISSECTED INTO <strong className="text-slate-900">{result.sections.length}</strong> LOGICAL SECTIONS
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto font-sans text-xs">
                <button
                  onClick={handleEvaluate}
                  disabled={isLoading}
                  className="neu-button px-4 py-2.5 rounded-2xl font-bold text-slate-700 hover:text-blue-600 flex items-center space-x-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Re-Evaluate</span>
                </button>

                <button
                  onClick={() => setIsExportOpen(true)}
                  className="neu-button-primary px-5 py-2.5 rounded-2xl font-bold flex items-center space-x-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Report (JSON)</span>
                </button>
              </div>
            </div>

            {/* Main Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bento Box 1: Persona Telemetry Mean Scores */}
              <div className="lg:col-span-1">
                <PersonaMetrics result={result} />
              </div>

              {/* Bento Box 2: Spectrogram & Disagreement Matrix */}
              <div className="lg:col-span-2">
                <DisagreementMatrix
                  result={result}
                  selectedSectionId={selectedSectionId}
                  onSelectSection={setSelectedSectionId}
                />
              </div>

              {/* Bento Box 3a: Blind Spot Profile — dimension severity bars */}
              <div className="lg:col-span-2">
                <BlindSpotProfile result={result} />
              </div>

              {/* Bento Box 3b: Blind Spot Disconnect Alerts */}
              <div className="lg:col-span-1">
                <BlindSpotAlerts result={result} />
              </div>

              {/* Bento Box 4: Macro Persona Summaries */}
              <div className="lg:col-span-3">
                <OverallSummaryCard summary={result.overall_summary} />
              </div>

              {/* Bento Box 5: Sectional Telemetry Stream */}
              <div className="lg:col-span-3">
                <SectionViewer
                  sections={result.sections}
                  selectedSectionId={selectedSectionId}
                  onSelectSection={setSelectedSectionId}
                  activePersonaFilter={activePersonaFilter}
                  setActivePersonaFilter={setActivePersonaFilter}
                />
              </div>
            </div>

            {/* Export Modal */}
            <ExportModal
              result={result}
              isOpen={isExportOpen}
              onClose={() => setIsExportOpen(false)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-6 text-center font-mono text-xs text-slate-500 bg-white/60 backdrop-blur-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <LayoutGrid className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900">COGNITIVE MIRROR ENGINE</span>
            <span>— WHITE NEOMORPHIC BENTO GRID</span>
          </div>
          <div>POWERED BY IBM WATSONX.AI (GRANITE) • SYS.V1.4</div>
        </div>
      </footer>
    </div>
  );
}
