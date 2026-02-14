import { Server, createServer } from 'node:http';
import { handleRootEndpoint, handleScrapeEndpoint } from './routes.js';

/**
 * This function starts a Node.js HTTP server which exposes some API endpoints
 * @param {number} port
 * @returns {Server<IncomingMessage, ServerResponse>} server
 */
export function startServer(port) {
    const server = createServer(async (req, res) => {
        // A malformed request (proxy, etc.) could end up in empty URL
        if (typeof req.url !== 'string' || req.url.length === 0) {
            res.writeHead(500).end('Error: Node.js server request not provided request URL.');
            return;
        }
        // Cap URL length to prevent buffer overflow attacks in general (regardless of what we do later with URL content)
        if (req.url.length > 255) {
            res.writeHead(400).end('Error: URL is not allowed to exceed a limit of 255 characters.');
            return;
        }
        // Get URL class instance (for path-name and query-params)
        let url;
        try {
            const proto = req.headers['x-forwarded-proto'] ?? 'http';
            url = new URL(req.url, `${proto}://${req.headers.host}`); // URL class can throw
            if (!url) throw new Error(); // URL class can return falsy value
        } catch {
            res.writeHead(400).end('Error: URL is not valid.');
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
                res.writeHead(404).end(); // Matches '/favicon.ico' route too
                break;
        }
    });
    server.listen(port, '0.0.0.0');
    console.log(`Server started (http://localhost:${port})`);
    return server;
}