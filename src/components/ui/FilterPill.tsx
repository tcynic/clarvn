interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}

export function FilterPill({ label, active, onClick, className = "" }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-pill ${active ? "active" : ""} ${className}`}
    >
      {label}
    </button>
  );
}
