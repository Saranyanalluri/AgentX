import React from 'react';
import { GridCell, AgentState, CellType, Position } from '../types';
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

const GridWorld: React.FC<GridWorldProps> = ({ 
  grid, 
  agent, 
  lastAction, 
  activePath, 
  abandonedPaths,
  isGameOver 
}) => {
  const gridSize = grid.length;
  // Calculate cell size relative to container 
  // We use percentage logic for SVG overlay
  
  const getCoord = (p: Position) => {
    // Center of cell: (x + 0.5) / size * 100
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
    <div className="relative p-1 bg-slate-900 rounded-lg shadow-2xl border border-slate-700 w-full aspect-square max-w-[600px]">
      
      {/* Grid Layer */}
      <div 
        className="grid gap-1 w-full h-full absolute inset-0 p-1"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
        }}
      >
        {grid.map((row, y) => (
          row.map((cell, x) => (
            <Cell 
              key={`${x}-${y}`} 
              cell={cell} 
              isAgent={agent.position.x === x && agent.position.y === y}
              agentAction={lastAction}
              dimmed={isGameOver} // Dim grid when game over to highlight path
            />
          ))
        ))}
      </div>

      {/* Path Overlay Layer (Visible always, but highlighted on Game Over) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
        {/* Abandoned Paths (Mistakes) - Red Dashed */}
        {abandonedPaths.map((path, i) => (
          <polyline 
            key={`abandoned-${i}`}
            points={pointsToPolyline(path)}
            fill="none"
            stroke="#ef4444" // red-500
            strokeWidth="0.8%"
            strokeDasharray="4, 4"
            opacity="0.6"
            className="drop-shadow-sm"
          />
        ))}

        {/* Active Path (Current) - Cyan/Green */}
        <polyline 
          points={pointsToPolyline(activePath)}
          fill="none"
          stroke={isGameOver ? "#34d399" : "#22d3ee"} // emerald-400 (win) or cyan-400
          strokeWidth={isGameOver ? "1.5%" : "1%"}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
          className="drop-shadow-[0_0_4px_rgba(34,211,238,0.5)] transition-all duration-500"
        />
        
        {/* Markers for Start and Path End */}
        {activePath.length > 0 && (
          <>
            <circle 
              cx={`${getCoord(activePath[0]).x}%`} 
              cy={`${getCoord(activePath[0]).y}%`} 
              r="1.5%" 
              fill="#3b82f6" 
              stroke="#fff" 
              strokeWidth="0.5%"
            />
          </>
        )}
      </svg>
    </div>
  );
};

interface CellProps {
  cell: GridCell;
  isAgent: boolean;
  agentAction: AgentAction | null;
  dimmed: boolean;
}

const Cell: React.FC<CellProps> = ({ cell, isAgent, agentAction, dimmed }) => {
  let bgClass = COLORS.EMPTY;
  let content = '';

  switch (cell.type) {
    case CellType.WALL:
      bgClass = COLORS.WALL;
      break;
    case CellType.START:
      bgClass = COLORS.START;
      content = 'S';
      break;
    case CellType.GOAL:
      bgClass = COLORS.GOAL;
      content = '🚩';
      break;
    case CellType.TRAP:
      bgClass = cell.isActive ? COLORS.TRAP_ACTIVE : COLORS.TRAP;
      content = '⚡';
      break;
    case CellType.SWITCH:
      bgClass = COLORS.SWITCH;
      content = '⦿';
      break;
    case CellType.DOOR:
      bgClass = cell.isOpen ? COLORS.DOOR_OPEN : COLORS.DOOR;
      break;
  }

  const agentClasses = isAgent ? `${COLORS.AGENT} z-30 scale-110 transition-transform` : '';
  const dimClass = (dimmed && !isAgent && cell.type !== CellType.GOAL) ? 'opacity-30 grayscale' : 'opacity-100';

  return (
    <div className={`
      relative w-full h-full
      flex items-center justify-center 
      text-xs sm:text-sm font-bold rounded-sm
      transition-all duration-300
      ${isAgent ? agentClasses : bgClass}
      ${cell.type === CellType.WALL ? 'shadow-inner' : ''}
      ${dimClass}
    `}>
      {/* Background layer for Agent on top of cell */}
      {isAgent && (
        <span className="text-slate-900">
             {agentAction === AgentAction.REWIND ? '↺' : '♟'}
        </span>
      )}
      
      {!isAgent && <span className="opacity-70">{content}</span>}
    </div>
  );
};

export default GridWorld;