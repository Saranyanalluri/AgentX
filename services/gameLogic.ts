
import { 
    SimulationState, 
    AgentAction, 
    CellType, 
    GridCell, 
    Position,
    TrapType,
    ItemType,
    AgentState
  } from '../types';
  import { DEFAULT_CONFIG, REVISIT_PENALTY, RE_ENTER_POISON_PENALTY } from '../constants';
  
  const cloneGrid = (grid: GridCell[][]): GridCell[][] => {
      const len = grid.length;
      const newGrid = new Array(len);
      for (let y = 0; y < len; y++) {
          const row = grid[y];
          const rowLen = row.length;
          const newRow = new Array(rowLen);
          for (let x = 0; x < rowLen; x++) {
              newRow[x] = { ...row[x] };
          }
          newGrid[y] = newRow;
      }
      return newGrid;
  };

  export const calculateNextState = (
    prevState: SimulationState, 
    action: AgentAction
  ): { nextState: SimulationState; reward: number; eventLog: string } => {
    
    if (prevState.isGameOver) {
        return { nextState: prevState, reward: 0, eventLog: '' };
    }

    const grid = cloneGrid(prevState.grid);
    let agent: AgentState = { 
        ...prevState.agent, 
        visitedTraps: [...prevState.agent.visitedTraps] 
    };
    let score = prevState.score;
    let isGameOver = prevState.isGameOver;
    let gameResult = prevState.gameResult;
    let logs = [...prevState.logs];
    let activePath = [...prevState.activePath];
    let abandonedPaths = [...prevState.abandonedPaths];
    let globalKnownTraps = [...(prevState.globalKnownTraps || [])];
    
    let history = action !== AgentAction.REWIND 
        ? [...prevState.history, { 
            grid: cloneGrid(prevState.grid), 
            agent: {...prevState.agent}, 
            score: prevState.score 
          }]
        : prevState.history;
  
    let reward = DEFAULT_CONFIG.stepPenalty;
    let logMsg = `Action: ${action}`;

    if (action === AgentAction.REWIND) {
        const isTrapped = agent.statusEffect === 'TRAPPED_WAITING_REWIND';
        
        if (isTrapped) {
             if (agent.rewindBudget > 0 && prevState.history.length >= 1) { 
                const targetIndex = Math.max(0, prevState.history.length - DEFAULT_CONFIG.rewindSteps);
                const pastState = prevState.history[targetIndex];
                
                const keepPath = activePath.slice(0, targetIndex + 1);
                const abandonedSegment = activePath.slice(targetIndex);

                return {
                    nextState: {
                        ...prevState,
                        grid: pastState.grid,
                        agent: {
                            ...pastState.agent,
                            rewindBudget: agent.rewindBudget - 1, 
                            statusEffect: 'NONE',
                            trapsTriggered: agent.trapsTriggered 
                        },
                        score: score + DEFAULT_CONFIG.rewindCost, 
                        history: prevState.history.slice(0, targetIndex),
                        activePath: keepPath,
                        abandonedPaths: [...abandonedPaths, abandonedSegment],
                        logs: [...logs, `Rewind Successful. Timeline Restored.`],
                        globalKnownTraps
                    },
                    reward: DEFAULT_CONFIG.rewindCost,
                    eventLog: "REWIND_SUCCESS"
                };
             } else {
                 return {
                    nextState: { ...prevState, logs: [...logs, "Rewind Failed (Data Corruption)"] },
                    reward: -5,
                    eventLog: "REWIND_FAIL"
                 };
             }
        } else {
            return {
                nextState: {
                     ...prevState,
                     logs: [...logs, "Rewind Rejected: No immediate danger detected."] 
                },
                reward: -10,
                eventLog: "REWIND_DENIED"
            };
        }
    }

    if (prevState.agent.statusEffect === 'TRAPPED_WAITING_REWIND') {
         return {
            nextState: {
                ...prevState,
                logs: [...logs, "MOVEMENT LOCKED. TIMELINE CORRUPTED. REWIND REQUIRED."]
            },
            reward: -5,
            eventLog: "LOCKED_IN_TRAP"
        };
    }

    agent.stepsTaken += 1;
  
    let newX = agent.position.x;
    let newY = agent.position.y;
    
    if (action === AgentAction.UP) newY--;
    if (action === AgentAction.DOWN) newY++;
    if (action === AgentAction.LEFT) newX--;
    if (action === AgentAction.RIGHT) newX++;
  
    const cell = grid[newY]?.[newX]; 
  
    if (!cell || cell.type === CellType.WALL) {
        logMsg += " (Blocked)";
        reward -= 2; 
    } 
    else {
        const isRetreadingFailure = abandonedPaths.some(path => 
            path.some(p => p.x === newX && p.y === newY)
        );

        if (isRetreadingFailure) {
            reward += REVISIT_PENALTY; 
            if (!agent.visitedTraps.includes(`fail-${newX},${newY}`)) {
                logMsg += " [REPEATING FAILED PATH]";
                agent.visitedTraps.push(`fail-${newX},${newY}`);
            }
        }
        
        const isBacktracking = activePath.some(p => p.x === newX && p.y === newY);
        if (isBacktracking) {
             reward -= 1; 
        }

        agent.position = { x: newX, y: newY };
        activePath.push(agent.position);

        const currentCell = grid[newY][newX];

        // --- Coin Collection ---
        if (currentCell.type === CellType.ITEM && currentCell.itemType === ItemType.COIN) {
            reward += DEFAULT_CONFIG.coinReward;
            agent.coins += 1;
            logMsg += " -> COIN COLLECTED (+10)";
            // Remove coin from grid
            grid[newY][newX] = { ...currentCell, type: CellType.EMPTY, itemType: undefined };
        }

        if (currentCell.type === CellType.TRAP) {
            const trapKey = `${newX},${newY}`;
            agent.trapsTriggered = (agent.trapsTriggered || 0) + 1;
            
            const isFatal = currentCell.trapType === TrapType.POISON || currentCell.trapType === TrapType.PIT;
            const isKnown = globalKnownTraps.includes(trapKey);

            if (isFatal) {
                if (isKnown) {
                    // Specified: -50 penalty for entering a poisoned path + -20 additional penalty
                    reward += (DEFAULT_CONFIG.trapPenalty + RE_ENTER_POISON_PENALTY);
                    logMsg += " -> RE-ENTERED KNOWN POISON! HEAVY PENALTY.";
                } else {
                    reward += DEFAULT_CONFIG.trapPenalty;
                    logMsg += " -> POISON ENCOUNTERED.";
                    globalKnownTraps.push(trapKey);
                }
                
                if (agent.rewindBudget > 0) {
                    agent.statusEffect = 'TRAPPED_WAITING_REWIND';
                    logMsg += " HAZARD DETECTED. REWIND NOW.";
                } else {
                    agent.statusEffect = currentCell.trapType === TrapType.POISON ? 'POISONED' : 'FALLEN';
                    isGameOver = true;
                    gameResult = 'LOSS';
                    logMsg += " -> FATAL. NO REWINDS REMAINING.";
                }
            }
            else {
                agent.health -= 30;
                reward += DEFAULT_CONFIG.trapPenalty / 2;
                logMsg += " -> SPIKES (-30 HP)";
                if (agent.health <= 0) {
                    isGameOver = true;
                    gameResult = 'LOSS';
                }
            }
        }

        if (currentCell.type === CellType.GOAL) {
             reward += DEFAULT_CONFIG.goalReward; 
             logMsg += " -> DESTINATION REACHED (+100)";
             isGameOver = true;
             gameResult = 'WIN';
        }
    }
  
    return {
        nextState: {
            ...prevState,
            grid,
            agent,
            score: score + reward,
            history,
            activePath,
            abandonedPaths,
            isGameOver,
            gameResult,
            logs: [...logs, logMsg],
            globalKnownTraps
        },
        reward,
        eventLog: logMsg
    };
  };
