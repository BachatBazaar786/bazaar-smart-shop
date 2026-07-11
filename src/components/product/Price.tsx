import { formatPKR } from "@/lib/format";

export function Price({ price, salePrice, size = "md" }: { price: number; salePrice?: number; size?: "sm" | "md" | "lg" }) {
  const priceCls = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  const origCls = size === "lg" ? "text-base" : "text-xs";
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className={`font-semibold text-foreground ${priceCls}`}>{formatPKR(salePrice ?? price)}</span>
      {salePrice != null && (
        <span className={`text-muted-foreground line-through ${origCls}`}>{formatPKR(price)}</span>
      )}
    </div>
  );
}

export function discountPct(price: number, salePrice?: number) {
  if (salePrice == null) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}
