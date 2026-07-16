import { useEffect } from "react";
import { useSiteSettings } from "@/context/SiteContext";

export function FaviconManager() {
  const { favicon_url, seo_title, seo_description } = useSiteSettings();
  useEffect(() => {
    if (!favicon_url) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon_url;
  }, [favicon_url]);

  useEffect(() => {
    if (seo_title) document.title = seo_title;
    if (seo_description) {
      let meta = document.querySelector<HTMLMetaElement>("meta[name='description']");
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = seo_description;
    }
  }, [seo_title, seo_description]);

  return null;
}
