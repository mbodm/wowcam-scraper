// src/api/server.js
var import_node_http = require("node:http");

// src/curse/playwright.js
var import_playwright = require("playwright");
async function scrapeAddonSite(addonSlug) {
  let browser;
  try {
    try {
      browser = await import_playwright.chromium.launch({ headless: true });
    } catch (err2) {
      console.log(err2);
      return error("Playwright exception occurred while launching browser.");
    }
    let context;
    try {
      context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        locale: "en-US",
        extraHTTPHeaders: { "Accept-Language": "en" }
      });
    } catch {
      console.log(err);
      return error("Playwright exception occurred while creating context.");
    }
    let page;
    try {
      page = await context.newPage();
    } catch (err2) {
      console.log(err2);
      return error("Playwright exception occurred while creating page.");
    }
    const url2 = `http://www.curseforge.com/wow/addons/${addonSlug}`;
    try {
      const response = await page.goto(url2, { waitUntil: "domcontentloaded", timeout: 1e4 });
      if (response === null) {
        throw new Error("Playwright page.goto() call returned null, instead of response object.");
      }
      const status = response.status();
      if (status !== 200) {
        if (status === 404) {
          return error("It seems like the addon page does not exist (this usually happens when the given addon param is not a valid addon slug).");
        }
        return error("Received error response from addon page, but the response status code was not HTTP 404 (which is rather unexpected).");
      }
    } catch (err2) {
      console.log(err2);
      return error("Exception occurred while going to page.");
    }
    let siteJson;
    try {
      siteJson = await getAddonSiteJson(page);
    } catch (err2) {
      console.log(err2);
      return error("Exception occurred while evaluating page, to grab the embedded JSON data.");
    }
    let siteHeaders;
    try {
      siteHeaders = await getAddonSiteHeaders(page);
    } catch (err2) {
      console.log(err2);
      return error("Exception occurred while evaluating page, to grab the headers (user-agent, cookies, referer and origin).");
    }
    return success({ siteJson, siteHeaders });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
async function getAddonSiteJson(page) {
  const element = await page.$("script#__NEXT_DATA__");
  if (!element) {
    throw Error("Could not find JSON script element in page.");
  }
  const text = await element.textContent();
  if (!text) {
    throw Error("Found JSON script element in page, but the element was empty.");
  }
  return text;
}
async function getAddonSiteHeaders(page) {
  const userAgent = await page.evaluate(() => navigator.userAgent) ?? "";
  const cookiesArray = await page.context().cookies();
  const cookies = cookiesArray.map(({ name, value }) => `${name}=${value}`).join("; ");
  const { referer, origin } = await page.evaluate(() => ({
    referer: (document?.referrer || location?.href) ?? "",
    origin: location?.origin ?? ""
  }));
  return { userAgent, cookies, referer, origin };
}
function error(msg) {
  return { success: false, error: msg };
}
function success(result) {
  return { success: true, error: "", ...result };
}

// src/curse/eval.js
function evalSiteJson(siteJson) {
  let obj;
  try {
    obj = JSON.parse(siteJson);
  } catch (err2) {
    console.log(err2);
    return error2("The scraped site JSON (from Curse addon site) is not valid JSON.");
  }
  const project = obj?.props?.pageProps?.project;
  if (!project) {
    return error2('Could not determine "project" in scraped site JSON.');
  }
  const file = project.mainFile;
  if (!file) {
    return error2(`Could not determine the project's "mainFile" in scraped site JSON.`);
  }
  if (!project.id) {
    return error2(`Could not determine the project's "id" in scraped site JSON (necessary for download URL).`);
  }
  if (!file.id) {
    return error2(`Could not determine the mainFile's "id" in scraped site JSON (necessary for download URL).`);
  }
  return success2({
    projectId: project.id ?? null,
    projectName: project.name ?? null,
    projectSlug: project.slug ?? null,
    fileId: file.id ?? null,
    fileName: file.fileName ?? null,
    fileLength: file.fileLength ?? null,
    gameVersion: file.primaryGameVersion ?? null,
    downloadUrl: `https://www.curseforge.com/api/v1/mods/${project.id}/files/${file.id}/download`,
    downloadUrlFinal: ""
  });
}
function error2(msg) {
  return { success: false, error: msg };
}
function success2(result) {
  return { success: true, error: "", ...result };
}

// src/curse/redirects.js
async function getFinalDownloadUrl(scrapedDownloadUrl, scrapedSiteHeaders) {
  try {
    const headers = {
      "User-Agent": scrapedSiteHeaders.userAgent,
      "Cookie": scrapedSiteHeaders.cookies,
      "Referer": scrapedSiteHeaders.referer,
      "Origin": scrapedSiteHeaders.origin,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Connection": "keep-alive"
    };
    const response = await fetch(scrapedDownloadUrl, { method: "GET", headers });
    return response.url;
  } catch (err2) {
    console.log(err2);
    return "Error: Could not fetch the final download URL (after all redirects).";
  }
}

// src/api/routes.js
function root(res) {
  res.setHeader("Content-Type", "text/plain");
  res.statusCode = 200;
  res.end("hello");
}
async function scrape(url2, req, res) {
  const addonParam = url2.searchParams.get("addon");
  if (!addonParam) {
    return error3(res, 400, 'Missing "addon" query parameter in request URL.');
  }
  const scrapeStep = await scrapeAddonSite(addonParam.toLocaleLowerCase());
  if (!scrapeStep.success) {
    const code = scrapeStep.error.includes("page does not exist") ? 400 : 500;
    return error3(res, code, scrapeStep.error);
  }
  const siteJson = scrapeStep.siteJson;
  const pureParam = url2.searchParams.get("pure");
  if (pureParam && pureParam.toLowerCase() === "true") {
    return success3(res, siteJson);
  }
  const evalStep = evalSiteJson(siteJson);
  if (!evalStep.success) {
    return error3(req, 500, evalStep.error);
  }
  const downloadUrl = evalStep.downloadUrl;
  if (downloadUrl) {
    const siteHeaders = scrapeStep.siteHeaders;
    const realDownloadUrl = await getFinalDownloadUrl(downloadUrl, siteHeaders);
    evalStep.downloadUrlFinal = realDownloadUrl;
  }
  return success3(res, evalStep);
}
function error3(res, status, msg) {
  const content = { success: false, result: null, error: msg, status: createPrettyStatus(status) };
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(content, null, 4));
}
function success3(res, result) {
  const content = { success: true, result, error: "", status: createPrettyStatus(200) };
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(content, null, 4));
}
function createPrettyStatus(status) {
  switch (status) {
    case 200:
      return "HTTP 200 (OK)";
    case 400:
      return "HTTP 400 (Bad Request)";
    case 500:
      return "HTTP 500 (Internal Server Error)";
    default:
      return "UNKNOWN";
  }
}

// src/api/server.js
function startServer(port) {
  const server = (0, import_node_http.createServer)(async (req, res) => {
    if (req.url.length > 255) {
      res.setHeader("Content-Type", "text/plain");
      res.statusCode = 400;
      res.end("URL is not allowed to exceed a limit of 255 characters");
      return;
    }
    const url2 = createUrl(req);
    switch (url2.pathname) {
      case "/":
        req.method === "GET" ? root(res) : methodNotAllowed(res);
        break;
      case "/scrape":
        req.method === "GET" ? scrape(url2, req, res) : methodNotAllowed(res);
        break;
      case "/favicon.ico":
        req.method === "GET" ? handleFaviconRequest(res) : methodNotAllowed(res);
        break;
      default:
        routeNotFound(res, url2);
        break;
    }
  });
  server.listen(port, "0.0.0.0");
  console.log(`Server started (http://localhost:${port})`);
}
function createUrl(req) {
  const proto = req.headers["x-forwarded-proto"] ?? "http";
  const url2 = new URL(req.url, `${proto}://${req.headers.host}`);
  return url2;
}
function methodNotAllowed(req, res) {
  console.log(`HTTP ${req.method} method not allowed for requested "${url.pathname}" path`);
  res.writeHead(405, { "Content-Type": "text/plain", "Allow": "GET" });
  res.end();
}
function handleFaviconRequest(res) {
  res.statusCode = 404;
  res.end();
}
function routeNotFound(res, url2) {
  console.log(`No route handler implemented for requested "${url2.pathname}" path`);
  res.statusCode = 404;
  res.end();
}

// src/app.js
startServer(8e3);
