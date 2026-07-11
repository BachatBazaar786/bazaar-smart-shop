import type { ReactNode } from "react";

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-4">
      {icon && <div className="mx-auto mb-4 h-16 w-16 grid place-items-center rounded-full bg-muted text-muted-foreground">{icon}</div>}
      <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
