/**
 * Submit all URLs to IndexNow for instant search engine notification.
 * Supported by: Bing, Yandex, Seznam, Naver, Yep
 *
 * Usage: node scripts/indexnow.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const HOST = "dueneo.com";
const KEY = "fa665ea9-6b61-4460-a340-635b73134618";
const BASE = `https://${HOST}`;

function getUrls() {
  const urls = [`${BASE}/`];

  // Tool pages
  const tools = fs.readFileSync(
    path.join(__dirname, "..", "src", "data", "tools.ts"),
    "utf8"
  );
  const toolSlugs = [...tools.matchAll(/slug:\s*"([^"]+)"/g)]
    .map((m) => m[1])
    .filter((s) => s !== "string");
  for (const slug of toolSlugs) urls.push(`${BASE}/${slug}/`);

  // Category pages
  const cats = fs.readFileSync(
    path.join(__dirname, "..", "src", "data", "categories.ts"),
    "utf8"
  );
  const catRoutes = [...cats.matchAll(/route:\s*"([^"]+)"/g)].map((m) => m[1]);
  for (const route of catRoutes) urls.push(`${BASE}/${route}/`);

  // Game pages
  const games = fs.readFileSync(
    path.join(__dirname, "..", "src", "data", "games.ts"),
    "utf8"
  );
  const gameSlugs = [...games.matchAll(/slug:\s*"([^"]+)"/g)]
    .map((m) => m[1])
    .filter((s) => s !== "string");
  for (const slug of gameSlugs) urls.push(`${BASE}/games/${slug}/`);

  return urls;
}

function submit(endpoint, urls) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `${BASE}/${KEY}.txt`,
      urlList: urls,
    });

    const url = new URL(endpoint);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({ endpoint: url.hostname, status: res.statusCode, body: data })
        );
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const urls = getUrls();
  console.log(`Submitting ${urls.length} URLs to IndexNow...`);

  const endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
    "https://yandex.com/indexnow",
  ];

  const results = await Promise.all(
    endpoints.map((ep) => submit(ep, urls).catch((e) => ({ endpoint: ep, error: e.message })))
  );

  for (const r of results) {
    console.log(`  ${r.endpoint}: ${r.status || r.error}`);
  }

  console.log("Done.");
}

main();
