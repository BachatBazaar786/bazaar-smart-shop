import { Star } from "lucide-react";

export function Rating({ value, count, showCount = true, size = 14 }: { value: number; count?: number; showCount?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = value >= i;
          const half = !filled && value >= i - 0.5;
          return (
            <Star
              key={i}
              width={size}
              height={size}
              className={filled ? "fill-savings text-savings" : half ? "fill-savings/50 text-savings" : "text-muted-foreground/70"}
            />
          );
        })}
      </div>
      {showCount && count != null && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
