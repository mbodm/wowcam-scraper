import { UpstreamError } from './error.js';

/**
 * This function follows all redirects of the scraped Curse addon download URL and returns the final "real" zip file download URL
 * @param {string} scrapedDownloadUrl
 * @param {object} scrapedSiteHeaders
 * @returns {Promise<string>}
 */
export async function getFinalDownloadUrl(scrapedDownloadUrl, scrapedSiteHeaders) {
    const headers = {
        'User-Agent': scrapedSiteHeaders.userAgent,
        'Cookie': scrapedSiteHeaders.cookiesString,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    };
    const response = await fetch(scrapedDownloadUrl, {
        method: 'GET',
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
        throw new UpstreamError(`Redirects: Received error response while following Curse redirects (HTTP ${response.status}).`);
    }
    return response.url;
}