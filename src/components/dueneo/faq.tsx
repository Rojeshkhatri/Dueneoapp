"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface QA {
  q: string;
  a: React.ReactNode;
}

export function FAQ({ items, title = "Frequently asked questions" }: { items: QA[]; title?: string }) {
  const [open, setOpen] = useState<string | undefined>(undefined);
  return (
    <section aria-label={title} className="scroll-mt-20">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <Accordion
        type="single"
        collapsible
        value={open}
        onValueChange={(v) => setOpen(v || undefined)}
        className="mt-4"
      >
        {items.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left text-base">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
