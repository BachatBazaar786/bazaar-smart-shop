import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { products } from "@/data/products";
import { categories } from "@/data/categories";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const searchSchema = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc", "best", "rating"]).optional(),
  deals: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop — BachatAtBazaar.pk" }, { name: "description", content: "Browse all products across categories at BachatAtBazaar.pk." }] }),
  validateSearch: searchSchema,
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [selectedCats, setSelectedCats] = useState<string[]>(search.cat ? [search.cat] : []);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [q, setQ] = useState(search.q ?? "");
  const sort = search.sort ?? "featured";

  const filtered = useMemo(() => {
    let list = products.slice();
    if (search.deals) list = list.filter((p) => p.onDeal);
    if (selectedCats.length) list = list.filter((p) => selectedCats.includes(p.categorySlug));
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(t) || p.tags.some((tag) => tag.includes(t)));
    }
    list = list.filter((p) => {
      const price = p.salePrice ?? p.price;
      return price >= priceRange[0] && price <= priceRange[1];
    });
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
    if (minRating) list = list.filter((p) => p.rating >= minRating);
    switch (sort) {
      case "price-asc": list.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price)); break;
      case "price-desc": list.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price)); break;
      case "newest": list.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0)); break;
      case "best": list.sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0)); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
    }
    return list;
  }, [selectedCats, priceRange, inStockOnly, minRating, q, sort, search.deals]);

  const toggleCat = (slug: string) =>
    setSelectedCats((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]));

  const clearAll = () => {
    setSelectedCats([]);
    setPriceRange([0, 5000]);
    setInStockOnly(false);
    setMinRating(0);
    setQ("");
    navigate({ search: {} as never });
  };

  const activeCount = selectedCats.length + (inStockOnly ? 1 : 0) + (minRating ? 1 : 0) + (search.deals ? 1 : 0);

  const Filters = (
    <div className="space-y-6">
      <div>
        <div className="font-semibold mb-3 text-sm">Search</div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search within products..." />
      </div>
      <div>
        <div className="font-semibold mb-3 text-sm">Categories</div>
        <div className="space-y-2">
          {categories.map((c) => (
            <label key={c.slug} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selectedCats.includes(c.slug)} onCheckedChange={() => toggleCat(c.slug)} />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="font-semibold mb-3 text-sm">Price (Rs)</div>
        <Slider min={0} max={5000} step={50} value={priceRange} onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])} />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Rs {priceRange[0]}</span><span>Rs {priceRange[1]}</span>
        </div>
      </div>
      <div>
        <div className="font-semibold mb-3 text-sm">Availability</div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={inStockOnly} onCheckedChange={(v) => setInStockOnly(!!v)} />
          <span>In stock only</span>
        </label>
      </div>
      <div>
        <div className="font-semibold mb-3 text-sm">Minimum rating</div>
        <div className="flex gap-1">
          {[0, 3, 4, 4.5].map((r) => (
            <button key={r} onClick={() => setMinRating(r)} className={`rounded-md border px-3 py-1.5 text-xs ${minRating === r ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}>
              {r === 0 ? "Any" : `${r}★ +`}
            </button>
          ))}
        </div>
      </div>
      {activeCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearAll}>Clear all filters</Button>
      )}
    </div>
  );

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "Shop" }]} />
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Shop</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} product{filtered.length !== 1 && "s"} found</p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden gap-2">
                <SlidersHorizontal className="h-4 w-4" /> Filters
                {activeCount > 0 && <span className="rounded-full bg-primary text-primary-foreground text-[10px] px-1.5">{activeCount}</span>}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-80 overflow-y-auto p-6">
              {Filters}
            </SheetContent>
          </Sheet>
          <Select value={sort} onValueChange={(v) => navigate({ search: { ...search, sort: v as never } })}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="best">Best selling</SelectItem>
              <SelectItem value="rating">Highest rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedCats.map((s) => {
            const c = categories.find((x) => x.slug === s);
            return c ? (
              <button key={s} onClick={() => toggleCat(s)} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs">
                {c.name} <X className="h-3 w-3" />
              </button>
            ) : null;
          })}
          {inStockOnly && (
            <button onClick={() => setInStockOnly(false)} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs">In stock <X className="h-3 w-3" /></button>
          )}
          {minRating > 0 && (
            <button onClick={() => setMinRating(0)} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs">{minRating}★+ <X className="h-3 w-3" /></button>
          )}
          {search.deals && (
            <button onClick={() => navigate({ search: { ...search, deals: undefined } })} className="inline-flex items-center gap-1 rounded-full bg-savings text-savings-foreground px-3 py-1 text-xs">On sale <X className="h-3 w-3" /></button>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="hidden lg:block">{Filters}</aside>
        <div><ProductGrid products={filtered} /></div>
      </div>
    </div>
  );
}
