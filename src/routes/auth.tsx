import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — BachatAtBazaar.pk" },
      { name: "description", content: "Sign in or create an account to shop with BachatAtBazaar.pk." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function safeRedirect(target: string | undefined): string {
  if (!target) return "/account";
  try {
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin) return "/account";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/account";
  }
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: safeRedirect(redirect) });
    });
  }, [redirect, navigate]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: safeRedirect(redirect) });
  };

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: String(fd.get("full_name") ?? "") },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your inbox to verify your email.");
    setTab("signin");
  };

  const onGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      return toast.error(result.error.message || "Google sign-in failed");
    }
    if (result.redirected) return;
    setBusy(false);
    navigate({ to: safeRedirect(redirect) });
  };

  return (
    <div className="container-page py-12 max-w-md">
      <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold">Welcome to BachatAtBazaar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Shop smart. Save more. Live better.</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={onGoogle}
          disabled={busy}
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={onSignIn} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="si-password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
                </div>
                <Input id="si-password" name="password" type="password" required autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={busy} className="w-full h-11 bg-primary hover:bg-primary-dark">
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={onSignUp} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="su-name">Full name</Label>
                <Input id="su-name" name="full_name" required autoComplete="name" />
              </div>
              <div>
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="su-password">Password</Label>
                <Input id="su-password" name="password" type="password" required minLength={8} autoComplete="new-password" />
                <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <Button type="submit" disabled={busy} className="w-full h-11 bg-primary hover:bg-primary-dark">
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create account
              </Button>
              <p className="text-xs text-muted-foreground text-center">By continuing you agree to our terms & privacy.</p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
