const fs = require('fs')
const path = require("path")
const axios = require('axios');

const gitBaseUrl = 'https://github.com/cardano-foundation/CIPs/tree/master'
const rawBaseUrl = 'https://raw.githubusercontent.com/cardano-foundation/CIPs/master';
const apiBaseUrl = "https://api.github.com/repos/cardano-foundation/CIPs/git/trees/master"
const cipDocsPath = "/docs/governance/cardano-improvement-proposals/";
const ___dirname = path.resolve(path.dirname(''));

//Array to store CIP folders 
let folders = [];

//Fetching CIP folder names, then fetching README raw files
let fetchFolderNames = async () => {
    //Fetching list of CIP folders 
    axios.get(apiBaseUrl).then(response => {
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
        const response = await axios.get(`${rawBaseUrl}` + "/" + `${fileName}` + "/README.md");

        //Cleaning image files
        const rawFile = response.data
            .replace("](", "")
            .replace(".png)", ".png")
            .replace(".jpg)", ".jpg")
            .replace(".jpeg)", ".jpeg")

        //Stripping HTML 
        const stripHTML = rawFile.slice(3).replace(/<[^>]+>/g, '')

        //Adding sidebar_label tag to each document and stripping HTML
        const sideBarLabelValue = fileName === "CIP-0001" ? "Overview" : fileName
        const sideBarLabelKey = "--- \nsidebar_label: " + sideBarLabelValue

        //Some of the files contain symbol that hasn't been removed by stripHTML, I'm using extra fucntiont to clean the result
        const cleanerTextResult = stripHTML.split("\n")
            .map(s => s.includes("###" && "##" && "#") ? s.replace(/\\/g, '') : s && s.includes("](../") ? s.replace("../", "./") : s
            )
            .join("\n");

        const overCleanResult = cleanerTextResult.split("\n")
            .map(s => s.includes("](./") ? s.replace("./", gitBaseUrl + '/' + fileName + '/') : s)
            .join("\n");

        //Downloading files locally
        fs.writeFile(___dirname + cipDocsPath + fileName + ".md", sideBarLabelKey + overCleanResult, (err) => {
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
