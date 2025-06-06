// wasm-service.ts

let wasmModule: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

const BASE_PATH = '/learning-platform';

export async function loadWasmModule() {
 if (wasmModule) {
   return wasmModule;
 }
 
 if (isLoading) {
   return loadPromise;
 }
 
 isLoading = true;
 
 try {
   loadPromise = new Promise(async (resolve, reject) => {
     try {
       const wasmPath = `${BASE_PATH}/wasm/browser.js`;
       const module = await import(/* webpackIgnore: true */ wasmPath);
       
       if (typeof module.default === 'function') {
         await module.default();
       }
       
       wasmModule = module;
       isLoading = false;
       console.log("WASM module loaded successfully");
       resolve(module);
     } catch (err) {
       isLoading = false;
       console.error("Failed to load WASM module:", err);
       reject(err);
     }
   });
   
   return loadPromise;
 } catch (err) {
   isLoading = false;
   console.error("Error loading WASM module:", err);
   throw err;
 }
}

export async function processGameEvent(eventData: {
  eventType: string;
  eventResult: number;
  playerId: number;
  exerciseId: number;
  gameId: number;
}) {
  try {
    const wasm = await loadWasmModule();
    if (!wasm) {
      console.error("WASM module not loaded properly");
      return null;
    }
    const playerId = isNaN(eventData.playerId) ? 1 : eventData.playerId;
    const exerciseId = isNaN(eventData.exerciseId) ? 1 : eventData.exerciseId;
    const gameId = isNaN(eventData.gameId) ? 1 : eventData.gameId;
    
    // Get stored game state
    const gameStateKey = `game_state_${gameId}_${playerId}`;
    const currentGameState = localStorage.getItem(gameStateKey) || "";
    console.log("Current game state:", currentGameState ? "Found" : "Empty");
    //timestamp
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const timeString = now.toTimeString().split(' ')[0];
    
    const wasmEvent = {
      event: {
        parts: {
          player: { NumberBased: playerId },
          exercise: { NumberBased: exerciseId },
          game: { NumberBased: gameId },
          type: { NumberBased: 1 },
          result: { NumberBased: eventData.eventResult },
          on: { DateBased: dateString },
          at: { TimeBased: timeString }
        }
      },
      game_state: currentGameState,
      simple_rules_str: "simple_rule: player 1 on 2020.01.01..2026.01.01 at 8:30..23:30 achieving 100 repeat +",
      compound_rules_str: "",
      rule_results_str: "simple_rule -> repeat msg nicely_done_simple_rule"
    };
    
    console.log("Sending to WASM:", JSON.stringify(wasmEvent));
    
    if (!wasm.process_event) {
      console.error("process_event function not found in WASM module");
      return null;
    }
    
    const result = await wasm.process_event(wasmEvent);
    console.log("WASM raw result:", result);
    
    if (!result) {
      console.error("WASM returned null or undefined result");
      return null;
    }
    
    if (result.game_state) {
      console.log("Saving new game state to localStorage");
      localStorage.setItem(gameStateKey, result.game_state);
    } else {
      console.warn("No game_state in WASM result");
    }
    
    if (result.results && Array.isArray(result.results)) {
      console.log("WASM results found:", result.results.length);
      
      result.results.forEach((item: any, index: number) => {
        if (Array.isArray(item) && item.length >= 2 && item[0] === "Message") {
          if (Array.isArray(item[1]) && item[1].length > 0) {
            console.log(`Valid message found at index ${index}:`, item[1][0]);
          } else {
            console.warn(`Message at index ${index} has invalid format:`, item);
          }
        }
      });
    } else {
      console.warn("No valid results array in WASM response");
    }
    
    return result;
  } catch (error) {
    console.error("Detailed error in processGameEvent:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return null;
  }
}