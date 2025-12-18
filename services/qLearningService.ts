
import { AgentAction, AgentState, GridCell, CellType, Position } from '../types';

type QTable = Record<string, Record<string, number>>;

export class QLearningAgent {
  qTable: QTable = {};
  
  alpha = 0.5;   // Learning Rate
  gamma = 0.9;   // Discount Factor
  epsilon = 0.85; // Default Exploration
  
  lastAction: AgentAction | null = null; 
  hasSolvedOnce = false;
  isInferenceMode = false;
  isTestMode = false; 
  
  private getStateKey(agent: AgentState): string {
    return `${agent.position.x},${agent.position.y},${agent.statusEffect},${agent.rewindBudget > 0 ? 'HAS_REWIND' : 'NO_REWIND'}`;
  }

  // Hard Reset: Clears everything
  reset(level: number = 1) {
    this.qTable = {}; 
    const baseEpsilon = Math.max(0.15, 0.90 - (level * 0.18)); 
    this.epsilon = baseEpsilon;
    this.hasSolvedOnce = false;
    this.lastAction = null;
    this.isInferenceMode = false;
    this.isTestMode = false;
  }

  // Soft Reset: Retains Q-Table for curriculum continuity
  prepareNextLevel(level: number) {
      // Specified: Carry forward learned policy. We do NOT clear qTable.
      // We adjust exploration for the next level's difficulty.
      const baseEpsilon = Math.max(0.1, 0.80 - (level * 0.1)); 
      this.epsilon = baseEpsilon;
      this.hasSolvedOnce = false;
      this.lastAction = null;
  }

  decayEpsilon() {
    if (!this.isInferenceMode) {
        this.epsilon = Math.max(0.01, this.epsilon * 0.6);
    }
  }

  forceConservativePolicy() {
      this.epsilon = 0.01;
  }

  setInferenceMode(enabled: boolean) {
      this.isInferenceMode = enabled;
  }

  setTestMode(enabled: boolean) {
      this.isTestMode = enabled;
      this.isInferenceMode = enabled; 
  }

  maximizeExploitation() {
    this.epsilon = 0.05; 
    this.hasSolvedOnce = true;
  }

  private getQValues(agent: AgentState): Record<string, number> {
    const key = this.getStateKey(agent);
    if (!this.qTable[key]) {
      this.qTable[key] = {
        [AgentAction.UP]: 0,
        [AgentAction.DOWN]: 0,
        [AgentAction.LEFT]: 0,
        [AgentAction.RIGHT]: 0,
        [AgentAction.REWIND]: -5, 
        [AgentAction.WAIT]: -10,  
      };
    }
    return this.qTable[key];
  }

  private findGoal(grid: GridCell[][]): Position {
      for(let y=0; y<grid.length; y++) {
          for(let x=0; x<grid[0].length; x++) {
              if (grid[y][x].type === CellType.GOAL) return {x, y};
          }
      }
      return {x: 1, y: 1};
  }

  getAction(agent: AgentState, grid?: GridCell[][]): AgentAction {
    if (agent.statusEffect === 'TRAPPED_WAITING_REWIND') {
        return AgentAction.REWIND;
    }

    if (this.isTestMode && grid) {
        return this.getOptimalAction(agent, grid);
    }

    const effectiveEpsilon = this.isInferenceMode ? 0 : this.epsilon;

    if (Math.random() < effectiveEpsilon) {
       return this.getSmartRandomMove(agent);
    }
    
    const qValues = this.getQValues(agent);
    let bestActions: AgentAction[] = [];
    let maxVal = -Infinity;
    
    for (const actionKey of Object.keys(qValues)) {
      const action = actionKey as AgentAction;
      const val = qValues[action];
      if (val > maxVal) {
        maxVal = val;
        bestActions = [action];
      } else if (val === maxVal) {
        bestActions.push(action);
      }
    }
    
    if (bestActions.length === 0) return this.getSmartRandomMove(agent);
    
    return bestActions[Math.floor(Math.random() * bestActions.length)];
  }

  private getOptimalAction(agent: AgentState, grid: GridCell[][]): AgentAction {
      const start = agent.position;
      const goal = this.findGoal(grid);
      const rows = grid.length;
      const cols = grid[0].length;
      
      interface Node { x: number; y: number; f: number; g: number; h: number; parent?: Node; action?: AgentAction }
      const createNode = (x: number, y: number, g: number, parent?: Node, action?: AgentAction): Node => {
          const h = Math.abs(x - goal.x) + Math.abs(y - goal.y); 
          return { x, y, g, h, f: g + h, parent, action };
      };

      const openList: Node[] = [createNode(start.x, start.y, 0)];
      const closedSet = new Set<string>();
      
      while (openList.length > 0) {
          openList.sort((a, b) => a.f - b.f);
          const current = openList.shift()!;
          
          if (current.x === goal.x && current.y === goal.y) {
              let curr: Node = current;
              while (curr.parent && curr.parent.parent) {
                  curr = curr.parent;
              }
              return curr.action || AgentAction.WAIT;
          }

          const key = `${current.x},${current.y}`;
          if (closedSet.has(key)) continue;
          closedSet.add(key);

          const neighbors = [
              { x: 0, y: -1, a: AgentAction.UP },
              { x: 0, y: 1, a: AgentAction.DOWN },
              { x: -1, y: 0, a: AgentAction.LEFT },
              { x: 1, y: 0, a: AgentAction.RIGHT }
          ];

          for (const n of neighbors) {
              const nx = current.x + n.x;
              const ny = current.y + n.y;
              if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
              const cell = grid[ny][nx];
              
              const isWall = cell.type === CellType.WALL;
              const isLethal = cell.type === CellType.TRAP && (cell.trapType === 'POISON' || cell.trapType === 'PIT');
              if (isWall || isLethal) continue;

              const gScore = current.g + 1;
              openList.push(createNode(nx, ny, gScore, current, n.a));
          }
      }
      return this.getSmartRandomMove(agent);
  }

  getSmartRandomMove(agent?: AgentState): AgentAction {
    const allActions = [AgentAction.UP, AgentAction.DOWN, AgentAction.LEFT, AgentAction.RIGHT];

    if (!this.lastAction) {
        return allActions[Math.floor(Math.random() * allActions.length)];
    }
    
    let opposite: AgentAction | null = null;
    if (this.lastAction === AgentAction.UP) opposite = AgentAction.DOWN;
    if (this.lastAction === AgentAction.DOWN) opposite = AgentAction.UP;
    if (this.lastAction === AgentAction.LEFT) opposite = AgentAction.RIGHT;
    if (this.lastAction === AgentAction.RIGHT) opposite = AgentAction.LEFT;

    if (Math.random() > 0.3) {
        const filtered = allActions.filter(a => a !== opposite);
        if (filtered.length > 0) return filtered[Math.floor(Math.random() * filtered.length)];
    }
    
    return allActions[Math.floor(Math.random() * allActions.length)];
  }

  update(prevAgent: AgentState, action: AgentAction, reward: number, nextAgent: AgentState) {
    if (this.isInferenceMode) return; 

    this.lastAction = action; 
    const prevKey = this.getStateKey(prevAgent);
    this.getQValues(prevAgent); 
    const nextQ = this.getQValues(nextAgent);

    let maxNextQ = -Infinity;
    for (const k in nextQ) {
         if (nextQ[k] > maxNextQ) maxNextQ = nextQ[k];
    }

    const currentQ = this.qTable[prevKey][action];
    this.qTable[prevKey][action] = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
  }
}
