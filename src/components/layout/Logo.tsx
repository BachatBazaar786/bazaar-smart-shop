import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 group" aria-label="BachatAtBazaar.pk home">
      <span className="grid place-items-center h-9 w-9 rounded-md bg-primary text-primary-foreground font-display text-lg font-bold shadow-sm">
        B
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            BachatAtBazaar<span className="text-savings">.pk</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-0.5">
            Shop Smart. Save More.
          </span>
        </span>
      )}
    </Link>
  );
}
