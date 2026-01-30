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
        return success(res, { downloadUrlFinal })
    }
    catch (err) {
        return error(req, 500, err);
    }











    if (!scrapeStep.success) {
        const code = scrapeStep.error.includes('page does not exist') ? 400 : 500;
        return error(res, code, scrapeStep.error);
    }
    const siteJson = scrapeStep.siteJson;
    const pureParam = url.searchParams.get('pure');
    if (pureParam && pureParam.toLowerCase() === 'true') {
        return success(res, siteJson);
    }
    const evalStep = evalSiteJson(siteJson);
    if (!evalStep.success) {
        return error(req, 500, evalStep.error);
    }
    const downloadUrl = evalStep.downloadUrl;
    if (downloadUrl) {
        const siteHeaders = scrapeStep.siteHeaders;
        const realDownloadUrl = await getFinalDownloadUrl(downloadUrl, siteHeaders);
        evalStep.downloadUrlFinal = realDownloadUrl;
    }
    const result = createSuccessResult(evalStep);
    return success(res, result);
}

function error(res, status, msg) {
    const content = { success: false, result: null, error: msg, status: createPrettyStatus(status) };
    res.writeHead(status, 'Content-Type', 'application/json').end(JSON.stringify(content, null, 4));
};

function success(res, result) {
    const content = { success: true, result, error: '', status: createPrettyStatus(200) };
    res.writeHead(200, 'Content-Type', 'application/json').end(JSON.stringify(content, null, 4));
};

function createSuccessResult(evalStep) {
    const { success, error, ...objWithoutSuccessAndError } = evalStep;
    return objWithoutSuccessAndError;
}