
import React, { useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart, Area, AreaChart 
} from 'recharts';
import { AgentState, EpisodeStats } from '../types';

interface MetricsPanelProps {
  scoreHistory: { step: number; score: number }[];
  agent: AgentState;
  logs: string[];
  episodeStats: EpisodeStats[];
  currentEpisode: number;
  totalScore: number;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ scoreHistory, agent, logs, episodeStats, currentEpisode, totalScore }) => {
  const [viewMode, setViewMode] = useState<'LIVE' | 'HISTORY'>('LIVE');

  const currentObjective = "COLLECT COINS & REACH GOAL";

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Stats Modules */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-3 rounded-lg border-l-2 border-l-green-500">
          <div className="text-slate-400 text-[10px] uppercase tracking-widest font-cyber">Integrity</div>
          <div className={`text-2xl font-mono font-bold ${agent.health < 30 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
            {agent.health}%
          </div>
        </div>

        <div className="glass-panel p-3 rounded-lg border-l-2 border-l-purple-500">
          <div className="text-slate-400 text-[10px] uppercase tracking-widest font-cyber">Steps Taken</div>
          <div className="text-2xl font-mono font-bold text-purple-400">
             {agent.stepsTaken}
          </div>
          <div className="text-[9px] text-slate-500 mt-1 font-mono">
            REWIND BUDGET: {agent.rewindBudget}
          </div>
        </div>

        <div className="glass-panel p-3 rounded-lg border-l-2 border-l-blue-500">
          <div className="text-slate-400 text-[10px] uppercase tracking-widest font-cyber">Session Coins</div>
          <div className="flex justify-between items-end">
             <div className="text-xs text-slate-400">COINS</div>
             <div className="text-xl font-mono font-bold text-yellow-400">{agent.coins}</div>
          </div>
        </div>
        
         <div className="glass-panel p-3 rounded-lg border-l-2 border-l-yellow-500">
          <div className="text-slate-400 text-[10px] uppercase tracking-widest font-cyber">Total Score</div>
          <div className="text-2xl font-mono font-bold text-yellow-400">
             {totalScore}
          </div>
        </div>
      </div>

      {/* View Toggle & Info */}
      <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-3">
             <div className="bg-slate-800/80 border border-slate-700 px-3 py-1 rounded text-cyan-400 font-cyber font-bold text-sm shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                LEVEL {String(currentEpisode).padStart(2, '0')}
             </div>
             <span className="text-[10px] text-orange-400 font-cyber tracking-wider opacity-80 uppercase">
                OBJ: {currentObjective}
             </span>
          </div>
          
          <div className="bg-slate-900/50 p-1 rounded-lg border border-slate-700 flex gap-1">
              <button 
                onClick={() => setViewMode('LIVE')}
                className={`px-3 py-1 text-[10px] font-bold tracking-wider rounded transition-all ${viewMode === 'LIVE' ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  LIVE
              </button>
              <button 
                onClick={() => setViewMode('HISTORY')}
                className={`px-3 py-1 text-[10px] font-bold tracking-wider rounded transition-all ${viewMode === 'HISTORY' ? 'bg-blue-900/40 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  HISTORY
              </button>
          </div>
      </div>

      {/* Charts Container */}
      <div className="flex-1 min-h-[250px] glass-panel p-4 rounded-xl border-t border-slate-700/50 flex flex-col relative overflow-hidden">
          
          {viewMode === 'LIVE' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* Live Reward Flow */}
                <div className="flex flex-col h-full">
                    <h3 className="text-xs font-cyber text-slate-400 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                        CUMULATIVE REWARD (CURRENT LEVEL)
                    </h3>
                    <div className="flex-1 bg-slate-900/20 rounded border border-slate-800/50">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={scoreHistory}>
                            <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" />
                            <XAxis dataKey="step" stroke="#475569" fontSize={10} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                            />
                            <Line type="stepAfter" dataKey="score" stroke="#fbbf24" strokeWidth={2} dot={false} animationDuration={300} />
                        </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Brief Stats */}
                <div className="flex flex-col h-full">
                    <h3 className="text-xs font-cyber text-slate-400 mb-2 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                         RECENT PERFORMANCE
                    </h3>
                    <div className="flex-1 bg-slate-900/20 rounded border border-slate-800/50">
                        {episodeStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={episodeStats.slice(-10)}>
                                <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="episode" stroke="#475569" fontSize={10} tickLine={false} />
                                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }} />
                                <Bar dataKey="steps" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Steps" />
                            </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500 text-[10px]">NO HISTORY DATA</div>
                        )}
                    </div>
                </div>
              </div>
          )}

          {viewMode === 'HISTORY' && (
              <div className="flex flex-col h-full">
                  <h3 className="text-xs font-cyber text-slate-400 mb-2 flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                        PERFORMANCE COMPARISON (ALL LEVELS)
                      </div>
                      <div className="flex gap-4 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500/50"></span> Steps (Lower is Better)</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500"></span> Reward (Higher is Better)</span>
                      </div>
                  </h3>
                  <div className="flex-1 bg-slate-900/20 rounded border border-slate-800/50 relative">
                     {episodeStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={episodeStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="episode" stroke="#475569" fontSize={10} tickLine={false} />
                                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={10} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }} />
                                <Area yAxisId="left" type="monotone" dataKey="steps" fillOpacity={1} fill="url(#colorSteps)" stroke="#3b82f6" name="Steps Taken" />
                                <Line yAxisId="right" type="monotone" dataKey="totalReward" stroke="#fbbf24" strokeWidth={2} dot={{r: 2}} name="Total Reward" />
                            </ComposedChart>
                        </ResponsiveContainer>
                     ) : (
                         <div className="flex flex-col items-center justify-center h-full text-slate-500">
                             <div className="text-2xl mb-2 opacity-20">📊</div>
                             <div className="text-xs uppercase tracking-widest">Awaiting Simulation Data</div>
                             <div className="text-[9px] opacity-50 mt-1">Complete a level to see comparative analysis</div>
                         </div>
                     )}
                  </div>
              </div>
          )}
      </div>

      {/* Logs */}
      <div className="glass-panel p-2 rounded-lg border border-slate-800 h-32 overflow-y-auto font-mono text-[10px]">
        <h3 className="text-slate-500 font-bold mb-1 sticky top-0 bg-[#0f172a]/90 backdrop-blur pb-1 border-b border-slate-800">SYSTEM_LOGS</h3>
        <div className="flex flex-col-reverse">
          {logs.map((log, i) => (
            <div key={i} className="mb-0.5 text-slate-400 border-b border-slate-800/30 py-0.5 last:border-0 hover:text-slate-200">
              <span className="text-slate-600 mr-2">[{String(logs.length - 1 - i).padStart(3, '0')}]</span>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
