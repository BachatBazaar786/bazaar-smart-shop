import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Logo } from "./Logo";
import { categories, navCategories } from "@/data/categories";

export function MobileNav({ open, onClose, isAdmin = false }: { open: boolean; onClose: () => void; isAdmin?: boolean }) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-[85%] sm:w-96 p-0 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Logo />
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-md hover:bg-accent" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">Categories</div>
          {categories.map((c) => (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              onClick={onClose}
              className="block rounded-md px-3 py-2.5 text-sm hover:bg-accent"
            >
              {c.name}
            </Link>
          ))}
          <div className="my-3 h-px bg-border" />
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">Menu</div>
          {navCategories.map((n) => (
            <Link key={n.label} to={n.to} onClick={onClose} className="block rounded-md px-3 py-2.5 text-sm hover:bg-accent">
              {n.label}
            </Link>
          ))}
          <div className="my-3 h-px bg-border" />
          <Link to="/account" onClick={onClose} className="block rounded-md px-3 py-2.5 text-sm hover:bg-accent">My Account</Link>
          {isAdmin && (
            <Link to="/admin" onClick={onClose} className="block rounded-md px-3 py-2.5 text-sm font-semibold text-primary hover:bg-accent">Admin Dashboard</Link>
          )}
          <Link to="/account/orders" onClick={onClose} className="block rounded-md px-3 py-2.5 text-sm hover:bg-accent">My Orders</Link>
          <Link to="/wishlist" onClick={onClose} className="block rounded-md px-3 py-2.5 text-sm hover:bg-accent">Wishlist</Link>
          <Link to="/track-order" onClick={onClose} className="block rounded-md px-3 py-2.5 text-sm hover:bg-accent">Track Order</Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
