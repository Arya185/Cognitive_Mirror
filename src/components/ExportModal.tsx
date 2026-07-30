import React, { useState } from 'react';
import { EvaluationResult } from '../types';
import { X, Copy, Check, Download, Terminal } from 'lucide-react';

interface ExportModalProps {
  result: EvaluationResult;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ result, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'json' | 'markdown'>('json');

  if (!isOpen) return null;

  const jsonString = JSON.stringify(result, null, 2);

  const markdownString = `# Cognitive Mirror Evaluation Report

## Overall Summaries
- **Novice:** ${result.overall_summary.novice}
- **Expert:** ${result.overall_summary.expert}
- **Skeptic:** ${result.overall_summary.skeptic}
- **Emotional Reader:** ${result.overall_summary.emotional}

## Section Breakdown
${result.sections
  .map(
    (s) => `### Section §0${s.id}: "${s.excerpt}"
**Dimensions:** ${s.dimensions.join(', ')} | **Importance:** ${s.importance}/5

${s.personas
  .map(
    (p) => `- **${p.id.toUpperCase()}**: Score ${p.score}/5 (Confidence: ${Math.round(
      p.confidence * 100
    )}%)${p.emotion ? ` | Emotion: "${p.emotion}"` : ''} - "${p.note}"`
  )
  .join('\n')}
`
  )
  .join('\n\n')}
`;

  const contentToCopy = format === 'json' ? jsonString : markdownString;

  const handleCopy = () => {
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([contentToCopy], {
      type: format === 'json' ? 'application/json' : 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognitive-mirror-report.${format === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-[16px_16px_40px_rgba(180,195,215,0.6),-16px_-16px_40px_#FFFFFF] border border-white max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Terminal className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              EXPORT TELEMETRY REPORT
            </h3>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex bg-slate-200/70 p-1 rounded-2xl border border-slate-300/60">
              <button
                onClick={() => setFormat('json')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                  format === 'json'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                JSON SCHEMA
              </button>
              <button
                onClick={() => setFormat('markdown')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                  format === 'markdown'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                MARKDOWN REPORT
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs text-slate-800 bg-[#F0F4F8] neu-inset rounded-2xl m-4 leading-relaxed whitespace-pre-wrap select-all">
          {contentToCopy}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <span className="text-[11px] text-slate-500 font-semibold">
            FORMAT: {format.toUpperCase()} | ENGINE SPEC V1.4
          </span>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopy}
              className="neu-button px-4 py-2 rounded-2xl text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors flex items-center space-x-2 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="neu-button-primary px-4 py-2 rounded-2xl text-xs font-bold transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
