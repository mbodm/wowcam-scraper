import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function getCurrentFolderPath() {
    // See -> https://medium.com/@kishantashok/understanding-dirname-in-es-modules-solutions-for-modern-node-js-9d0560eb5ed7
    return path.dirname(fileURLToPath(import.meta.url));
}

export function getFaviconFilePath() {
    return path.join(getCurrentFolderPath(), '../', 'favicon.ico');
}