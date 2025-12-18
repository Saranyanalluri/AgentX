
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
  EpisodeStats,
  TrapType,
  ItemType,
  Position
} from './types';
import { DEFAULT_CONFIG, INITIAL_REWIND_BUDGET, MAX_HEALTH } from './constants';
import { QLearningAgent } from './services/qLearningService';
import { calculateNextState } from './services/gameLogic';

// --- DIFFICULTY & CONSTRAINT CONFIGURATION ---
const FAILURE_LIMITS: Record<number, number> = {
    1: 5,
    2: 4,
    3: 3,
    4: 2,
    5: 1
};

const getLevelConfig = (level: number) => {
    // Curriculum design: size and trap density increase with levels
    const size = Math.min(22, 12 + ((level - 1) * 2)); 
    
    return {
        size,
        trapDensity: Math.min(0.8, 0.2 + (level * 0.12)), 
        branchingFactor: Math.min(0.9, 0.4 + (level * 0.05)), 
        complexity: 3 + (level * 2) 
    };
};

// --- PROCEDURAL GENERATOR ---
const generateRandomDungeon = (level: number): GridCell[][] => {
  const config = getLevelConfig(level);
  const size = config.size;

  const grid: GridCell[][] = Array(size).fill(null).map((_, y) => 
    Array(size).fill(null).map((_, x) => ({
      x, 
      y, 
      type: CellType.WALL,
      isActive: false
    }))
  );

  const start = { x: 1, y: 1 };
  const goal = { x: size - 2, y: size - 2 };
  
  const isValid = (x: number, y: number) => x > 0 && x < size - 1 && y > 0 && y < size - 1;
  const isWall = (x: number, y: number) => isValid(x, y) && grid[y][x].type === CellType.WALL;
  const isOpen = (x: number, y: number) => isValid(x, y) && grid[y][x].type !== CellType.WALL;

  const carvePath = (pStart: Position, pEnd: Position, biasX: number, biasY: number): Position[] => {
      const path: Position[] = [];
      let current = { ...pStart };
      let steps = 0;
      const maxSteps = size * size * 2; 

      while ((current.x !== pEnd.x || current.y !== pEnd.y) && steps < maxSteps) {
          path.push({ ...current });
          grid[current.y][current.x].type = CellType.EMPTY;

          const moves: Position[] = [];
          const dx = pEnd.x - current.x;
          const dy = pEnd.y - current.y;

          if (dx > 0) moves.push({x: 1, y: 0}); 
          if (dx < 0) moves.push({x: -1, y: 0}); 
          if (dy > 0) moves.push({x: 0, y: 1}); 
          if (dy < 0) moves.push({x: 0, y: -1}); 

          if (Math.random() < 0.4) {
             moves.push({x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1});
          }

          if (biasX !== 0 && Math.random() < 0.3) moves.push({x: biasX, y: 0});
          if (biasY !== 0 && Math.random() < 0.3) moves.push({x: 0, y: biasY});

          const validMoves = moves.filter(m => isValid(current.x + m.x, current.y + m.y));
          
          if (validMoves.length > 0) {
              const m = validMoves[Math.floor(Math.random() * validMoves.length)];
              current.x += m.x;
              current.y += m.y;
          } else {
              break; 
          }
          steps++;
      }
      path.push({ ...pEnd });
      grid[pEnd.y][pEnd.x].type = CellType.EMPTY;
      return path;
  };

  const path1 = carvePath(start, goal, 1, -1);
  const waypoint = { x: 3, y: size - 4 }; 
  const path2A = carvePath(start, waypoint, -1, 1);
  const path2B = carvePath(waypoint, goal, 1, 1);
  const path2 = [...path2A, ...path2B];

  const emptyCells: Position[] = [];
  const baitCells: Position[] = [];
  const targetDensity = 0.65; 
  let filledCount = path1.length + path2.length;
  const totalArea = size * size;

  let attempts = 0;
  const maxAttempts = size * 100; 

  while (filledCount / totalArea < targetDensity && attempts < maxAttempts) {
      attempts++;
      const rx = Math.floor(Math.random() * (size - 2)) + 1;
      const ry = Math.floor(Math.random() * (size - 2)) + 1;
      if (!isOpen(rx, ry)) continue; 

      const dirs = [{x:1, y:0}, {x:-1, y:0}, {x:0, y:1}, {x:0, y:-1}];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      let bx = rx + dir.x;
      let by = ry + dir.y;
      
      const branch: Position[] = [];
      let digging = true;
      let branchLen = 0;
      const maxBranchLen = 6 + level; 

      while (digging && branchLen < maxBranchLen) {
          if (!isWall(bx, by)) {
              digging = false;
              break;
          }
          let neighbors = 0;
          dirs.forEach(d => {
              if (isOpen(bx + d.x, by + d.y)) neighbors++;
          });
          if (neighbors > 1) {
              digging = false;
              break;
          }

          grid[by][bx].type = CellType.EMPTY;
          branch.push({x: bx, y: by});
          baitCells.push({x: bx, y: by});
          filledCount++;
          branchLen++;
          
          if (Math.random() < config.branchingFactor) {
              bx += dir.x;
              by += dir.y;
          } else {
              const nd = dirs[Math.floor(Math.random() * dirs.length)];
              bx += nd.x;
              by += nd.y;
          }
      }
  }

  grid[goal.y][goal.x].type = CellType.GOAL;
  grid[start.y][start.x].type = CellType.START;

  // Track all walkable empty cells for coin placement
  for(let y=1; y < size-1; y++) {
      for(let x=1; x < size-1; x++) {
          if (grid[y][x].type === CellType.EMPTY) {
              emptyCells.push({x, y});
          }
      }
  }

  baitCells.forEach(p => {
      const dirs = [{x:1, y:0}, {x:-1, y:0}, {x:0, y:1}, {x:0, y:-1}];
      let openNeighbors = 0;
      dirs.forEach(d => {
          if (isOpen(p.x + d.x, p.y + d.y)) openNeighbors++;
      });
      if (openNeighbors === 1) {
          if (Math.random() < config.trapDensity) {
              grid[p.y][p.x].type = CellType.TRAP;
              grid[p.y][p.x].trapType = TrapType.POISON;
          }
      } else {
          if (Math.random() < (config.trapDensity * 0.2)) {
              grid[p.y][p.x].type = CellType.TRAP;
              grid[p.y][p.x].trapType = TrapType.SPIKE;
          }
      }
  });

  // Random Coin Placement (Mandatory)
  const coinCount = 5 + Math.floor(Math.random() * 5); 
  let coinsPlaced = 0;
  // Shuffle empty cells to place coins randomly
  const shuffledEmpty = [...emptyCells].sort(() => Math.random() - 0.5);
  for (const p of shuffledEmpty) {
      if (grid[p.y][p.x].type === CellType.EMPTY && coinsPlaced < coinCount) {
          grid[p.y][p.x].type = CellType.ITEM;
          grid[p.y][p.x].itemType = ItemType.COIN;
          coinsPlaced++;
      }
  }

  return grid;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SIMULATION' | 'SPEC'>('SIMULATION');
  const [isRunning, setIsRunning] = useState(false);
  const [isInferenceMode, setIsInferenceMode] = useState(false); 
  const [isTestMode, setIsTestMode] = useState(false); 

  const [lastAction, setLastAction] = useState<AgentAction | null>(null);
  const [simSpeed, setSimSpeed] = useState<number>(30); 
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelAttempt, setLevelAttempt] = useState(1);
  const [showClearOverlay, setShowClearOverlay] = useState(false);
  
  // Total score across levels
  const [totalCumulativeScore, setTotalCumulativeScore] = useState(0);

  const qAgentRef = useRef(new QLearningAgent());
  const [episodeStats, setEpisodeStats] = useState<EpisodeStats[]>([]);
  
  const masterGridRef = useRef<GridCell[][]>([]);

  const [simState, setSimState] = useState<SimulationState>(() => {
    const initialGrid = generateRandomDungeon(1);
    masterGridRef.current = JSON.parse(JSON.stringify(initialGrid));
    
    return {
      grid: initialGrid,
      agent: {
        position: { x: 1, y: 1 },
        health: MAX_HEALTH,
        rewindBudget: INITIAL_REWIND_BUDGET,
        stepsTaken: 0,
        keysCollected: 0,
        coins: 0,
        visitedTraps: [],
        trapsTriggered: 0,
        statusEffect: 'NONE'
      },
      score: 0,
      history: [],
      episode: 1,
      isGameOver: false,
      gameResult: null,
      logs: ["Level 1 Init. Objective: Reach Goal and Collect Coins."],
      activePath: [{ x: 1, y: 1 }],
      abandonedPaths: [],
      globalKnownTraps: []
    };
  });

  const [scoreHistory, setScoreHistory] = useState<{ step: number; score: number }[]>([]);

  // --- LEVEL ADVANCEMENT ---
  const advanceLevel = useCallback(() => {
    const nextLevel = currentLevel + 1;
    // Commit current level score to total
    setTotalCumulativeScore(prev => prev + simState.score);
    
    setCurrentLevel(nextLevel);
    setLevelAttempt(1); 
    setShowClearOverlay(false);
    
    // CONTINUITY: Only reset parameters (epsilon, etc) but RETAIN policy (Q-Table)
    qAgentRef.current.prepareNextLevel(nextLevel); 

    const nextGrid = generateRandomDungeon(nextLevel);
    masterGridRef.current = JSON.parse(JSON.stringify(nextGrid)); 

    setSimState(prev => ({
        grid: nextGrid,
        agent: {
            position: { x: 1, y: 1 },
            health: MAX_HEALTH,
            rewindBudget: INITIAL_REWIND_BUDGET,
            stepsTaken: 0,
            keysCollected: 0,
            coins: 0,
            visitedTraps: [],
            trapsTriggered: 0,
            statusEffect: 'NONE'
        },
        score: 0, // Reset current level score
        history: [],
        episode: prev.episode + 1,
        isGameOver: false,
        gameResult: null,
        logs: [`Level ${nextLevel} Started. Objective: Reach Goal.`],
        activePath: [{ x: 1, y: 1 }],
        abandonedPaths: [],
        globalKnownTraps: [] 
    }));
    setScoreHistory([]);
    setIsRunning(true); 
  }, [currentLevel, simState.score]);


  // Handle Game Over
  useEffect(() => {
    if (simState.isGameOver) {
       setIsRunning(false); 
       
       setEpisodeStats(prev => {
           if (prev.length > 0 && prev[prev.length - 1].episode === simState.episode && prev[prev.length - 1].totalReward === simState.score) {
               return prev;
           }
           return [...prev, {
               episode: simState.episode,
               steps: simState.agent.stepsTaken,
               totalReward: simState.score,
               result: simState.gameResult || 'LOSS',
               rewindsUsed: INITIAL_REWIND_BUDGET - simState.agent.rewindBudget,
               trapCount: simState.agent.trapsTriggered 
           }];
       });

       if (simState.gameResult === 'WIN') {
           setShowClearOverlay(true);
           const timer = setTimeout(() => {
               advanceLevel();
           }, 3500); // Specified: Show for a short duration then transition
           return () => clearTimeout(timer);
       } 
       else if (simState.gameResult === 'LOSS') {
           if (!isTestMode) {
               qAgentRef.current.decayEpsilon();
           }

           const internalLimit = FAILURE_LIMITS[currentLevel] || 5;
           if (levelAttempt >= internalLimit) {
               qAgentRef.current.forceConservativePolicy();
           }
           
           const timer = setTimeout(() => {
               handleRetryEpisode(); 
           }, 1000);
           return () => clearTimeout(timer);
       }
    }
  }, [simState.isGameOver, simState.gameResult, advanceLevel, simState.episode, simState.score, isInferenceMode, isTestMode, currentLevel, levelAttempt]);

  const performStep = useCallback(async (action: AgentAction) => {
    setSimState(prev => {
      if (prev.isGameOver) return prev;
      
      const { nextState, reward } = calculateNextState(prev, action);
      
      if (action !== AgentAction.WAIT) {
          qAgentRef.current.update(prev.agent, action, reward, nextState.agent);
      }
      
      setLastAction(action);
      return nextState;
    });
  }, []);

  useEffect(() => {
      setScoreHistory(h => [...h, { step: simState.agent.stepsTaken, score: simState.score }]);
  }, [simState.score, simState.agent.stepsTaken]);

  const timerRef = useRef<number | null>(null);

  const tick = useCallback(async () => {
    if (simState.isGameOver) {
      setIsRunning(false);
      return;
    }

    let action = AgentAction.WAIT;
    
    if (lastAction === AgentAction.REWIND) {
         await new Promise(r => setTimeout(r, 600));
         setLastAction(null);
    }
    
    action = qAgentRef.current.getAction(simState.agent, simState.grid);
    await performStep(action);
  }, [simState, performStep, lastAction]);

  useEffect(() => {
    if (isRunning && !simState.isGameOver) {
      const delay = simSpeed; 
      timerRef.current = window.setTimeout(tick, delay); 
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, tick, simSpeed, simState.isGameOver]);

  const handleRetryEpisode = () => {
    // Generate new random coins for the same map layout if retry occurs
    // To satisfy: "Coin locations must change every time the level restarts or begins"
    const baseGrid = JSON.parse(JSON.stringify(masterGridRef.current));
    
    // Clear existing coins and traps to re-place them or just re-place coins?
    // Requirement says coins change every restart.
    const size = baseGrid.length;
    const emptyCells: Position[] = [];
    for(let y=0; y < size; y++) {
        for(let x=0; x < size; x++) {
            if (baseGrid[y][x].type === CellType.ITEM && baseGrid[y][x].itemType === ItemType.COIN) {
                baseGrid[y][x].type = CellType.EMPTY;
                baseGrid[y][x].itemType = undefined;
            }
            if (baseGrid[y][x].type === CellType.EMPTY) {
                emptyCells.push({x, y});
            }
        }
    }
    
    const coinCount = 5 + Math.floor(Math.random() * 5); 
    let coinsPlaced = 0;
    const shuffledEmpty = [...emptyCells].sort(() => Math.random() - 0.5);
    for (const p of shuffledEmpty) {
        if (baseGrid[p.y][p.x].type === CellType.EMPTY && coinsPlaced < coinCount) {
            baseGrid[p.y][p.x].type = CellType.ITEM;
            baseGrid[p.y][p.x].itemType = ItemType.COIN;
            coinsPlaced++;
        }
    }

    setLevelAttempt(prev => prev + 1);

    setSimState(prev => ({
      grid: baseGrid, 
      agent: {
        position: { x: 1, y: 1 },
        health: MAX_HEALTH,
        rewindBudget: INITIAL_REWIND_BUDGET,
        stepsTaken: 0,
        keysCollected: 0,
        coins: 0,
        visitedTraps: [],
        trapsTriggered: 0,
        statusEffect: 'NONE'
      },
      score: 0,
      history: [],
      episode: prev.episode + 1,
      isGameOver: false,
      gameResult: null,
      logs: [`Retry #${levelAttempt + 1}. Redistributing resources...`],
      activePath: [{ x: 1, y: 1 }],
      abandonedPaths: [],
      globalKnownTraps: prev.globalKnownTraps 
    }));
    setScoreHistory([]);
    setIsRunning(true);
    setLastAction(null);
  };

  const handleResetBrain = () => {
    qAgentRef.current.reset(1);
    handleResetGame(); 
  };

  const handleToggleInference = (val: boolean) => {
      setIsInferenceMode(val);
      qAgentRef.current.setInferenceMode(val);
  };

  const handleToggleTestMode = useCallback(() => {
    if (isTestMode) {
        setIsTestMode(false);
        setIsInferenceMode(false);
        qAgentRef.current.setTestMode(false);
        handleResetGame();
    } else {
        setIsTestMode(true);
        setIsInferenceMode(true); 
        qAgentRef.current.setTestMode(true);
        
        const testGrid = generateRandomDungeon(3); 
        masterGridRef.current = JSON.parse(JSON.stringify(testGrid));
        
        setSimState({
            grid: testGrid,
            agent: {
                position: { x: 1, y: 1 },
                health: MAX_HEALTH,
                rewindBudget: INITIAL_REWIND_BUDGET,
                stepsTaken: 0,
                keysCollected: 0,
                coins: 0,
                visitedTraps: [],
                trapsTriggered: 0,
                statusEffect: 'NONE'
            },
            score: 0,
            history: [],
            episode: 1,
            isGameOver: false,
            gameResult: null,
            logs: ["*** TEST MODE ACTIVE ***", "Evaluating Agent Performance on Random Medium Map."],
            activePath: [{ x: 1, y: 1 }],
            abandonedPaths: [],
            globalKnownTraps: []
        });
        setScoreHistory([]);
        setIsRunning(false); 
        setLastAction(null);
    }
  }, [isTestMode]);

  const handleResetGame = () => {
    setCurrentLevel(1);
    setLevelAttempt(1);
    setTotalCumulativeScore(0);
    qAgentRef.current.reset(1); 
    
    const initialGrid = generateRandomDungeon(1);
    masterGridRef.current = JSON.parse(JSON.stringify(initialGrid));

    setSimState({
      grid: initialGrid,
      agent: {
        position: { x: 1, y: 1 },
        health: MAX_HEALTH,
        rewindBudget: INITIAL_REWIND_BUDGET,
        stepsTaken: 0,
        keysCollected: 0,
        coins: 0,
        visitedTraps: [],
        trapsTriggered: 0,
        statusEffect: 'NONE'
      },
      score: 0,
      history: [],
      episode: 1, 
      isGameOver: false,
      gameResult: null,
      logs: [`System Reset. Training Phase Initiated.`],
      activePath: [{ x: 1, y: 1 }],
      abandonedPaths: [],
      globalKnownTraps: []
    });
    setScoreHistory([]);
    setIsRunning(false);
    setLastAction(null);
  };

  const displayTotalScore = totalCumulativeScore + simState.score;

  return (
    <div className="flex flex-col h-screen text-slate-100 overflow-hidden font-sans relative">
      
      {/* FULL SCREEN LEVEL CLEAR OVERLAY */}
      {showClearOverlay && (
        <div className="absolute inset-0 z-[999] bg-[#020617] flex items-center justify-center animate-in fade-in duration-500">
            <div className="flex flex-col items-center">
                <div className="font-cyber text-6xl md:text-8xl text-cyan-400 font-extrabold tracking-tighter drop-shadow-[0_0_30px_rgba(34,211,238,0.8)] animate-pulse">
                    LEVEL {currentLevel} : CLEARED
                </div>
                <div className="mt-4 font-cyber text-3xl md:text-5xl text-yellow-400 font-bold tracking-widest drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                    SCORE : {displayTotalScore}
                </div>
                <div className="mt-12 font-mono text-cyan-500/60 tracking-[1em] text-sm animate-bounce">
                    PREPARING NEXT SECTOR...
                </div>
                <div className="w-64 h-1 bg-slate-900 mt-4 rounded-full overflow-hidden border border-cyan-500/20">
                    <div className="h-full bg-cyan-500 animate-[loading_3.5s_linear]"></div>
                </div>
            </div>
            <style>{`
                @keyframes loading {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
      )}

      <header className="flex items-center justify-between px-6 py-3 glass-panel border-b border-cyan-900/30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-cyan-500/10 rounded border border-cyan-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <span className="font-cyber font-bold text-cyan-400 text-lg">AX</span>
          </div>
          <div>
            <h1 className="font-cyber text-lg font-bold tracking-widest text-slate-100">TEMPORAL<span className="text-cyan-400">RL</span></h1>
          </div>
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          <div className="flex items-center gap-3">
              <div className="flex flex-col">
                  <span className="text-[10px] font-cyber text-slate-400 tracking-wider">LEVEL</span>
                  <span className="text-xl font-bold font-mono text-yellow-400 leading-none">{isTestMode ? 'EVAL' : String(currentLevel).padStart(2, '0')}</span>
              </div>
              <div className="h-6 w-px bg-slate-800 mx-2"></div>
              <div className="flex flex-col">
                  <span className="text-[10px] font-cyber text-slate-400 tracking-wider">TOTAL SCORE</span>
                  <span className="text-xl font-bold font-mono text-cyan-400 leading-none">{displayTotalScore}</span>
              </div>
              <div className="flex gap-1 ml-4">
                  {Array.from({length: 5}).map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i < currentLevel % 5 || (currentLevel >= 5 && i === 4) ? 'bg-yellow-500 animate-pulse' : 'bg-slate-800'}`}></div>
                  ))}
              </div>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setActiveTab('SIMULATION')} className={`px-4 py-2 text-xs font-bold font-cyber tracking-wider rounded transition-all border ${activeTab === 'SIMULATION' ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-400' : 'border-transparent text-slate-500'}`}>SIMULATION</button>
           <button onClick={() => setActiveTab('SPEC')} className={`px-4 py-2 text-xs font-bold font-cyber tracking-wider rounded transition-all border ${activeTab === 'SPEC' ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-400' : 'border-transparent text-slate-500'}`}>RULES</button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-4">
        {activeTab === 'SIMULATION' ? (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
            
            <div className="lg:col-span-7 flex flex-col gap-4 relative">
               <div className="flex justify-between items-center px-2">
                 <div className="flex items-center gap-4">
                     <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-cyber">STATUS</span>
                        <span className={`text-xs font-bold ${simState.agent.statusEffect !== 'NONE' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>{simState.agent.statusEffect}</span>
                     </div>
                 </div>
                 
                 {simState.isGameOver && !showClearOverlay && (
                    <span className={`px-4 py-1 rounded border font-cyber text-sm tracking-widest ${simState.gameResult === 'WIN' ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-400' : 'bg-red-900/50 border-red-500/50 text-red-400 animate-pulse'}`}>
                        {simState.gameResult === 'WIN' ? 'DESTINATION REACHED' : 'Poisoned – Retry'}
                    </span>
                 )}
               </div>
               
               <div className="flex-1 flex items-center justify-center relative">
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

            <div className="lg:col-span-5 flex flex-col gap-4 h-full overflow-hidden">
              <div className="flex-none">
                 <ControlPanel 
                    isRunning={isRunning}
                    onToggleRun={() => setIsRunning(!isRunning)}
                    onStep={() => tick()}
                    onNextEpisode={handleRetryEpisode}
                    onResetBrain={handleResetBrain}
                    onToggleInference={handleToggleInference}
                    onEnterTestMode={handleToggleTestMode}
                    isInferenceMode={isInferenceMode}
                    isTestMode={isTestMode}
                    onManualAction={(a) => performStep(a)}
                    rewindBudget={simState.agent.rewindBudget}
                    speed={simSpeed}
                    onSpeedChange={setSimSpeed}
                    episodeCount={simState.episode}
                  />
              </div>
              
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-2">
                 <MetricsPanel 
                   scoreHistory={scoreHistory} 
                   agent={simState.agent}
                   logs={simState.logs}
                   episodeStats={episodeStats}
                   currentEpisode={currentLevel}
                   totalScore={displayTotalScore}
                 />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full p-4 max-w-5xl mx-auto overflow-y-auto">
             <ResearchSpec />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
