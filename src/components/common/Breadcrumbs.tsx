import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

export type Crumb = { label: string; to?: string; params?: Record<string, string> };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm">
      <ol className="flex items-center gap-1.5 flex-wrap text-muted-foreground">
        <li>
          <Link to="/" className="inline-flex items-center hover:text-primary" aria-label="Home">
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {c.to && i < items.length - 1 ? (
              <Link to={c.to} params={c.params as never} className="hover:text-primary">
                {c.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
