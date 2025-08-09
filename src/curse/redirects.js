/**
 * This functions follows all redirects of the scraped Curse addon download URL and returns the final "real" zip file download URL
 * @param {string} scrapedDownloadUrl
 * @param {object} scrapedSiteHeaders
 * @returns {Promise<string>}
 */
export async function getFinalDownloadUrl(scrapedDownloadUrl, scrapedSiteHeaders) {
    try {
        const headers = {
            'User-Agent': scrapedSiteHeaders.userAgent,
            'Cookie': scrapedSiteHeaders.cookies,
            'Referer': scrapedSiteHeaders.referer,
            'Origin': scrapedSiteHeaders.origin,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive'
        };
        const response = await fetch(scrapedDownloadUrl, { method: 'GET', headers });
        return response.url;
    } catch (err) {
        console.log(err);
        return 'Error: Could not fetch the final download URL (after all redirects).';
    }
}