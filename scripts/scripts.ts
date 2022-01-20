import cipMain from "./cip";
import rustMain from "./rust-library";
import tokenRegistryMain from "./token-registry";

// Initiate all the scripts in one file
const start = (callback: any) => {

  console.log("Running scripts");
  
  // Callback for scripts to run after eachother after 2 seconds
  setTimeout(() => {
    callback(cipMain);
    setTimeout(() => {
      callback(rustMain);
      setTimeout(() => {
        callback(tokenRegistryMain);
      }, 2000);
    }, 2000);
  }, 2000);
  
};

// Run scripts
start((script: any) => script());
