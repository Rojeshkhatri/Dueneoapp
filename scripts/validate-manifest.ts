import { readFile } from "node:fs/promises";
import { categories } from "../src/data/categories";
import { games } from "../src/data/games";
import { tools } from "../src/data/tools";

const errors: string[] = [];

function duplicates(values: string[]) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

const toolSlugs = tools.map((tool) => tool.slug);
const toolIds = tools.map((tool) => String(tool.id));
const gameSlugs = games.map((game) => game.slug);
const categoryRoutes = categories.map((category) => category.route);
const categorySlugs = new Set(categories.map((category) => category.slug));

for (const [label, values] of [
  ["tool slug", toolSlugs],
  ["tool id", toolIds],
  ["game slug", gameSlugs],
  ["category route", categoryRoutes],
] as const) {
  const repeated = duplicates([...values]);
  if (repeated.length) errors.push(`Duplicate ${label}(s): ${repeated.join(", ")}`);
}

const knownTools = new Set(toolSlugs);
for (const tool of tools) {
  if (!categorySlugs.has(tool.category)) errors.push(`${tool.slug}: unknown category ${tool.category}`);
  if (!tool.implemented || !tool.component) errors.push(`${tool.slug}: tool is not fully implemented`);
  if (!tool.seoTitle.trim() || !tool.metaDescription.trim()) errors.push(`${tool.slug}: missing SEO metadata`);
  for (const related of tool.related) {
    if (!knownTools.has(related)) errors.push(`${tool.slug}: related tool ${related} does not exist`);
    if (related === tool.slug) errors.push(`${tool.slug}: tool relates to itself`);
  }
}

for (const category of categories.filter((item) => item.slug !== "games")) {
  if (!tools.some((tool) => tool.category === category.slug)) {
    errors.push(`${category.route}: category contains no tools`);
  }
}

for (const game of games) {
  if (!game.implemented || !game.component) errors.push(`${game.slug}: game is not fully implemented`);
}

async function main() {
const sitemap = await readFile("public/sitemap.xml", "utf8");
for (const path of [
  "/tools/",
  ...tools.map((tool) => `/${tool.slug}/`),
  ...categories.map((category) => `/${category.route}/`),
  ...games.map((game) => `/games/${game.slug}/`),
]) {
  if (!sitemap.includes(`<loc>https://dueneo.com${path}</loc>`)) {
    errors.push(`Sitemap missing ${path}`);
  }
}

const sharedFiles = await Promise.all(
  [
    "src/lib/dueneo/router.tsx",
    "src/components/dueneo/home-page.tsx",
    "src/components/dueneo/related-items.tsx",
    "src/components/dueneo/consent-banner.tsx",
    "src/components/dueneo/legal-content.tsx",
  ].map(async (path) => [path, await readFile(path, "utf8")] as const)
);

for (const [path, source] of sharedFiles) {
  if (/href=["']#\//.test(source)) errors.push(`${path}: legacy hash link found`);
}

const homeSource = sharedFiles.find(([path]) => path.endsWith("home-page.tsx"))?.[1] ?? "";
if (/Ten tool categories|Search 100\+|count:\s*\d+/.test(homeSource)) {
  errors.push("Homepage contains stale hard-coded catalogue copy or counts");
}

const relatedSource = sharedFiles.find(([path]) => path.endsWith("related-items.tsx"))?.[1] ?? "";
if (relatedSource.includes('to="/image-tools"')) {
  errors.push("Related tools contains a hard-coded Image Tools destination");
}

if (errors.length) {
  console.error(`Manifest validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Manifest valid: ${tools.length} tools, ${categories.length - 1} tool categories, ${games.length} games.`
  );
}
}

void main();
