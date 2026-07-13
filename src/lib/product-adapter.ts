import type { Product } from "@/data/products";
import type { ProductListItem, ProductDetail } from "@/types/catalog";

export function toListItem(p: Product): ProductListItem {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    stock: p.stock,
    rating: p.rating,
    reviewCount: p.reviewCount,
    image: p.images[0],
    category: { slug: p.categorySlug, name: p.category },
    bestSeller: !!p.bestSeller,
    newArrival: !!p.newArrival,
    onDeal: !!p.onDeal,
    featured: !!p.featured,
  };
}

export function toListItems(ps: Product[]): ProductListItem[] {
  return ps.map(toListItem);
}

export function toDetail(p: Product): ProductDetail {
  return {
    ...toListItem(p),
    sku: p.sku,
    shortDescription: p.shortDescription,
    description: p.description,
    images: p.images,
    benefits: p.benefits,
    usage: p.usage,
    tags: p.tags,
    specifications: p.specifications,
  };
}
