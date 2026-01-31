import { ServerResponse, IncomingMessage } from 'node:http';
import { scrapeAddonSite } from '../curse/scrape.js';
import { extractDownloadUrl } from '../curse/eval.js';
import { getFinalDownloadUrl } from '../curse/redirects.js';
import { createPrettyStatus } from '../helper/http.js';

/**
 * This function is the handler for the "/" endpoint
 * @param {ServerResponse<IncomingMessage>} res
 */
export function handleRootEndpoint(res) {
    res.writeHead(200).end('hello');
}

/**
 * This function is the handler for the "/scrape" endpoint
 * @param {URL} url
 * @param {IncomingMessage} req
 * @param {ServerResponse<IncomingMessage>} res
 */
export async function handleScrapeEndpoint(url, req, res) {
    const addonParam = url.searchParams.get('addon');
    if (!addonParam) {
        error(res, 400, 'Missing "addon" query parameter in request URL.');
        return;
    }
    try {
        const scrapeResult = await scrapeAddonSite(addonParam.toLocaleLowerCase());
        const downloadUrl = extractDownloadUrl(scrapeResult.siteContent);
        const downloadUrlFinal = await getFinalDownloadUrl(downloadUrl, scrapeResult.siteHeaders);
        const result = {
            downloadUrlFinal
        };
        const content = {
            success: true,
            result,
            error: '',
            status: createPrettyStatus(200)
        };
        res.writeHead(200, 'Content-Type', 'application/json').end(JSON.stringify(content, null, 4));
    }
    catch (err) {
        error(req, 500, err);
    }
}

function error(res, status, msg) {
    const content = { success: false, result: null, error: msg, status: createPrettyStatus(status) };
    res.writeHead(status, 'Content-Type', 'application/json').end(JSON.stringify(content, null, 4));
};

function success(res, result) {
};
