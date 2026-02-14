import { ServerResponse, IncomingMessage, STATUS_CODES } from 'node:http';
import { scrapeAddonSite } from '../curse/scrape.js';
import { extractDownloadUrl } from '../curse/eval.js';
import { getFinalDownloadUrl } from '../curse/redirects.js';

/**
 * This function handles the "/" endpoint
 * @param {ServerResponse<IncomingMessage>} res
 */
export function handleRootEndpoint(res) {
    res.writeHead(200).end('hello');
}

/**
 * This function handles the "/scrape" endpoint
 * @param {URL} url
 * @param {ServerResponse<IncomingMessage>} res
 */
export async function handleScrapeEndpoint(url, res) {
    const addonSlug = url.searchParams.get('addon')?.trim().toLowerCase();
    if (!addonSlug) {
        error(res, 400, 'Missing "addon" query parameter in request URL.');
        return;
    }
    if (!/^[a-z0-9-]+$/.test(addonSlug)) {
        error(res, 400, 'Invalid "addon" query parameter in request URL (format is not Curse addon-slug format).');
        return;
    }
    try {
        const scrapeResult = await scrapeAddonSite(addonSlug);
        const downloadUrl = extractDownloadUrl(scrapeResult.siteContent);
        const downloadUrlFinal = await getFinalDownloadUrl(downloadUrl, scrapeResult.siteHeaders);
        success(res, addonSlug, downloadUrlFinal);
    }
    catch (err) {
        if (err instanceof Error) {
            console.error('Error occurred in /scrape route handler.', err);
            error(res, 500, err.message);
        }
        else {
            const msg = 'Unknown error occurred in /scrape route handler.';
            console.error(msg);
            error(res, 500, msg);
        }
    }
}

const error = (res, status, errorMessage) =>
    sendJsonResponse(res, status, {
        errorMessage,
        statusInfo: createPrettyStatus(status)
    });

const success = (res, addonSlug, downloadUrl) =>
    sendJsonResponse(res, 200, {
        addonSlug,
        downloadUrl,
        statusInfo: createPrettyStatus(200)
    });

const sendJsonResponse = (res, status, content) =>
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
    }).end(JSON.stringify(content, null, 4));

const createPrettyStatus = (status) =>
    `HTTP ${status} (${STATUS_CODES[status] ?? 'Unknown'})`;
