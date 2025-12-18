
import { GoogleGenAI, Type } from "@google/genai";
import { GridCell, AgentState, CellType, AgentAction } from "../types";

// Helper to convert grid to string representation for the LLM
const gridToString = (grid: GridCell[][], agent: AgentState): string => {
  return grid.map((row, y) => {
    return row.map((cell, x) => {
      if (agent.position.x === x && agent.position.y === y) return 'A'; // Agent
      switch (cell.type) {
        case CellType.WALL: return '#';
        case CellType.GOAL: return 'G';
        // Treat all traps as dangerous for the AI, regardless of 'isActive' which was used for dynamic traps
        case CellType.TRAP: return 'T'; 
        case CellType.DOOR: return cell.isOpen ? '_' : 'D';
        case CellType.SWITCH: return 'S';
        case CellType.ITEM: return 'I'; // Items
        default: return '.';
      }
    }).join(' ');
  }).join('\n');
};

export const getNextMoveFromGemini = async (
  grid: GridCell[][],
  agent: AgentState,
  logs: string[]
): Promise<AgentAction> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API Key provided, returning random move.");
    return getRandomMove();
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const gridStr = gridToString(grid, agent);
  const recentLogs = logs.slice(-5).join('\n');

  const prompt = `
    You are an RL Agent (AgentX) in a dungeon grid world.
    
    Map Legend:
    A = Agent (You)
    # = Wall
    G = Goal (Treasure Chest - Requires 4 Keys to unlock full potential)
    T = Trap (Spikes, Poison, or Pit - AVOID AT ALL COSTS)
    D = Closed Door (Requires Key)
    _ = Open Door
    I = Item (Key or Money)
    . = Empty Space
    
    Current State:
    ${gridStr}

    Status:
    Health: ${agent.health} (Death at 0)
    Rewind Budget: ${agent.rewindBudget}
    Keys Collected: ${agent.keysCollected}
    Status Effect: ${agent.statusEffect}
    
    Recent Events:
    ${recentLogs}

    STRICT RULES (READ CAREFULLY):
    1. REACTIVE REWIND ONLY: You are forbidden from using REWIND based on prediction.
    2. ENTER DANGER FIRST: You must step ONTO a trap or poison first. This will trigger a "TRAPPED_WAITING_REWIND" status.
    3. WHEN TRAPPED: If your status is "TRAPPED_WAITING_REWIND", you MUST use REWIND immediately. Movement is blocked in this state.
    4. WHEN SAFE: If your status is "NONE", do NOT use REWIND. Move normally.
    
    Decision Logic:
    - If status == "TRAPPED_WAITING_REWIND": OUTPUT "REWIND".
    - If status == "NONE": Choose best path to G. Avoid T if possible, but do not rewind pre-emptively.
    
    Choose action from: UP, DOWN, LEFT, RIGHT, REWIND, WAIT.
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              enum: ["UP", "DOWN", "LEFT", "RIGHT", "REWIND", "WAIT"]
            },
            reasoning: {
              type: Type.STRING
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return (result.action as AgentAction) || AgentAction.WAIT;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return getRandomMove();
  }
};

const getRandomMove = (): AgentAction => {
  const actions = [AgentAction.UP, AgentAction.DOWN, AgentAction.LEFT, AgentAction.RIGHT];
  return actions[Math.floor(Math.random() * actions.length)];
};
