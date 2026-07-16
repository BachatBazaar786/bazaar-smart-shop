import { Link } from "@tanstack/react-router";
import { useSiteSettings } from "@/context/SiteContext";

export function Logo({ compact: _compact = false }: { compact?: boolean }) {
  const { site_name, logo_url } = useSiteSettings();
  const name = site_name?.trim() || "BachatAtBazaar.pk";
  const initial = name.charAt(0).toUpperCase();

  return (
    <Link to="/" className="flex items-center group" aria-label={`${name} home`}>
      {logo_url ? (
        <img src={logo_url} alt={name} className="h-20 md:h-24 w-auto object-contain bg-transparent" />
      ) : (
        <span className="grid place-items-center h-16 w-16 md:h-20 md:w-20 rounded-md bg-primary text-primary-foreground font-display text-2xl font-bold shadow-sm">
          {initial}
        </span>
      )}
    </Link>
  );
}
