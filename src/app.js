import { startServer } from './api/server.js';

const server = startServer(8000);

process.on('SIGTERM', exitGracefully);
process.on('SIGINT', exitGracefully);

function exitGracefully(signal) {
    if (!server) {
        return;
    }
    console.log(`Closing server now, cause received ${signal} signal.`);
    // Stop server gracefully
    server.close(err => {
        if (err) {
            console.error('Forcing exit, cause error occurred while closing server: ', err);
            process.exit(1);
        }
        else {
            console.log('Server successfully closed.');
            process.exit(0);
        }
    });
    // Force exit if server.close() hangs
    setTimeout(() => {
        console.error('Forcing exit, cause timeout occurred while closing server.');
        process.exit(1);
    }, 10 * 1000);
}