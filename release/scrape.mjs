// src/api/server.js
import { Server, createServer } from "node:http";

// src/api/routes.js
import { ServerResponse, IncomingMessage, STATUS_CODES } from "node:http";

// src/curse/scrape.js
async function scrapeAddonSite(addonSlug) {
  const flareSolverrUrl = "http://flaresolverr:8191/v1";
  const addonSiteUrl = `https://www.curseforge.com/wow/addons/${addonSlug}`;
  const response = await fetch(flareSolverrUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "request.get",
      url: addonSiteUrl,
      maxTimeout: 3e4
    }),
    signal: AbortSignal.timeout(45e3)
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
function validateFlareSolverrResponseObject(obj) {
  if (!obj) {
    throw new Error("Scrape: The received response object, from internal FlareSolverr API, was null or undefined.");
  }
  if (!obj.status) {
    throw new Error('Scrape: The received "status", from internal FlareSolverr API, was null, undefined, or an empty string.');
  }
  if (obj.message === void 0) {
    throw new Error('Scrape: The received "message", from internal FlareSolverr API, was undefined.');
  }
  if (obj.status.toLowerCase() !== "ok") {
    console.log(`FlareSolverr "status" was "${obj.status}"`);
    console.log(`FlareSolverr "message" was "${obj.message}"`);
    throw new Error("Scrape: The received response object, from internal FlareSolverr API, indicates that scraping was not successful.");
  }
  if (!obj.solution) {
    throw new Error('Scrape: The received "solution", from internal FlareSolverr API, was null or undefined.');
  }
}
function validateCurseResponseStatus(obj) {
  const status = Number(obj.solution.status);
  if (Number.isNaN(status) || status < 1 || status > 1024) {
    throw new Error("Scrape: Could not determine Curse addon site response-status.");
  }
  if (status === 404) {
    throw new Error("Scrape: Curse addon site not exists for given addon name (internal FlareSolverr API showed HTTP 404).");
  }
  if (status !== 200) {
    throw new Error(`Scrape: Curse addon site response status was not OK (internal FlareSolverr API showed HTTP ${status}).`);
  }
}
function getAddonSiteContent(obj) {
  const siteContent = obj.solution.response;
  if (!siteContent) {
    throw new Error("Scrape: Could not determine Curse addon site page-content.");
  }
  if (siteContent.includes("NEXT_HTTP_ERROR_FALLBACK;404")) {
    throw new Error("Scrape: Curse addon site not exists for given addon name (internal FlareSolverr API received Curse 404 page).");
  }
  return siteContent;
}
function getAddonSiteHeaders(obj) {
  const userAgent = obj.solution.userAgent;
  const cookiesArray = obj.solution.cookies;
  if (!userAgent || !Array.isArray(cookiesArray)) {
    throw new Error("Scrape: Could not determine Curse addon site header-data (user-agent and cookies).");
  }
  const kvpStrings = cookiesArray.map((arrayItem) => `${arrayItem.name}=${arrayItem.value}`);
  const cookiesString = kvpStrings.join("; ");
  return { userAgent, cookiesString };
}

// src/curse/eval.js
function extractDownloadUrl(siteContent) {
  const projectId = parse(siteContent, "project");
  const fileId = parse(siteContent, "mainFile");
  return `https://www.curseforge.com/api/v1/mods/${projectId}/files/${fileId}/download`;
}
function parse(html, search) {
  const regex = new RegExp(`\\\\"${search}\\\\"\\s*:\\s*{[\\s\\S]*?\\\\"id\\\\"\\s*:\\s*(\\d+)`);
  const match = html.match(regex);
  if (!match) {
    throw new Error(`Eval: Could not determine the "${search} id" in scraped site content (necessary for download URL).`);
  }
  const id = Number(match[1]);
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`Eval: The determined "${search} id", in scraped site content, is not a positive integer number.`);
  }
  return id;
}

// src/curse/redirects.js
async function getFinalDownloadUrl(scrapedDownloadUrl, scrapedSiteHeaders) {
  const headers = {
    "User-Agent": scrapedSiteHeaders.userAgent,
    "Cookie": scrapedSiteHeaders.cookiesString,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive"
  };
  const response = await fetch(scrapedDownloadUrl, {
    method: "GET",
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(15e3)
  });
  if (!response.ok) {
    throw new Error(`Redirects: Received error response while following Curse redirects (HTTP ${response.status}).`);
  }
  return response.url;
}

// src/api/routes.js
function handleRootEndpoint(res) {
  res.writeHead(200).end("hello");
}
async function handleScrapeEndpoint(url, res) {
  const addonSlug = url.searchParams.get("addon")?.trim().toLowerCase();
  if (!addonSlug) {
    error(res, 400, 'Missing "addon" query parameter in request URL.');
    return;
  }
  if (!/^[a-z0-9-]+$/.test(addonSlug)) {
    error(res, 400, 'Invalid "addon" query parameter in request URL (format is not Curse addon-slug format).');
    return;
  }
  try {
    const scrapeResult = await scrapeAddonSite(addonSlug);
    const downloadUrl = extractDownloadUrl(scrapeResult.siteContent);
    const downloadUrlFinal = await getFinalDownloadUrl(downloadUrl, scrapeResult.siteHeaders);
    success(res, addonSlug, downloadUrlFinal);
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error occurred in /scrape route handler.", err);
      error(res, 500, err.message);
    } else {
      const msg = "Unknown error occurred in /scrape route handler.";
      console.error(msg);
      error(res, 500, msg);
    }
  }
}
var error = (res, status, errorMessage) => sendJsonResponse(res, status, {
  errorMessage,
  statusInfo: createPrettyStatus(status)
});
var success = (res, addonSlug, downloadUrl) => sendJsonResponse(res, 200, {
  addonSlug,
  downloadUrl,
  statusInfo: createPrettyStatus(200)
});
var sendJsonResponse = (res, status, content) => res.writeHead(status, {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
}).end(JSON.stringify(content, null, 4));
var createPrettyStatus = (status) => `HTTP ${status} (${STATUS_CODES[status] ?? "Unknown"})`;

// src/api/server.js
function startServer(port) {
  const server2 = createServer(async (req, res) => {
    const url = createUrlClassInstance(req);
    if (!url) {
      res.writeHead(400).end("Error: Invalid request URL (check logs for details).");
      return;
    }
    if (req.method !== "GET") {
      res.writeHead(405, { "Allow": "GET" }).end("Error: HTTP method not allowed.");
      return;
    }
    switch (url.pathname) {
      case "/":
        handleRootEndpoint(res);
        break;
      case "/scrape":
        await handleScrapeEndpoint(url, res);
        break;
      default:
        res.writeHead(404).end();
        break;
    }
  });
  server2.listen(port, "0.0.0.0");
  console.log(`Server started (http://127.0.0.1:${port})`);
  return server2;
}
function createUrlClassInstance(req) {
  try {
    if (typeof req.url !== "string" || req.url.length === 0) {
      throw new Error("The request URL was not provided.");
    }
    if (req.url.length > 255) {
      throw new Error("The request URL is not allowed to exceed a limit of 255 characters.");
    }
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error('Missing "BASE_URL" environment variable.');
    }
    return new URL(req.url, baseUrl);
  } catch (err) {
    console.error(err);
    return null;
  }
}

// src/app.js
var server = startServer(8e3);
process.on("SIGTERM", exitGracefully);
process.on("SIGINT", exitGracefully);
function exitGracefully(signal) {
  if (!server) {
    return;
  }
  console.log(`Closing server now, cause received ${signal}.`);
  server.close((err) => {
    if (err) {
      console.error("Forcing exit, cause error occurred while closing server: ", err);
      process.exit(1);
    } else {
      console.log("Server successfully closed.");
      process.exit(0);
    }
  });
  setTimeout(() => {
    console.error("Forcing exit, cause timeout occurred while closing server.");
    process.exit(1);
  }, 10 * 1e3);
}
