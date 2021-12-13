import fetch from 'node-fetch';
import path from "path"
import * as fs from 'fs';

const repoRawBaseUrl: string = 'https://raw.githubusercontent.com/cardano-foundation/CIPs/master/';
const repoBaseUrl = 'https://github.com/cardano-foundation/CIPs/tree/master'
const readmeUrl: string = '/README.md';
const readmeRegex = /\.\/CIP.*?\//gm;
const cipRegex = /\]\(.*?.png\)|\]\(.*?.jpg\)|\]\(.*?.jpeg\)/gm;
const cipDocsPath = "./docs/governance/cardano-improvement-proposals";
const cipStaticResourcePath = "/static/img/cip/";
const dirPath = path.resolve(path.dirname(''))

const getStringContentAsync = async (url: string) => {
    return await fetch(url).then(res => res.text());
}

const getBufferContentAsync = async (url: string) => {
    return await fetch(url).then(res => res.arrayBuffer());
}

// Download markdown resources
const processCIPContentAsync = async (cipName: string, content: string) => {

    const cipResources = content.match(cipRegex);
    if (cipResources) {
        await Promise.all(cipResources.map(async r => {
            if (r.indexOf("http://") < 0 && r.indexOf("https://") < 0) {
                // create filenames to download into static folder
                const fileName = r
                    .replace("](", "")
                    .replace(".png)", ".png")
                    .replace(".jpg)", ".jpg")
                    .replace(".jpeg)", ".jpeg");


                const buffer = await getBufferContentAsync(`${repoRawBaseUrl}${cipName}/${fileName}`);

                // fs.rmdirSync(`${cipStaticResourcePath}${cipName}`, { recursive: true });
                fs.mkdirSync(`.${cipStaticResourcePath}${cipName}`, { recursive: true });

                fs.writeFileSync(`.${cipStaticResourcePath}${cipName}/${fileName}`, new Uint8Array(buffer));

                // Rewrite link to static folder
                content = content.replace(fileName, `../../..${cipStaticResourcePath}${cipName}/${fileName}`);
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
    content = content.replace(/(<([^>]+)>)/ig, "");

    // Rewrite relative links like [Byron](./Byron.md) to absolute links. 
    content = content.replace(/\]\(\.\//gm, "](" + repoRawBaseUrl + cipName + "/");

    // Remove invalid "CIP-YET-TO-COME" links that are empty 
    content = content.replace(/]\(\)/g, "]");

    // Remove unterminated string constant like in CIP 30
    content = content.replace(/\\/g, '');

    // Checking if file starts with 3 `---` && Removing it if it starts with `---`
    content = content.substring(0, 3) === '---' ? content.slice(3) : content

    // Adding sidebar_label tag to each document and stripping HTML
    content = '--- \nsidebar_label: ' + cipName + content

    // Finding title value
    const title = content.match(/(Title:).*(?=\nAuthors:)/g)
    
    // Finding CIP number value
    const cipNumber = content.match(/(CIP:).*(?=\nTitle:)/g)

    // Replacing sideBarLabel with a new value
    content =
        content.replace(/(sidebar_label:).*(?=\nCIP:)/g,
            `$1 (${cipNumber && cipNumber[0].substring(cipNumber[0].indexOf(' ') + 1)})${title && title[0].substring(title[0].indexOf(':') + 1)}`)

    // Changing Title to lowercase
    content = content.replace('Title: ', 'title: ')

    // Fixing parent links to CIPs 
    content =  content.replace(/]\(\..\/CIP/gm, '](./CIP') 

    // Fixing broken readme.md links
    content =  content.replace(/]\(\..\/README.md/gm, '](' + repoBaseUrl) 

    // Fixing parent folder links to other files (Needs to be changed, for now takes care only of CIP-17)
    content = content.replace("](CIP-0017.json)", "](" + repoBaseUrl + "/CIP-0017/CIP-0017.json)")
   
    // Stripping `\` symbol from headlines (Needs REGEX)
    content =  content.includes('####' && '###' && '##' && '#') ? content.replace(/\\/g, '') : content

    // Enforcing H2 headlines (Docusaurus doesn't like that)
    content =  content.includes('# Abstract') && !content.includes('## Abstract') ? content.replace('#', '##') : content


    return content;
}

const main = async () => {
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
        const cipName: string = cipUrl.substring(2, cipUrl.length - 1); // ./CIP-xxx/ --> CIP-xxx

        let content = await getStringContentAsync(cipUrl.replace("./", repoRawBaseUrl) + fileName);
        content = await processCIPContentAsync(cipName, content);

        // fs.mkdirSync(`${cipDocsPath}/${cipName}`, { recursive: true });

        fs.writeFileSync(`${cipDocsPath}/${cipName}.md`, content);
        console.log(`Downloaded to ${cipDocsPath}/${cipName}/${fileName}`);
    }));

    console.log("CIP Content Downloaded");
}

main();