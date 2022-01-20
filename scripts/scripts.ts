import cipMain from "./cip";
import rustMain from "./rust-library";
import tokenRegistryMain from "./token-registry";

// Initiate every script every few seconds
const start = (callback: any) => {

  console.log("Running scripts");
  
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

start((script: any) => script());
