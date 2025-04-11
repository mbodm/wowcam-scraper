import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { getFaviconFilePath } from './helper.js';
import { parseSite } from './browser.js';

export function run() {
    const server = createServer(async (req, res) => {
        if (req.url === '/') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end('hello');
        }
        else if (req.url === '/favicon.ico') {
            try {
                const buffer = await readFile(getFaviconFilePath());
                res.statusCode = 200;
                res.end(buffer);
            } catch (e) {
                if (e.code == 'ENOENT') {
                    res.statusCode = 404;
                    res.end();
                }
                else {
                    console.log(e);
                    res.statusCode = 500;
                    res.end();
                }
            }
        }
        else if (req.url.startsWith('/run')) {
            extendResponse(res);
            const host = req.headers.host.trimEnd('/');
            const path = req.url.trimEnd('/');
            const url = new URL(`http://${host}${path}`);
            const addon = url.searchParams.get('addon');
            if (!addon) {
                return res.errorResponse(400, 'Missing "addon" query parameter in request URL.');
            }
            const parseSiteResult = await parseSite(addon);
            if (!parseSiteResult.success) {
                if (parseSiteResult.error.includes('page does not exist')) {
                    return res.errorResponse(400, parseSiteResult.error);
                }
                return res.errorResponse(500, parseSiteResult.error);
            }
            return res.successResponse(parseSiteResult.result);
        }
        else {
            sendResponse(res, 404);
        }
    });
    server.listen(3000, '127.0.0.1');
}

function extendResponse(res) {
    res.successResponse = function (result) {
        sendResponse(this, 200, { success: true, result, error: '', status: createPrettyStatus(200) });
    };
    res.errorResponse = function (status, error) {
        sendResponse(this, status, { success: false, result: null, error, status: createPrettyStatus(status) });
    };
}

function sendResponse(res, status, content) {
    res.statusCode = status;
    if (content) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(content, null, 4));
    }
    else {
        res.end();
    }
}

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