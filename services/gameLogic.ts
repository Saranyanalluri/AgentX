import { 
    SimulationState, 
    AgentAction, 
    CellType, 
    GridCell, 
    Position 
  } from '../types';
  import { DEFAULT_CONFIG } from '../constants';
  
  export const calculateNextState = (
    prevState: SimulationState, 
    action: AgentAction
  ): { nextState: SimulationState; reward: number; eventLog: string } => {
    
    // Deep copy for immutability
    const grid = prevState.grid.map(row => row.map(cell => ({ ...cell })));
    let agent = { ...prevState.agent };
    let score = prevState.score;
    let isGameOver = prevState.isGameOver;
    let gameResult = prevState.gameResult;
    let logs = [...prevState.logs];
    let activePath = [...prevState.activePath];
    let abandonedPaths = [...prevState.abandonedPaths];
    let history = action !== AgentAction.REWIND 
        ? [...prevState.history, { 
            grid: JSON.parse(JSON.stringify(prevState.grid)), 
            agent: {...prevState.agent}, 
            score: prevState.score 
          }]
        : prevState.history;
  
    let reward = DEFAULT_CONFIG.stepPenalty;
    let logMsg = `Action: ${action}`;
  
    // --- REWIND LOGIC ---
    if (action === AgentAction.REWIND) {
        if (agent.rewindBudget > 0 && prevState.history.length >= DEFAULT_CONFIG.rewindSteps) {
            const targetIndex = Math.max(0, prevState.history.length - DEFAULT_CONFIG.rewindSteps);
            const pastState = prevState.history[targetIndex];
            
            // Cut path for visualization
            const keepPath = activePath.slice(0, targetIndex + 1);
            const abandonedSegment = activePath.slice(targetIndex);

            return {
                nextState: {
                    ...prevState,
                    grid: pastState.grid,
                    agent: {
                        ...pastState.agent,
                        // Persist the budget decrement despite time travel
                        rewindBudget: agent.rewindBudget - 1,
                    },
                    score: score + DEFAULT_CONFIG.rewindCost,
                    history: prevState.history.slice(0, targetIndex),
                    activePath: keepPath,
                    abandonedPaths: [...abandonedPaths, abandonedSegment],
                    logs: [...logs, `Action: REWIND (-${DEFAULT_CONFIG.rewindSteps}s)`]
                },
                reward: DEFAULT_CONFIG.rewindCost,
                eventLog: "REWIND"
            };
        } else {
            return {
                nextState: { ...prevState, logs: [...logs, "Rewind Failed"] },
                reward: 0,
                eventLog: "REWIND_FAIL"
            };
        }
    }

    // --- INCREMENT STEP COUNT (Game Time) ---
    // We do this after Rewind check because Rewind reverts time
    agent.stepsTaken += 1;
  
    // --- MOVEMENT LOGIC ---
    let newX = agent.position.x;
    let newY = agent.position.y;
    
    if (action === AgentAction.UP) newY--;
    if (action === AgentAction.DOWN) newY++;
    if (action === AgentAction.LEFT) newX--;
    if (action === AgentAction.RIGHT) newX++;
  
    const cell = grid[newY]?.[newX]; // Safety check
  
    // Check bounds/walls
    if (!cell || cell.type === CellType.WALL || (cell.type === CellType.DOOR && !cell.isOpen)) {
        logMsg += " (Blocked)";
        reward -= 5; // Penalty for hitting wall
    } else {
        // Move allowed
        agent.position = { x: newX, y: newY };
        activePath.push(agent.position);
        
        // Shaping: Reward for getting closer to goal?
        // Let's find goal
        const goalY = grid.length - 2;
        const goalX = grid.length - 2;
        const prevDist = Math.abs(prevState.agent.position.x - goalX) + Math.abs(prevState.agent.position.y - goalY);
        const newDist = Math.abs(newX - goalX) + Math.abs(newY - goalY);
        
        if (newDist < prevDist) {
            reward += 1; // Shaping reward
        }
    }
  
    // Interaction
    const currentCell = grid[agent.position.y][agent.position.x];
  
    if (currentCell.type === CellType.TRAP && currentCell.isActive) {
        agent.health -= DEFAULT_CONFIG.trapDamage;
        reward -= 20;
        logMsg += " -> TRAP!";
    } else if (currentCell.type === CellType.GOAL) {
        reward += DEFAULT_CONFIG.goalReward;
        logMsg += " -> GOAL!";
        isGameOver = true;
        gameResult = 'WIN';
    }
  
    // Dynamic Updates (Traps)
    const nextGrid = grid.map(row => row.map(c => {
         if (c.type === CellType.TRAP) {
             return { ...c, isActive: Math.random() > 0.5 };
         }
         return c;
    }));
  
    if (agent.health <= 0) {
        isGameOver = true;
        gameResult = 'LOSS';
        logMsg += " -> DIED";
        reward -= 100;
    }
  
    return {
        nextState: {
            ...prevState,
            grid: nextGrid,
            agent,
            score: score + reward,
            history,
            activePath,
            abandonedPaths,
            isGameOver,
            gameResult,
            logs: [...logs, logMsg]
        },
        reward,
        eventLog: logMsg
    };
  };