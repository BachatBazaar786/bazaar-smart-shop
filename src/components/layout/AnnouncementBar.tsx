import { Truck, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const messages = [
  { icon: Sparkles, text: "Premium Products. Smarter Prices." },
  { icon: Truck, text: "Nationwide Delivery Across Pakistan" },
  { icon: ShieldCheck, text: "Shop Smart. Save More. Live Better." },
];

export function AnnouncementBar() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % messages.length), 4000);
    return () => clearInterval(t);
  }, []);
  const M = messages[i];
  const Icon = M.icon;
  return (
    <div className="bg-primary text-primary-foreground text-xs sm:text-sm">
      <div className="container-page flex h-9 items-center justify-center gap-2">
        <Icon className="h-3.5 w-3.5 opacity-80" />
        <span className="truncate">{M.text}</span>
      </div>
    </div>
  );
}
