import { createServer } from 'node:http';
import { sayHello, sendFavicon, scrapeCurse } from './routes.js';

export function start() {
    const server = createServer(async (req, res) => {
        // Cap URL length to prevent buffer overflow attacks in general (regardless what we do later with URL content)
        if (req.url.length > 255) {
            res.setHeader('Content-Type', 'text/plain');
            res.statusCode = 400;
            res.end('URL is not allowed to exceed a limit of 255 characters');
            return;
        }
        // Routes
        if (req.url === '/') {
            sayHello(res);
        }
        else if (req.url === '/favicon.ico') {
            sendFavicon(res);
        }
        else if (req.url.startsWith('/wowcam')) {
            scrapeCurse(req, res);
        }
        else {
            res.statusCode = 404;
            res.end();
        }
    });
    server.listen(8000, '0.0.0.0');
}