"use client";

import * as React from "react";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { PrivacyNote } from "./privacy-note";
import { AdSlot } from "./ad-slot";
import { FAQ, type QA } from "./faq";
import { HowTo, type Step } from "./how-to";
import { RelatedTools } from "./related-items";
import type { ToolDefinition } from "@/data/tools";
import { getCategory } from "@/data/categories";
import { toolStructuredData, faqStructuredData } from "@/lib/dueneo/seo";

export interface ToolContent {
  intro: React.ReactNode;
  tool: React.ReactNode;
  howTo: Step[];
  examples?: React.ReactNode;
  useCases?: string[];
  limitations?: React.ReactNode;
  faq: QA[];
}

const privacyLevelToType: Record<string, "file" | "sensitive" | "standard"> = {
  file: "file",
  sensitive: "sensitive",
  standard: "standard",
};

export function ToolLayout({
  tool,
  content,
}: {
  tool: ToolDefinition;
  content: ToolContent;
}) {
  const category = getCategory(tool.category);
  const crumbs: Crumb[] = category
    ? [
        { label: category.name, to: `/${category.route}` },
        { label: tool.name },
      ]
    : [{ label: tool.name }];

  React.useEffect(() => {
    document.title = tool.seoTitle.trim().endsWith("| Dueneo")
      ? tool.seoTitle
      : `${tool.seoTitle} | Dueneo`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", tool.metaDescription);
  }, [tool.seoTitle, tool.metaDescription]);

  // Inject JSON-LD structured data.
  React.useEffect(() => {
    if (!category) return;
    const scripts: HTMLScriptElement[] = [];

    // Tool + Breadcrumb schema
    const data = toolStructuredData(tool, category);
    const s1 = document.createElement("script");
    s1.type = "application/ld+json";
    s1.text = JSON.stringify(data);
    document.head.appendChild(s1);
    scripts.push(s1);

    // FAQPage schema
    if (content.faq && content.faq.length > 0) {
      const faqData = faqStructuredData(
        content.faq,
        `https://dueneo.com/${tool.slug}/`
      );
      if (faqData) {
        const s2 = document.createElement("script");
        s2.type = "application/ld+json";
        s2.text = JSON.stringify(faqData);
        document.head.appendChild(s2);
        scripts.push(s2);
      }
    }

    return () => {
      scripts.forEach((s) => {
        if (s.parentNode) s.parentNode.removeChild(s);
      });
    };
  }, [tool, category, content.faq]);

  return (
    <article className="dueneo-container py-6 sm:py-10">
      <Breadcrumbs items={crumbs} />

      <header className="mt-4">
        {category && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {category.name}
            </span>
          </div>
        )}
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{tool.name}</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">{content.intro}</p>
      </header>

      <section aria-label={`${tool.name} tool`} className="mt-6">
        <PrivacyNote level={privacyLevelToType[tool.privacyLevel]} className="mb-3" />
        {content.tool}
      </section>

      <div className="mt-10">
        <AdSlot id="ad-after-tool" placement="after-tool" />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          <HowTo steps={content.howTo} />
          {content.examples && (
            <section aria-label="Examples" className="scroll-mt-20">
              <h2 className="text-2xl font-semibold tracking-tight">Examples</h2>
              <div className="mt-4">{content.examples}</div>
            </section>
          )}
          {content.useCases && content.useCases.length > 0 && (
            <section aria-label="Use cases" className="scroll-mt-20">
              <h2 className="text-2xl font-semibold tracking-tight">Common use cases</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {content.useCases.map((u, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                    {u}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {content.limitations && (
            <section aria-label="Limitations" className="scroll-mt-20">
              <h2 className="text-2xl font-semibold tracking-tight">Limitations</h2>
              <div className="mt-4 text-sm text-muted-foreground">{content.limitations}</div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <h3 className="font-semibold">Privacy & data</h3>
            <p className="mt-2 text-muted-foreground">
              {tool.privacyLevel === "sensitive"
                ? "This is a sensitive tool. Your input never leaves your device — not even temporarily. We do not log, store or transmit what you type."
                : "Your input is processed locally in your browser. Dueneo never uploads your files or data."}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <h3 className="font-semibold">Keywords</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tool.keywords.map((k) => (
                <span key={k} className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {k}
                </span>
              ))}
            </div>
          </div>
          <AdSlot id="ad-sidebar" placement="sidebar" />
        </aside>
      </div>

      <div className="mt-12">
        <FAQ items={content.faq} />
      </div>

      <div className="mt-10">
        <AdSlot id="ad-after-content" placement="after-content" />
      </div>

      <div className="mt-12">
        <RelatedTools tool={tool} />
      </div>
    </article>
  );
}
