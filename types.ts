
export enum CellType {
  EMPTY = 'EMPTY',
  WALL = 'WALL',
  START = 'START',
  GOAL = 'GOAL',
  TRAP = 'TRAP',
  SWITCH = 'SWITCH',
  DOOR = 'DOOR',
  ITEM = 'ITEM'
}

export enum TrapType {
  SPIKE = 'SPIKE',        // Normal: 2 hits = death
  POISON = 'POISON',      // Mandatory Rewind
  PIT = 'PIT',            // Mandatory Rewind
  TRIGGER = 'TRIGGER'     // Closes a door
}

export enum ItemType {
  KEY = 'KEY',
  MONEY_BAG = 'MONEY_BAG',
  COIN = 'COIN'
}

export enum AgentAction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  REWIND = 'REWIND',
  WAIT = 'WAIT'
}

export interface Position {
  x: number;
  y: number;
}

export interface GridCell {
  type: CellType;
  x: number;
  y: number;
  // Dynamic Props
  isDynamic?: boolean; 
  isOpen?: boolean; 
  isActive?: boolean;
  // Specifics
  trapType?: TrapType;
  itemType?: ItemType;
  itemValue?: number; // Amount of money or score
  targetDoor?: Position; // For trigger traps
}

export interface AgentState {
  position: Position;
  health: number;
  rewindBudget: number;
  stepsTaken: number;
  // New props
  keysCollected: number;
  coins: number;
  visitedTraps: string[]; // Unique traps visited
  trapsTriggered: number; // Total mistake count for analysis
  statusEffect: 'NONE' | 'POISONED' | 'FALLEN' | 'TRAPPED_WAITING_REWIND'; 
}

export interface EpisodeStats {
  episode: number;
  steps: number;
  totalReward: number;
  result: 'WIN' | 'LOSS';
  rewindsUsed: number;
  trapCount: number; // Metric for mistakes
}

export interface SimulationState {
  grid: GridCell[][];
  agent: AgentState;
  score: number; // Current level reward/score
  history: { grid: GridCell[][]; agent: AgentState; score: number }[];
  episode: number;
  isGameOver: boolean;
  gameResult: 'WIN' | 'LOSS' | null;
  logs: string[];
  activePath: Position[];
  abandonedPaths: Position[][];
  globalKnownTraps: string[]; // Persists across episodes for the specific map
}

export interface SimulationConfig {
  gridSize: number;
  rewindCost: number;
  rewindSteps: number;
  trapDamage: number;
  trapPenalty: number;
  goalReward: number;
  stepPenalty: number;
  coinReward: number;
}
