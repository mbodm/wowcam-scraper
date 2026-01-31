import { createPrettyStatus } from '../helper/http.js';

/**
 * This function scrapes a Curse addon site (by using FlareSolverr) and returns the site's HTML content and the scraper's request headers
 * @param {string} addonSlug
 * @returns {Promise<object>}
 */
export async function scrapeAddonSite(addonSlug) {
    const flareSolverrUrl = 'http://flaresolverr:8191/v1';
    const addonSiteUrl = `https://www.curseforge.com/wow/addons/${addonSlug}`;
    const response = await fetch(flareSolverrUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cmd: 'request.get',
            url: addonSiteUrl,
            maxTimeout: 30000
        }),
    });
    if (!response.ok) {
        const status = createPrettyStatus(response.status, response.statusText);
        throw new Error(`Received error response from internal FlareSolverr API: ${status}`);
    }
    const obj = await response.json();
    validateFlareSolverrResponseObject(obj);
    checkCurseResponseStatusCode(obj);
    const siteContent = getAddonSiteContent(obj);
    const siteHeaders = getAddonSiteHeaders(obj);
    return { siteContent, siteHeaders };
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
        throw new Error('Scraping: The received response object (from internal FlareSolverr API) was null or undefined.');
    }
    if (!obj.status) {
        throw new Error('Scraping: The received "status" (from internal FlareSolverr API) was null, undefined, or an empty string.');
    }
    // The "message" is allowed to be null or an empty string (but it has to exist)
    if (obj.message === undefined) {
        throw new Error('Scraping: The received "message" (from internal FlareSolverr API) was undefined.');
    }
    if (obj.status.toLowerCase() !== 'ok') {
        console.log(`FlareSolverr "status" was "${obj.status}"`);
        console.log(`FlareSolverr "message" was "${obj.message}"`); // If message is null then it shows "null"
        throw new Error('Scraping: The received response object (from internal FlareSolverr API) indicates that scraping was not successful.');
    }
    if (!obj.solution) {
        throw new Error('Scraping: The received "solution" (from internal FlareSolverr API) was null or undefined.');
    }
}

function checkCurseResponseStatusCode(obj) {
    // FlareSolver solution already validated above
    const status = obj.solution.status;
    if (!status) {
        throw new Error('Scraping: Could not determine Curse addon site response-status.');
    }
    if (status === 404) {
        throw new Error('Scraping: Curse addon site not exists for given addon name (internal FlareSolverr API showed HTTP 404).');
    }
    if (status !== 200) {
        throw new Error(`Scraping: Curse addon site response status was not OK (internal FlareSolverr API showed HTTP ${status}).`);
    }
}

function getAddonSiteContent(obj) {
    // FlareSolver solution already validated above
    const siteContent = obj.solution.response;
    if (!siteContent) {
        throw new Error('Scraping: Could not determine Curse addon site page-content.');
    }
    if (obj.solution.status === )
        return siteContent;
}

function getAddonSiteHeaders(obj) {
    // FlareSolver solution already validated above
    const userAgent = obj.solution.userAgent;
    const cookiesArray = obj.solution.cookies;
    if (!userAgent || !Array.isArray(cookiesArray)) {
        throw new Error('Scraping: Could not determine Curse addon site header-data (user-agent and cookies).');
    }
    const cookiesString = cookiesArray.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    return { userAgent, cookiesString };
}