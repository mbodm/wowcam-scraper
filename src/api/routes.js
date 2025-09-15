import { ServerResponse, IncomingMessage } from 'node:http';
import { scrapeAddonSite } from '../curse/scrape.js';
import { evalSiteJson } from '../curse/eval.js';
import { getFinalDownloadUrl } from '../curse/redirects.js';

/**
 * This function is the HTTP handler for the "/" endpoint
 * @param {ServerResponse<IncomingMessage>} res
 */
export function root(res) {
    res.setHeader('Content-Type', 'text/plain');
    res.statusCode = 200;
    res.end('hello');
}

/**
 * This function is the HTTP handler for the "/scrape" endpoint
 * @param {URL} url
 * @param {IncomingMessage} req
 * @param {ServerResponse<IncomingMessage>} res
 */
export async function scrape(url, req, res) {
    const addonParam = url.searchParams.get('addon');
    if (!addonParam) {
        return error(res, 400, 'Missing "addon" query parameter in request URL.');
    }
    const scrapeStep = await scrapeAddonSite(addonParam.toLocaleLowerCase());
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
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(content, null, 4));
};

function success(res, result) {
    const content = { success: true, result, error: '', status: createPrettyStatus(200) };
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(content, null, 4));
};

function createPrettyStatus(status) {
    switch (status) {
        case 200:
            return 'HTTP 200 (OK)';
        case 400:
            return 'HTTP 400 (Bad Request)';
        case 500:
            return 'HTTP 500 (Internal Server Error)';
        default:
            return 'UNKNOWN';
    }
}

function createSuccessResult(evalStep) {
    const { success, error, ...objWithoutSuccessAndError } = evalStep;
    return objWithoutSuccessAndError;
}