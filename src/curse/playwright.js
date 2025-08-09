import { chromium } from 'playwright';

/**
 * This function scrapes a Curse addon site and returns the site's embedded JSON data
 * @param {string} addonSlug
 * @returns {Promise<object>}
 */
export async function scrapeAddonSite(addonSlug) {
    let browser;
    try {
        try {
            browser = await chromium.launch({ headless: true });
        }
        catch (err) {
            console.log(err);
            return error('Playwright exception occurred while launching browser.');
        }
        let context;
        try {
            context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                locale: 'en-US',
                extraHTTPHeaders: { 'Accept-Language': 'en' }
            });
        }
        catch {
            console.log(err);
            return error('Playwright exception occurred while creating context.');
        }
        let page;
        try {
            page = await context.newPage();
        }
        catch (err) {
            console.log(err);
            return error('Playwright exception occurred while creating page.');
        }
        const url = `http://www.curseforge.com/wow/addons/${addonSlug}`;
        try {
            const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
            if (response === null) {
                throw new Error('Playwright page.goto() call returned null, instead of response object.');
            }
            const status = response.status();
            if (status !== 200) {
                if (status === 404) {
                    return error('It seems like the addon page does not exist (this usually happens when the given addon param is not a valid addon slug).');
                }
                return error('Received error response from addon page, but the response status code was not HTTP 404 (which is rather unexpected).');
            }
        }
        catch (err) {
            console.log(err);
            return error('Exception occurred while going to page.');
        }
        let siteJson;
        try {
            siteJson = await getAddonSiteJson(page);
        }
        catch (err) {
            console.log(err);
            return error('Exception occurred while evaluating page, to grab the embedded JSON data.');
        }
        let siteHeaders;
        try {
            siteHeaders = await getAddonSiteHeaders(page);
        }
        catch (err) {
            console.log(err);
            return error('Exception occurred while evaluating page, to grab the headers (user-agent, cookies, referer and origin).');
        }
        return success({ siteJson, siteHeaders });
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
        throw Error('Could not find JSON script element in page.');
    }
    const text = await element.textContent();
    if (!text) {
        throw Error('Found JSON script element in page, but the element was empty.');
    }
    return text;
}

async function getAddonSiteHeaders(page) {
    const userAgent = await page.evaluate(() => navigator.userAgent) ?? '';
    const cookiesArray = await page.context().cookies();
    const cookies = cookiesArray.map(({ name, value }) => `${name}=${value}`).join('; ');
    const { referer, origin } = await page.evaluate(() => ({
        referer: (document?.referrer || location?.href) ?? '',
        origin: location?.origin ?? ''
    }));
    return { userAgent, cookies, referer, origin };
}

function error(msg) {
    return { success: false, error: msg };
}

function success(result) {
    return { success: true, error: '', ...result };
}