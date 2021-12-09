const fs = require('fs')
const path = require("path")
const axios = require('axios');

const gitBaseUrl = 'https://github.com/cardano-foundation/CIPs/tree/master'
const rawBaseUrl = 'https://raw.githubusercontent.com/cardano-foundation/CIPs/master';
const apiBaseUrl = "https://api.github.com/repos/cardano-foundation/CIPs/git/trees/master"
const cipDocsPath = "/docs/governance/cardano-improvement-proposals/";
const ___dirname = path.resolve(path.dirname(''));

// Array to store CIP folders 
let folders = [];

// Fetching CIP folder names, then fetching README raw files
let fetchFolderNames = async () => {
    // Fetching list of CIP folders 
    axios.get(apiBaseUrl).then(response => {
        let cipFolderNames = []
        response.data.tree.map((e) => {
            if (e.path.startsWith("CIP")) {
                cipFolderNames.push(e.path)
            }
        })
        folders.splice(0, folders.length, ...cipFolderNames)
        // Fetching README's and locally downloading data
        folders.forEach(async (folder) => {
            const content = await fetchFileContent(folder);
        });
    }).catch(error => {
        console.log(error)
    })
}

// Fetching README.md files in every CIP folder and downloading it locally
let fetchFileContent = async (fileName) => {
    try {
        const response = await axios.get(`${rawBaseUrl}` + "/" + `${fileName}` + "/README.md");
      
        // Stripping HTML && Removing first 3 `---` && Splitting
        const stripHTML = response.data.slice(3).replace(/<[^>]+>/g, '').split("\n");
        
        // Adding sidebar_label tag to each document and stripping HTML
        const sideBarLabelKey = "--- \nsidebar_label: " + fileName;

        // Stripping `\` symbol from headlines 
        const cleanerStringResult =
            stripHTML.map(s => s.includes("####" && "###" && "##" && "#") ? s.replace(/\\/g, '') : s
                // Fixing parent links to CIPs
                && s.includes("](../") ? s.replace("../", "./") : s
            );
        // Rewritting relative URLs to absolute URLs 
        const fileRedirectStringResult =
            cleanerStringResult.map(s => s.includes("](./") ? s.replace("](./", "./", gitBaseUrl + '/' + fileName + '/') : s
                // Enforcing H2 headlines (Docusaurus doesn't like that)
                && s.includes("# Abstract") && !s.includes("## Abstract") ? s.replace("#", "##") : s
            ).join("\n");

        // Downloading files locally
        fs.writeFile(___dirname + cipDocsPath + fileName + ".md", sideBarLabelKey + fileRedirectStringResult, (err) => {
            if (err)
                console("Oops, there has been a problem with downloading " + fileName)
            else {
                console.log("File " + fileName + " has been added to " + cipDocsPath + fileName);
            }
        });
        // TO DO: Downloading Images for CIPs
    }
    catch (error) {
        console.log(error, "oops, there is an error")
    }
}

//Calling script
let main = async () => {
    console.log("CIP Content Downloading...");
    const data = await fetchFolderNames();
}

main();
