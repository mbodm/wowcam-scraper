// src/api/server.js
import { createServer } from "node:http";

// src/curse/scrape.js
async function scrapeAddonSite(addonSlug) {
  try {
    const url = `https://www.curseforge.com/wow/addons/${addonSlug}`;
    const response = await fetch("http://flaresolverr:8191/v1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url,
        maxTimeout: 3e4
      })
    });
    if (!response.ok) {
      throw new Error(`The received response status (from internal FlareSolverr API) was HTTP ${response.status}`);
    }
    const obj = await response.json();
    validateFlareSolverrResponseObject(obj);
    const siteJson = getAddonSiteJson(obj);
    const siteHeaders = getAddonSiteHeaders(obj);
    return success({ siteJson, siteHeaders });
  } catch (err) {
    console.log(err);
    return error("An internal exception occurred while scraping (see log for details).");
  }
}
function error(msg) {
  return { success: false, error: msg };
}
function success(result) {
  return { success: true, error: "", ...result };
}
function validateFlareSolverrResponseObject(obj) {
  if (!obj) {
    throw new Error("The received response object (from internal FlareSolverr API) was null or undefined");
  }
  const invalid = !obj.solution || !obj.status || obj.message === void 0 || !obj.solution.status || !obj.solution.headers || !obj.solution.response || !obj.solution.cookies || !obj.solution.userAgent === void 0;
  if (invalid) {
    console.log("FlareSolverr response object was:");
    console.log(obj);
    throw new Error("The received response content (from internal FlareSolverr API) had not the expected JSON format");
  }
  if (obj.status.toLowerCase() !== "ok") {
    console.log(`FlareSolverr response object "status" was "${obj.status}"`);
    console.log(`FlareSolverr response object "message" was "${obj.message}"`);
    throw new Error("The received response object (from internal FlareSolverr API) indicates that scraping was not successful");
  }
}
function getAddonSiteJson(obj) {
  const html = obj.solution.response;
  const projectJson = extractProjectJson(html);
  const project = JSON.parse(projectJson);
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
  const cookies = cookiesArray.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  if (!userAgent || !cookies) {
    throw new Error("Could not determine valid Curse addon site header data (user-agent and cookies)");
  }
  return { userAgent, cookies };
}
function extractProjectJson(html) {
  console.log("----------");
  console.log(html);
  console.log("----------");
  const scriptStartMarker = '<script>self.__next_f.push([1, "17:';
  const scriptStartPos = html.indexOf(scriptStartMarker);
  if (scriptStartPos === -1) {
    throw new Error("Could not find the starting <script> tag of Next.js flight transport data (element 17) in Curse addon site");
  }
  const scriptEndMarker = "</script>";
  const scriptEndPos = html.indexOf(scriptEndMarker, scriptStartPos);
  if (scriptEndPos === -1) {
    throw new Error("Could not find the closing </script> tag of Next.js flight transport data (element 17) in Curse addon site");
  }
  const scriptContent = html.substring(scriptStartPos, scriptEndPos);
  const projectJsonStartMarker = '"project":{';
  const projectJsonStartPos = scriptContent.indexOf(projectJsonStartMarker);
  if (projectJsonStartPos === -1) {
    throw new Error('Could not find start for "project" JSON part of Next.js flight transport data (element 17) in Curse addon site');
  }
  const startPos = projectJsonStartPos + projectJsonStartMarker.length - 1;
  let braceCount = 0;
  let endPos = -1;
  for (let i = startPos; i < scriptContent.length; i++) {
    const char = scriptContent[i];
    if (char === "{") braceCount++;
    else if (char === "}") {
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
  const projectJson = scriptContent.substring(startPos, endPos);
  const projectJsonUnescaped = projectJson.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "	").replace(/\\\\/g, "\\");
  return projectJsonUnescaped;
}

// src/curse/eval.js
function evalSiteJson(siteJson) {
  let obj;
  try {
    obj = JSON.parse(siteJson);
  } catch (err) {
    console.log(err);
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
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive"
    };
    const response = await fetch(scrapedDownloadUrl, { method: "GET", headers });
    return response.url;
  } catch (err) {
    console.log(err);
    return "Error: Could not fetch the final download URL (after all redirects).";
  }
}

// src/api/routes.js
function root(res) {
  res.setHeader("Content-Type", "text/plain");
  res.statusCode = 200;
  res.end("hello");
}
async function scrape(url, req, res) {
  const addonParam = url.searchParams.get("addon");
  if (!addonParam) {
    return error3(res, 400, 'Missing "addon" query parameter in request URL.');
  }
  const scrapeStep = await scrapeAddonSite(addonParam.toLocaleLowerCase());
  if (!scrapeStep.success) {
    const code = scrapeStep.error.includes("page does not exist") ? 400 : 500;
    return error3(res, code, scrapeStep.error);
  }
  const siteJson = scrapeStep.siteJson;
  const pureParam = url.searchParams.get("pure");
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
  const result = createSuccessResult(evalStep);
  return success3(res, result);
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
function createSuccessResult(evalStep) {
  const { success: success4, error: error4, ...objWithoutSuccessAndError } = evalStep;
  return objWithoutSuccessAndError;
}

// src/api/server.js
function startServer(port) {
  const server = createServer(async (req, res) => {
    if (req.url.length > 255) {
      res.setHeader("Content-Type", "text/plain");
      res.statusCode = 400;
      res.end("URL is not allowed to exceed a limit of 255 characters");
      return;
    }
    const url = createUrl(req);
    switch (url.pathname) {
      case "/":
        req.method === "GET" ? root(res) : methodNotAllowed(req, res, url);
        break;
      case "/scrape":
        req.method === "GET" ? scrape(url, req, res) : methodNotAllowed(req, res, url);
        break;
      case "/favicon.ico":
        req.method === "GET" ? handleFaviconRequest(res) : methodNotAllowed(req, res, url);
        break;
      default:
        routeNotFound(res, url);
        break;
    }
  });
  server.listen(port, "0.0.0.0");
  console.log(`Server started (http://localhost:${port})`);
}
function createUrl(req) {
  const proto = req.headers["x-forwarded-proto"] ?? "http";
  const url = new URL(req.url, `${proto}://${req.headers.host}`);
  return url;
}
function methodNotAllowed(req, res, url) {
  console.log(`HTTP ${req.method} method not allowed for requested "${url.pathname}" path`);
  res.writeHead(405, { "Content-Type": "text/plain", "Allow": "GET" });
  res.end();
}
function handleFaviconRequest(res) {
  res.statusCode = 404;
  res.end();
}
function routeNotFound(res, url) {
  console.log(`No route handler implemented for requested "${url.pathname}" path`);
  res.statusCode = 404;
  res.end();
}

// src/app.js
process.on("SIGTERM", () => {
  console.log("Received SIGTERM signal (and therefore exit process now)");
  process.exit(0);
});
startServer(8e3);
