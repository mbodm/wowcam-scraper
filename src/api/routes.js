import { ServerResponse, IncomingMessage } from 'node:http';
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
    const addonParam = url.searchParams.get('addon');
    if (!addonParam) {
        error(res, 400, 'Missing "addon" query parameter in request URL.');
        return;
    }
    const addonSlug = addonParam.toLowerCase().trim();
    if (!/^[a-z0-9-]+$/i.test(addonSlug)) {
        error(res, 400, 'Invalid "addon" query parameter in request URL (format is not Curse addon-slug format).');
        return;
    }
    try {
        const scrapeResult = await scrapeAddonSite(addonSlug);
        const downloadUrl = extractDownloadUrl(scrapeResult.siteContent);
        const downloadUrlFinal = await getFinalDownloadUrl(downloadUrl, scrapeResult.siteHeaders);
        const result = {
            downloadUrlFinal
        };
        success(res, result);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error occurred.';
        error(res, 500, msg);
    }
}

function error(res, status, msg) {
    const content = {
        success: false,
        result: null,
        error: msg,
        status: createPrettyStatus(status)
    };
    res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(content, null, 4));

};

function success(res, result) {
    const content = {
        success: true,
        result,
        error: '',
        status: createPrettyStatus(200)
    };
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(content, null, 4));
}

function createPrettyStatus(statusCode) {
    switch (statusCode) {
        case 200:
            return 'HTTP 200 (OK)';
        case 400:
            return 'HTTP 400 (Bad Request)';
        case 500:
            return 'HTTP 500 (Internal Server Error)';
        default:
            return `HTTP ${statusCode}`;
    }
}