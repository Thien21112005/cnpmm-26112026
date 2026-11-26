import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus, Wrench } from 'lucide-react';
import { repairStore } from '../services/repairStore';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';

export function TechniciansPage() {
  const toast = useToast();
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ code: '', fullName: '', phone: '', specialty: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await repairStore.getTechnicians();
      setTechnicians(list);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const maxLoad = useMemo(
    () => Math.max(4, ...technicians.map((t) => Number(t.activeTicketCount || 0))),
    [technicians]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await repairStore.createTechnician(form);
      toast(`Đã thêm kỹ thuật viên ${form.fullName}.`);
      setDrawerOpen(false);
      setForm({ code: '', fullName: '', phone: '', specialty: '' });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bàn kỹ thuật & Phân bổ tải</h1>
          <p className="page-subtitle">
            Theo dõi mức tải phiếu đang xử lý theo từng kỹ thuật viên để phân công sửa chữa cân bằng.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setError('');
              setDrawerOpen(true);
            }}
          >
            <Plus size={15} />
            Thêm kỹ thuật viên
          </button>
        </div>
      </div>

      {loading ? (
        <p className="field-hint">Đang tải danh sách kỹ thuật viên…</p>
      ) : technicians.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={Wrench}
            title="Chưa có kỹ thuật viên"
            description="Thêm nhân viên kỹ thuật để có thể gán xử lý cho phiếu sửa chữa."
          />
        </div>
      ) : (
        <div className="tech-grid">
          {technicians.map((tech) => {
            const active = Number(tech.activeTicketCount || 0);
            const pct = Math.min(100, Math.round((active / maxLoad) * 100));
            const loadLabel = active === 0 ? 'Sẵn sàng' : active >= 3 ? 'Tải cao' : 'Đang xử lý';
            return (
              <article key={tech._id} className="tech-card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <div>
                    <div className="cell-primary" style={{ fontSize: 15.5 }}>
                      {tech.fullName}
                    </div>
                    <div className="cell-sub">{tech.specialty}</div>
                  </div>
                  <span className="job-code">{tech.code}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: 'var(--ink-muted)',
                    }}
                  >
                    <span>Tải bàn kỹ thuật · {loadLabel}</span>
                    <span className="mono">{active} phiếu mở</span>
                  </div>
                  <div className="load-meter" aria-hidden="true">
                    <div className="load-meter-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="cell-sub tabular">SĐT nội bộ: {tech.phone}</div>

                <div className="tech-stats">
                  <div>
                    <div className="meta-label">Đang giữ</div>
                    <div className="cost-value" style={{ fontSize: 19, color: 'var(--accent)' }}>
                      {tech.activeTicketCount}
                    </div>
                  </div>
                  <div>
                    <div className="meta-label">Hoàn thành</div>
                    <div className="cost-value" style={{ fontSize: 19 }}>
                      {tech.completedTicketCount}
                    </div>
                  </div>
                  <div>
                    <div className="meta-label">Tổng phiếu</div>
                    <div className="cost-value" style={{ fontSize: 19 }}>
                      {tech.totalTicketCount}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/tickets?technicianId=${tech._id}`}
                  className="btn btn-sm"
                  style={{ width: '100%' }}
                >
                  Xem phiếu phụ trách
                  <ArrowUpRight size={14} />
                </Link>
              </article>
            );
          })}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Thêm nhân viên kỹ thuật"
        subtitle="Kỹ thuật viên mới sẽ hiển thị ngay trong bộ lọc và form phân công phiếu sửa chữa."
        footer={
          <>
            <button type="button" className="btn" onClick={() => setDrawerOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="tech-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Thêm kỹ thuật viên'}
            </button>
          </>
        }
      >
        <form id="tech-form" onSubmit={handleSubmit} className="stack-v">
          {error && <div className="inline-alert">{error}</div>}

          <div className="form-field">
            <label className="field-label" htmlFor="t-code">
              Mã kỹ thuật viên
            </label>
            <input
              id="t-code"
              type="text"
              spellCheck={false}
              className="input mono"
              placeholder="Để trống tự sinh (VD: KTV-05)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="t-name">
              Họ tên<span className="field-req">*</span>
            </label>
            <input
              id="t-name"
              type="text"
              className="input"
              required
              placeholder="Nguyễn Văn Hải"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="t-phone">
              Số điện thoại<span className="field-req">*</span>
            </label>
            <input
              id="t-phone"
              type="tel"
              className="input tabular"
              required
              placeholder="0901 200 105"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="t-spec">
              Chuyên môn
            </label>
            <input
              id="t-spec"
              type="text"
              className="input"
              placeholder="Ví dụ: Điện thoại, Laptop & Mainboard, MacBook…"
              value={form.specialty}
              onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
