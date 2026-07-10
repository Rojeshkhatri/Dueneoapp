"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, LineChart, Briefcase, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalculatorTab = "scientific" | "graphing" | "business";

interface CalculatorSuiteProps {
  activeTab: CalculatorTab;
  onTabChange: (tab: CalculatorTab) => void;
  scientific: React.ReactNode;
  graphing: React.ReactNode;
  business: React.ReactNode;
  guide: Record<CalculatorTab, { title: string; sections: GuideSection[] }>;
}

interface GuideSection {
  heading: string;
  content: React.ReactNode;
}

export function CalculatorSuite({
  activeTab,
  onTabChange,
  scientific,
  graphing,
  business,
  guide,
}: CalculatorSuiteProps) {
  const [showGuide, setShowGuide] = React.useState(false);
  const currentGuide = guide[activeTab];

  return (
    <div className="flex flex-col gap-6">
      {/* Calculator switcher */}
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as CalculatorTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scientific" className="gap-1.5">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Scientific</span>
          </TabsTrigger>
          <TabsTrigger value="graphing" className="gap-1.5">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Graphing</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-1.5">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scientific" className="mt-4">
          {scientific}
        </TabsContent>
        <TabsContent value="graphing" className="mt-4">
          {graphing}
        </TabsContent>
        <TabsContent value="business" className="mt-4">
          {business}
        </TabsContent>
      </Tabs>

      {/* Guide section */}
      <Card>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">
              {currentGuide.title} — How to Use
            </span>
          </div>
          {showGuide ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        {showGuide && (
          <CardContent className="border-t pt-4">
            <div className="space-y-6">
              {currentGuide.sections.map((section, i) => (
                <div key={i}>
                  <h3 className="mb-2 text-base font-semibold">{section.heading}</h3>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/** Reusable calculator display */
export function CalcDisplay({
  value,
  expression,
  className,
}: {
  value: string;
  expression?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/30 p-4 text-right",
        className
      )}
    >
      {expression && (
        <div className="truncate text-sm text-muted-foreground">{expression}</div>
      )}
      <div className="truncate text-2xl font-mono font-bold sm:text-3xl">
        {value || "0"}
      </div>
    </div>
  );
}

/** Reusable calculator button grid */
export function CalcButton({
  onClick,
  children,
  variant = "default",
  span = 1,
  className,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "operator" | "function" | "clear" | "equals";
  span?: number;
  className?: string;
}) {
  const variants = {
    default: "bg-background hover:bg-accent border",
    operator: "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20",
    function: "bg-secondary hover:bg-secondary/80 border",
    clear: "bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20",
    equals: "bg-primary text-primary-foreground hover:bg-primary/90",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-12 items-center justify-center rounded-lg text-sm font-medium transition-colors",
        variants[variant],
        span > 1 && `col-span-${span}`,
        className
      )}
    >
      {children}
    </button>
  );
}
