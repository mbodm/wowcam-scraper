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
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if (!match) {
        throw new Error('Could not find "__NEXT_DATA__" JSON script element in Curse addon site');
    }
    const content = match[1];
    if (!content) {
        throw Error('Found "__NEXT_DATA__" JSON script element in Curse addon site but the element was empty');
    }
    return content;
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