/**
 * Post-build script: generates static HTML files for every tool, category,
 * and game page. Each file contains proper <meta> tags, canonical URL,
 * JSON-LD structured data, and noscript content — all in the raw HTML
 * so search engines can index without JavaScript.
 *
 * After generation, each page redirects to the SPA hash route via JS.
 */

const fs = require("fs");
const path = require("path");

const BASE = "https://dueneo.com";
const OUT = path.join(__dirname, "..", "out");
const TEMPLATE = fs.readFileSync(path.join(OUT, "index.html"), "utf8");

// ─── Extract metadata from source files ──────────────────────────────────────

function extractTools() {
  const content = fs.readFileSync(
    path.join(__dirname, "..", "src", "data", "tools.ts"),
    "utf8"
  );
  const tools = [];
  const blocks = content.split(/\{\s*\n\s*id:/);
  for (const block of blocks) {
    if (!block.includes("slug:")) continue;
    const get = (key) => {
      const m = block.match(new RegExp(key + ':\\s*"([^"]*)"'));
      return m ? m[1] : "";
    };
    const slug = get("slug");
    if (!slug) continue;
    tools.push({
      slug,
      name: get("name"),
      category: get("category"),
      summary: get("summary"),
      seoTitle: get("seoTitle"),
      metaDescription: get("metaDescription"),
      keywords: (block.match(/keywords:\s*\[([^\]]*)\]/)?.[1] || "")
        .split(",")
        .map((k) => k.trim().replace(/"/g, ""))
        .filter(Boolean),
    });
  }
  return tools;
}

function extractCategories() {
  const content = fs.readFileSync(
    path.join(__dirname, "..", "src", "data", "categories.ts"),
    "utf8"
  );
  const cats = [];
  const regex = /slug:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?route:\s*"([^"]+)"[\s\S]*?description:\s*"([^"]+)"[\s\S]*?longDescription:\s*\n\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    cats.push({
      slug: m[1],
      name: m[2],
      route: m[3],
      description: m[4],
      longDescription: m[5],
    });
  }
  return cats;
}

function extractGames() {
  const content = fs.readFileSync(
    path.join(__dirname, "..", "src", "data", "games.ts"),
    "utf8"
  );
  const games = [];
  const blocks = content.split(/\{\s*\n\s*id:/);
  for (const block of blocks) {
    if (!block.includes("slug:")) continue;
    const get = (key) => {
      const m = block.match(new RegExp(key + ':\\s*"([^"]*)"'));
      return m ? m[1] : "";
    };
    const slug = get("slug");
    if (!slug) continue;
    games.push({
      slug,
      name: get("name"),
      summary: get("summary"),
      seoTitle: get("seoTitle"),
      metaDescription: get("metaDescription"),
      keywords: (block.match(/keywords:\s*\[([^\]]*)\]/)?.[1] || "")
        .split(",")
        .map((k) => k.trim().replace(/"/g, ""))
        .filter(Boolean),
    });
  }
  return games;
}

// ─── Escape HTML ─────────────────────────────────────────────────────────────

function esc(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Generate HTML for a tool page ───────────────────────────────────────────

function toolPage(tool) {
  const url = `${BASE}/${tool.slug}/`;
  const ogImage = `${BASE}/logo.svg`;
  const keywords = tool.keywords.join(", ");

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: tool.name,
        url,
        description: tool.summary,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: tool.name,
            item: url,
          },
        ],
      },
    ],
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(tool.seoTitle)} | Dueneo</title>
  <meta name="description" content="${esc(tool.metaDescription)}">
  <meta name="keywords" content="${esc(keywords)}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${esc(tool.seoTitle)}">
  <meta property="og:description" content="${esc(tool.metaDescription)}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Dueneo">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(tool.seoTitle)}">
  <meta name="twitter:description" content="${esc(tool.metaDescription)}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="google-adsense-account" content="ca-pub-4725076822352086">
  <script type="application/ld+json">${jsonLd}</script>
  <script>window.location.replace("/#/${tool.slug}");</script>
</head>
<body>
  <noscript>
    <h1>${esc(tool.name)}</h1>
    <p>${esc(tool.summary)}</p>
    <p><strong>Keywords:</strong> ${esc(keywords)}</p>
    <p>This tool runs entirely in your browser. <a href="${BASE}">Visit Dueneo</a> to use it.</p>
  </noscript>
</body>
</html>`;
}

// ─── Generate HTML for a category page ───────────────────────────────────────

function categoryPage(cat) {
  const url = `${BASE}/${cat.route}/`;
  const ogImage = `${BASE}/logo.svg`;

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: cat.name, item: url },
    ],
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Free ${esc(cat.name)} — Browser-Based Utilities | Dueneo</title>
  <meta name="description" content="${esc(cat.longDescription)}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="Free ${esc(cat.name)} — Dueneo">
  <meta property="og:description" content="${esc(cat.longDescription)}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Dueneo">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Free ${esc(cat.name)} — Dueneo">
  <meta name="twitter:description" content="${esc(cat.longDescription)}">
  <meta name="twitter:image" content="${ogImage}">
  <script type="application/ld+json">${jsonLd}</script>
  <script>window.location.replace("/#/${cat.route}");</script>
</head>
<body>
  <noscript>
    <h1>${esc(cat.name)}</h1>
    <p>${esc(cat.longDescription)}</p>
    <p><a href="${BASE}">Visit Dueneo</a> to browse all tools.</p>
  </noscript>
</body>
</html>`;
}

// ─── Generate HTML for a game page ───────────────────────────────────────────

function gamePage(game) {
  const url = `${BASE}/games/${game.slug}/`;
  const ogImage = `${BASE}/logo.svg`;

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Game",
    name: game.name,
    url,
    description: game.summary,
    gameItem: "Browser",
    gameLocation: "Online",
    numberOfPlayers: "1",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(game.seoTitle)} | Dueneo</title>
  <meta name="description" content="${esc(game.metaDescription)}">
  <meta name="keywords" content="${esc(game.keywords.join(", "))}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${esc(game.seoTitle)}">
  <meta property="og:description" content="${esc(game.metaDescription)}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Dueneo">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(game.seoTitle)}">
  <meta name="twitter:description" content="${esc(game.metaDescription)}">
  <meta name="twitter:image" content="${ogImage}">
  <script type="application/ld+json">${jsonLd}</script>
  <script>window.location.replace("/#/games/${game.slug}");</script>
</head>
<body>
  <noscript>
    <h1>${esc(game.name)}</h1>
    <p>${esc(game.summary)}</p>
    <p><a href="${BASE}">Visit Dueneo</a> to play.</p>
  </noscript>
</body>
</html>`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const tools = extractTools();
  const categories = extractCategories();
  const games = extractGames();

  console.log(
    `Generating static pages: ${tools.length} tools, ${categories.length} categories, ${games.length} games`
  );

  // Tool pages: out/<slug>/index.html
  for (const tool of tools) {
    const dir = path.join(OUT, tool.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), toolPage(tool));
  }

  // Category pages: out/<route>/index.html
  for (const cat of categories) {
    const dir = path.join(OUT, cat.route);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), categoryPage(cat));
  }

  // Game pages: out/games/<slug>/index.html
  for (const game of games) {
    const dir = path.join(OUT, "games", game.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), gamePage(game));
  }

  console.log(
    `Done. Generated ${tools.length + categories.length + games.length} static pages.`
  );
}

main();
