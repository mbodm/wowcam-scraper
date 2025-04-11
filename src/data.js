import { createSuccess } from './results.js';
import { createError } from './results.js';

export function createCurseObject(json) {
    try {
        const o = JSON.parse(json);
        return createSuccess(o);
    }
    catch (e) {
        return createError('Scraped page script data is not valid JSON.');
    }
}

export function validateCurseObject(curseObject) {
    const project = curseObject?.props?.pageProps?.project;
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
    return createSuccess();
}

export function createAddonObject(curseObject) {
    const project = curseObject.props.pageProps.project;
    const file = project.mainFile;
    const url = `https://www.curseforge.com/api/v1/mods/${project.id}/files/${file.id}/download`;
    const addon = {
        projectId: project.id ?? null,
        projectName: project.name ?? null,
        projectSlug: project.slug ?? null,
        fileId: file.id ?? null,
        fileName: file.fileName ?? null,
        fileLength: file.fileLength ?? null,
        gameVersion: file.primaryGameVersion ?? null,
        downloadUrl: url ?? null
    };
    return createSuccess({ addon });
}