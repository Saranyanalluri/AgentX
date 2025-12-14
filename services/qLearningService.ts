import { AgentAction, Position } from '../types';

type QTable = Record<string, Record<string, number>>;

export class QLearningAgent {
  qTable: QTable = {};
  alpha = 0.5; // Learning rate
  gamma = 0.9; // Discount factor
  epsilon = 0.2; // Exploration rate (start higher for discovery)
  
  private getStateKey(pos: Position): string {
    return `${pos.x},${pos.y}`;
  }

  // Reset agent memory
  reset() {
    this.qTable = {}; 
    this.epsilon = 0.2;
  }

  // Decay epsilon to simulate "mastery" over time
  decayEpsilon() {
    this.epsilon = Math.max(0.01, this.epsilon * 0.95);
  }

  setEpsilon(val: number) {
    this.epsilon = val;
  }

  private getQValues(pos: Position): Record<string, number> {
    const key = this.getStateKey(pos);
    if (!this.qTable[key]) {
      this.qTable[key] = {
        [AgentAction.UP]: 0,
        [AgentAction.DOWN]: 0,
        [AgentAction.LEFT]: 0,
        [AgentAction.RIGHT]: 0,
      };
    }
    return this.qTable[key];
  }

  getAction(pos: Position): AgentAction {
    // Epsilon-greedy strategy
    if (Math.random() < this.epsilon) {
       return this.getRandomMove();
    }
    
    const qValues = this.getQValues(pos);
    const actions = [AgentAction.UP, AgentAction.DOWN, AgentAction.LEFT, AgentAction.RIGHT];
    
    // Find best action
    let bestActions: AgentAction[] = [];
    let maxVal = -Infinity;
    
    for (const action of actions) {
      const val = qValues[action];
      if (val > maxVal) {
        maxVal = val;
        bestActions = [action];
      } else if (val === maxVal) {
        bestActions.push(action);
      }
    }
    
    // Break ties randomly
    return bestActions[Math.floor(Math.random() * bestActions.length)];
  }

  getRandomMove(): AgentAction {
    const actions = [AgentAction.UP, AgentAction.DOWN, AgentAction.LEFT, AgentAction.RIGHT];
    return actions[Math.floor(Math.random() * actions.length)];
  }

  update(prevPos: Position, action: AgentAction, reward: number, nextPos: Position) {
    const prevKey = this.getStateKey(prevPos);
    
    // Ensure initialized
    this.getQValues(prevPos);
    const nextQ = this.getQValues(nextPos);

    // Max Q for next state
    const maxNextQ = Math.max(
      nextQ[AgentAction.UP], 
      nextQ[AgentAction.DOWN], 
      nextQ[AgentAction.LEFT], 
      nextQ[AgentAction.RIGHT]
    );

    const currentQ = this.qTable[prevKey][action];
    
    // Update rule
    this.qTable[prevKey][action] = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
  }

  // Heuristic to check if we are in a "bad" spot (low value)
  isInDanger(pos: Position): boolean {
      const q = this.getQValues(pos);
      const maxVal = Math.max(...Object.values(q));
      return maxVal < -10; // If best action is still very negative
  }
}