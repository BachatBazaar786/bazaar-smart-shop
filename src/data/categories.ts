export type Category = {
  slug: string;
  name: string;
  description: string;
  image: string;
  color: string; // tailwind bg class
};

export const categories: Category[] = [
  {
    slug: "himalayan-buckwheat",
    name: "Himalayan Buckwheat",
    description: "Stone-milled flour, groats, tea and cereal from Gilgit-Baltistan.",
    image: `https://picsum.photos/seed/cat-buckwheat/900/700`,
    color: "bg-emerald-50",
  },
  {
    slug: "sea-buckthorn",
    name: "Sea Buckthorn",
    description: "Cold-pressed juice, oil and tea from the wild Himalayan berry.",
    image: `https://picsum.photos/seed/cat-seabuckthorn/900/700`,
    color: "bg-amber-50",
  },
  {
    slug: "natural-foods",
    name: "Natural Foods",
    description: "Wholesome pantry essentials sourced with care.",
    image: `https://picsum.photos/seed/cat-natural/900/700`,
    color: "bg-lime-50",
  },
  {
    slug: "health-wellness",
    name: "Health & Wellness",
    description: "Everyday wellness picks for a balanced lifestyle.",
    image: `https://picsum.photos/seed/cat-wellness/900/700`,
    color: "bg-teal-50",
  },
  {
    slug: "electronics",
    name: "Electronics",
    description: "Smart devices and everyday tech — coming soon.",
    image: `https://picsum.photos/seed/cat-electronics/900/700`,
    color: "bg-slate-100",
  },
  {
    slug: "home-living",
    name: "Home & Living",
    description: "Thoughtfully chosen home essentials — coming soon.",
    image: `https://picsum.photos/seed/cat-home/900/700`,
    color: "bg-stone-100",
  },
];

export const navCategories = [
  { label: "Home", to: "/" },
  { label: "Natural Foods", to: "/category/natural-foods" },
  { label: "Health & Wellness", to: "/category/health-wellness" },
  { label: "Electronics", to: "/category/electronics" },
  { label: "Home & Living", to: "/category/home-living" },
  { label: "Deals", to: "/shop", search: { deals: "1" } as Record<string, string> },
  { label: "New Arrivals", to: "/shop", search: { sort: "newest" } as Record<string, string> },
  { label: "About Us", to: "/about" },
  { label: "Contact", to: "/contact" },
];
