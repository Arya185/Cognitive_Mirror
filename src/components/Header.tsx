import React from 'react';
import { Eye, BookOpen, Activity, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onReset?: () => void;
  hasResult?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, hasResult }) => {
  return (
    <header className="sticky top-0 z-30 bg-[#F0F4F8]/80 backdrop-blur-md border-b border-slate-200/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={onReset}
        >
          {/* Neumorphic icon badge */}
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-[4px_4px_10px_rgba(180,195,215,0.45),-4px_-4px_10px_#FFFFFF] border border-white group-hover:scale-105 transition-all duration-200">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 font-sans">
                Cognitive Mirror
              </h1>
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                SYS.V1.4
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium font-sans">
              Cognitive Divergence Engine
            </p>
          </div>
        </div>

        {/* Header Right Status & Actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 font-mono text-xs text-slate-600 bg-white px-3.5 py-2 rounded-2xl shadow-[3px_3px_8px_rgba(180,195,215,0.35),-3px_-3px_8px_#FFFFFF] border border-slate-100/80">
            <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
            <span className="font-semibold text-slate-700">4 LENSES ACTIVE</span>
          </div>

          {hasResult && (
            <button
              onClick={onReset}
              className="neu-button inline-flex items-center space-x-2 font-sans text-xs font-bold px-4 py-2 rounded-2xl text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Reset Input</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
