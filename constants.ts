
import { SimulationConfig } from './types';

export const DEFAULT_CONFIG: SimulationConfig = {
  gridSize: 20, 
  rewindCost: -5,       // Specified: -5 for rewind usage
  rewindSteps: 5,       // Steps to rewind
  trapDamage: 100,      // Lethal
  trapPenalty: -50,     // Specified: -50 for traps
  goalReward: 100,      // Specified: +100 for level clear
  stepPenalty: -1,      // Specified: -1 per step
  coinReward: 10,       // Specified: +10 for coin collection
};

export const REVISIT_PENALTY = -10; // For retreading abandoned path segments
export const RE_ENTER_POISON_PENALTY = -20; // Specified: -20 additional penalty for re-entering previously identified poisoned path
export const INITIAL_REWIND_BUDGET = 5; 
export const MAX_HEALTH = 100;

// Dark Dungeon Palette
export const COLORS = {
  // Grid
  EMPTY: 'bg-[#1e293b] border border-[#334155]', 
  WALL: 'bg-[#0f172a] border border-[#1e293b] shadow-[inset_0_0_15px_rgba(0,0,0,1)]',
  
  // Locations
  START: 'bg-blue-900/20 border border-blue-500/20',
  GOAL: 'bg-yellow-900/20 border border-yellow-500/20 shadow-[inset_0_0_20px_rgba(234,179,8,0.2)]',
  
  // Traps
  TRAP_SPIKE: 'bg-[#334155]', 
  TRAP_POISON: 'bg-green-900/30 shadow-[inset_0_0_10px_rgba(34,197,94,0.4)] border border-green-900/50',
  TRAP_PIT: 'bg-black shadow-[inset_0_0_20px_black]',
  TRAP_TRIGGER: 'bg-orange-900/20',
  
  // Items
  ITEM_KEY: 'bg-transparent',
  ITEM_MONEY: 'bg-transparent',
  ITEM_COIN: 'bg-transparent',
  
  // Doors
  DOOR: 'bg-[#3f2e18] border border-orange-900/50',
  DOOR_OPEN: 'bg-emerald-900/10 border border-emerald-500/20 border-dashed',
  
  // Agent
  AGENT: 'z-50 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]',
};
