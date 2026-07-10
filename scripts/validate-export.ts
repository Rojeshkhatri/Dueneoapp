import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { categories } from "../src/data/categories";
import { games } from "../src/data/games";
import { tools } from "../src/data/tools";

const BASE = "https://dueneo.com";
const legalRoutes = ["about", "contact", "privacy-policy", "terms", "cookie-policy"];
const paths = [
  "/",
  "/tools/",
  ...categories.map((category) => `/${category.route}/`),
  ...tools.map((tool) => `/${tool.slug}/`),
  ...games.map((game) => `/games/${game.slug}/`),
  ...legalRoutes.map((route) => `/${route}/`),
];

function exportFile(pathname: string): string {
  return pathname === "/"
    ? join("out", "index.html")
    : join("out", pathname.slice(1), "index.html");
}

async function main() {
  const errors: string[] = [];
  const titles = new Map<string, string>();

  for (const pathname of paths) {
    let html = "";
    try {
      html = await readFile(exportFile(pathname), "utf8");
    } catch {
      errors.push(`${pathname}: exported HTML is missing`);
      continue;
    }

    const canonical = `${BASE}${pathname}`;
    if (!html.includes(`rel="canonical" href="${canonical}"`)) {
      errors.push(`${pathname}: canonical URL is missing or incorrect`);
    }
    if (!/<meta name="description" content="[^"]+"/.test(html)) {
      errors.push(`${pathname}: meta description is missing`);
    }
    if (!/<h1(?:\s[^>]*)?>/.test(html)) errors.push(`${pathname}: H1 is missing`);
    if (/href="\/#\//.test(html) || /href="#\//.test(html)) {
      errors.push(`${pathname}: legacy hash route found in exported HTML`);
    }

    const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
    if (!title) {
      errors.push(`${pathname}: title is missing`);
    } else if (titles.has(title)) {
      errors.push(`${pathname}: duplicate title also used by ${titles.get(title)}`);
    } else {
      titles.set(title, pathname);
    }
  }

  if (errors.length) {
    console.error(`Export validation failed with ${errors.length} issue(s):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Export valid: ${paths.length} canonical pages with unique titles, descriptions and H1s.`);
}

void main();
