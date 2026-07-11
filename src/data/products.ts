export type Product = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: string;
  categorySlug: string;
  brand: string;
  shortDescription: string;
  description: string;
  price: number;
  salePrice?: number;
  stock: number;
  images: string[];
  featured?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  onDeal?: boolean;
  tags: string[];
  rating: number;
  reviewCount: number;
  specifications: { label: string; value: string }[];
  benefits: string[];
  usage: string;
};

// Placeholder image helper — using picsum for stable placeholders
const img = (seed: string, w = 800, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const products: Product[] = [
  {
    id: "p1",
    slug: "premium-himalayan-buckwheat-flour-1kg",
    name: "Premium Himalayan Buckwheat Flour",
    sku: "BAB-BF-1000",
    category: "Himalayan Buckwheat",
    categorySlug: "himalayan-buckwheat",
    brand: "BachatAtBazaar",
    shortDescription: "Stone-milled buckwheat flour from Gilgit-Baltistan — naturally gluten-free and nutrient-dense.",
    description:
      "Our Premium Himalayan Buckwheat Flour is stone-milled from carefully selected buckwheat grown in the pristine valleys of Gilgit-Baltistan. Naturally gluten-free, rich in fibre and plant protein, and perfect for chapatis, pancakes, noodles and baking.",
    price: 1450,
    salePrice: 1150,
    stock: 42,
    images: [img("buckwheat-flour-1"), img("buckwheat-flour-2"), img("buckwheat-flour-3")],
    featured: true,
    bestSeller: true,
    onDeal: true,
    tags: ["gluten-free", "stone-milled", "Gilgit-Baltistan"],
    rating: 4.7,
    reviewCount: 128,
    specifications: [
      { label: "Weight", value: "1 kg" },
      { label: "Origin", value: "Gilgit-Baltistan, Pakistan" },
      { label: "Processing", value: "Stone-milled" },
      { label: "Shelf life", value: "9 months" },
    ],
    benefits: [
      "Naturally gluten-free",
      "High in plant-based protein",
      "Good source of dietary fibre",
      "Rich in minerals like magnesium & manganese",
    ],
    usage: "Use in place of wheat flour for chapatis, pancakes, cookies and porridge. Store in a cool, dry place.",
  },
  {
    id: "p2",
    slug: "hulled-buckwheat-groats-500g",
    name: "Hulled Buckwheat Groats",
    sku: "BAB-HB-500",
    category: "Himalayan Buckwheat",
    categorySlug: "himalayan-buckwheat",
    brand: "BachatAtBazaar",
    shortDescription: "Tender, hulled buckwheat groats — perfect for kasha, salads and hearty bowls.",
    description:
      "Cleaned and hulled buckwheat groats ready to cook in minutes. A wholesome, gluten-free grain alternative with a mild, nutty flavour.",
    price: 850,
    salePrice: 720,
    stock: 60,
    images: [img("hulled-buckwheat-1"), img("hulled-buckwheat-2")],
    featured: true,
    bestSeller: true,
    tags: ["gluten-free", "protein"],
    rating: 4.6,
    reviewCount: 74,
    specifications: [
      { label: "Weight", value: "500 g" },
      { label: "Origin", value: "Gilgit-Baltistan, Pakistan" },
    ],
    benefits: ["Complete plant protein", "Cooks in 15 minutes", "Naturally gluten-free"],
    usage: "Rinse, then simmer 1 cup groats in 2 cups water for about 15 minutes.",
  },
  {
    id: "p3",
    slug: "whole-buckwheat-grains-1kg",
    name: "Whole Buckwheat Grains",
    sku: "BAB-WB-1000",
    category: "Himalayan Buckwheat",
    categorySlug: "himalayan-buckwheat",
    brand: "BachatAtBazaar",
    shortDescription: "Unhulled whole buckwheat grains — ideal for sprouting and traditional recipes.",
    description: "Whole buckwheat grains with their protective hull intact — great for sprouting, milling at home, or traditional Himalayan dishes.",
    price: 1250,
    stock: 35,
    images: [img("whole-buckwheat-1"), img("whole-buckwheat-2")],
    newArrival: true,
    tags: ["whole grain", "sprouting"],
    rating: 4.5,
    reviewCount: 32,
    specifications: [
      { label: "Weight", value: "1 kg" },
      { label: "Origin", value: "Gilgit-Baltistan, Pakistan" },
    ],
    benefits: ["Rich in fibre", "Great for sprouting", "Ancient Himalayan grain"],
    usage: "Soak overnight for sprouting, or mill fresh at home for the freshest flour.",
  },
  {
    id: "p4",
    slug: "buckwheat-sobacha-tea-200g",
    name: "Buckwheat Tea (Sobacha)",
    sku: "BAB-BT-200",
    category: "Himalayan Buckwheat",
    categorySlug: "himalayan-buckwheat",
    brand: "BachatAtBazaar",
    shortDescription: "Roasted buckwheat tea with a warm, nutty aroma — caffeine-free and comforting.",
    description: "Slow-roasted buckwheat kernels that steep into a golden, caffeine-free tea with a naturally sweet, toasty flavour.",
    price: 980,
    salePrice: 790,
    stock: 55,
    images: [img("sobacha-tea-1"), img("sobacha-tea-2")],
    featured: true,
    onDeal: true,
    tags: ["caffeine-free", "tea"],
    rating: 4.8,
    reviewCount: 96,
    specifications: [
      { label: "Weight", value: "200 g" },
      { label: "Type", value: "Roasted buckwheat kernels" },
    ],
    benefits: ["Caffeine-free", "Warm nutty aroma", "Easy to brew"],
    usage: "Steep 1 tablespoon in 250 ml hot water for 3–5 minutes.",
  },
  {
    id: "p5",
    slug: "buckwheat-breakfast-cereal-400g",
    name: "Buckwheat Breakfast Cereal",
    sku: "BAB-BC-400",
    category: "Himalayan Buckwheat",
    categorySlug: "himalayan-buckwheat",
    brand: "BachatAtBazaar",
    shortDescription: "Wholesome buckwheat cereal — a warming, gluten-free start to your day.",
    description: "A ready-to-cook buckwheat cereal blend that makes a comforting, fibre-rich breakfast in minutes.",
    price: 1100,
    stock: 40,
    images: [img("buckwheat-cereal-1"), img("buckwheat-cereal-2")],
    newArrival: true,
    tags: ["breakfast", "gluten-free"],
    rating: 4.4,
    reviewCount: 41,
    specifications: [{ label: "Weight", value: "400 g" }],
    benefits: ["High in fibre", "Ready in 5 minutes", "Naturally gluten-free"],
    usage: "Simmer 1/3 cup cereal with 1 cup milk or water for 5 minutes.",
  },
  {
    id: "p6",
    slug: "sea-buckthorn-juice-500ml",
    name: "Sea Buckthorn Juice",
    sku: "BAB-SBJ-500",
    category: "Sea Buckthorn",
    categorySlug: "sea-buckthorn",
    brand: "BachatAtBazaar",
    shortDescription: "Pure Himalayan sea buckthorn juice — vibrant, tangy and packed with vitamin C.",
    description: "Cold-pressed juice from wild-harvested sea buckthorn berries from Gilgit-Baltistan. A vibrant, tangy source of natural vitamin C.",
    price: 2450,
    salePrice: 1990,
    stock: 28,
    images: [img("sea-buckthorn-juice-1"), img("sea-buckthorn-juice-2")],
    featured: true,
    bestSeller: true,
    onDeal: true,
    tags: ["vitamin C", "cold-pressed"],
    rating: 4.9,
    reviewCount: 156,
    specifications: [
      { label: "Volume", value: "500 ml" },
      { label: "Origin", value: "Gilgit-Baltistan, Pakistan" },
    ],
    benefits: ["Rich in natural vitamin C", "Cold-pressed", "No added sugar"],
    usage: "Dilute 30 ml with water or juice. Refrigerate after opening.",
  },
  {
    id: "p7",
    slug: "sea-buckthorn-oil-100ml",
    name: "Sea Buckthorn Berry Oil",
    sku: "BAB-SBO-100",
    category: "Sea Buckthorn",
    categorySlug: "sea-buckthorn",
    brand: "BachatAtBazaar",
    shortDescription: "Golden sea buckthorn oil — a nourishing addition to your daily wellness ritual.",
    description: "Cold-pressed sea buckthorn berry oil, rich in omega fatty acids and carotenoids.",
    price: 3200,
    stock: 18,
    images: [img("sb-oil-1"), img("sb-oil-2")],
    featured: true,
    tags: ["cold-pressed", "wellness"],
    rating: 4.7,
    reviewCount: 62,
    specifications: [{ label: "Volume", value: "100 ml" }],
    benefits: ["Rich in omega fatty acids", "Cold-pressed", "Small-batch"],
    usage: "Take 5 ml daily, or use as directed by a nutritionist.",
  },
  {
    id: "p8",
    slug: "sea-buckthorn-tea-100g",
    name: "Sea Buckthorn Herbal Tea",
    sku: "BAB-SBT-100",
    category: "Sea Buckthorn",
    categorySlug: "sea-buckthorn",
    brand: "BachatAtBazaar",
    shortDescription: "Dried sea buckthorn berries and leaves for a bright, citrusy herbal infusion.",
    description: "A hand-picked blend of dried sea buckthorn berries and leaves for a tart, refreshing tea.",
    price: 1350,
    salePrice: 1150,
    stock: 45,
    images: [img("sb-tea-1"), img("sb-tea-2")],
    newArrival: true,
    onDeal: true,
    tags: ["herbal", "tea"],
    rating: 4.6,
    reviewCount: 38,
    specifications: [{ label: "Weight", value: "100 g" }],
    benefits: ["Caffeine-free", "Naturally tart", "Rich botanical blend"],
    usage: "Steep 1 teaspoon in 250 ml hot water for 5 minutes.",
  },
];

export const findProduct = (slug: string) => products.find((p) => p.slug === slug);
export const featured = () => products.filter((p) => p.featured);
export const bestSellers = () => products.filter((p) => p.bestSeller);
export const newArrivals = () => products.filter((p) => p.newArrival);
export const dealsProducts = () => products.filter((p) => p.onDeal);
export const relatedProducts = (slug: string) => {
  const p = findProduct(slug);
  if (!p) return [];
  return products.filter((x) => x.categorySlug === p.categorySlug && x.slug !== slug).slice(0, 4);
};
