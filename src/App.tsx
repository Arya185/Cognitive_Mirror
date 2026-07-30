import React, { useState, useCallback, useMemo } from 'react';
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
import { Sparkles, Download, ArrowLeft, RefreshCw, LayoutGrid, Activity, LoaderCircle } from 'lucide-react';

// -----------------------------------------------------------------------------
// Custom Hook: useEvaluation
// -----------------------------------------------------------------------------
function useEvaluation(initialText: string) {
  const [inputText, setInputText] = useState<string>(initialText);
  const [activePresetId, setActivePresetId] = useState<string>(PRESET_SAMPLES[0].id);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);

  const formatErrorMessage = useCallback((message: string) => {
    if (/AI response was incomplete/i.test(message) || /AI response could not be parsed/i.test(message)) {
      return message;
    }
    if (/WATSONX_API_KEY environment variable is not configured/i.test(message) || /WATSONX_PROJECT_ID environment variable is not configured/i.test(message)) {
      return 'IBM watsonx.ai credentials are unavailable. Check server configuration.';
    }
    if (/Too many evaluation requests/i.test(message)) {
      return 'Rate limit reached. Wait a moment, then run again.';
    }
    if (/Failed to fetch/i.test(message)) {
      return 'Evaluation service is unreachable. Check server connection.';
    }
    return message;
  }, []);

  const readErrorMessage = useCallback(async (response: Response) => {
    try {
      const errorData = await response.json();
      if (typeof errorData?.error === 'string' && errorData.error.trim().length > 0) {
        return errorData.error;
      }
    } catch {
      return `Request failed (${response.status}). Please try again.`;
    }

    return `Request failed (${response.status}). Please try again.`;
  }, []);

  const selectPreset = useCallback((preset: PresetSample) => {
    setActivePresetId(preset.id);
    setInputText(preset.text);
    setError(null);
  }, []);

  const evaluate = useCallback(async () => {
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
        const errorMessage = await readErrorMessage(response);
        throw new Error(formatErrorMessage(errorMessage));
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
      setError(
        err instanceof Error
          ? formatErrorMessage(err.message)
          : 'Evaluation failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [formatErrorMessage, inputText, readErrorMessage]);

  const reset = useCallback(() => {
    setResult(null);
    setSelectedSectionId(null);
    setError(null);
  }, []);

  return {
    inputText,
    setInputText,
    activePresetId,
    isLoading,
    error,
    result,
    selectedSectionId,
    setSelectedSectionId,
    selectPreset,
    evaluate,
    reset,
  };
}

// -----------------------------------------------------------------------------
// Subcomponents (can be moved to separate files)
// -----------------------------------------------------------------------------

// --- Input View ---
interface InputViewProps {
  inputText: string;
  setInputText: (text: string) => void;
  onEvaluate: () => void;
  isLoading: boolean;
  onSelectPreset: (preset: PresetSample) => void;
  activePresetId: string;
  error: string | null;
}

function InputView({
  inputText,
  setInputText,
  onEvaluate,
  isLoading,
  onSelectPreset,
  activePresetId,
  error,
}: InputViewProps) {
  return (
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
        onEvaluate={onEvaluate}
        isLoading={isLoading}
        onSelectPreset={onSelectPreset}
        activePresetId={activePresetId}
        error={error}
      />

      {isLoading && (
        <div className="neu-card rounded-3xl p-5 flex items-center gap-3 border border-blue-100 bg-white/90">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <LoaderCircle className="w-5 h-5 animate-spin" />
          </div>
          <div className="font-mono text-sm text-slate-700">
            <div className="font-bold text-slate-900">[RUNNING]: Cognitive Persona Engine active.</div>
            <div className="text-xs text-slate-500 mt-1">Awaiting structured IBM watsonx.ai response...</div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Action Bar ---
interface ActionBarProps {
  onReset: () => void;
  onReEvaluate: () => void;
  isLoading: boolean;
  onExport: () => void;
  sectionCount: number;
}

function ActionBar({ onReset, onReEvaluate, isLoading, onExport, sectionCount }: ActionBarProps) {
  return (
    <div className="neu-card rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center space-x-3">
        <button
          onClick={onReset}
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
            DISSECTED INTO <strong className="text-slate-900">{sectionCount}</strong> LOGICAL SECTIONS
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 w-full sm:w-auto font-sans text-xs">
        <button
          onClick={onReEvaluate}
          disabled={isLoading}
          className="neu-button px-4 py-2.5 rounded-2xl font-bold text-slate-700 hover:text-blue-600 flex items-center space-x-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Re-Evaluate</span>
        </button>

        <button
          onClick={onExport}
          className="neu-button-primary px-5 py-2.5 rounded-2xl font-bold flex items-center space-x-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Report (JSON)</span>
        </button>
      </div>
    </div>
  );
}

// --- Results Dashboard ---
interface ResultsDashboardProps {
  result: EvaluationResult;
  selectedSectionId: number | null;
  onSelectSection: (id: number) => void;
  onReEvaluate: () => void;
  isLoading: boolean;
  onReset: () => void;
  onExport: () => void;
  error: string | null;
}

function ResultsDashboard({
  result,
  selectedSectionId,
  onSelectSection,
  onReEvaluate,
  isLoading,
  onReset,
  onExport,
  error,
}: ResultsDashboardProps) {
  const [activePersonaFilter, setActivePersonaFilter] = useState<PersonaId | 'all'>('all');

  return (
    <div className="space-y-8">
      <ActionBar
        onReset={onReset}
        onReEvaluate={onReEvaluate}
        isLoading={isLoading}
        onExport={onExport}
        sectionCount={result.sections.length}
      />

      {(isLoading || error) && (
        <div className={`neu-card rounded-3xl p-4 flex items-start gap-3 ${
          error
            ? 'border-2 border-rose-300 bg-rose-100/80'
            : 'border border-blue-100 bg-white/90'
        }`}>
          <div className={`p-2 rounded-xl border ${
            error
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-blue-50 text-blue-600 border-blue-100'
          }`}>
            {error ? <Activity className="w-5 h-5" /> : <LoaderCircle className="w-5 h-5 animate-spin" />}
          </div>
          <div className="font-mono text-sm">
            <div className="font-bold text-slate-900">
              {error ? '[ERR]: Re-evaluation failed.' : '[RUNNING]: Refreshing telemetry.'}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {error ? error : 'Existing result remains visible until new response lands.'}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PersonaMetrics result={result} />
        </div>

        <div className="lg:col-span-2">
          <DisagreementMatrix
            result={result}
            selectedSectionId={selectedSectionId}
            onSelectSection={onSelectSection}
          />
        </div>

        <div className="lg:col-span-2">
          <BlindSpotProfile result={result} />
        </div>

        <div className="lg:col-span-1">
          <BlindSpotAlerts result={result} />
        </div>

        <div className="lg:col-span-3">
          <OverallSummaryCard summary={result.overall_summary} />
        </div>

        <div className="lg:col-span-3">
          <SectionViewer
            sections={result.sections}
            selectedSectionId={selectedSectionId}
            onSelectSection={onSelectSection}
            activePersonaFilter={activePersonaFilter}
            setActivePersonaFilter={setActivePersonaFilter}
          />
        </div>
      </div>
    </div>
  );
}

// --- Footer ---
function Footer() {
  return (
    <footer className="border-t border-slate-200/80 py-6 text-center font-mono text-xs text-slate-500 bg-white/60 backdrop-blur-xs mt-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <LayoutGrid className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-900">COGNITIVE MIRROR ENGINE</span>
        </div>
        <div>POWERED BY IBM WATSONX.AI (GRANITE) • MULTI-PERSONA TELEMETRY</div>
      </div>
    </footer>
  );
}

// -----------------------------------------------------------------------------
// Main App Component
// -----------------------------------------------------------------------------
export default function App() {
  const initialPreset = PRESET_SAMPLES[0];
  const {
    inputText,
    setInputText,
    activePresetId,
    isLoading,
    error,
    result,
    selectedSectionId,
    setSelectedSectionId,
    selectPreset,
    evaluate,
    reset,
  } = useEvaluation(initialPreset.text);

  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const handleSelectPreset = useCallback((preset: PresetSample) => {
    selectPreset(preset);
  }, [selectPreset]);

  const handleEvaluate = useCallback(() => {
    evaluate();
  }, [evaluate]);

  const handleReset = useCallback(() => {
    reset();
    setIsExportOpen(false);
  }, [reset]);

  const handleReEvaluate = useCallback(() => {
    evaluate();
  }, [evaluate]);

  const handleExport = useCallback(() => {
    setIsExportOpen(true);
  }, []);

  const handleCloseExport = useCallback(() => {
    setIsExportOpen(false);
  }, []);

  // Memoize export modal to avoid re-creating on every render
  const exportModal = useMemo(() => {
    if (!result) return null;
    return (
      <ExportModal
        result={result}
        isOpen={isExportOpen}
        onClose={handleCloseExport}
      />
    );
  }, [result, isExportOpen, handleCloseExport]);

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 flex flex-col font-sans selection:bg-blue-200 selection:text-blue-900">
      <Header onReset={handleReset} hasResult={!!result} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {!result ? (
          <InputView
            inputText={inputText}
            setInputText={setInputText}
            onEvaluate={handleEvaluate}
            isLoading={isLoading}
            onSelectPreset={handleSelectPreset}
            activePresetId={activePresetId}
            error={error}
          />
        ) : (
          <ResultsDashboard
            result={result}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
            onReEvaluate={handleReEvaluate}
            isLoading={isLoading}
            onReset={handleReset}
            onExport={handleExport}
            error={error}
          />
        )}
      </main>

      <Footer />

      {exportModal}
    </div>
  );
}
