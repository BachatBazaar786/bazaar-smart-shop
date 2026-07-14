import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — BachatAtBazaar.pk" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email")), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <div className="container-page py-12 max-w-md">
      <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <h1 className="font-display text-2xl font-bold text-center">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">
          We'll send you a link to set a new password.
        </p>
        {sent ? (
          <div className="mt-6 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm text-center">
            If an account exists for that email, a password reset link is on its way.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fp-email">Email</Label>
              <Input id="fp-email" name="email" type="email" required autoComplete="email" />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-11 bg-primary hover:bg-primary-dark">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send reset link
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to="/auth" className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
