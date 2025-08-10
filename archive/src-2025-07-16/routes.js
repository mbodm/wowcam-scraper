import { ServerResponse, IncomingMessage } from 'node:http';
import { createUrl } from './helper.js';
import { parseSite } from './browser.js';
import { createObject } from './curse.js';
import { getFinalDownloadUrlAfterAllRedirects } from './redirects.js';

/**
 * @param {ServerResponse<IncomingMessage>} response
 */
export function sayHello(response) {
    response.setHeader('Content-Type', 'text/plain');
    response.statusCode = 200;
    response.end('hello');
}

/**
 * @param {IncomingMessage} request
 * @param {ServerResponse<IncomingMessage>} response
 */
export async function scrapeCurse(request, response) {
    const url = createUrl('http', request.headers.host, request.url);
    const addonParam = url.searchParams.get('addon');
    if (!addonParam) {
        return sendError(response, 400, 'Missing "addon" query parameter in request URL.');
    }
    const parseStep = await parseSite(addonParam.toLocaleLowerCase());
    if (!parseStep.success) {
        const code = parseStep.error.includes('page does not exist') ? 400 : 500;
        return sendError(response, code, parseStep.error);
    }
    const curseJson = parseStep.result;
    const pureParam = url.searchParams.get('pure');
    if (pureParam && pureParam.toLowerCase() === 'true') {
        return sendSuccess(response, curseJson);
    }
    const scrapeStep = createObject(curseJson);
    if (!scrapeStep.success) {
        return sendError(request, 500, scrapeStep.error);
    }
    const downloadUrl = scrapeStep.result.downloadUrl;
    if (downloadUrl) {
        const realDownloadUrl = await getFinalDownloadUrlAfterAllRedirects(downloadUrl);
        scrapeStep.result.downloadUrlAfterAllRedirects = realDownloadUrl;
    }
    return sendSuccess(response, scrapeStep.result);
}

/**
 * @param {ServerResponse<IncomingMessage>} response
 * @param {any} result
 */
function sendSuccess(response, result) {
    const content = { success: true, result, error: '', status: createPrettyStatus(200) };
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(content, null, 4));
};

/**
 * @param {ServerResponse<IncomingMessage>} response
 * @param {number} status
 * @param {string} error
 */
function sendError(response, status, error) {
    const content = { success: false, result: null, error, status: createPrettyStatus(status) };
    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(content, null, 4));
};

/**
 * @param {number} status
 * @returns {string}
 */
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