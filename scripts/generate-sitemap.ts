import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { categories } from "../src/data/categories";
import { games } from "../src/data/games";
import { tools } from "../src/data/tools";

const BASE = "https://dueneo.com";
const legalRoutes = ["about", "contact", "privacy-policy", "terms", "cookie-policy"];

const routes = [
  { path: "/", priority: "1.0", frequency: "weekly" },
  { path: "/tools/", priority: "0.9", frequency: "weekly" },
  ...categories.map((category) => ({
    path: `/${category.route}/`,
    priority: "0.8",
    frequency: "weekly",
  })),
  ...tools.map((tool) => ({
    path: `/${tool.slug}/`,
    priority: "0.7",
    frequency: "monthly",
  })),
  ...games.map((game) => ({
    path: `/games/${game.slug}/`,
    priority: "0.7",
    frequency: "monthly",
  })),
  ...legalRoutes.map((route) => ({
    path: `/${route}/`,
    priority: "0.3",
    frequency: "yearly",
  })),
];

const uniqueRoutes = new Map(routes.map((route) => [route.path, route]));
const body = [...uniqueRoutes.values()]
  .map(
    (route) =>
      `  <url><loc>${BASE}${route.path}</loc><changefreq>${route.frequency}</changefreq><priority>${route.priority}</priority></url>`
  )
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

async function main() {
  await writeFile(resolve("public/sitemap.xml"), sitemap, "utf8");
  console.log(`Generated sitemap with ${uniqueRoutes.size} canonical routes.`);
}

void main();
