import * as fs from "fs";
import * as path from "path";
import { getStringContentAsync, injectDocusaurusDocTags } from "./reusable";
import {
  TRDocsPath,
  TRUrl,
  TROverviewUrl,
  TRWiki,
  TRrepoRawWikiHomeUrl,
} from "./constants";

// Current pathname
const pathName = path.basename(__filename);

// Fetch and manipulate overview markdown file
const getOverviewMarkdown = async () => {
  // Fetch raw overview file
  const content = await getStringContentAsync(TROverviewUrl);

  // Modify content to ensure compatibility
  const modifiedContent = overviewStringManipulation(content);

  return modifiedContent;
};

// Manipulate URL string
const tokenRegistryStringManipulation = (content: string) => {
  // Encode symbols for url purpose
  content = encodeURIComponent(content);

  // Replace encoded %20 space with '-' (needs to be replaced in order to fetch data from the correct link)
  content = content.replace(/\%20/g, "-");

  // Replace '(' with '%28' for url purpose (is not included in URIComponent function)
  content = content.replace(/\(/g, "%28");

  // Replace ')' with '%29' for url purpose (is not included in URIComponent function)
  content = content.replace(/\)/g, "%29");

  return content;
};

// Manipulate markdown file name
const markdownStringManipulation = (content: string) => {
  // Encode symbols for url purpose
  content = encodeURIComponent(content);

  // Replace encoded %20 space with '-'
  content = content.replace(/\%20/g, "-");

  // Replace '?' with '%3F'
  content = content.replace(/\?/g, "%3F");

  // Replace '(' with ''
  content = content.replace(/\(/g, "");

  // Replace ')' with ''
  content = content.replace(/\)/g, "");

  // Remove '
  content = content.replace(/\'/g, "");

  return content;
};

// String manipulations to ensure compatibility
const stringManipulation = (content: string, fileName: string) => {
  // Remove `(` and `)` from relative links (temporariy not in use, using hardcoded solution for now)
  // content = content.replace(/(?<=\]\()(.*)(?=\))/g, (x) => x.replace(/[()]/g, ''));

  // Remove `(` and `)` from relative links (temporariy solution focusing on specific link, in the future needs to be changed to work through all of the links)
  content = content.replace(
    "How-to-prepare-an-entry-for-the-registry-(NA-policy-script)",
    "How-to-prepare-an-entry-for-the-registry-NA-policy-script"
  );

  content = injectTRnformation(content, fileName);

  return content;
};

// Inject extra docusaurus doc tags and manipulate overview markdown file content
const overviewStringManipulation = (content: string) => {
  // Extra content
  const extraContent =
    "--- \nid: cardano-token-registry \ntitle: Cardano Token Registry \nsidebar_label: Overview \ndescription: The Cardano Token Registry provides a means to register off-chain token metadata that can map to on-chain identifiers. \nimage: ../img/og-developer-portal.png \nsidebar_position: 1 \n--- \nThe [Cardano Token Registry](https://github.com/cardano-foundation/cardano-token-registry) provides a means to register off-chain token metadata to map to on-chain identifiers (typically hashes representing asset IDs, output locking scripts, or token forging policies).\n\n";

  // Add extra content
  content = extraContent + content;

  // Remove unused content
  content = content
    .replace("# cardano-token-registry", "")
    .split("## Step-by-Step")[0];

  // Replace relative links to absolute links.
  content = content.replace(
    /\bRegistry_Terms_of_Use.md\b/g,
    TRUrl + "Registry_Terms_of_Use.md"
  );
  content = content.replace(
    /\bAPI_Terms_of_Use.md\b/g,
    TRUrl + "API_Terms_of_Use.md"
  );
  content = content.replace(/\(\bmappings\b/g, "(" + TRUrl + "mappings");

  // Inject token registry link info
  content =
    content +
    "  \n## Token Registry Information  \nThis page was generated automatically from: [" +
    TRUrl +
    "](" +
    TRUrl +
    "/" +
    "README.md" +
    ").";

  return content;
};

// Add Token Registry Info
const injectTRnformation = (content: string, fileName: string) => {
  // Add to the end
  return (
    content +
    "  \n## Token Registry Information  \nThis page was generated automatically from: [" +
    TRWiki +
    "](" +
    TRWiki +
    "/" +
    fileName +
    ")."
  );
};

const main = async () => {
  console.log("Token Registry Content Downloading...");

  // Fetch raw wiki content for token registry
  const wikiHomeContent = await getStringContentAsync(
    `${TRrepoRawWikiHomeUrl}Home.md`
  );

  // Fetch raw overview content for token registry
  const overviewContent = await getOverviewMarkdown();

  // Find wiki file names in order to fetch them individually
  const contentUrls = wikiHomeContent.match(/(?<=\[\[)(.*?)(?=\]\])/g);
  const tokeRegistryUniqueUrls = [...new Set(contentUrls)];

  // Create token registry folder to store markdown files locally
  if (fs.existsSync(TRDocsPath)) {
    fs.rmdirSync(TRDocsPath, { recursive: true });
  }
  fs.mkdirSync(TRDocsPath, { recursive: true });

  // Create markdown overview file locally with downloaded content
  fs.writeFileSync(`${TRDocsPath}/Overview.md`, overviewContent);

  // Save token registry markdown files into docs folder
  await Promise.all(
    tokeRegistryUniqueUrls.map(async (trUrl) => {
      // Get token registry url
      const tokenRegistryUrl = await tokenRegistryStringManipulation(trUrl);

      // Get markdown file names
      const markdownFileName = await markdownStringManipulation(trUrl);

      // Download markdown files
      const content = await getStringContentAsync(
        `${TRrepoRawWikiHomeUrl}${tokenRegistryUrl}.md`
      );

      // Manipulate content to ensure compatibility
      const manipulatedContent = await stringManipulation(
        content,
        tokenRegistryUrl
      );

      // Finish manipulation with injecting docosautus doc tags
      const manipulatedContentWithDocTags = injectDocusaurusDocTags(
        manipulatedContent,
        trUrl,
        "",
        pathName
      );

      // Create markdown files locally with downloaded content
      fs.writeFileSync(
        `${TRDocsPath}/${markdownFileName}.md`,
        manipulatedContentWithDocTags
      );
      console.log(`Downloaded to ${TRDocsPath}/${markdownFileName}.md`);
    })
  );

  console.log("Token Registry Content Downloaded");
};

main();
