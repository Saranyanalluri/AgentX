import { SimulationConfig } from './types';

export const DEFAULT_CONFIG: SimulationConfig = {
  gridSize: 12,
  rewindCost: -5,
  rewindSteps: 3,
  trapDamage: 20,
  goalReward: 100,
  stepPenalty: -1,
};

export const INITIAL_REWIND_BUDGET = 5;
export const MAX_HEALTH = 100;

// Colors for the grid
export const COLORS = {
  EMPTY: 'bg-slate-800',
  WALL: 'bg-slate-600 border-slate-500',
  START: 'bg-blue-900/50',
  GOAL: 'bg-yellow-500/20 border-yellow-500',
  TRAP: 'bg-red-900/40 border-red-500',
  TRAP_ACTIVE: 'bg-red-600 animate-pulse',
  SWITCH: 'bg-purple-600',
  DOOR: 'bg-orange-800',
  DOOR_OPEN: 'bg-orange-900/30 border-orange-800 border-dashed',
  AGENT: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]',
};