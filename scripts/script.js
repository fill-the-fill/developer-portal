const axios = require('axios');
const fs = require('fs')
const path = require("path")

const repoBaseUrl = 'https://raw.githubusercontent.com/cardano-foundation/CIPs/master';
const repoApiUrl = "https://api.github.com/repos/cardano-foundation/CIPs/git/trees/master"
const cipDocsPath = "/docs/governance/cardano-improvement-proposals/";
const ___dirname = path.resolve(path.dirname(''));
// const cipRegex = /\]\(.*?.png\)|\]\(.*?.jpg\)|\]\(.*?.jpeg\)/gm;

//Array to store CIP folders 
let folders = [];

//Fetching CIP folder names, then fetching README raw files
let fetchFolderNames = async () => {
    //Fetching list of CIP folders 
    axios.get(repoApiUrl).then(response => {
        let cipFolderNames = []
        response.data.tree.map((e) => {
            if (e.path.startsWith("CIP")) {
                cipFolderNames.push(e.path)
            }
        })
        folders.splice(0, folders.length, ...cipFolderNames)
        //Fetching readmes and locally downloading data
        folders.forEach(async (folder) => {
            const content = await fetchFileContent(folder);
        });
    }).catch(error => {
        console.log(error)
    })
}

//Fetching README.md files in every CIP folder and downloading it locally
let fetchFileContent = async (fileName) => {
    try {
        const response = await axios.get(`${repoBaseUrl}` + "/" + `${fileName}` + "/README.md");
        const rawFile = response.data
            .replace("](", "")
            .replace(".png)", ".png")
            .replace(".jpg)", ".jpg")
            .replace(".jpeg)", ".jpeg")

        //Adding sidebar_label tag to each document
        const sideBarLabel = "--- \nsidebar_label: " + `${fileName}`

        fs.writeFile(___dirname + cipDocsPath + `${fileName}` + ".md",  sideBarLabel + rawFile.slice(3), (err) => {
            if (err)
                console("Oops, there has been a problem with downloading " + fileName)
            else {
                console.log("File " + fileName + " has been added to " + cipDocsPath + fileName);
            }
        });
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
