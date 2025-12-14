import React, { useState, useEffect, useCallback, useRef } from 'react';
import GridWorld from './components/GridWorld';
import MetricsPanel from './components/MetricsPanel';
import ControlPanel from './components/ControlPanel';
import ResearchSpec from './components/ResearchSpec';
import { 
  SimulationState, 
  GridCell, 
  CellType, 
  AgentAction, 
  EpisodeStats
} from './types';
import { DEFAULT_CONFIG, INITIAL_REWIND_BUDGET, MAX_HEALTH } from './constants';
import { getNextMoveFromGemini } from './services/geminiService';
import { QLearningAgent } from './services/qLearningService';
import { calculateNextState } from './services/gameLogic';

// Initial Grid Layout Generator
const generateGrid = (size: number): GridCell[][] => {
  const grid: GridCell[][] = Array(size).fill(null).map((_, y) => 
    Array(size).fill(null).map((_, x) => ({
      x, 
      y, 
      type: CellType.EMPTY,
      isDynamic: Math.random() > 0.8, // 20% chance to be a dynamic wall
      isActive: false
    }))
  );

  // Borders
  for(let i=0; i<size; i++) {
    grid[0][i].type = CellType.WALL;
    grid[size-1][i].type = CellType.WALL;
    grid[i][0].type = CellType.WALL;
    grid[i][size-1].type = CellType.WALL;
  }

  // Random obstacles
  for(let y=1; y<size-1; y++) {
    for(let x=1; x<size-1; x++) {
      if(Math.random() > 0.8) grid[y][x].type = CellType.WALL;
      if(Math.random() > 0.95) {
          grid[y][x].type = CellType.TRAP;
          grid[y][x].isActive = Math.random() > 0.5; // Random initial state
      }
    }
  }

  // Ensure Start and Goal
  grid[1][1].type = CellType.START;
  grid[size-2][size-2].type = CellType.GOAL;
  
  // Clear paths near start/end
  grid[1][2].type = CellType.EMPTY;
  grid[2][1].type = CellType.EMPTY;
  grid[size-2][size-3].type = CellType.EMPTY;
  grid[size-3][size-2].type = CellType.EMPTY;

  return grid;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SIMULATION' | 'SPEC'>('SIMULATION');
  const [isRunning, setIsRunning] = useState(false);
  const [useGemini, setUseGemini] = useState(false);
  const [lastAction, setLastAction] = useState<AgentAction | null>(null);
  const [simSpeed, setSimSpeed] = useState<number>(150); // Default speed

  // Q-Learning Agent Ref (Persistent across episodes)
  const qAgentRef = useRef(new QLearningAgent());

  // Training History
  const [episodeStats, setEpisodeStats] = useState<EpisodeStats[]>([]);

  // Initialize State
  const [simState, setSimState] = useState<SimulationState>(() => {
    const initialGrid = generateGrid(DEFAULT_CONFIG.gridSize);
    return {
      grid: initialGrid,
      agent: {
        position: { x: 1, y: 1 },
        health: MAX_HEALTH,
        rewindBudget: INITIAL_REWIND_BUDGET,
        stepsTaken: 0,
      },
      score: 0,
      history: [],
      episode: 1,
      isGameOver: false,
      gameResult: null,
      logs: ["Simulation initialized. Waiting for agent..."],
      activePath: [{ x: 1, y: 1 }],
      abandonedPaths: []
    };
  });

  const [scoreHistory, setScoreHistory] = useState<{ step: number; score: number }[]>([]);

  // Record stats when game ends
  useEffect(() => {
    if (simState.isGameOver) {
       setEpisodeStats(prev => {
           // Prevent duplicate entries for same episode if component re-renders
           if (prev.length > 0 && prev[prev.length - 1].episode === simState.episode) {
               return prev;
           }
           return [...prev, {
               episode: simState.episode,
               steps: simState.agent.stepsTaken,
               totalReward: simState.score,
               result: simState.gameResult || 'LOSS',
               rewindsUsed: INITIAL_REWIND_BUDGET - simState.agent.rewindBudget
           }];
       });
       
       // Decay epsilon on win to exploit more next time
       if (simState.gameResult === 'WIN' && !useGemini) {
           qAgentRef.current.decayEpsilon();
       }
    }
  }, [simState.isGameOver, simState.episode, simState.agent.stepsTaken, simState.score, simState.gameResult, simState.agent.rewindBudget, useGemini]);

  // Execute Step
  const performStep = useCallback(async (action: AgentAction) => {
    setSimState(prev => {
      
      if (prev.isGameOver) return prev;

      const { nextState, reward } = calculateNextState(prev, action);

      // Update Q-Table (if not using Gemini)
      // Note: We only update if it was a movement action for now, or we can update for all.
      if (!useGemini && action !== AgentAction.REWIND && action !== AgentAction.WAIT) {
          qAgentRef.current.update(prev.agent.position, action, reward, nextState.agent.position);
      }

      setLastAction(action);
      return nextState;
    });
  }, [useGemini]);

  // Effect to update Score History chart
  useEffect(() => {
      setScoreHistory(h => [...h, { step: simState.agent.stepsTaken, score: simState.score }]);
  }, [simState.score, simState.agent.stepsTaken]);

  // AI Loop
  const timerRef = useRef<number | null>(null);

  const tick = useCallback(async () => {
    if (simState.isGameOver) {
      setIsRunning(false);
      return;
    }

    let action = AgentAction.WAIT;
    
    if (useGemini) {
      action = await getNextMoveFromGemini(simState.grid, simState.agent, simState.logs);
    } else {
      // Q-Learning Agent
      action = qAgentRef.current.getAction(simState.agent.position);
      
      // Override: Heuristic for Rewind
      // If agent is in danger (low Q-value state) or health low, try to rewind
      // But we also want to simulate mistakes.
      if (
        (simState.agent.health < 40 || qAgentRef.current.isInDanger(simState.agent.position)) 
        && simState.agent.rewindBudget > 0
        && Math.random() > 0.7 // 30% chance to accept fate
      ) {
         action = AgentAction.REWIND;
      }
    }

    await performStep(action);
  }, [simState, useGemini, performStep]);

  useEffect(() => {
    if (isRunning) {
      // Dynamic Speed from state
      const delay = useGemini ? Math.max(800, simSpeed) : simSpeed; 
      timerRef.current = window.setTimeout(tick, delay); 
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, tick, useGemini, simSpeed]);

  // Handlers
  
  // Retry: Keep Map, Keep Q-Table
  const handleRetryEpisode = () => {
    setSimState(prev => ({
      grid: prev.grid.map(row => row.map(cell => ({...cell, isActive: false}))), // Reset dynamic elements but keep layout
      agent: {
        position: { x: 1, y: 1 },
        health: MAX_HEALTH,
        rewindBudget: INITIAL_REWIND_BUDGET,
        stepsTaken: 0,
      },
      score: 0,
      history: [],
      episode: prev.episode + 1,
      isGameOver: false,
      gameResult: null,
      logs: [`Episode ${prev.episode + 1} Started. Q-Table learned states: ${Object.keys(qAgentRef.current.qTable).length}`],
      activePath: [{ x: 1, y: 1 }],
      abandonedPaths: []
    }));
    setScoreHistory([]);
    setIsRunning(false);
    setLastAction(null);
  };

  // New Map: New Grid, Reset Q-Table
  const handleNewMap = () => {
    qAgentRef.current.reset(); // Clear memory for new map
    setEpisodeStats([]); // Clear chart
    setSimState({
      grid: generateGrid(DEFAULT_CONFIG.gridSize),
      agent: {
        position: { x: 1, y: 1 },
        health: MAX_HEALTH,
        rewindBudget: INITIAL_REWIND_BUDGET,
        stepsTaken: 0,
      },
      score: 0,
      history: [],
      episode: 1,
      isGameOver: false,
      gameResult: null,
      logs: ["New Map Generated. Agent memory reset."],
      activePath: [{ x: 1, y: 1 }],
      abandonedPaths: []
    });
    setScoreHistory([]);
    setIsRunning(false);
    setLastAction(null);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-500 rounded-sm flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            AX
          </div>
          <h1 className="text-xl font-bold tracking-tight">Temporal RL: AgentX Simulation</h1>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setActiveTab('SIMULATION')}
             className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${activeTab === 'SIMULATION' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
           >
             Simulation Dashboard
           </button>
           <button 
             onClick={() => setActiveTab('SPEC')}
             className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${activeTab === 'SPEC' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
           >
             Research Spec
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'SIMULATION' ? (
          <div className="h-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Grid */}
            <div className="lg:col-span-7 flex flex-col gap-4 relative">
               <div className="flex justify-between items-center mb-2">
                 <div className="flex gap-4">
                     <h2 className="text-sm font-bold text-slate-400">EPISODE {simState.episode}</h2>
                     <span className="text-xs font-mono text-slate-500 py-0.5">EXPLORATION: {(qAgentRef.current.epsilon * 100).toFixed(0)}%</span>
                 </div>
                 {simState.isGameOver && (
                   <span className={`px-3 py-1 rounded text-sm font-bold ${simState.gameResult === 'WIN' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                     {simState.gameResult === 'WIN' ? 'MISSION ACCOMPLISHED' : 'AGENT TERMINATED'}
                   </span>
                 )}
               </div>
               
               <div className="flex-1 flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800 p-4 relative">
                 <GridWorld 
                   grid={simState.grid} 
                   agent={simState.agent} 
                   lastAction={lastAction}
                   activePath={simState.activePath}
                   abandonedPaths={simState.abandonedPaths}
                   isGameOver={simState.isGameOver}
                 />
               </div>
            </div>

            {/* Right Col: Controls & Metrics */}
            <div className="lg:col-span-5 flex flex-col gap-6 h-full overflow-y-auto pr-2">
              <ControlPanel 
                isRunning={isRunning}
                onToggleRun={() => setIsRunning(!isRunning)}
                onStep={() => tick()}
                onNextEpisode={handleRetryEpisode}
                onNewMap={handleNewMap}
                onRewind={() => performStep(AgentAction.REWIND)}
                onManualAction={(a) => performStep(a)}
                useGemini={useGemini}
                onToggleGemini={() => setUseGemini(!useGemini)}
                canRewind={simState.agent.rewindBudget > 0 && simState.history.length >= DEFAULT_CONFIG.rewindSteps}
                speed={simSpeed}
                onSpeedChange={setSimSpeed}
                episodeCount={simState.episode}
              />
              
              <div className="flex-1">
                 <MetricsPanel 
                   scoreHistory={scoreHistory} 
                   agent={simState.agent}
                   logs={simState.logs}
                   episodeStats={episodeStats}
                 />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full p-6 max-w-5xl mx-auto">
             <ResearchSpec />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;