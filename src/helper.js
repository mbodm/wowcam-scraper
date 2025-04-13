import path from 'node:path';

/**
 * @returns {string}
 */
export function getProjectFolderPath() {
    const rootFolder = process.cwd();
    return path.resolve(rootFolder);
}

/**
 * @param {string} protocol
 * @param {string} host
 * @param {string} path
 * @returns {URL}
 */
export function createUrl(protocol, host, path) {
    if (!protocol) {
        protocol = 'http';
    }
    if (!host) {
        host = 'localhost';
    }
    if (!path) {
        path = '/';
    }
    else {
        path = path[0] === '/' ? path : `/${path}`;
    }
    return new URL(`${protocol}://${host}${path}`);
}