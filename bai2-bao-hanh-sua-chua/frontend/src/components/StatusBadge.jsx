import { STATUS_META } from '../constants/repair';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META['Mới tiếp nhận'];
  return (
    <span className={`status-badge status-${meta.key}`}>
      <span className="status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

