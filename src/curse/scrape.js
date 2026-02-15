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
        signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) {
        throw new Error(`Scrape: Received error response from internal FlareSolverr API (HTTP ${response.status}).`);
    }
    const obj = await response.json();
    validateFlareSolverrResponseObject(obj);
    validateCurseResponseStatus(obj);
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
        throw new Error('Scrape: The received response object, from internal FlareSolverr API, was null or undefined.');
    }
    if (!obj.status) {
        throw new Error('Scrape: The received "status", from internal FlareSolverr API, was null, undefined, or an empty string.');
    }
    // The "message" is allowed to be null or an empty string (but it has to exist)
    if (obj.message === undefined) {
        throw new Error('Scrape: The received "message", from internal FlareSolverr API, was undefined.');
    }
    if (obj.status.toLowerCase() !== 'ok') {
        console.log(`FlareSolverr "status" was: "${obj.status}"`);
        console.log(`FlareSolverr "message" was: "${obj.message}"`); // If message is null then it shows "null"
        throw new Error('Scrape: The received response object, from internal FlareSolverr API, indicates that scraping was not successful.');
    }
    if (!obj.solution) {
        throw new Error('Scrape: The received "solution", from internal FlareSolverr API, was null or undefined.');
    }
}

function validateCurseResponseStatus(obj) {
    // FlareSolver obj was already validated above
    const status = Number(obj.solution.status); // Number conversion never throws
    if (Number.isNaN(status) || status < 1 || status > 1024) {
        throw new Error('Scrape: Could not determine Curse addon site response status.');
    }
    if (status === 404) {
        // Note:
        // This check is not reliable. We do a second check below, inspecting the site content.
        // Because FlareSolverr may show HTTP 200 OK, but receives a Curse 404 page as content.
        throw new Error('Scrape: Curse addon site does not exist for given addon name (internal FlareSolverr API showed HTTP 404).');
    }
    if (status !== 200) {
        throw new Error(`Scrape: Curse addon site response status was not OK (internal FlareSolverr API showed HTTP ${status}).`);
    }
}

function getAddonSiteContent(obj) {
    // FlareSolver obj was already validated above
    const siteContent = obj.solution.response;
    if (!siteContent) {
        throw new Error('Scrape: Could not determine Curse addon site page content.');
    }
    // 404 page detection
    if (siteContent.includes('NEXT_HTTP_ERROR_FALLBACK;404')) {
        throw new Error('Scrape: Curse addon site does not exist for given addon name (internal FlareSolverr API received Curse 404 page).');
    }
    return siteContent;
}

function getAddonSiteHeaders(obj) {
    // FlareSolver obj was already validated above
    const userAgent = obj.solution.userAgent;
    const cookiesArray = obj.solution.cookies;
    if (!userAgent || !Array.isArray(cookiesArray)) {
        throw new Error('Scrape: Could not determine Curse addon site header data (user-agent and cookies).');
    }
    const kvpStrings = cookiesArray.map(arrayItem => `${arrayItem.name}=${arrayItem.value}`);
    const cookiesString = kvpStrings.join('; '); // Empty array results in empty string ("")
    return { userAgent, cookiesString };
}