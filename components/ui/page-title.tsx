import type { ReactNode } from "react";

export function PageTitle({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <header className="page-header module-header">
      <div><div className="eyebrow"><span className="live-dot" />{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}
