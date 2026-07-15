import { createFileRoute, Link } from "@tanstack/react-router";
import { useWishlist } from "@/context/WishlistContext";
import { ProductGrid } from "@/components/product/ProductGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { Heart } from "lucide-react";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Your wishlist — BachatAtBazaar.pk" },
      { name: "description", content: "Save products you love to your BachatAtBazaar.pk wishlist and come back to buy them later." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});


function WishlistPage() {
  const wishlist = useWishlist();
  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "Wishlist" }]} />
      <h1 className="font-display text-3xl md:text-4xl font-bold">Your wishlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">{wishlist.count} saved item{wishlist.count !== 1 && "s"}</p>

      <div className="mt-6">
        {wishlist.items.length > 0 ? (
          <ProductGrid products={wishlist.items.map((w) => ({
            id: w.id, slug: w.slug, name: w.name, image: w.image,
            price: w.price, salePrice: w.salePrice, stock: 1,
            rating: 0, reviewCount: 0, category: null,
            bestSeller: false, newArrival: false, onDeal: false, featured: false,
          }))} />
        ) : (
          <EmptyState
            icon={<Heart className="h-7 w-7" />}
            title="Your wishlist is empty"
            description="Tap the heart icon on any product to save it here."
            action={<Link to="/shop" className="inline-flex rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">Browse products</Link>}
          />
        )}
      </div>
    </div>
  );
}
