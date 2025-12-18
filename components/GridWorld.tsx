
import React from 'react';
import { GridCell, AgentState, CellType, Position, TrapType, ItemType } from '../types';
import { COLORS } from '../constants';
import { AgentAction } from '../types';

interface GridWorldProps {
  grid: GridCell[][];
  agent: AgentState;
  lastAction: AgentAction | null;
  activePath: Position[];
  abandonedPaths: Position[][];
  isGameOver: boolean;
}

/* --- ICONS --- */

const SuperWomanIcon = ({ isRewinding, direction, status }: { isRewinding: boolean; direction: 'L' | 'R', status: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={`w-full h-full ${isRewinding ? 'animate-spin-reverse opacity-70' : ''}`} 
    style={{overflow: 'visible', transform: direction === 'L' ? 'scaleX(-1)' : 'scaleX(1)'}}
  >
    <defs>
      <linearGradient id="suitGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    
    {/* Status Effects */}
    {status === 'POISONED' && <circle cx="12" cy="12" r="12" fill="none" stroke="#22c55e" strokeWidth="2" className="animate-pulse" />}
    {status === 'FALLEN' && <path d="M4,20 L20,20" stroke="#ef4444" strokeWidth="2" strokeDasharray="2 2" />}
    {status === 'TRAPPED_WAITING_REWIND' && (
        <>
            <circle cx="12" cy="12" r="14" fill="none" stroke="#ef4444" strokeWidth="3" className="animate-ping" />
            <path d="M12,4 L12,20 M4,12 L20,12" stroke="#facc15" strokeWidth="2" strokeDasharray="4 4" className="animate-spin" style={{transformOrigin: 'center'}}/>
        </>
    )}

    {/* Cape */}
    <path d="M6,8 Q2,16 3,22 L21,22 Q22,16 18,8 L12,8 Z" fill="#db2777" className="drop-shadow-sm origin-top animate-pulse"/>

    {/* Moving Legs */}
    <g className={!isRewinding ? "animate-leg-l" : ""}>
        <path d="M11,16 L11,20 L9,22" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M9,22 L11,22" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    <g className={!isRewinding ? "animate-leg-r" : ""}>
        <path d="M13,16 L13,20 L15,22" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M15,22 L13,22" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    
    {/* Body */}
    <path d="M8,8 L16,8 L15,16 L9,16 Z" fill="url(#suitGrad)" />
    <path d="M12,9 L13,11 L12,13 L11,11 Z" fill="#fcd34d" />
    <circle cx="12" cy="5" r="3.5" fill="#fecaca" />
    <path d="M12,1 C9,1 7,3 7,5 L7,8 L6,10 L8,12 L16,12 L18,10 L17,8 L17,5 C17,3 15,1 12,1 Z" fill="#fcd34d" />
    <rect x="9" y="4" width="6" height="2" fill="#3b82f6" rx="0.5" />
    
    {/* Torch Light (Dungeon Feel) */}
    <circle cx="12" cy="10" r="10" fill="url(#torchLight)" opacity="0.3" style={{mixBlendMode: 'overlay'}} />
    <defs>
      <radialGradient id="torchLight">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
  </svg>
);

const SpikeTrap = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full p-1">
    <path d="M2,22 L6,10 L10,22 M8,22 L12,8 L16,22 M14,22 L18,10 L22,22" fill="#94a3b8" stroke="#475569" strokeLinejoin="round" />
  </svg>
);

const PoisonTrap = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full p-2 animate-pulse">
    <path d="M12,2 C7,2 4,6 4,10 C4,13 6,15 8,16 L8,20 L10,20 L10,18 L14,18 L14,20 L16,20 L16,16 C18,15 20,13 20,10 C20,6 17,2 12,2 Z" fill="#22c55e" opacity="0.8"/>
    <circle cx="9" cy="9" r="2" fill="#022c22" />
    <circle cx="15" cy="9" r="2" fill="#022c22" />
    <rect x="11" y="13" width="2" height="3" fill="#022c22" />
  </svg>
);

const PitTrap = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full">
    <circle cx="12" cy="12" r="8" fill="#020617" stroke="#1e293b" strokeWidth="2" />
    <path d="M12,4 L12,20 M4,12 L20,12" stroke="#1e293b" opacity="0.3" />
  </svg>
);

const TriggerTrap = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full p-3">
     <rect x="4" y="4" width="16" height="16" rx="2" fill="#7c2d12" stroke="#ea580c" strokeWidth="2" />
     <path d="M12,8 L12,16" stroke="#fdba74" strokeWidth="2" />
  </svg>
);

const CoinIcon = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full p-1.5 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-bounce">
        <circle cx="12" cy="12" r="9" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
        <circle cx="12" cy="12" r="6" fill="none" stroke="#ca8a04" strokeWidth="1" strokeDasharray="1 2" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#713f12" style={{fontFamily: 'Orbitron'}}>$</text>
    </svg>
);

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full p-1 drop-shadow-md animate-bounce" style={{animationDuration: '2s'}}>
    <path d="M14,10 C14,12.2 12.2,14 10,14 C7.8,14 6,12.2 6,10 C6,7.8 7.8,6 10,6 C12.2,6 14,7.8 14,10 Z M13,13 L20,20 L22,18" fill="none" stroke="#facc15" strokeWidth="2" />
    <circle cx="10" cy="10" r="2" fill="#facc15" />
    <path d="M16,16 L18,14 M18,18 L20,16" stroke="#facc15" strokeWidth="2" />
  </svg>
);

const MoneyBagIcon = ({value}: {value: number}) => (
  <svg viewBox="0 0 24 24" className="w-full h-full p-2 drop-shadow-md">
    <path d="M12,3 C10,3 9,4 9,6 L9,8 C6,8 4,10 4,14 C4,18 7,21 12,21 C17,21 20,18 20,14 C20,10 18,8 15,8 L15,6 C15,4 14,3 12,3 Z" fill={value > 50 ? "#eab308" : "#94a3b8"} stroke="#fefce8" />
    <path d="M9,8 L15,8" stroke="#ca8a04" />
    <text x="12" y="16" textAnchor="middle" fontSize="8" fill="#422006" fontWeight="bold">$</text>
  </svg>
);

const ChestIcon = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]">
        <rect x="4" y="8" width="16" height="12" rx="1" fill="#854d0e" stroke="#fef08a" />
        <path d="M4,8 L12,4 L20,8" fill="#a16207" stroke="#fef08a" />
        <rect x="11" y="11" width="2" height="3" fill="#fef08a" />
        <circle cx="12" cy="10" r="5" fill="none" stroke="#fef08a" strokeWidth="1" strokeDasharray="2 2" className="animate-ping opacity-50" />
    </svg>
);

const LockIcon = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full opacity-90 drop-shadow-md">
        <rect x="6" y="10" width="12" height="10" rx="2" fill="#451a03" stroke="#f97316" />
        <path d="M12,10 L12,6 C12,4 14,4 14,6 L14,10" fill="none" stroke="#f97316" strokeWidth="2" />
        <circle cx="12" cy="15" r="1.5" fill="#f97316" />
    </svg>
);

/* --- CELL COMPONENT (OPTIMIZED) --- */

interface CellProps {
  cell: GridCell;
  isAgent: boolean;
  agentAction: AgentAction | null;
  dimmed: boolean;
  agentStatus: string;
}

// React.memo with custom comparison to prevent unnecessary re-renders of static cells
const Cell = React.memo<CellProps>(({ cell, isAgent, agentAction, dimmed, agentStatus }) => {
  let bgClass = COLORS.EMPTY;
  let content: React.ReactNode = null;
  const isTrap = cell.type === CellType.TRAP;

  switch (cell.type) {
    case CellType.WALL:
      bgClass = COLORS.WALL;
      break;
    case CellType.START:
      bgClass = COLORS.START;
      content = <span className="text-blue-500/30 text-[8px] tracking-tighter uppercase">START</span>;
      break;
    case CellType.GOAL:
      bgClass = COLORS.GOAL;
      content = <ChestIcon />;
      break;
    case CellType.TRAP:
        if (cell.trapType === TrapType.POISON) {
             bgClass = COLORS.TRAP_POISON;
             content = <PoisonTrap />;
        } else if (cell.trapType === TrapType.PIT) {
             bgClass = COLORS.TRAP_PIT;
             content = <PitTrap />;
        } else if (cell.trapType === TrapType.TRIGGER) {
             bgClass = COLORS.TRAP_TRIGGER;
             content = <TriggerTrap />;
        } else {
             bgClass = COLORS.TRAP_SPIKE;
             content = <SpikeTrap />;
        }
      break;
    case CellType.ITEM:
      if (cell.itemType === ItemType.KEY) {
          content = <KeyIcon />;
      } else if (cell.itemType === ItemType.MONEY_BAG) {
          content = <MoneyBagIcon value={cell.itemValue || 50} />;
      } else if (cell.itemType === ItemType.COIN) {
          content = <CoinIcon />;
      }
      break;
    case CellType.DOOR:
      bgClass = cell.isOpen ? COLORS.DOOR_OPEN : COLORS.DOOR;
      content = !cell.isOpen && <LockIcon />;
      break;
  }

  const agentClasses = isAgent ? `${COLORS.AGENT} scale-90 -translate-y-1 transition-all duration-150` : '';
  const dimClass = (dimmed && !isAgent && cell.type !== CellType.GOAL) ? 'opacity-30 grayscale' : 'opacity-100';

  return (
    <div className={`
      relative w-full h-full
      flex items-center justify-center 
      text-xs font-bold rounded-sm
      transition-colors duration-300
      ${bgClass}
      ${dimClass}
    `}>
      
      {!isAgent && (
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isTrap ? 'z-20' : 'z-10'}`}>
              {content}
          </div>
      )}

      {isAgent && (
        <div className={`w-full h-full flex items-center justify-center ${agentClasses}`}>
            <SuperWomanIcon 
                isRewinding={agentAction === AgentAction.REWIND} 
                direction={agentAction === AgentAction.LEFT ? 'L' : 'R'}
                status={agentStatus}
            />
        </div>
      )}
      
    </div>
  );
}, (prevProps, nextProps) => {
    // Custom Equality Check
    // 1. Check strict primitive equality for simple flags
    if (prevProps.isAgent !== nextProps.isAgent) return false;
    if (prevProps.dimmed !== nextProps.dimmed) return false;
    
    // 2. If it is the agent, check agent-specific props
    if (nextProps.isAgent) {
        if (prevProps.agentAction !== nextProps.agentAction) return false;
        if (prevProps.agentStatus !== nextProps.agentStatus) return false;
    }

    // 3. Check Cell data content (Deep check of relevant visual properties)
    // We avoid checking the entire cell object reference because it changes every frame
    const p = prevProps.cell;
    const n = nextProps.cell;
    
    return (
        p.type === n.type &&
        p.isOpen === n.isOpen &&
        p.isActive === n.isActive &&
        p.trapType === n.trapType &&
        p.itemType === n.itemType &&
        // For items, check value
        p.itemValue === n.itemValue
    );
});

/* --- MAIN GRID COMPONENT --- */

const GridWorld: React.FC<GridWorldProps> = ({ 
  grid, 
  agent, 
  lastAction, 
  activePath, 
  abandonedPaths, 
  isGameOver 
}) => {
  const gridSize = grid.length;
  
  const getCoord = (p: Position) => {
    return {
      x: ((p.x + 0.5) / gridSize) * 100,
      y: ((p.y + 0.5) / gridSize) * 100
    };
  };

  const pointsToPolyline = (points: Position[]) => {
    return points.map(p => {
      const c = getCoord(p);
      return `${c.x},${c.y}`;
    }).join(' ');
  };

  return (
    <div className="relative p-2 glass-panel glass-panel-border rounded-xl w-full aspect-square max-w-[650px] mx-auto shadow-2xl bg-[#020617] overflow-hidden">
      
      {/* Grid Layer */}
      <div 
        className="grid gap-0 w-full h-full absolute inset-0 p-2 z-10"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
        }}
      >
        {grid.map((row, y) => (
          row.map((cell, x) => {
             const isAgent = agent.position.x === x && agent.position.y === y;
             return (
                <Cell 
                  key={`${x}-${y}`} 
                  cell={cell} 
                  isAgent={isAgent}
                  // Optimization: Only pass agent props to the cell where the agent actually is.
                  // This allows non-agent cells to skip re-rendering even if agentAction changes.
                  agentAction={isAgent ? lastAction : null}
                  agentStatus={isAgent ? agent.statusEffect : 'NONE'}
                  dimmed={isGameOver}
                />
             );
          })
        ))}
      </div>

      {/* Path Overlay Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible p-2">
        {abandonedPaths.map((path, i) => (
          <polyline 
            key={`abandoned-${i}`}
            points={pointsToPolyline(path)}
            fill="none"
            stroke="#dc2626" 
            strokeWidth="0.5%"
            strokeDasharray="2, 2"
            opacity="0.3"
          />
        ))}

        <polyline 
          points={pointsToPolyline(activePath)}
          fill="none"
          stroke={isGameOver ? "#10b981" : "#3b82f6"} 
          strokeWidth="0.8%"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.5"
          className="drop-shadow-[0_0_2px_rgba(59,130,246,0.5)]"
          style={{ vectorEffect: 'non-scaling-stroke' }}
        />
      </svg>
      
      {/* HIGHLY VISIBLE REWIND OVERLAY */}
      {lastAction === AgentAction.REWIND && (
          <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-cyan-900/30 backdrop-blur-[1px]">
               {/* Scanlines Effect */}
               <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-50"></div>
               
               {/* Text */}
               <div className="flex flex-col items-center">
                   <div className="font-cyber text-4xl text-cyan-300 font-bold tracking-[0.2em] drop-shadow-[0_0_15px_rgba(34,211,238,1)] animate-pulse">
                       REWINDING
                   </div>
                   <div className="font-mono text-xs text-cyan-400/70 tracking-widest mt-2 animate-bounce">
                       TEMPORAL REVERSAL IN PROGRESS...
                   </div>
               </div>
               
               {/* VHS Glitch lines (Simulated with simple borders) */}
               <div className="absolute top-10 left-0 w-full h-[1px] bg-cyan-400/50 animate-pulse"></div>
               <div className="absolute bottom-10 left-0 w-full h-[1px] bg-cyan-400/50 animate-pulse delay-75"></div>
          </div>
      )}
    </div>
  );
};

export default GridWorld;
