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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
        >
          <path
            d="M4 7L12 3L20 7V17L12 21L4 17V7Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9 12L12 9L15 12L12 15L9 12Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="text-lg tracking-tight">Dueneo</span>
    </RouterLink>
  );
}
