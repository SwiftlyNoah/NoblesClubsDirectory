interface EmptyStateProps {
  /** A single emoji or short glyph used as the icon. */
  icon?: string;
  message: string;
}

export function EmptyState({ icon = '🔍', message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden>
        {icon}
      </div>
      <div className="empty-message">{message}</div>
    </div>
  );
}
