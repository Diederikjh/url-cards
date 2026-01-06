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

    // Extract image
    let imageUrl = document.querySelector('meta[property="og:image"]')?.content?.trim() ||
                   document.querySelector('meta[name="twitter:image"]')?.content?.trim() ||
                   document.querySelector('meta[name="twitter:image:src"]')?.content?.trim();
    
    // If no meta image, try to find the first large image in the content
    if (!imageUrl) {
      const images = document.querySelectorAll('img');
      for (const img of images) {
        const src = img.src || img.getAttribute('data-src');
        if (src && !src.includes('logo') && !src.includes('icon')) {
          // Try to avoid logos and small icons
          const width = parseInt(img.width) || parseInt(img.getAttribute('width')) || 0;
          const height = parseInt(img.height) || parseInt(img.getAttribute('height')) || 0;
          if (width >= 200 || height >= 200) {
            imageUrl = src;
            break;
          }
        }
      }
    }

    // Convert relative URLs to absolute URLs
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url);
      if (imageUrl.startsWith('//')) {
        imageUrl = baseUrl.protocol + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        imageUrl = baseUrl.origin + imageUrl;
      } else {
        imageUrl = new URL(imageUrl, baseUrl).href;
      }
    }

    // Clean up and limit length
    title = title.substring(0, 200);
    description = description.substring(0, 500);

    logger.info(`Successfully extracted metadata: title="${title}", description="${description}", image="${imageUrl}"`);

    return {
      title,
      description,
      imageUrl,
      url
    };

  } catch (error) {
    logger.error(`Error extracting metadata for ${url}:`, error);
    
    // Return fallback data
    return {
      title: new URL(url).hostname,
      description: 'Could not extract description - click to edit',
      imageUrl: null,
      url,
      error: error.message
    };
  }
});
