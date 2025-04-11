import { launch } from 'puppeteer';
import { createError } from './results.js';
import { createSuccess } from './results.js';

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
        const elementWhenErrorPage = await page.$('.error-description');
        if (elementWhenErrorPage) {
            const contentWhenErrorPage = await page.evaluate((el) => el.textContent, elementWhenErrorPage);
            if (contentWhenErrorPage && contentWhenErrorPage.includes('404')) {
                return createError('It seems like the addon page does not exist (maybe your given addon name is invalid).');
            }
        }
        const element = await page.$('script#__NEXT_DATA__');
        if (!element) {
            return createError('Could not found JSON script element in page.')
        }
        const content = await page.evaluate((el) => el.textContent, element);
        if (!content) {
            return createError('Found JSON script element in page, but the element\'s content was empty.');
        }
        json = content;
    }
    catch (e) {
        console.log(e);
        return createError('Puppeteer exception occurreed while evaluating page.');
    }
    await browser.close();
    return createSuccess(json);
}