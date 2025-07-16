/**
 * This function evalutates a Curse addon site's embedded JSON data and returns an object which contains the most important addon properties
 * @param {string} siteJson
 * @returns {object}
 */
export function evalSiteJson(siteJson) {
    let obj;
    try {
        obj = JSON.parse(siteJson);
    }
    catch (err) {
        console.log(err);
        return createError('The scraped site JSON (from Curse addon site) is not valid JSON.');
    }
    const project = obj?.props?.pageProps?.project;
    if (!project) {
        return createError('Could not determine "project" in scraped site JSON.');
    }
    const file = project.mainFile;
    if (!file) {
        return createError('Could not determine the project\'s "mainFile" in scraped site JSON.');
    }
    if (!project.id) {
        return createError('Could not determine the project\'s "id" in scraped site JSON (necessary for download URL).');
    }
    if (!file.id) {
        return createError('Could not determine the mainFile\'s "id" in scraped site JSON (necessary for download URL).');
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

function createError(error) {
    return { success: false, error };
}

function createSuccess(result) {
    return { success: true, error: '', ...result };
}