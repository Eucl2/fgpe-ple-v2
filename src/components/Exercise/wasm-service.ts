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
   
   const gameStateKey = `game_state_${eventData.gameId}_${eventData.playerId}`;
   const currentGameState = localStorage.getItem(gameStateKey) || "";
   
   const playerId = isNaN(eventData.playerId) ? 1 : eventData.playerId;
   const exerciseId = isNaN(eventData.exerciseId) ? 1 : eventData.exerciseId;
   const gameId = isNaN(eventData.gameId) ? 1 : eventData.gameId;
   
   const wasmEvent = {
     event: {
       parts: {
         player: { NumberBased: playerId },
         exercise: { NumberBased: exerciseId },
         game: { NumberBased: gameId },
         type: { NumberBased: 1 },
         result: { NumberBased: eventData.eventResult },
         on: { DateBased: new Date().toISOString().split('T')[0] },
         at: { TimeBased: new Date().toTimeString().split(' ')[0] }
       }
     },
     game_state: currentGameState,
     simple_rules_str: "simple_rule: player 1 on 2020.01.01..2026.01.01 at 8:30..23:30 achieving 100 repeat +",
     compound_rules_str: "",
     rule_results_str: "simple_rule -> msg nicely_done_simple_rule"
   };
   
   console.log("Processing game event:", wasmEvent);
   
   const result = await wasm.process_event(wasmEvent);
   console.log("WASM result:", result);
   
   if (result && result.game_state) {
     localStorage.setItem(gameStateKey, result.game_state);
   }
   
   return result;
 } catch (error) {
   console.error("Error processing game event:", error);
   return null;
 }
}