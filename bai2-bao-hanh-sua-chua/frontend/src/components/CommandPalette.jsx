import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, HardDrive, Search, Users, X } from 'lucide-react';
import { repairStore } from '../services/repairStore';
import { StatusBadge } from './StatusBadge';

export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [data, setData] = useState({ tickets: [], devices: [], customers: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setLoading(true);
    let active = true;
    Promise.all([
      repairStore.getTickets().catch(() => []),
      repairStore.getDevices().catch(() => []),
      repairStore.getCustomers().catch(() => []),
    ])
      .then(([tickets, devices, customers]) => {
        if (active) setData({ tickets, devices, customers });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (text) => !q || String(text || '').toLowerCase().includes(q);

    const tickets = data.tickets
      .filter(
        (t) =>
          match(t.ticketCode) ||
          match(t.issueDescription) ||
          match(t.deviceId?.name) ||
          match(t.deviceId?.serialNumber) ||
          match(t.deviceId?.customerId?.fullName) ||
          match(t.deviceId?.customerId?.phone)
      )
      .slice(0, 5);

    const devices = data.devices
      .filter(
        (d) =>
          match(d.deviceCode) ||
          match(d.name) ||
          match(d.serialNumber) ||
          match(d.brand) ||
          match(d.model)
      )
      .slice(0, 4);

    const customers = data.customers
      .filter((c) => match(c.fullName) || match(c.phone))
      .slice(0, 4);

    return { tickets, devices, customers };
  }, [data, query]);

  if (!open) return null;

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const hasAny =
    results.tickets.length + results.devices.length + results.customers.length > 0;

  return (
    <div
      className="cmd-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Tra cứu nhanh hệ thống"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cmd-dialog">
        <div className="cmd-input-row">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="cmd-input"
            placeholder="Nhập mã phiếu (PSC-…), số serial, tên thiết bị hoặc SĐT khách hàng…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Từ khóa tra cứu nhanh"
          />
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Đóng tra cứu nhanh"
          >
            <X size={16} />
          </button>
        </div>

        <div className="cmd-body">
          {loading ? (
            <p className="cmd-empty">Đang nạp dữ liệu từ máy chủ…</p>
          ) : !hasAny ? (
            <p className="cmd-empty">Không tìm thấy phiếu, thiết bị hay khách hàng phù hợp.</p>
          ) : (
            <>
              {results.tickets.length > 0 && (
                <div className="cmd-group">
                  <div className="cmd-group-label">Phiếu sửa chữa</div>
                  {results.tickets.map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      className="cmd-item"
                      onClick={() => go(`/tickets/${t._id}`)}
                    >
                      <ClipboardList size={15} className="cmd-item-icon" aria-hidden="true" />
                      <div className="cmd-item-main">
                        <span className="mono cell-primary">{t.ticketCode}</span>
                        <span className="cmd-item-sub">
                          {t.deviceId?.name} · {t.deviceId?.customerId?.fullName}
                        </span>
                      </div>
                      <StatusBadge status={t.status} />
                    </button>
                  ))}
                </div>
              )}

              {results.devices.length > 0 && (
                <div className="cmd-group">
                  <div className="cmd-group-label">Thiết bị</div>
                  {results.devices.map((d) => (
                    <button
                      key={d._id}
                      type="button"
                      className="cmd-item"
                      onClick={() => go(`/devices?search=${encodeURIComponent(d.deviceCode)}`)}
                    >
                      <HardDrive size={15} className="cmd-item-icon" aria-hidden="true" />
                      <div className="cmd-item-main">
                        <span className="cell-primary">{d.name}</span>
                        <span className="cmd-item-sub mono">
                          {d.deviceCode} · S/N {d.serialNumber}
                        </span>
                      </div>
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              {results.customers.length > 0 && (
                <div className="cmd-group">
                  <div className="cmd-group-label">Khách hàng</div>
                  {results.customers.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      className="cmd-item"
                      onClick={() => go(`/customers?search=${encodeURIComponent(c.phone)}`)}
                    >
                      <Users size={15} className="cmd-item-icon" aria-hidden="true" />
                      <div className="cmd-item-main">
                        <span className="cell-primary">{c.fullName}</span>
                        <span className="cmd-item-sub tabular">{c.phone}</span>
                      </div>
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="cmd-footer">
          <span>Bấm mục để mở nhanh</span>
          <span className="mono">ESC để đóng</span>
        </div>
      </div>
    </div>
  );
}

