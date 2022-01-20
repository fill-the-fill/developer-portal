import fetch from 'node-fetch';
import * as fs from 'fs';

const currentDate = new Date();
const scriptDateRegex = /(?<=RUST-LIBRARY\:)(.*?)(?=\s)/g;
const scriptLockPath: string = "./scripts/script.lock";
const rlStaticResourcePath: string = '/tree/master/doc/getting-started'
const repoBaseUrl: string = 'https://github.com/Emurgo/cardano-serialization-lib'
const rustLibraryDocsPath: string = './docs/get-started/cardano-serialization-lib';
const namesRawBaseIndexUrl: string = 'https://raw.githubusercontent.com/Emurgo/cardano-serialization-lib/master/doc/index.rst';
const repoRawBaseUrl: string = 'https://raw.githubusercontent.com/Emurgo/cardano-serialization-lib/master/doc/getting-started/';

const getStringContentAsync = async (url: string) => {
    return await fetch(url).then(res => res.text());
}

// String manipulations to ensure compatibility
const stringManipulation = (content: string, fileName: string) => {

    // Replace empty links
    content = content.replace( /\]\(\)/gm, ']');
    
    // Inject rust library additional info
    content = injectRLInformation(content, fileName);

    return content;
}

// Inject extra Docusarus doc tags
const injectDocusaurusDocTags = (content: string, fileName: string) => {
    
    // Replace '-' from url in order to create a clean sidebar label
    const modifiedFileName = fileName.replace(/[-]/gm, ' ')
    
    // Capitalize the first letter of each word
    let sidebarLabel = modifiedFileName.toLowerCase().replace(/(^\w{1})|(\s{1}\w{1})/g, match => match.toUpperCase());

    // Remove '---' from doc to add it later
    content = content.substring(0, 3) === '---' ? content.slice(3) : content;

    // Add '---' with doc tags for Docusaurus
    content = '--- \nsidebar_label: ' + sidebarLabel +'\ntitle: '+fileName + '\n'+sidebar_positionForFilename(fileName)+'--- ' + '\n'+content;

    return content;
}

// In case we want a specific sidebar_position for a certain filename (otherwise alphabetically)
// In the future it will be better to get this information from the index.rst file
const sidebar_positionForFilename = (fileName: string) => {
    // Overview was 1
    if (fileName === 'prerequisite-knowledge') return 'sidebar_position: 2\n';
    if (fileName === 'generating-keys') return 'sidebar_position: 3\n';
    if (fileName === 'generating-transactions') return 'sidebar_position: 4\n';
    if (fileName === 'transaction-metadata') return 'sidebar_position: 5\n';
    return ''; // empty string means alphabetically within the sidebar
}

// Filename manipulations to ensure compatibility
const fileNameManipulation = (fileName: string) => {

    // Modify filename for 'metadata' with 'transaction-metadata'
    fileName = fileName === 'metadata' ? 'transaction-metadata' : fileName

    return fileName;
}

// Add rust library Info
const injectRLInformation = (content: string, fileName: string) => {

    // Add to the end
    return content + '  \n## Serialization-Lib Information  \nThis page was generated automatically from: ['+repoBaseUrl+']('+repoBaseUrl + rlStaticResourcePath + '/' + fileName + '.md' + ').';
}

const rlDownload = async () => {
  console.log('Rust Library Content Downloading...')

  // Fetch markdown file names 
  const indexWithMarkDownNames = await getStringContentAsync(`${namesRawBaseIndexUrl}`);

  // Create array of markdown names to fetch raw files 
  const markDownNames = indexWithMarkDownNames.match(/(?<=getting-started\/)(.*?)(?=[\r\n]+)/g);
  const rustLibraryUniqueUrls = [...new Set(markDownNames)];

  // Save rust library markdowns into docs folder
  await Promise.all(rustLibraryUniqueUrls.map(async (fileName) => {

      // Download markdown files
      const result = await getStringContentAsync(`${repoRawBaseUrl}${fileName}.md`);

      // Remove invalid links that are empty
      const manipualtedContent = stringManipulation(result, fileName)
      
      // Finish manipulation with injecting Docusaurus doc tags
      const contentWithDocosaurusDocTags = injectDocusaurusDocTags(manipualtedContent, fileName);

      const manipulatedFileName = fileNameManipulation(fileName)

      // Create markdown files locally with downloaded content
      fs.writeFileSync(`${rustLibraryDocsPath}/${manipulatedFileName}.md`, contentWithDocosaurusDocTags);
      console.log(`Downloaded to ${rustLibraryDocsPath}/${fileName}.md`);

   }));

   console.log('Rust Library Content Downloaded') 
   console.log("-----------------------------------------------------");
}

// Check content of previously recorded date
// This is being done in order for script to fetch rust library content only once per day
const compareDate = () => {
    fs.readFile(scriptLockPath, "utf8", (err, data) => {

        // Find previously recorded date 
        const findTime = data.match(scriptDateRegex);
        const previousTime = findTime && new Date(findTime.toString()).getDate();
        
            // Check if present and previously recorded date is equal or there is no date at all
            if(currentDate && currentDate.getDate() !== previousTime) {
                // If script.lock has rust library in it - replace its date
                if(data.match(/RUST-LIBRARY/g)) {

                    // Create new content for the file
                    const newContent: any = data.replace(scriptDateRegex, currentDate.toISOString());

                    // Replace previous file with new content 
                    fs.writeFileSync(scriptLockPath, newContent);

                } else {

                    // Create new content for the file with rust library included
                    const newContent: any = data.concat("\n" + "RUST-LIBRARY:" + currentDate.toISOString() + "\n");
                    
                    // Replace previous file with new content 
                    fs.writeFileSync(scriptLockPath, newContent);
                }

                console.log("Rust Library Build date has been updated...");

                // Run rust library script 
                rlDownload();

            } else {

                // Inform user that script has been already initiated in today's build
                console.log("Rust Library script has been already initiated today.");
                console.log("-----------------------------------------------------");
            }
    });
}

const rustMain = async () => {

    console.log("Checking previous Rust Library build date...");

    compareDate()

}

export default rustMain