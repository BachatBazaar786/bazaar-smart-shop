import { Truck, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSiteSection } from "@/context/SiteContext";

const defaultMessages = [
  "Premium Products. Smarter Prices.",
  "Nationwide Delivery Across Pakistan",
  "Shop Smart. Save More. Live Better.",
];

const icons = [Sparkles, Truck, ShieldCheck];

export function AnnouncementBar() {
  const section = useSiteSection("announcement");
  const messages = useMemo(() => {
    const raw = section.messages;
    if (typeof raw === "string" && raw.trim()) {
      const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length) return lines;
    }
    return defaultMessages;
  }, [section.messages]);

  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    if (messages.length <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % messages.length), 4000);
    return () => clearInterval(t);
  }, [messages]);

  const Icon = icons[i % icons.length];
  return (
    <div className="bg-primary text-primary-foreground text-xs sm:text-sm">
      <div className="container-page flex h-9 items-center justify-center gap-2">
        <Icon className="h-3.5 w-3.5 opacity-80" />
        <span className="truncate">{messages[i]}</span>
      </div>
    </div>
  );
}
