import React from 'react';
import { AgentAction } from '../types';

interface ControlPanelProps {
  isRunning: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  onNextEpisode: () => void;
  onNewMap: () => void;
  onRewind: () => void;
  onManualAction: (action: AgentAction) => void;
  useGemini: boolean;
  onToggleGemini: () => void;
  canRewind: boolean;
  speed: number;
  onSpeedChange: (val: number) => void;
  episodeCount: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isRunning,
  onToggleRun,
  onStep,
  onNextEpisode,
  onNewMap,
  onRewind,
  onManualAction,
  useGemini,
  onToggleGemini,
  canRewind,
  speed,
  onSpeedChange,
  episodeCount
}) => {
  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <div className="flex flex-col gap-4">
        
        {/* Main Sim Controls */}
        <div className="flex gap-2">
          <button
            onClick={onToggleRun}
            className={`flex-1 py-2 px-4 rounded font-bold text-sm transition-colors ${
              isRunning 
                ? 'bg-red-500/20 text-red-400 border border-red-500 hover:bg-red-500/30' 
                : 'bg-green-500/20 text-green-400 border border-green-500 hover:bg-green-500/30'
            }`}
          >
            {isRunning ? 'STOP' : 'RUN'}
          </button>
          
          <button
            onClick={onStep}
            disabled={isRunning}
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 disabled:opacity-50 border border-slate-600 font-mono text-sm"
          >
            STEP
          </button>
        </div>

        {/* Speed Control */}
        <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>SPEED: {speed}ms</span>
            <span>{speed < 100 ? 'TURBO' : speed > 500 ? 'SLOW' : 'NORMAL'}</span>
          </div>
          <input 
            type="range" 
            min="20" 
            max="1000" 
            step="10" 
            value={speed} 
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="h-px bg-slate-700 my-1" />

         {/* Episode Controls */}
         <div className="flex flex-col gap-2">
             <button
                onClick={onNextEpisode}
                className="w-full px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/50 rounded hover:bg-blue-600/30 text-sm font-semibold"
            >
                RETRY LEVEL (Keep Training)
            </button>
            <button
                onClick={onNewMap}
                className="w-full px-4 py-2 bg-slate-700 text-slate-300 border border-slate-600 rounded hover:bg-slate-600 text-xs"
            >
                GENERATE NEW MAP (Reset Agent)
            </button>
         </div>

        <div className="h-px bg-slate-700 my-1" />

        {/* AI Mode Toggle */}
        <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded border border-slate-800">
           <span className="text-xs font-semibold text-slate-300 uppercase">Policy</span>
           <button 
             onClick={onToggleGemini}
             className={`text-xs px-3 py-1 rounded-full border transition-all ${
               useGemini 
               ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
               : 'bg-slate-700 border-slate-600 text-slate-400'
             }`}
           >
             {useGemini ? 'GEMINI' : 'Q-LEARNING'}
           </button>
        </div>

        {/* Rewind Button */}
        <button
          onClick={onRewind}
          disabled={!canRewind || isRunning}
          className="w-full mt-2 py-3 bg-purple-900/30 border border-purple-500/50 text-purple-300 rounded hover:bg-purple-900/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 group transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="font-bold">TRIGGER REWIND</span>
        </button>

      </div>
    </div>
  );
};

export default ControlPanel;