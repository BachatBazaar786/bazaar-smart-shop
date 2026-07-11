import { Link } from "@tanstack/react-router";
import type { Category } from "@/data/categories";
import { ArrowUpRight } from "lucide-react";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to="/category/$slug"
      params={{ slug: category.slug }}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img src={category.image} alt={category.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{category.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{category.description}</p>
        </div>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
