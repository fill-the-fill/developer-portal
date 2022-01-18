import fetch from 'node-fetch';
import * as fs from 'fs';

const repoBaseUrl: string = 'https://github.com/cardano-foundation/CIPs/tree/master/';
const repoRawBaseUrl: string = 'https://raw.githubusercontent.com/cardano-foundation/CIPs/master/';
const readmeUrl: string = '/README.md';
const readmeRegex = /\.\/CIP.*?\//gm;
const cipRegex = /\]\(.*?.png\)|\]\(.*?.jpg\)|\]\(.*?.jpeg\)|\]\(.*?.json\)/gm;
const cipDocsPath: string = "./docs/governance/cardano-improvement-proposals";
const buildTimer: string = "./scripts/script.lock";
const cipStaticResourcePath: string = "/static/img/cip/";
const sourceRepo: string = "cardano-foundatios/CIPs";
const currentDate = new Date();

const getStringContentAsync = async (url: string) => {
    return await fetch(url).then(res => res.text());
}

const getBufferContentAsync = async(url: string) => { 
    return await fetch(url).then(res => res.arrayBuffer());
}

// Download markdown resources
const processCIPContentAsync = async (cipName: string, content: string) => {

    const cipResources = content.match(cipRegex);
    if(cipResources) {
        await Promise.all(cipResources.map(async r => { 
            if(r.indexOf("http://") < 0 && r.indexOf("https://") < 0)
            {
                // create filenames to download into static folder
                const fileName = r
                    .replace("](", "")
                    .replace(".png)",".png")
                    .replace(".jpg)",".jpg")
                    .replace(".jpeg)",".jpeg")
                    .replace(".json)",".json");

                // create modified filenames in case we want to store files 
                // with a different ending, like JSON files
                const modifiedFileName = r
                    .replace("](", "")
                    .replace(".png)",".png")
                    .replace(".jpg)",".jpg")
                    .replace(".jpeg)",".jpeg")
                    .replace(".json)",".txt");
                
                const buffer = await getBufferContentAsync(`${repoRawBaseUrl}${cipName}/${fileName}`);

                fs.rmdirSync(`.${cipStaticResourcePath}${cipName}`, { recursive: true });
                fs.mkdirSync(`.${cipStaticResourcePath}${cipName}`, { recursive: true });

                fs.writeFileSync(`.${cipStaticResourcePath}${cipName}/${modifiedFileName}`, new Uint8Array(buffer));

                // Rewrite link to static folder
                content = content.replace(fileName, `../../..${cipStaticResourcePath}${cipName}/${modifiedFileName}`);
                console.log(`Processed CIP content downloaded to .${cipStaticResourcePath}${cipName}/${fileName}`);
            }
        }));
    }

    // Ensure compatibility
    content = stringManipulation(content, cipName);

    return content;
}

// String manipulations to ensure compatibility
const stringManipulation = (content: string, cipName: string) => {

    // We expect markdown files, therefore strip HTML
    content = content.replace( /(<([^>]+)>)/ig, "");

    // Rewrite relative links like [Byron](./Byron.md) to absolute links. 
    content = content.replace( /\]\(\.\//gm, "](" + repoRawBaseUrl + cipName + "/");

    // Fix parent links to CIPs 
    content =  content.replace(/]\(\..\/CIP-/gm, '](./CIP-') 

    // Remove invalid "CIP-YET-TO-COME" links that are empty
    content = content.replace("]()", "]");

    // Remove unterminated string constant like in CIP 30
    content = content.replace(/\\/g, '');

    // Prevent H1 headlines 
    content = preventH1Headline(content, "Abstract");
    content = preventH1Headline(content, "Motivation");
    content = preventH1Headline(content, "Specification");
    content = preventH1Headline(content, "Rationale");
    content = preventH1Headline(content, "Copyright");

    // Inject Docusaurus doc tags for title and a nice sidebar
    content = injectDocusaurusDocTags(content);

    // Inject CIP Info to make clear this is auto generated
    content = injectCIPInformation(content, cipName);

    return content;
}

// Prevent H1 headlines
const preventH1Headline = (content: string, headline: string) => {
    return content.includes("# "+headline) && !content.includes("## "+headline) ? content.replace("# "+headline, "## "+headline) : content;
}

// Add Docusaurus doc tags
const injectDocusaurusDocTags = (content: string) => {

    // Parse information from markdown file
    const title = getDocTag(content, "Title");
    const cipNumber = getDocTag(content, "CIP");

    // Remove "---" from doc to add it later
    content = content.substring(0, 3) === "---" ? content.slice(3) : content;

    // Add "---" with doc tags for Docusaurus
    content = "--- \nsidebar_label: " + "("+cipNumber+") " + title+"\ntitle: "+title+"\n"+content;

    return content;
}

// Add CIP Info
const injectCIPInformation = (content: string, cipName: string) => {

    // Parse information from markdown file
    const status = getDocTag(content, "Status");
    const type = getDocTag(content, "Type");
    const creationDate = getDocTag(content, "Created");

    // Add to the end
    return content + "  \n## CIP Information  \nThis ["+type+"](CIP-0001#cip-format-and-structure) "+cipName+" created on **"+creationDate+"** has the status: ["+status+"](CIP-0001#cip-workflow).  \nThis page was generated automatically from: ["+sourceRepo+"]("+repoBaseUrl + cipName + readmeUrl+").";
}

// Get a specific doc tag
const getDocTag = (content: string, tagName: string) => {
    return content.match(new RegExp(`(?<=${tagName}: ).*`, ''));
}

const cipDownload = async () => {

    console.log("CIP Content Downloading...");

    // Use https://raw.githubusercontent.com/cardano-foundation/CIPs/master/README.md as entry point to get URLs
    const readmeContent = await getStringContentAsync(`${repoRawBaseUrl}${readmeUrl}`);
    const cipUrls = readmeContent.match(readmeRegex);
    const cipUrlsUnique = [...new Set(cipUrls)];

    fs.rmdirSync(cipDocsPath, { recursive: true });
    fs.mkdirSync(cipDocsPath, { recursive: true });

    // Save CIP Readme into docs
    await Promise.all(cipUrlsUnique.map(async (cipUrl) => {

        const fileName: string = "README.md"; 
        const cipName: string = cipUrl.substring(2, cipUrl.length-1); // ./CIP-xxx/ --> CIP-xxx

        let content = await getStringContentAsync(cipUrl.replace("./", repoRawBaseUrl)+ fileName);
        content = await processCIPContentAsync(cipName, content);

        fs.writeFileSync(`${cipDocsPath}/${cipName}.md`, content);
        console.log(`Downloaded to ${cipDocsPath}/${cipName}.md`);
    }));

    console.log("CIP Content Downloaded");
    console.log("-----------------------------------------------------");
}

const main = async () => {

    console.log("Checking previous CIP build date...");

    // Check content of previously recorded date
    // This is being done in order to make sure the script to fetch CIPs runs only once a day
    fs.readFile(buildTimer, "utf8", (err, data) => {

        // Find previously recorded date 
        const findTime = data.match(/(?<=CIP\:)(.*?)(?=\sRUST)/g);
        const previousTime = findTime && new Date(findTime.toString()).getDate();

        // Check if present and previously recorded date is equal
        if(currentDate.getDate() !== previousTime) {

            // Create new content for the file
            const newContent: any = previousTime && data.replace(findTime[0], currentDate.toISOString());

            // Replace previous file with new content 
            fs.writeFileSync(buildTimer, newContent);

            console.log("CIP Build date has been updated...");

            // Run CIP script 
            cipDownload();

        } else {

            // Inform user that script has been already initiated in todays build
            console.log("CIP script has been already initiated today.");
            console.log("-----------------------------------------------------");
        }
    });

}

main();