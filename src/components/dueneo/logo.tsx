import { RouterLink } from "@/lib/dueneo/router";

export function Logo({ className }: { className?: string }) {
  return (
    <RouterLink
      to="/"
      className={`group inline-flex items-center gap-2 font-semibold ${className ?? ""}`}
      aria-label="Dueneo home"
    >
      <span
        aria-hidden
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105"
      >
        <img
          src="/logo.png"
          alt="Dueneo logo"
          width={32}
          height={32}
          className="h-8 w-8"
        />
      </span>
      <span className="text-lg tracking-tight">Dueneo</span>
    </RouterLink>
  );
}
