import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { products } from "@/data/products";
import { categories } from "@/data/categories";
import { Input } from "@/components/ui/input";

export function SearchBar({ onSubmitted }: { onSubmitted?: () => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return { products: [], categories: [] };
    return {
      products: products.filter((p) => p.name.toLowerCase().includes(t) || p.tags.some((tag) => tag.toLowerCase().includes(t))).slice(0, 5),
      categories: categories.filter((c) => c.name.toLowerCase().includes(t)).slice(0, 3),
    };
  }, [q]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/search", search: { q } });
    setOpen(false);
    onSubmitted?.();
  };

  return (
    <div className="relative w-full">
      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search products, categories and brands..."
            className="pl-10 pr-9 h-11 rounded-full border-border bg-background"
            aria-label="Search products"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-dark transition-colors hidden sm:block"
        >
          Search
        </button>
      </form>

      {open && q && (suggestions.products.length > 0 || suggestions.categories.length > 0) && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {suggestions.categories.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">Categories</div>
              {suggestions.categories.map((c) => (
                <Link
                  key={c.slug}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  className="block rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {suggestions.products.length > 0 && (
            <div className="p-2 border-t border-border">
              <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">Products</div>
              {suggestions.products.map((p) => (
                <Link
                  key={p.id}
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                  <span className="flex-1 truncate">{p.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
