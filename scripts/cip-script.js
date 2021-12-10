const fs = require('fs')
const path = require("path")
const axios = require('axios')

const gitBaseUrl = 'https://github.com/cardano-foundation/CIPs/tree/master'
const rawBaseUrl = 'https://raw.githubusercontent.com/cardano-foundation/CIPs/master'
const apiBaseUrl = "https://api.github.com/repos/cardano-foundation/CIPs/git/trees/master"
const cipDocsPath = "/docs/governance/cardano-improvement-proposals/"
const cipStaticPath = "/static/img/cip-images/"
const ___dirname = path.resolve(path.dirname(''))
const imageRegex = /\]\(.*?.png\)|\]\(.*?.jpg\)|\]\(.*?.jpeg\)/gm

// Array to store CIP folders 
let folders = []

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
            const content = await fetchFileContent(folder)
        })
    }).catch(error => {
        console.log(error)
    })
}

// Fetching README.md files in every CIP folder and downloading it locally
let fetchFileContent = async (fileName) => {
    try {

        const response = await axios.get(`${rawBaseUrl}/${fileName}/README.md`)

        // Checking if file starts with 3 `---` && Removing it if it starts with `---`
        const checkForMd = response.data.substring(0, 3) === '---' ? response.data.slice(3) : response.data

        // Stripping HTML && Splitting
        const stripHTML = checkForMd.replace(/<[^>]+>/g, '').split("\n")

        // Adding sidebar_label tag to each document and stripping HTML
        const sideBarLabelKey = "--- \nsidebar_label: " + fileName

        // Stripping `\` symbol from headlines 
        const cleanerStringResult =
            stripHTML.map(s => s.includes("####" && "###" && "##" && "#") ? s.replace(/\\/g, '') : s
                // Fixing parent links to CIPs
                && s.includes("](../") ? s.replace("../", "./") : s
            )
        // Rewritting relative URLs to absolute URLs 
        const fileRedirectStringResult =
            cleanerStringResult.map(s => s.includes("](./") ? s.replace("](./", "](" + gitBaseUrl + '/' + fileName + '/') : s                // Enforcing H2 headlines (Docusaurus doesn't like that)
                && s.includes("# Abstract") && !s.includes("## Abstract") ? s.replace("#", "##") : s
                    // Checking if absolute URLs are empty and removing them
                    && s.includes("]()") ? s.replace("]()", "]") : s
            ).join("\n")

        // Downloading files locally
        fs.writeFile(___dirname + cipDocsPath + fileName + ".md", sideBarLabelKey + fileRedirectStringResult, (err) => {
            if (err)
                console.log("Oops, there has been a problem with downloading " + fileName, err)
            else {
                console.log("File " + fileName + " has been added to " + cipDocsPath + fileName)
            }
        })

        // Identifying static images for CIPs
        const cipImageResources = fileRedirectStringResult.match(imageRegex)

        // Downloading Images for CIPs
        cipImageResources && cipImageResources.map(async s => {
            if (s.indexOf("http://") < 0 && s.indexOf("https://") < 0) {

                // Cleaning image names to fetch 
                const imageName = s
                    .replace("](", "")
                    .replace(".png)", ".png")
                    .replace(".jpg)", ".jpg")
                    .replace(".jpeg)", ".jpeg")

                // Fetchibg images 
                const imageResponse = await axios.get(`${rawBaseUrl}/${fileName}/${imageName}`, { responseType: 'arraybuffer' })

                // Creating CIP image folder && CIP image file
                fs.rmSync(___dirname + cipStaticPath + fileName, { recursive: true }),
                    fs.mkdirSync(___dirname + cipStaticPath + fileName, { recursive: true }),
                    fs.writeFileSync(___dirname + cipStaticPath + fileName + "/" + imageName, imageResponse.data, (err) => {
                        if (err)
                            console.log("Oops, there has been a problem with downloading " + fileName, err)
                        else {
                            console.log("File " + fileName + " has been added to " + cipDocsPath + fileName)
                        }
                    })

                // Rewritting relative image URLs to absolute image URLs
                const MarkdownsWithImages =
                    fileRedirectStringResult.split("\n").map(
                        s => s.includes(imageName) ? s.replace("](", `](../../..${cipStaticPath}${fileName}/`) : s
                    ).join("\n")

                // Downloading files with images locally  
                fs.writeFile(___dirname + cipDocsPath + fileName + ".md", sideBarLabelKey + MarkdownsWithImages, (err) => {
                    if (err)
                        console.log("Oops, there has been a problem with downloading " + fileName, err)
                    else {
                        console.log("File " + fileName + " has been added to " + cipDocsPath + fileName)
                    }
                })
            }
        })
    }
    catch (error) {
        console.log(error, "oops, there is an error")
    }
}

//Calling script
let main = async () => {
    console.log("CIP Content Downloading...")
    const data = await fetchFolderNames()
}

main()
