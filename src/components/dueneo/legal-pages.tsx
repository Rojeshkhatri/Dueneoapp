"use client";

import * as React from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { Mail, Bug, Lightbulb } from "lucide-react";
import { RouterLink } from "@/lib/dueneo/router";
import { usePageMetadata } from "@/lib/dueneo/client-metadata";

export interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

export function LegalPage({
  title,
  description,
  lastUpdated,
  sections,
  crumbs,
  pathname,
}: {
  title: string;
  description?: string;
  lastUpdated?: string;
  sections: LegalSection[];
  crumbs?: { label: string; to?: string }[];
  pathname?: string;
}) {
  usePageMetadata({
    title,
    description: description ?? `${title} on Dueneo.`,
    pathname: pathname ?? `/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  });

  return (
    <main className="dueneo-container flex-1 py-6 sm:py-10">
      <Breadcrumbs items={crumbs ?? [{ label: title }]} />
      <article className="dueneo-content mt-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {lastUpdated && (
            <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          )}
          {description && (
            <p className="mt-3 text-muted-foreground">{description}</p>
          )}
        </header>
        <div className="mt-8 space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}

export function AboutPage() {
  usePageMetadata({
    title: "About Dueneo — Private Browser Tools & Classic Games",
    description: "Learn how Dueneo builds useful, private browser tools and lightweight games.",
    pathname: "/about",
  });
  return (
    <main className="dueneo-container flex-1 py-6 sm:py-10">
      <Breadcrumbs items={[{ label: "About" }]} />
      <article className="dueneo-content mt-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About Dueneo</h1>
        <p className="mt-3 text-muted-foreground">
          Dueneo is an independently operated, browser-first collection of
          practical tools and lightweight classic games. It is designed to be
          useful immediately, without an account or software installation.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Last reviewed: July 10, 2026</p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">Our promises</h2>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Useful.</strong> Each page
              solves a real user problem immediately — no fluff, no detours.
            </li>
            <li>
              <strong className="text-foreground">Private.</strong> All tools
              are designed to process inputs locally in your browser.
              Files and form data are not uploaded for tool processing.
            </li>
            <li>
              <strong className="text-foreground">Fast.</strong> Pages are
              statically delivered, mobile-first, and designed to work without
              unnecessary network round trips.
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">What Dueneo offers</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Dueneo provides over 240 browser-based tools across 16 categories:
            image editing, PDF manipulation, developer utilities, text
            processing, business document generation, financial calculators,
            design helpers, SEO analysis, and more. There are also 15 lightweight
            classic games you can play instantly. Every tool runs entirely in
            your browser — no file uploads, no accounts, no server-side
            processing.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">How we test changes</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Before publishing, we validate every catalogue entry and route,
            run TypeScript and production-build checks, and manually test key
            journeys at desktop and mobile widths. If you find a result that
            looks wrong, include the tool URL and your inputs in a bug report
            when those inputs are safe to share.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">How we make money</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Dueneo is supported by simple, non-obstructive ads. The page must
            remain useful even if ads fail to load. We never place ads near
            copy/download/play buttons, never use popups, and never use forced
            interstitials. Sensitive tools (like the password generator or JWT
            decoder) show fewer ads by default.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">How the site is built</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Dueneo is built with modern web technologies and served as static
            pages for fast loading worldwide. All tool logic runs client-side
            using browser APIs like Canvas, Web Crypto, and File System Access.
            The site is open about its architecture: your data stays on your
            device because the code literally cannot send it elsewhere.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">Get in touch</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Spotted a bug or have a tool suggestion? Head to our{" "}
            <RouterLink to="/contact" className="text-primary hover:underline">
              contact page
            </RouterLink>
            .
          </p>
        </section>
      </article>
    </main>
  );
}

export function ContactPage() {
  usePageMetadata({
    title: "Contact Dueneo",
    description: "Report a bug, suggest a tool, or contact the team behind Dueneo.",
    pathname: "/contact",
  });
  return (
    <main className="dueneo-container flex-1 py-6 sm:py-10">
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <article className="dueneo-content mt-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact Dueneo</h1>
        <p className="mt-3 text-muted-foreground">
          Dueneo is maintained independently. Messages are reviewed, although
          a personal reply cannot be guaranteed. Pick the option that best
          matches your message.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </span>
            <h3 className="mt-3 text-sm font-semibold">General email</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Questions, feedback, partnerships:
            </p>
            <a
              href="mailto:hello@dueneo.com"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              hello@dueneo.com
            </a>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <Bug className="h-4 w-4" />
            </span>
            <h3 className="mt-3 text-sm font-semibold">Bug reports</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Something broken? Tell us the URL, your browser and what you expected.
            </p>
            <a
              href="mailto:bugs@dueneo.com"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              bugs@dueneo.com
            </a>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Lightbulb className="h-4 w-4" />
            </span>
            <h3 className="mt-3 text-sm font-semibold">Tool suggestions</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Have an idea for a browser-only tool? We&apos;d love to hear it.
            </p>
            <a
              href="mailto:ideas@dueneo.com"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              ideas@dueneo.com
            </a>
          </div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          We do not accept guest posts, paid placements, link exchanges, or
          sponsored tool listings. Please don&apos;t ask.
        </p>
      </article>
    </main>
  );
}
