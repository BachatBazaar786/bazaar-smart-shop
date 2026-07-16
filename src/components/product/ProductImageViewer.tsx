import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  name: string;
  activeIndex: number;
  onChange: (i: number) => void;
}

export function ProductImageViewer({ images, name, activeIndex, onChange }: Props) {
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const ref = useRef<HTMLDivElement>(null);

  const prev = useCallback(() => onChange((activeIndex - 1 + images.length) % images.length), [activeIndex, images.length, onChange]);
  const next = useCallback(() => onChange((activeIndex + 1) % images.length), [activeIndex, images.length, onChange]);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <>
      <div
        ref={ref}
        className="relative aspect-square rounded-xl overflow-hidden bg-muted border border-border group cursor-zoom-in"
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={handleMove}
      >
        <img
          src={images[activeIndex]}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-200 ease-out will-change-transform"
          style={{
            transform: zoom ? "scale(2)" : "scale(1)",
            transformOrigin: `${pos.x}% ${pos.y}%`,
          }}
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-background/90 border border-border shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background z-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-background/90 border border-border shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background z-10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-background/80 text-xs font-medium border border-border">
              {activeIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-pressed={i === activeIndex}
              className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${i === activeIndex ? "border-primary" : "border-transparent hover:border-border"}`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
