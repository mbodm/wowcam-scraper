/**
 * This function scrapes a Curse addon site and returns the site's embedded JSON data and the scraper's request headers
 * @param {string} addonSlug
 * @returns {Promise<object>}
 */
export async function scrapeAddonSite(addonSlug) {
    try {
        const url = `https://www.curseforge.com/wow/addons/${addonSlug}`;
        const response = await fetch('http://flaresolverr:8191/v1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cmd: 'request.get',
                url,
                maxTimeout: 30000
            }),
        });
        if (!response.ok) {
            throw new Error(`The received response status (from internal FlareSolverr API) was HTTP ${response.status}`);
        }
        const obj = await response.json();
        validateFlareSolverrResponseObject(obj);
        const siteJson = getAddonSiteJson(obj);
        const siteHeaders = getAddonSiteHeaders(obj);
        return success({ siteJson, siteHeaders });
    }
    catch (err) {
        console.log(err);
        return error('An internal exception occurred while scraping (see log for details).');
    }
}

function error(msg) {
    return { success: false, error: msg };
}

function success(result) {
    return { success: true, error: '', ...result };
}

//////////////////////////////////////////////////////////////////////
// FlareSolverr response JSON looks like this:                      //
//////////////////////////////////////////////////////////////////////
// {
//     "solution": {
//         "url": "https://www.google.com/?gws_rd=ssl",
//         "status": 200,
//         "headers": {
//             "status": "200",
//             "date": "Thu, 16 Jul 2020 04:15:49 GMT",
//             "expires": "-1",
//             "cache-control": "private, max-age=0",
//             "content-type": "text/html; charset=UTF-8",
//             "strict-transport-security": "max-age=31536000",
//             "p3p": "CP=\"This is not a P3P policy! See g.co/p3phelp for more info.\"",
//             "content-encoding": "br",
//             "server": "gws",
//             "content-length": "61587",
//             "x-xss-protection": "0",
//             "x-frame-options": "SAMEORIGIN",
//             "set-cookie": "1P_JAR=2020-07-16-04; expires=Sat..."
//         },
//         "response":"<!DOCTYPE html>...",
//         "cookies": [
//             {
//                 "name": "NID",
//                 "value": "204=QE3Ocq15XalczqjuDy52HeseG3zAZuJzID3R57...",
//                 "domain": ".google.com",
//                 "path": "/",
//                 "expires": 1610684149.307722,
//                 "size": 178,
//                 "httpOnly": true,
//                 "secure": true,
//                 "session": false,
//                 "sameSite": "None"
//             },
//             {
//                 "name": "1P_JAR",
//                 "value": "2020-07-16-04",
//                 "domain": ".google.com",
//                 "path": "/",
//                 "expires": 1597464949.307626,
//                 "size": 19,
//                 "httpOnly": false,
//                 "secure": true,
//                 "session": false,
//                 "sameSite": "None"
//             }
//         ],
//         "userAgent": "Windows NT 10.0; Win64; x64) AppleWebKit/5..."
//     },
//     "status": "ok",
//     "message": "",
//     "startTimestamp": 1594872947467,
//     "endTimestamp": 1594872949617,
//     "version": "1.0.0"
// }
//////////////////////////////////////////////////////////////////////

function validateFlareSolverrResponseObject(obj) {
    if (!obj) {
        throw new Error('The received response object (from internal FlareSolverr API) was null or undefined');
    }
    // The .message and .userAgent properties "may" be null or an empty string (and .userAgent also has another validation for headers later)
    const invalid = !obj.solution || !obj.status || obj.message === undefined ||
        !obj.solution.status || !obj.solution.headers || !obj.solution.response || !obj.solution.cookies || !obj.solution.userAgent === undefined;
    if (invalid) {
        console.log('FlareSolverr response object was:');
        console.log(obj);
        throw new Error('The received response content (from internal FlareSolverr API) had not the expected JSON format');
    }
    if (obj.status.toLowerCase() !== 'ok') {
        console.log(`FlareSolverr response object "status" was "${obj.status}"`);
        console.log(`FlareSolverr response object "message" was "${obj.message}"`);
        throw new Error('The received response object (from internal FlareSolverr API) indicates that scraping was not successful');
    }
}

function getAddonSiteJson(obj) {
    const html = obj.solution.response;
    const projectJson = extractProjectJson(html);
    const project = JSON.parse(projectJson);
    // Wrap it in the old structure format that evalSiteJson() function expects
    const wrappedJson = {
        props: {
            pageProps: {
                project
            }
        }
    };
    return JSON.stringify(wrappedJson);
}

function getAddonSiteHeaders(obj) {
    const userAgent = obj.solution.userAgent;
    const cookiesArray = obj.solution.cookies;
    const cookies = cookiesArray.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    if (!userAgent || !cookies) {
        throw new Error('Could not determine valid Curse addon site header data (user-agent and cookies)');
    }
    return { userAgent, cookies };
}

function extractProjectJson(html) {
    console.log('----------');
    console.log(html);
    console.log('----------');
    // 1) Find the <script> block (which contains the "self.__next_f.push([1, "17:..." part)
    const scriptStartMarkerWithSpace = '<script>self.__next_f.push([1, "17:';
    const scriptStartMarkerWithoutSpace = '<script>self.__next_f.push([1,"17:';
    // The start marker may or may not contain a space between 1 and 17 (i saw both)
    const scriptStartPosWithSpace = html.indexOf(scriptStartMarkerWithSpace);
    const scriptStartPosWithoutSpace = html.indexOf(scriptStartMarkerWithoutSpace);
    const scriptStartPos = scriptStartPosWithSpace > 0 ? scriptStartMarkerWithSpace : scriptStartPosWithoutSpace;
    if (scriptStartPos === -1) {
        throw new Error('Could not find the starting <script> tag of Next.js flight transport data (element 17) in Curse addon site');
    }
    // 2) Find the closing </script> tag of that block
    const scriptEndMarker = '</script>';
    const scriptEndPos = html.indexOf(scriptEndMarker, scriptStartPos);
    if (scriptEndPos === -1) {
        throw new Error('Could not find the closing </script> tag of Next.js flight transport data (element 17) in Curse addon site');
    }
    // 3) Extract the script content and find where "project" JSON starts
    const scriptContent = html.substring(scriptStartPos, scriptEndPos);
    const projectJsonStartMarker = '"project":{';
    const projectJsonStartPos = scriptContent.indexOf(projectJsonStartMarker);
    if (projectJsonStartPos === -1) {
        throw new Error('Could not find start for "project" JSON part of Next.js flight transport data (element 17) in Curse addon site');
    }
    // 4) Extract onwards from the first opening brace of "project" until the last matching closing brace
    const startPos = projectJsonStartPos + projectJsonStartMarker.length - 1;
    let braceCount = 0;
    let endPos = -1;
    for (let i = startPos; i < scriptContent.length; i++) {
        const char = scriptContent[i];
        if (char === '{') braceCount++;
        else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
                endPos = i + 1;
                break;
            }
        }
    }
    if (endPos === -1) {
        throw new Error('Could not find closing brace for "project" JSON part of Next.js flight transport data (element 17) in Curse addon site');
    }
    // 5) Extract the project JSON string (from starting brace to ending brace)
    const projectJson = scriptContent.substring(startPos, endPos);
    // 6) Unescape the JSON string (it's escaped because it's inside a JavaScript string)
    const projectJsonUnescaped = projectJson
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    // 7) Return unescaped "project" JSON string
    return projectJsonUnescaped;
}