import { createServer } from 'node:http';
import { root, scrape } from './handler.js';

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
        const proto = req.headers['x-forwarded-proto'] ?? 'http';
        const url = new URL(req.url, `${proto}://${req.headers.host}`);
        const context = { url, req, res};




        switch (url.pathname) {
            case '/':
                root(req, res);
                break;
            case '/scrape':
                scrape(req, res);
                break;
            default:
                console.log(url.pathname);
                res.statusCode = 404;
                res.end();
                break;
        }
    });
    server.listen(port, '0.0.0.0');
    console.log(`Server started (http://localhost:${port})`);
}