import { Server, createServer } from 'node:http';
import { handleRootEndpoint, handleScrapeEndpoint } from './routes.js';

/**
 * This function starts a Node.js HTTP server which exposes some API endpoints
 * @param {number} port The port the server is listening on
 * @returns {Server<IncomingMessage, ServerResponse>} The server instance
 */
export function startServer(port) {
    const server = createServer(async (req, res) => {
        // URL (for pathname and query params)
        const url = createUrlClassInstance(req);
        if (!url) {
            res.writeHead(400).end('Error: Invalid request URL (check logs for details).');
            return;
        }
        // Methods (only allow GET requests)
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Allow': 'GET' }).end('Error: HTTP method not allowed.');
            return;
        }
        // Routes (call appropriate handler)
        switch (url.pathname) {
            case '/':
                handleRootEndpoint(res);
                break;
            case '/scrape':
                await handleScrapeEndpoint(url, res);
                break;
            default:
                // Matches '/favicon.ico' route too
                res.writeHead(404).end();
                break;
        }
    });
    server.listen(port, '0.0.0.0');
    console.log(`Server started (reachable at http://localhost:${port})`);
    return server;
}

function createUrlClassInstance(req) {
    try {
        // A malformed request (proxy, gateway, etc.) could result in an empty .url property
        if (typeof req.url !== 'string' || req.url.length === 0) {
            throw new Error('The request URL was not provided.');
        }
        // Cap URL length to prevent buffer overflow attacks in general (regardless of what we do later with URL content)
        if (req.url.length > 255) {
            throw new Error('The provided request URL must not exceed a limit of 255 characters.');
        }
        // Use fixed/defined base URL (using `${proto}://${req.headers.host}` is dangerous because of host-header-injection attacks)
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error('Missing "BASE_URL" environment variable.');
        }
        // Create URL class instance (for easy access to pathname and query params)
        return new URL(req.url, baseUrl);
    }
    catch (err) {
        console.error(err);
        return null;
    }
}