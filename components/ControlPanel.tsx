
import React from 'react';
import { AgentAction } from '../types';

interface ControlPanelProps {
  isRunning: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  onNextEpisode: () => void;
  onResetBrain: () => void; 
  onToggleInference: (val: boolean) => void;
  onEnterTestMode: () => void; 
  isInferenceMode: boolean; 
  isTestMode: boolean; 
  onManualAction: (action: AgentAction) => void;
  rewindBudget: number;
  speed: number;
  onSpeedChange: (val: number) => void;
  episodeCount: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isRunning,
  onToggleRun,
  onStep,
  onNextEpisode,
  onResetBrain,
  onToggleInference,
  onEnterTestMode,
  isInferenceMode,
  isTestMode,
  onManualAction,
  rewindBudget,
  speed,
  onSpeedChange,
  episodeCount
}) => {
  return (
    <div className="glass-panel p-5 rounded-xl border-t border-slate-700/50">
      <div className="flex flex-col gap-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
            <span className="font-cyber text-xs tracking-widest text-cyan-500 uppercase">Mission Control</span>
            <div className={`flex gap-1 items-center px-2 py-0.5 rounded ${isTestMode ? 'bg-purple-900/50 text-purple-400' : (isInferenceMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-yellow-900/50 text-yellow-400')}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isTestMode ? 'bg-purple-400 animate-pulse' : (isInferenceMode ? 'bg-emerald-400' : 'bg-yellow-400 animate-pulse')}`}></div>
                <span className="text-[10px] font-bold">
                    {isTestMode ? 'EVALUATION (TEST MODE)' : (isInferenceMode ? 'TRAINED (INFERENCE)' : 'TRAINING (LEARNING)')}
                </span>
            </div>
        </div>
        
        {/* TEMPORAL CAPACITOR - REWIND MONITOR */}
        <div className="bg-slate-900/60 p-4 rounded border border-cyan-500/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors pointer-events-none"></div>
            
            <div className="relative flex items-center justify-between mb-3">
                <div className="flex flex-col">
                    <span className="font-cyber text-sm text-cyan-400 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                        Temporal Capacitor
                    </span>
                    <span className="text-[9px] text-cyan-600/70 font-mono tracking-tighter">REWIND BUDGET</span>
                </div>
                <div className={`font-mono text-xl font-bold ${rewindBudget === 0 ? 'text-red-500' : 'text-cyan-400'}`}>
                    {rewindBudget}<span className="text-sm opacity-50">/5</span>
                </div>
            </div>

            {/* Gauge Bars */}
            <div className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div 
                        key={i}
                        className={`h-4 flex-1 rounded-sm skew-x-[-10deg] transition-all duration-300 ${
                            i < rewindBudget 
                            ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] border border-cyan-200' 
                            : 'bg-slate-800 border border-slate-700 opacity-30'
                        }`}
                    />
                ))}
            </div>
        </div>

        {/* Main Sim Controls */}
        <div className="flex gap-3">
          <button
            onClick={onToggleRun}
            className={`flex-1 py-3 px-4 rounded font-cyber text-sm tracking-wider transition-all duration-200 border ${
              isRunning 
                ? 'bg-red-500/10 text-red-400 border-red-500/50 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'
            }`}
          >
            {isRunning ? 'HALT SIMULATION' : 'START GAME'}
          </button>
          
          <button
            onClick={onStep}
            disabled={isRunning}
            className="px-6 py-2 bg-slate-800 text-slate-300 border border-slate-600 rounded hover:bg-slate-700 hover:text-white hover:border-slate-400 disabled:opacity-30 font-mono text-sm transition-all"
          >
            STEP
          </button>
        </div>

        {/* Brain Controls */}
        <div className="bg-slate-900/40 p-3 rounded border border-slate-800/50 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Training Campaign</span>
             <button
                onClick={onEnterTestMode}
                className={`w-full px-3 py-2 border rounded text-[10px] font-bold transition-all uppercase tracking-wider ${isTestMode ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-purple-300 hover:border-purple-500/50'}`}
            >
                {isTestMode ? 'EXIT TEST MODE' : 'RUN TEST (RANDOM MAP)'}
            </button>
             <button
                onClick={onResetBrain}
                disabled={isTestMode}
                className="w-full px-3 py-1.5 bg-red-900/10 text-red-400 border border-red-900/30 rounded hover:bg-red-900/30 text-[10px] font-bold transition-all uppercase disabled:opacity-20"
            >
                Reset Brain (Simulate "Before Training")
            </button>
        </div>

        {/* Speed Control */}
        <div className="bg-slate-900/40 p-3 rounded border border-slate-800/50">
          <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>CLOCK_SPEED: {speed}ms</span>
            <span className={speed < 100 ? 'text-red-400' : 'text-slate-500'}>{speed < 100 ? 'OVERCLOCK' : 'NORMAL'}</span>
          </div>
          <input 
            type="range" 
            min="20" 
            max="1000" 
            step="10" 
            value={speed} 
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

      </div>
    </div>
  );
};

export default ControlPanel;
