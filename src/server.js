import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { getFaviconFilePath } from './helper.js';
import { parseSite } from './browser.js';
import { createCurseObject, validateCurseObject, createAddonObject } from './curse.js';

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
            const url = createUrlObject(req);
            const addon = url.searchParams.get('addon');
            if (!addon) {
                return errorResponse(res, 400, 'Missing "addon" query parameter in request URL.');
            }
            const result1 = await parseSite(addon.toLocaleLowerCase());
            if (!result1.success) {
                const code = result1.error.includes('page does not exist') ? 400 : 500;
                return errorResponse(res, code, result1.error);
            }
            const curseJson = result1.result;
            const pure = url.searchParams.get('pure');
            if (pure && pure.toLowerCase() === 'true') {
                return successResponse(res, curseJson);
            }
            const result2 = createCurseObject(curseJson);
            if (!result2.success) {
                return errorResponse(res, 500, result2.error);
            }
            const curseObject = result2.result;
            const result3 = validateCurseObject(curseObject);
            if (!result3.success) {
                return errorResponse(res, 500, result3.error);
            }
            const result4 = createAddonObject(curseObject);
            if (!result4.success) {
                return errorResponse(res, 500, result4.error);
            }
            const addonObject = result4.result;
            return successResponse(res, addonObject);
        }
        else {
            sendResponse(res, 404);
        }
    });
    server.listen(8000, '127.0.0.1');
}

function successResponse(req, result) {
    sendResponse(req, 200, { success: true, result, error: '', status: createPrettyStatus(200) });
};

function errorResponse(req, status, error) {
    sendResponse(req, status, { success: false, result: null, error, status: createPrettyStatus(status) });
};

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

function createUrlObject(req) {
    // See Node.js documentation -> https://nodejs.org/api/http.html#class-httpincomingmessage
    return new URL(`http://${process.env.HOST ?? 'localhost'}${req.url}`);
}