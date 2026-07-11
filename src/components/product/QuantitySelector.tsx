import { Minus, Plus } from "lucide-react";

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-background">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-10 w-10 grid place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40"
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="w-10 text-center text-sm font-semibold" aria-live="polite">{value}</div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-10 w-10 grid place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40"
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
