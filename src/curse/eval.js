/**
 * This function evaluates a Curse addon site's content and returns the addon download URL as a string
 * @param {string} siteContent
 * @returns {string}
 */
export function extractDownloadUrl(siteContent) {
    const projectId = parse(siteContent, 'project');
    const fileId = parse(siteContent, 'mainFile');
    return `https://www.curseforge.com/api/v1/mods/${projectId}/files/${fileId}/download`;
}

function parse(html, search) {
    const regex = new RegExp(`\\\\"${search}\\\\"\\s*:\\s*{[\\s\\S]*?\\\\"id\\\\"\\s*:\\s*(\\d+)`);
    const match = html.match(regex);
    if (!match) {
        throw new Error(`Eval: Could not determine the "${search}.id" in scraped site content (necessary for download URL).`);
    }
    const id = Number(match[1]);
    if (!Number.isInteger(id) || id < 1) {
        throw new Error(`Eval: The determined "${search}.id", in scraped site content, is not a positive integer number.`);
    }
    return id;
}