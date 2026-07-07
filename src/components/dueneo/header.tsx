"use client";

import * as React from "react";
import { Menu, X, Gamepad2, Sparkles } from "lucide-react";
import { Logo } from "./logo";
import { SearchBox } from "./search-box";
import { ThemeToggle } from "./theme-toggle";
import { RouterLink, useRouter } from "@/lib/dueneo/router";
import { categories } from "@/data/categories";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const popularLinks = [
  { label: "Image Compressor", to: "/image-compressor" },
  { label: "JSON Formatter", to: "/json-formatter" },
  { label: "PDF Merge", to: "/pdf-merge" },
  { label: "Password Generator", to: "/password-generator" },
  { label: "Invoice Generator", to: "/invoice-generator" },
];

export function Header() {
  const [open, setOpen] = React.useState(false);
  const { path } = useRouter();

  const isActive = (to: string) =>
    to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="dueneo-container flex h-16 items-center gap-3">
        <Logo />

        {/* Desktop search */}
        <div className="ml-2 hidden flex-1 max-w-md md:block">
          <SearchBox />
        </div>

        {/* Desktop nav */}
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          <CategoryMenu />
          <NavLink to="/games" active={isActive("/games")} icon={<Gamepad2 className="h-3.5 w-3.5" />}>
            Games
          </NavLink>
          <PopularMenu />
          <NavLink to="/about" active={isActive("/about")}>
            About
          </NavLink>
          <ThemeToggle />
        </nav>

        {/* Mobile actions */}
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="h-9 w-9">
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[380px]">
              <SheetHeader>
                <SheetTitle className="text-left">Browse Dueneo</SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-4 overflow-y-auto pb-6">
                <SearchBox variant="default" />
                <div className="space-y-1">
                  <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Categories
                  </p>
                  {categories.map((c) => (
                    <RouterLink
                      key={c.slug}
                      to={`/${c.route}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                    >
                      <c.icon className={`h-4 w-4 ${c.color}`} />
                      {c.name}
                    </RouterLink>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Popular
                  </p>
                  {popularLinks.map((l) => (
                    <RouterLink
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      {l.label}
                    </RouterLink>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Site
                  </p>
                  <RouterLink
                    to="/about"
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2 text-sm hover:bg-accent"
                  >
                    About
                  </RouterLink>
                  <RouterLink
                    to="/contact"
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2 text-sm hover:bg-accent"
                  >
                    Contact
                  </RouterLink>
                  <RouterLink
                    to="/privacy-policy"
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2 text-sm hover:bg-accent"
                  >
                    Privacy
                  </RouterLink>
                  <RouterLink
                    to="/terms"
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2 text-sm hover:bg-accent"
                  >
                    Terms
                  </RouterLink>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  to,
  active,
  children,
  icon,
}: {
  to: string;
  active?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <RouterLink
      to={to}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground"
      )}
    >
      {icon}
      {children}
    </RouterLink>
  );
}

function CategoryMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { navigate } = useRouter();

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Categories
      </button>
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-50 grid w-[560px] grid-cols-2 gap-1 rounded-xl border bg-popover p-2 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                navigate(`/${c.route}`);
                setOpen(false);
              }}
              className="flex items-start gap-3 rounded-lg p-2 text-left hover:bg-accent"
            >
              <span className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-md ${c.accent}`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PopularMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { navigate } = useRouter();

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Popular
      </button>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-xl border bg-popover p-2 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {popularLinks.map((l) => (
            <button
              key={l.to}
              type="button"
              onClick={() => {
                navigate(l.to);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
