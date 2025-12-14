export enum CellType {
  EMPTY = 'EMPTY',
  WALL = 'WALL',
  START = 'START',
  GOAL = 'GOAL',
  TRAP = 'TRAP',
  SWITCH = 'SWITCH',
  DOOR = 'DOOR'
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
  isDynamic?: boolean; // If true, changes state periodically
  isOpen?: boolean; // For doors
  isActive?: boolean; // For traps/switches
}

export interface AgentState {
  position: Position;
  health: number;
  rewindBudget: number;
  stepsTaken: number;
}

export interface EpisodeStats {
  episode: number;
  steps: number;
  totalReward: number;
  result: 'WIN' | 'LOSS';
  rewindsUsed: number;
}

export interface SimulationState {
  grid: GridCell[][];
  agent: AgentState;
  score: number;
  history: { grid: GridCell[][]; agent: AgentState; score: number }[]; // For rewind
  episode: number;
  isGameOver: boolean;
  gameResult: 'WIN' | 'LOSS' | null;
  logs: string[];
  activePath: Position[]; // The current timeline path
  abandonedPaths: Position[][]; // Paths that were rewinded (mistakes)
}

export interface SimulationConfig {
  gridSize: number;
  rewindCost: number;
  rewindSteps: number; // K steps back
  trapDamage: number;
  goalReward: number;
  stepPenalty: number;
}