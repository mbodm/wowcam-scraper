import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * @returns {string}
 */
export function getModuleFolderPath() {
    const moduleFile = fileURLToPath(import.meta.url);
    const moduleFolder = path.dirname(moduleFile);
    return path.resolve(moduleFolder);
}

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