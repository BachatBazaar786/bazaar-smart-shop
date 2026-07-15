export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "primary" | "savings" | "muted";
}) {
  const accentClass =
    accent === "primary"
      ? "border-l-primary"
      : accent === "savings"
        ? "border-l-savings"
        : "border-l-muted-foreground/30";
  return (
    <div className={`bg-background border border-border rounded-lg p-4 border-l-4 ${accentClass}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl md:text-3xl font-bold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function AdminCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-background border border-border rounded-lg p-4 md:p-5">
      <header className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
