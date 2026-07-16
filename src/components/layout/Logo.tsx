import { Link } from "@tanstack/react-router";
import { useSiteSettings } from "@/context/SiteContext";

export function Logo({ compact = false }: { compact?: boolean }) {
  const { site_name, logo_url } = useSiteSettings();
  const name = site_name?.trim() || "BachatAtBazaar.pk";
  const initial = name.charAt(0).toUpperCase();

  return (
    <Link to="/" className="flex items-center gap-2 group" aria-label={`${name} home`}>
      {logo_url ? (
        <img src={logo_url} alt={name} className="h-14 w-14 rounded-md object-cover shadow-sm" />
      ) : (
        <span className="grid place-items-center h-14 w-14 rounded-md bg-primary text-primary-foreground font-display text-2xl font-bold shadow-sm">
          {initial}
        </span>
      )}
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            {name.includes(".") ? (
              <>
                {name.split(".")[0]}
                <span className="text-savings">.{name.split(".").slice(1).join(".")}</span>
              </>
            ) : (
              name
            )}
          </span>
        </span>
      )}
    </Link>
  );
}
