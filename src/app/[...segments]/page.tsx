import type { Metadata } from "next";
import { AppShell } from "@/components/dueneo/app-shell";
import { categories, getCategoryByRoute } from "@/data/categories";
import { games, getGame } from "@/data/games";
import { tools, getTool } from "@/data/tools";

type RouteProps = {
  params: Promise<{ segments: string[] }>;
};

const legalPages: Record<string, { title: string; description: string }> = {
  about: {
    title: "About Dueneo — Private Browser Tools & Classic Games",
    description: "Learn how Dueneo builds useful, private browser tools and lightweight games.",
  },
  contact: {
    title: "Contact Dueneo",
    description: "Report a bug, suggest a tool, or contact the team behind Dueneo.",
  },
  "privacy-policy": {
    title: "Privacy Policy — Dueneo",
    description: "How Dueneo handles browser data, tool inputs, cookies, advertising, and privacy.",
  },
  terms: {
    title: "Terms of Use — Dueneo",
    description: "Terms for using Dueneo's free browser tools and classic games.",
  },
  "cookie-policy": {
    title: "Cookie Policy — Dueneo",
    description: "How Dueneo uses consent, cookies, local storage, and advertising technologies.",
  },
  tools: {
    title: "All Free Browser Tools — Dueneo",
    description: "Browse and filter all free Dueneo image, PDF, developer, business, finance, design, SEO, utility and creator tools.",
  },
};

const DEFAULT_IMAGE = {
  url: "/logo.svg",
  width: 128,
  height: 128,
  alt: "Dueneo",
};

function absoluteTitle(title: string): string {
  return title.trim().endsWith("| Dueneo") || title.includes("— Dueneo")
    ? title
    : `${title} | Dueneo`;
}

function metadataFor(
  title: string,
  description: string,
  pathname: string
): Metadata {
  const canonical = `https://dueneo.com${pathname}`;
  const finalTitle = absoluteTitle(title);
  return {
    title: { absolute: finalTitle },
    description,
    alternates: { canonical: pathname },
    openGraph: {
      title: finalTitle,
      description,
      url: canonical,
      siteName: "Dueneo",
      type: "website",
      images: [DEFAULT_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description,
      images: ["/logo.svg"],
    },
  };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...tools.map((tool) => ({ segments: [tool.slug] })),
    ...categories.map((category) => ({ segments: [category.route] })),
    ...games.map((game) => ({ segments: ["games", game.slug] })),
    ...Object.keys(legalPages).map((slug) => ({ segments: [slug] })),
  ];
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { segments } = await params;
  if (segments.length === 2 && segments[0] === "games") {
    const game = getGame(segments[1]);
    if (game) {
      return metadataFor(game.seoTitle, game.metaDescription, `/games/${game.slug}/`);
    }
  }

  if (segments.length === 1) {
    const slug = segments[0];
    const tool = getTool(slug);
    if (tool) return metadataFor(tool.seoTitle, tool.metaDescription, `/${tool.slug}/`);

    const category = getCategoryByRoute(slug);
    if (category) {
      return metadataFor(
        `Free ${category.name} — Browser-Based Utilities`,
        category.longDescription,
        `/${category.route}/`
      );
    }

    const legal = legalPages[slug];
    if (legal) return metadataFor(legal.title, legal.description, `/${slug}/`);
  }

  return {};
}

export default async function RoutePage({ params }: RouteProps) {
  const { segments } = await params;
  return <AppShell initialPath={`/${segments.join("/")}`} />;
}
