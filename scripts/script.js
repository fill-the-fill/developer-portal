const axios = require('axios');
const fs = require('fs')
const path = require("path")

const repoBaseUrl = 'https://raw.githubusercontent.com/cardano-foundation/CIPs/master';
const repoApiUrl = "https://api.github.com/repos/cardano-foundation/CIPs/git/trees/master"
const cipDocsPath = "/docs/cardano-improvement-proposals/";
const ___dirname = path.resolve(path.dirname(''));
// const cipRegex = /\]\(.*?.png\)|\]\(.*?.jpg\)|\]\(.*?.jpeg\)/gm;

//Array to store CIP folders 
let folders = [];

//Fetching CIP folder names, then fetching README raw files
let fetchFolderNames = async () => {
    axios.get(repoApiUrl).then(response => {
        let cipFolderNames = []
        response.data.tree.map((e) => {
            if (e.path.startsWith("CIP")) {
                cipFolderNames.push(e.path)
            }
        })
        folders.splice(0, folders.length, ...cipFolderNames)
        folders.forEach(async (folder) => {
            const content = await fetchFileContent(folder);
        });
    }).catch(error => {
        console.log(error)
    })
}

//Fetching README.md files in every CIP folder, using some regex to clear unused information
let fetchFileContent = async (folder) => {
    try {
        const response = await axios.get(`${repoBaseUrl}` + "/" + `${folder}` + "/README.md");
        let rawFile = response.data
            .replace("](", "")
            .replace(".png)", ".png")
            .replace(".jpg)", ".jpg")
            .replace(".jpeg)", ".jpeg")

        fs.writeFile(___dirname + cipDocsPath + `${folder}` + ".md", rawFile, (err) => {
            if (err)
                console.log(err, "CHECK FOR ERROR");
            else {
                console.log("File written successfully\n");
                console.log("The written has the following contents:");
            }
        });
    }
    catch (error) {
        console.log(error, "oops, there is an error")
    }
}

//Calling script
let main = async () => {
    const data = await fetchFolderNames();
}

main();
