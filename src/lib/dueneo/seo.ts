import type { ToolDefinition } from "@/data/tools";
import type { GameDefinition } from "@/data/games";
import type { Category } from "@/data/categories";

/**
 * Build JSON-LD structured data for a tool page.
 * Returns a WebApplication + BreadcrumbList payload.
 */
export function toolStructuredData(
  tool: ToolDefinition,
  category: Category
): Record<string, unknown> {
  const base = "https://dueneo.com";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${base}/${tool.slug}/#app`,
        name: tool.name,
        url: `${base}/${tool.slug}/`,
        description: tool.summary,
        applicationCategory: applicationCategory(tool.category),
        operatingSystem: "Any",
        browserRequirements: "Modern browser with JavaScript enabled",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: tool.keywords,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${base}/${tool.slug}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${base}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: category.name,
            item: `${base}/${category.route}/`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: tool.name,
            item: `${base}/${tool.slug}/`,
          },
        ],
      },
    ],
  };
}

export function gameStructuredData(
  game: GameDefinition
): Record<string, unknown> {
  const base = "https://dueneo.com";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Game",
        "@id": `${base}/games/${game.slug}/#game`,
        name: game.name,
        url: `${base}/games/${game.slug}/`,
        description: game.summary,
        gameItem: "Browser",
        gameLocation: "Online",
        numberOfPlayers: "1",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${base}/games/${game.slug}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${base}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Games",
            item: `${base}/games/`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: game.name,
            item: `${base}/games/${game.slug}/`,
          },
        ],
      },
    ],
  };
}

export function categoryStructuredData(category: Category): Record<string, unknown> {
  const base = "https://dueneo.com";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${base}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category.name,
        item: `${base}/${category.route}/`,
      },
    ],
  };
}

function applicationCategory(category: string): string {
  switch (category) {
    case "image":
      return "MultimediaApplication";
    case "pdf":
      return "MultimediaApplication";
    case "developer":
      return "DeveloperApplication";
    case "security":
      return "SecurityApplication";
    case "text":
      return "TextEditor";
    case "business":
      return "BusinessApplication";
    case "finance":
      return "FinanceApplication";
    case "design":
      return "DesignApplication";
    case "seo":
      return "WebApplication";
    default:
      return "UtilitiesApplication";
  }
}
