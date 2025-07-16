/**
 * This functions follows all redirects of the scraped Curse addon download URL and returns the final "real" zip file download URL
 * @param {string} scrapedDownloadUrl 
 * @returns {Promise<string>}
 */
export async function getFinalDownloadUrlAfterAllRedirects(scrapedDownloadUrl) {
    try {
        const response = await fetch(scrapedDownloadUrl);
        return response.url;
    } catch (err) {
        console.log(err);
        return 'Error: Could not fetch the final download URL (after all redirects).';
    }
}