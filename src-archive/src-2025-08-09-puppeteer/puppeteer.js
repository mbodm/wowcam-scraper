import { launch } from 'puppeteer';

/**
 * This function scrapes a Curse addon site and returns the site's embedded JSON data
 * @param {string} addonSlug
 * @returns {Promise<object>}
 */
export async function scrapeAddonSite(addonSlug) {
    let browser;
    try {
        try {
            browser = await launch({ headless: true });
        }
        catch (err) {
            console.log(err);
            return error('Puppeteer exception occurreed while launching browser.');
        }
        let page;
        try {
            page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });
        }
        catch (err) {
            console.log(err);
            return error('Puppeteer exception occurreed while getting page.');
        }
        const url = `http://www.curseforge.com/wow/addons/${addonSlug}`;
        try {
            const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
            const status = response.status();
            if (status !== 200) {
                if (status === 404) {
                    return error('It seems like the addon page does not exist (this usually happens when the given addon param is not a valid addon slug).');
                }
                return error('Puppeteer reponse error occurred while going to page, but the response status code was not HTTP 404 (which is rather unexpected).');
            }
        }
        catch (err) {
            console.log(err);
            return error('Puppeteer exception occurreed while going to page.');
        }
        let siteJson;
        try {
            siteJson = await getAddonSiteJson(page);
        }
        catch (err) {
            console.log(err);
            return error('Puppeteer exception occurreed while evaluating page, to grab the embedded JSON data.');
        }
        let siteData;
        try {
            siteData = await getAddonSiteData(page, browser);
        }
        catch (err) {
            console.log(err);
            return error('Puppeteer exception occurreed while evaluating page, to grab user-agent, cookie and headers.');
        }
        return success({ siteJson, ...siteData });
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function getAddonSiteJson(page) {
    const element = await page.$('script#__NEXT_DATA__');
    if (!element) {
        throw Error('Could not found JSON script element in page.');
    }
    const text = await page.evaluate(el => el.textContent, element);
    if (!text) {
        throw Error('Found JSON script element in page, but the element was empty.');
    }
    return text;
}

async function getAddonSiteData(page, browser) {
    const userAgent = await page.evaluate(() => navigator.userAgent) ?? '';
    const cookies = await browser.defaultBrowserContext().cookies(page.url());
    const pageCookie = cookies?.map(entry => `${entry.name}=${entry.value}`)?.join("; ") ?? '';
    const headers = await page.evaluate(() => {
        return {
            referer: document.referrer || location.href,
            origin: location.origin
        };
    });
    const pageReferer = headers.referer ?? '';
    const pageOrigin = headers.origin ?? '';
    return { userAgent, pageCookie, pageReferer, pageOrigin };
}

function error(msg) {
    return { success: false, error: msg };
}

function success(result) {
    return { success: true, error: '', ...result };
}