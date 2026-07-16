import { Link, Outlet, useRouterState, useNavigate, createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isCurrentUserAdmin } from "@/lib/orders.functions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Building2,
  ShoppingBag,
  Users,
  Boxes,
  Image as ImageIcon,
  FileText,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — BachatAtBazaar.pk" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    // Extra guard: the pathless auth layout already ensured sign-in.
    // Redirect signed-in-but-not-admin users to /account.
    try {
      const isAdmin = await isCurrentUserAdmin();
      if (!isAdmin) throw redirect({ to: "/account" });
    } catch (e) {
      if (e && typeof e === "object" && "isRedirect" in e) throw e;
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
  },
  component: AdminLayout,
});

const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/analytics", label: "Analytics", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/variants", label: "Variants", icon: Package },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/brands", label: "Brands", icon: Building2 },
  { to: "/admin/tags", label: "Tags", icon: Tags },
  { to: "/admin/coupons", label: "Coupons", icon: Tags },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/media", label: "Media", icon: ImageIcon },
  { to: "/admin/blog", label: "Blog", icon: FileText },
  { to: "/admin/cms", label: "Content", icon: FileText },
  { to: "/admin/page-builder", label: "Page builder", icon: FileText },
  { to: "/admin/visual-editor", label: "Visual editor", icon: FileText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];


function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const check = useServerFn(isCurrentUserAdmin);
  useQuery({ queryKey: ["is-admin"], queryFn: () => check() });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[260px_1fr] bg-muted/30">
      <aside className="hidden lg:flex flex-col border-r border-border bg-background">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <Logo />
        </div>
        <div className="px-3 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">Admin</div>
        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent">
            <ExternalLink className="h-4 w-4" /> View site
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-destructive">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-col min-h-screen">
        <header className="lg:hidden h-14 border-b border-border bg-background flex items-center justify-between px-4">
          <Logo />
          <select
            className="border border-border rounded-md text-sm px-2 py-1.5"
            value={nav.find((n) => (n.exact ? pathname === n.to : pathname.startsWith(n.to)))?.to ?? "/admin"}
            onChange={(e) => navigate({ to: e.target.value as never })}
          >
            {nav.map((n) => (
              <option key={n.to} value={n.to}>{n.label}</option>
            ))}
          </select>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
