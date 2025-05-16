// wasm-loader.js
// This file loads the WASM module and makes it available globally

(function() {
  // Save the original importScripts function
  var originalImportScripts = self.importScripts;
  
  // Define a global object to hold the module
  self.wasmModule = null;
  
  // Function to initialize the module
  async function initModule() {
    try {
      // Import the browser.js module using a dynamic import
      const module = await import('./wasm/browser.js');
      
      // Initialize if needed
      if (typeof module.default === 'function') {
        await module.default();
      }
      
      // Store the module globally
      self.wasmModule = module;
      
      console.log('WASM module initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WASM module:', error);
    }
  }
  
  // Start initialization
  initModule();
})();