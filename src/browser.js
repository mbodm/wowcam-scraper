import { launch } from 'puppeteer';
import { createError } from './results.js';
import { createSuccess } from './results.js';

/**
 * @param {string} addonSlug
 * @returns {object}
 */
export async function parseSite(addonSlug) {
    let browser;
    try {
        browser = await launch({ headless: true });
    }
    catch (e) {
        console.log(e);
        return createError('Puppeteer exception occurreed while launching browser.');
    }
    let page;
    try {
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });
    }
    catch (e) {
        console.log(e);
        return createError(e, 'Puppeteer exception occurreed while getting page.');
    }
    const url = `http://www.curseforge.com/wow/addons/${addonSlug}`;
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    }
    catch (e) {
        console.log(e);
        return createError('Puppeteer exception occurreed while going to page.');
    }
    let json;
    try {
        const addonPageNotExists = await is404ErrorPage(page);
        if (addonPageNotExists) {
            return createError('It seems like the addon page does not exist (maybe the given addon param is invalid).');
        }
        const element = await page.$('script#__NEXT_DATA__');
        if (!element) {
            return createError('Could not found JSON script element in page.')
        }
        const text = await page.evaluate(el => el.textContent, element);
        if (!text) {
            return createError('Found JSON script element in page, but the element was empty.');
        }
        json = text;
    }
    catch (e) {
        console.log(e);
        return createError('Puppeteer exception occurreed while evaluating page.');
    }
    await browser.close();
    return createSuccess(json);
}

/**
 * @param {any} page
 * @returns {Promise<boolean>}
 */
async function is404ErrorPage(page) {
    const element = await page.$('.error-description');
    if (!element) {
        return false;
    }
    const text = await page.evaluate(el => el.textContent, element) ?? '';
    if (!text.includes('404')) {
        return false;
    }
    return true;
}