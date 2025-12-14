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
        case CellType.TRAP: return cell.isActive ? 'T' : '.';
        case CellType.DOOR: return cell.isOpen ? '_' : 'D';
        case CellType.SWITCH: return 'S';
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
    You are an RL Agent (AgentX) in a grid world.
    Map Legend:
    A = Agent (You)
    # = Wall
    G = Goal (Objective)
    T = Active Trap (Avoid!)
    D = Closed Door (Blocked)
    _ = Open Door (Passable)
    . = Empty Space
    
    Current State:
    ${gridStr}

    Status:
    Health: ${agent.health}
    Rewind Budget: ${agent.rewindBudget}
    Recent Events:
    ${recentLogs}

    Task: Navigate to 'G'. Avoid 'T'. 
    Special Action: REWIND. Use REWIND if you are trapped, stuck, or just took heavy damage efficiently.
    Rewind costs points but saves the episode.
    
    Choose the best action from: UP, DOWN, LEFT, RIGHT, REWIND, WAIT.
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