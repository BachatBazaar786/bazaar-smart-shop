import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { FaviconManager } from "@/components/layout/FaviconManager";
import { SiteProvider } from "@/context/SiteContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { RecentlyViewedProvider } from "@/context/RecentlyViewedContext";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="grid place-items-center py-24 px-4">
      <div className="max-w-lg text-center">
        <div className="text-savings font-display text-7xl md:text-8xl font-bold">404</div>
        <h1 className="mt-4 font-display text-2xl md:text-3xl font-bold">This page took a wrong turn</h1>
        <p className="mt-2 text-muted-foreground">The page you're looking for doesn't exist or has been moved. Try searching, or head back to the store.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-dark">Go home</Link>
          <Link to="/shop" className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Browse products</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again or return home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark"
          >Try again</button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BachatAtBazaar.pk — Shop Smart. Save More. Live Better." },
      { name: "description", content: "Pakistan's smart shopping marketplace. Premium Himalayan superfoods, wellness, electronics and home essentials with nationwide delivery." },
      { name: "author", content: "BachatAtBazaar.pk" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "BachatAtBazaar.pk" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0B3795" },
      { name: "google-site-verification", content: "eo_kWFgwlaqyQM8cuB-kTAq7iqj2P_oefNzs1gZqQD4" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" },

    ],
    scripts: [
      { src: "https://www.googletagmanager.com/gtag/js?id=G-E08EBXESJ2", async: true },
      {
        children: "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-E08EBXESJ2');",
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "BachatAtBazaar.pk",
              url: "https://bazaar-smart-shop.lovable.app",
              logo: "https://bazaar-smart-shop.lovable.app/favicon.ico",
              sameAs: [],
            },
            {
              "@type": "WebSite",
              name: "BachatAtBazaar.pk",
              url: "https://bazaar-smart-shop.lovable.app",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://bazaar-smart-shop.lovable.app/shop?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});


function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <SiteProvider>
        <FaviconManager />
        <CartProvider>
          <WishlistProvider>
            <RecentlyViewedProvider>
              <div className="min-h-screen flex flex-col bg-background">
                <Header />
                <main className="flex-1">
                  <Outlet />
                </main>
                <Footer />
              </div>
              <WhatsAppButton />
              <Toaster position="top-right" />
            </RecentlyViewedProvider>
          </WishlistProvider>
        </CartProvider>
      </SiteProvider>
    </QueryClientProvider>
  );
}

function AuthSync() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") qc.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, qc]);
  return null;
}
