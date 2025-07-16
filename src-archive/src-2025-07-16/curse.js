import { createError } from './results.js';
import { createSuccess } from './results.js';

/**
 * @param {string} curseJson
 * @returns {object}
 */
export function createObject(curseJson) {
    let obj;
    try {
        obj = JSON.parse(curseJson);
    }
    catch (e) {
        return createError('Scraped page script data is not valid JSON.');
    }
    const project = obj?.props?.pageProps?.project;
    if (!project) {
        return createError('Could not determine "project" in scraped JSON data.');
    }
    const file = project.mainFile;
    if (!file) {
        return createError('Could not determine the project\'s "mainFile" in scraped JSON data.');
    }
    if (!project.id) {
        return createError('Could not determine the project\'s "id" in scraped JSON data (necessary for download URL).');
    }
    if (!file.id) {
        return createError('Could not determine the mainFile\'s "id" in scraped JSON data (necessary for download URL).');
    }
    return createSuccess({
        projectId: project.id ?? null,
        projectName: project.name ?? null,
        projectSlug: project.slug ?? null,
        fileId: file.id ?? null,
        fileName: file.fileName ?? null,
        fileLength: file.fileLength ?? null,
        gameVersion: file.primaryGameVersion ?? null,
        downloadUrl: `https://www.curseforge.com/api/v1/mods/${project.id}/files/${file.id}/download`
    });
}