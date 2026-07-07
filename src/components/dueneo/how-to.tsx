"use client";

import { cn } from "@/lib/utils";

export interface Step {
  title: string;
  description: React.ReactNode;
}

export function HowTo({
  steps,
  title = "How to use",
  className,
}: {
  steps: Step[];
  title?: string;
  className?: string;
}) {
  return (
    <section aria-label={title} className={cn("scroll-mt-20", className)}>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <ol className="mt-4 space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">{s.title}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
