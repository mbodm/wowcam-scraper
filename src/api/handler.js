import { ServerResponse, IncomingMessage } from 'node:http';
import { scrapeSite } from '../curse/puppeteer.js';
import { evalSiteJson } from '../curse/eval.js';
import { getFinalDownloadUrlAfterAllRedirects } from '../curse/redirects.js';

/**
 * This function is a HTTP handler used for the '/' endpoint
 * @param {IncomingMessage} req
 * @param {ServerResponse<IncomingMessage>} res
 */
export function root(req, res) {
    if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 200;
        res.end('hello');
        return;
    }
    methodNotAllowed(res);
}

/**
 * This function is a HTTP handler used for the '/scrape' endpoint
 * @param {IncomingMessage} req
 * @param {ServerResponse<IncomingMessage>} res
 */
export async function scrape(req, res) {
    if (req.method === 'GET') {
        const proto = req.headers['x-forwarded-proto'] ?? 'http';
        const url = new URL(req.url, `${proto}://${req.headers.host}`);
        const addonParam = url.searchParams.get('addon');
        if (!addonParam) {
            return error(res, 400, 'Missing "addon" query parameter in request URL.');
        }
        const parseStep = await scrapeSite(addonParam.toLocaleLowerCase());
        if (!parseStep.success) {
            const code = parseStep.error.includes('page does not exist') ? 400 : 500;
            return error(res, code, parseStep.error);
        }
        const siteJson = parseStep.siteJson;
        const pureParam = url.searchParams.get('pure');
        if (pureParam && pureParam.toLowerCase() === 'true') {
            return success(res, siteJson);
        }
        const scrapeStep = evalSiteJson(siteJson);
        if (!scrapeStep.success) {
            return error(req, 500, scrapeStep.error);
        }
        const downloadUrl = scrapeStep.downloadUrl;
        if (downloadUrl) {
            const realDownloadUrl = await getFinalDownloadUrlAfterAllRedirects(downloadUrl);
            scrapeStep.result.downloadUrlAfterAllRedirects = realDownloadUrl;
        }
        return success(res, scrapeStep.result);
    }
    methodNotAllowed(res);
}

function success(res, result) {
    const content = { success: true, result, error: '', status: createPrettyStatus(200) };
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(content, null, 4));
};

function error(res, status, error) {
    const content = { success: false, result: null, error, status: createPrettyStatus(status) };
    res.statusCode = status;
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

function methodNotAllowed(res) {
    res.writeHead(405, { 'Content-Type': 'text/plain', 'Allow': 'GET' });
    res.end();
}