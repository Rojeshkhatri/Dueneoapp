import { RouterLink } from "@/lib/dueneo/router";

export function Logo({ className }: { className?: string }) {
  return (
    <RouterLink
      to="/"
      className={`group inline-flex items-center gap-2.5 font-semibold ${className ?? ""}`}
      aria-label="Dueneo home"
    >
      <img
        src="/logo.svg"
        alt="Dueneo"
        width={36}
        height={36}
        className="h-9 w-9 rounded-lg"
      />
      <span className="text-xl tracking-tight">Dueneo</span>
    </RouterLink>
  );
}
