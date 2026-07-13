import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag } from "lucide-react";
import type { ProductListItem } from "@/types/catalog";
import { Price, discountPct } from "./Price";
import { Rating } from "./Rating";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { toast } from "sonner";

export function ProductCard({ product }: { product: ProductListItem }) {
  const cart = useCart();
  const wishlist = useWishlist();
  const pct = discountPct(product.price, product.salePrice ?? undefined);
  const inWishlist = wishlist.has(product.id);

  return (
    <div className="group relative flex flex-col rounded-lg border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {pct > 0 && (
            <span className="rounded bg-savings px-2 py-0.5 text-[11px] font-bold text-savings-foreground shadow-sm">
              -{pct}%
            </span>
          )}
          {product.newArrival && (
            <span className="rounded bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow-sm">
              NEW
            </span>
          )}
          {product.bestSeller && (
            <span className="rounded bg-foreground/90 px-2 py-0.5 text-[11px] font-bold text-background shadow-sm">
              BEST SELLER
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            wishlist.toggle({
              id: product.id,
              slug: product.slug,
              name: product.name,
              image: product.image,
              price: product.price,
              salePrice: product.salePrice,
            });
            toast(inWishlist ? "Removed from wishlist" : "Added to wishlist");
          }}
          aria-label="Toggle wishlist"
          className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur border border-border hover:bg-background"
        >
          <Heart className={`h-4 w-4 ${inWishlist ? "fill-destructive text-destructive" : "text-foreground/70"}`} />
        </button>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        {product.category && (
          <Link
            to="/category/$slug"
            params={{ slug: product.category.slug }}
            className="text-[11px] uppercase tracking-wide text-muted-foreground hover:text-primary"
          >
            {product.category.name}
          </Link>
        )}
        <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
          <h3 className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary transition-colors min-h-10">
            {product.name}
          </h3>
        </Link>
        <Rating value={product.rating} count={product.reviewCount} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <Price price={product.price} salePrice={product.salePrice ?? undefined} />
        </div>
        <button
          type="button"
          disabled={product.stock <= 0}
          onClick={() => {
            cart.add({
              id: product.id,
              slug: product.slug,
              name: product.name,
              image: product.image,
              price: product.price,
              salePrice: product.salePrice,
              stock: product.stock,
            });
            toast.success("Added to cart");
          }}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <ShoppingBag className="h-4 w-4" />
          {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
        </button>
        {product.stock > 0 && product.stock < 15 && (
          <div className="text-[11px] text-savings-foreground/80">Only {product.stock} left in stock</div>
        )}
      </div>
    </div>
  );
}
