import React, { useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart, Area 
} from 'recharts';
import { AgentState, EpisodeStats } from '../types';

interface MetricsPanelProps {
  scoreHistory: { step: number; score: number }[];
  agent: AgentState;
  logs: string[];
  episodeStats: EpisodeStats[];
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ scoreHistory, agent, logs, episodeStats }) => {
  const [viewMode, setViewMode] = useState<'LIVE' | 'HISTORY'>('LIVE');

  // Calculate improvement metrics
  const firstEp = episodeStats.length > 0 ? episodeStats[0] : null;
  const lastEp = episodeStats.length > 1 ? episodeStats[episodeStats.length - 1] : null;
  
  const stepImprovement = firstEp && lastEp 
    ? ((firstEp.steps - lastEp.steps) / firstEp.steps * 100).toFixed(1) 
    : "0.0";
    
  const rewardImprovement = firstEp && lastEp
    ? (lastEp.totalReward - firstEp.totalReward).toFixed(0)
    : "0";

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-slate-400 text-xs uppercase tracking-wider">Health</div>
          <div className={`text-2xl font-mono font-bold ${agent.health < 30 ? 'text-red-500' : 'text-green-400'}`}>
            {agent.health}%
          </div>
          <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
            <div 
              className={`h-full ${agent.health < 30 ? 'bg-red-500' : 'bg-green-500'}`} 
              style={{ width: `${Math.max(0, agent.health)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-slate-400 text-xs uppercase tracking-wider">Rewind Budget</div>
          <div className="text-2xl font-mono font-bold text-purple-400">
            {agent.rewindBudget}
          </div>
          <div className="text-xs text-slate-500">Charges remaining</div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-slate-400 text-xs uppercase tracking-wider">Current Step</div>
          <div className="text-2xl font-mono font-bold text-blue-400">
            {agent.stepsTaken}
          </div>
        </div>
        
         <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-slate-400 text-xs uppercase tracking-wider">Current Reward</div>
          <div className="text-2xl font-mono font-bold text-yellow-400">
             {scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1].score : 0}
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex justify-end">
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex gap-1">
              <button 
                onClick={() => setViewMode('LIVE')}
                className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'LIVE' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  LIVE TELEMETRY
              </button>
              <button 
                onClick={() => setViewMode('HISTORY')}
                className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'HISTORY' ? 'bg-slate-700 text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  HISTORY COMPARISON
              </button>
          </div>
      </div>

      {/* Charts Container */}
      <div className="flex-1 min-h-[250px] bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col relative overflow-hidden">
          
          {viewMode === 'LIVE' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* Live Reward Flow */}
                <div className="flex flex-col h-full">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Episode Reward Velocity</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={scoreHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="step" stroke="#94a3b8" fontSize={10} />
                            <YAxis stroke="#94a3b8" fontSize={10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                                itemStyle={{ color: '#fbbf24' }}
                            />
                            <Line 
                            type="stepAfter" 
                            dataKey="score" 
                            stroke="#fbbf24" 
                            strokeWidth={2} 
                            dot={false}
                            animationDuration={300}
                            />
                        </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Brief Stats */}
                <div className="flex flex-col h-full">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Training Progress Overview</h3>
                    <div className="flex-1">
                        {episodeStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={episodeStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="episode" stroke="#94a3b8" fontSize={10} />
                                <YAxis stroke="#94a3b8" fontSize={10} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                />
                                <Bar dataKey="steps" fill="#3b82f6" name="Steps" radius={[2, 2, 0, 0]} />
                            </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2">
                                <span>No previous episodes.</span>
                                <span className="text-xs text-slate-600">Complete a run to see training data.</span>
                            </div>
                        )}
                    </div>
                </div>
              </div>
          ) : (
              <div className="flex flex-col h-full">
                  <div className="flex justify-between items-end mb-4 border-b border-slate-700/50 pb-2">
                      <div>
                        <h3 className="text-lg font-bold text-blue-400">Performance Comparison</h3>
                        <p className="text-xs text-slate-400">Comparing learning efficiency across episodes on current map</p>
                      </div>
                      <div className="flex gap-6 text-right">
                          <div>
                              <div className="text-xs text-slate-500 uppercase">Efficiency Gain</div>
                              <div className={`text-xl font-mono font-bold ${Number(stepImprovement) > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                                  {Number(stepImprovement) > 0 ? '+' : ''}{stepImprovement}%
                              </div>
                          </div>
                           <div>
                              <div className="text-xs text-slate-500 uppercase">Reward Delta</div>
                              <div className={`text-xl font-mono font-bold ${Number(rewardImprovement) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {Number(rewardImprovement) > 0 ? '+' : ''}{rewardImprovement}
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex-1">
                     {episodeStats.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={episodeStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="episode" stroke="#94a3b8" fontSize={10} label={{ value: 'Episode', position: 'insideBottom', offset: -5 }} />
                                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} label={{ value: 'Steps (Lower is Better)', angle: -90, position: 'insideLeft', style: {fill: '#3b82f6'} }} />
                                <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={10} label={{ value: 'Total Reward', angle: 90, position: 'insideRight', style: {fill: '#fbbf24'} }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                                />
                                <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                                <Area yAxisId="left" type="monotone" dataKey="steps" fill="url(#colorSteps)" stroke="#3b82f6" name="Steps Taken" />
                                <Line yAxisId="right" type="monotone" dataKey="totalReward" stroke="#fbbf24" strokeWidth={3} name="Total Reward" />
                                <Bar yAxisId="left" dataKey="rewindsUsed" barSize={10} fill="#ef4444" name="Rewinds Used" />
                                <defs>
                                    <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                            </ComposedChart>
                        </ResponsiveContainer>
                     ) : (
                         <div className="flex items-center justify-center h-full text-slate-500">
                             Need at least 2 episodes to generate comparison.
                         </div>
                     )}
                  </div>
              </div>
          )}
      </div>

      {/* Logs */}
      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 h-40 overflow-y-auto font-mono text-xs">
        <h3 className="text-slate-400 font-bold mb-2 sticky top-0 bg-slate-950 pb-2 border-b border-slate-800">Agent Logs</h3>
        <div className="flex flex-col-reverse">
          {logs.map((log, i) => (
            <div key={i} className="mb-1 text-slate-300 border-b border-slate-800/50 py-1 last:border-0">
              <span className="text-slate-600 mr-2">[{logs.length - 1 - i}]</span>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;