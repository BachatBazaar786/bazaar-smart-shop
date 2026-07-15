import { Link } from "@tanstack/react-router";
import { Menu, Heart, ShoppingBag, User, ChevronDown, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isCurrentUserAdmin } from "@/lib/orders.functions";
import { AnnouncementBar } from "./AnnouncementBar";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { MobileNav } from "./MobileNav";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { navCategories, categories } from "@/data/categories";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const cart = useCart();
  const wishlist = useWishlist();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  };

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container-page">
          {/* Top row */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 lg:grid-cols-[auto_1fr_auto]">
            <div className="flex items-center gap-2">
              <button
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Logo />
            </div>

            <div className="hidden lg:block max-w-2xl w-full mx-auto">
              <SearchBar />
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="hidden sm:inline-flex items-center gap-2 rounded-md px-3 h-10 hover:bg-accent text-sm">
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline max-w-[120px] truncate">{user.email}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="cursor-pointer"><LayoutDashboard className="h-4 w-4 mr-2" /> My account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wishlist" className="cursor-pointer"><Heart className="h-4 w-4 mr-2" /> Wishlist</Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="cursor-pointer"><Shield className="h-4 w-4 mr-2" /> Admin dashboard</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/auth"
                  className="hidden sm:inline-flex items-center gap-2 rounded-md px-3 h-10 hover:bg-accent text-sm"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">Sign in</span>
                </Link>
              )}
              <Link
                to="/wishlist"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
                {wishlist.count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-savings px-1 text-[10px] font-bold text-savings-foreground">
                    {wishlist.count}
                  </span>
                )}
              </Link>
              <Link
                to="/cart"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {cart.count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {cart.count}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile search */}
          <div className="lg:hidden pb-3">
            <SearchBar />
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 border-t border-border py-1">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-dark">
                <Menu className="h-4 w-4" />
                All Categories
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Shop by category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categories.map((c) => (
                  <DropdownMenuItem key={c.slug} asChild>
                    <Link to="/category/$slug" params={{ slug: c.slug }}>
                      {c.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {navCategories.map((n) => (
              <Link
                key={n.label}
                to={n.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-accent transition-colors"
                activeProps={{ className: "text-primary" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
