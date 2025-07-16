import fetch from 'node-fetch';

export async function getFinalDownloadUrlAfterAllRedirects(parsedDownloadUrl) {
    try {
        const response = await fetch(parsedDownloadUrl);
        const realDownloadUrl = response.url;
        return realDownloadUrl;
    }
    catch {
        return 'Error: Could not fetch the final download URL (after all redirects).';
    }
}