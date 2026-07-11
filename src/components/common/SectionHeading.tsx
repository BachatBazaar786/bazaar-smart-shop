import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 md:mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        {eyebrow && <div className="text-xs uppercase tracking-[0.15em] text-primary font-semibold mb-2">{eyebrow}</div>}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ViewAll({ to, params, label = "View all" }: { to: string; params?: Record<string, string>; label?: string }) {
  return (
    <Link
      // @ts-expect-error - dynamic link
      to={to}
      params={params}
      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark"
    >
      {label} <ChevronRight className="h-4 w-4" />
    </Link>
  );
}
