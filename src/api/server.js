import { createServer } from 'node:http';
import { root, scrape } from './routes.js';

/**
 * This function starts a Node.js HTTP server which exposes various API endpoints
 * @param {number} port 
 */
export function startServer(port) {
    const server = createServer(async (req, res) => {
        // Cap URL length to prevent buffer overflow attacks in general (regardless what we do later with URL content)
        if (req.url.length > 255) {
            res.setHeader('Content-Type', 'text/plain');
            res.statusCode = 400;
            res.end('URL is not allowed to exceed a limit of 255 characters');
            return;
        }
        // Routes
        const url = createUrl(req);
        switch (url.pathname) {
            case '/':
                req.method === 'GET' ? root(res) : methodNotAllowed(res);
                break;
            case '/scrape':
                req.method === 'GET' ? scrape(url, req, res) : methodNotAllowed(res);
                break;
            case '/favicon.ico':
                req.method === 'GET' ? handleFaviconRequest(res) : methodNotAllowed(res);
                break;
            default:
                routeNotFound(res, url);
                break;
        }
    });
    server.listen(port, '0.0.0.0');
    console.log(`Server started (http://localhost:${port})`);
}

function createUrl(req) {
    const proto = req.headers['x-forwarded-proto'] ?? 'http';
    const url = new URL(req.url, `${proto}://${req.headers.host}`);
    return url;
}

function methodNotAllowed(req, res) {
    console.log(`HTTP ${req.method} method not allowed for requested "${url.pathname}" path`);
    res.writeHead(405, { 'Content-Type': 'text/plain', 'Allow': 'GET' });
    res.end();
}

function handleFaviconRequest(res) {
    res.statusCode = 404;
    res.end();
}

function routeNotFound(res, url) {
    console.log(`No route handler implemented for requested "${url.pathname}" path`);
    res.statusCode = 404;
    res.end();
}