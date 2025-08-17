import { startServer } from "./api/server.js";

process.on('SIGTERM', () => {
    console.log('Received SIGTERM signal (and therefore exit process now)');
    process.exit(0);
});
startServer(8000);