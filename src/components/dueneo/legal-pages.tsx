"use client";

import * as React from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { Mail, Bug, Lightbulb } from "lucide-react";
import { RouterLink } from "@/lib/dueneo/router";

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
}: {
  title: string;
  description?: string;
  lastUpdated?: string;
  sections: LegalSection[];
  crumbs?: { label: string; to?: string }[];
}) {
  React.useEffect(() => {
    document.title = `${title} | Dueneo`;
  }, [title]);

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
  React.useEffect(() => {
    document.title = "About Dueneo — Free Browser Tools & Classic Games";
  }, []);
  return (
    <main className="dueneo-container flex-1 py-6 sm:py-10">
      <Breadcrumbs items={[{ label: "About" }]} />
      <article className="dueneo-content mt-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About Dueneo</h1>
        <p className="mt-3 text-muted-foreground">
          Dueneo is a focused, browser-first platform for practical tools and
          lightweight classic games. We&apos;re not a SaaS, we&apos;re not a
          gaming portal, and we&apos;re not an AI wrapper. We&apos;re a clean,
          durable, SEO-first utility website.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">Our promises</h2>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Useful.</strong> Each page
              solves a real user problem immediately — no fluff, no detours.
            </li>
            <li>
              <strong className="text-foreground">Private.</strong> Tool
              processing happens locally in your browser wherever technically
              possible. Your files and data stay on your device.
            </li>
            <li>
              <strong className="text-foreground">Fast.</strong> Pages are
              static, lightweight, mobile-first, and built for search engines
              and humans alike.
            </li>
          </ul>
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
  React.useEffect(() => {
    document.title = "Contact Dueneo — Free Browser Tools & Classic Games";
  }, []);
  return (
    <main className="dueneo-container flex-1 py-6 sm:py-10">
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <article className="dueneo-content mt-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact Dueneo</h1>
        <p className="mt-3 text-muted-foreground">
          We don&apos;t have a support team of humans, but we read everything
          sent our way. Pick the option that best matches your message.
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
