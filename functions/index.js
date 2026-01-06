const {setGlobalOptions} = require("firebase-functions");
const {onCall} = require("firebase-functions/v2/https");
const {JSDOM} = require("jsdom");
const logger = require("firebase-functions/logger");

setGlobalOptions({ maxInstances: 10 });

exports.extractMetadata = onCall(async (request) => {
  const { url } = request.data;
  
  if (!url) {
    throw new Error("URL is required");
  }

  try {
    // Validate URL
    new URL(url);
  } catch (error) {
    throw new Error("Invalid URL provided");
  }

  try {
    logger.info(`Extracting metadata for URL: ${url}`);
    
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; URL-Cards-Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract title
    let title = document.querySelector('meta[property="og:title"]')?.content?.trim() ||
                document.querySelector('meta[name="twitter:title"]')?.content?.trim() ||
                document.querySelector('title')?.textContent?.trim() ||
                new URL(url).hostname;

    // Extract description
    let description = document.querySelector('meta[property="og:description"]')?.content?.trim() ||
                     document.querySelector('meta[name="twitter:description"]')?.content?.trim() ||
                     document.querySelector('meta[name="description"]')?.content?.trim() ||
                     'No description available';

    // Clean up and limit length
    title = title.substring(0, 200);
    description = description.substring(0, 500);

    logger.info(`Successfully extracted metadata: title="${title}", description="${description}"`);

    return {
      title,
      description,
      url
    };

  } catch (error) {
    logger.error(`Error extracting metadata for ${url}:`, error);
    
    // Return fallback data
    return {
      title: new URL(url).hostname,
      description: 'Could not extract description - click to edit',
      url,
      error: error.message
    };
  }
});
