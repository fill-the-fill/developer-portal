import * as fs from 'fs';
import fetch from 'node-fetch';

// Today's date
const currentDate = new Date();

// New script.lock template
export const newTimeTemplate = "LAST BUILD TIME OF THE SCRIPTS" + "\n\n" + "CIPS:" + currentDate.toISOString() + "\n" + "RUST-LIBRARY:" + "\n" + "TOKEN-REGISTRY:" + "\n";

// Script.lock location
export const scriptLockPath: string = "./scripts/script.lock";

// Content fetch function
export const getStringContentAsync = async (url: string) => {
    return await fetch(url).then(res => res.text());
}

// Image content fetch function
export const getBufferContentAsync = async(url: string) => { 
    return await fetch(url).then(res => res.arrayBuffer());
}

// Compare dates with previous build and fetch data if needed
export const compareDateTest = async (name: string, scriptDateRegex: any, downloadFunction: any, regexMatch: any) => {
    fs.readFile(scriptLockPath, "utf8", (err, data) => {

        // Find previously recorded date 
        const findTime = data.match(scriptDateRegex);
        const previousTime = findTime && new Date(findTime.toString()).getDate();
            
            // Check if present and previously recorded date is equal or there is no date at all
            if(currentDate && currentDate.getDate() !== previousTime) {

                // If script.lock has current script name in it - replace its date
                if(data.match(regexMatch)) {

                    // Create new content for the file
                    const newContent: any = data.replace(scriptDateRegex, currentDate.toISOString());

                    // Replace previous file with new content 
                    fs.writeFileSync(scriptLockPath, newContent);

                } else {

                    // Create new content for the file with current script name included
                    const newContent: any = data.concat("\n" + name + ":" + currentDate.toISOString() + "\n");
                    
                    // Replace previous file with new content 
                    fs.writeFileSync(scriptLockPath, newContent);

                }


                console.log(name + "Build date has been updated...");

                // Run current script name script 
                downloadFunction();

            } else {

                // Inform user that script has been already initiated in today's build
                console.log(name + "script has been already initiated today.");
                console.log("-----------------------------------------------------");
            }
    });
}