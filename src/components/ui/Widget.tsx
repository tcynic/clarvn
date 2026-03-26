import { ReactNode } from "react";

interface WidgetProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Widget({ title, eyebrow, children, className = "", action }: WidgetProps) {
  return (
    <div className={`widget-card ${className}`}>
      {eyebrow && <p className="widget-card-eyebrow">{eyebrow}</p>}
      <div className="flex items-center justify-between mb-3">
        <h3 className="widget-card-title mb-0">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
