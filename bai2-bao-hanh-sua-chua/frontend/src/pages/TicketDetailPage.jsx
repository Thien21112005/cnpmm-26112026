import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  History,
  Save,
} from 'lucide-react';
import { repairStore } from '../services/repairStore';
import {
  STATUS_META,
  TICKET_STATUSES,
  formatDateTime,
  formatVND,
} from '../constants/repair';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';

export function TicketDetailPage() {
  const { id } = useParams();
  const toast = useToast();

  const [ticket, setTicket] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState('Mới tiếp nhận');
  const [actualCost, setActualCost] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [stepNote, setStepNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [detail, techList] = await Promise.all([
        repairStore.getTicketById(id),
        repairStore.getTechnicians(),
      ]);
      setTicket(detail);
      setTechnicians(techList);
      setStatus(detail.status);
      setActualCost(detail.actualCost ? String(detail.actualCost) : '');
      setTechnicianId(detail.technicianId?._id || '');
      setDiagnosisNotes(detail.diagnosisNotes || '');
      setStepNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const updated = await repairStore.updateTicketStatus(id, {
        status,
        actualCost: actualCost === '' ? 0 : Number(actualCost),
        technicianId,
        diagnosisNotes,
        note: stepNote,
      });
      setTicket(updated);
      setStepNote('');
      toast(`Đã cập nhật phiếu ${updated.ticketCode} (${updated.status}).`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="field-hint">Đang tải chi tiết phiếu sửa chữa…</p>;
  }

  if (error || !ticket) {
    return (
      <div className="stack-v">
        <div className="inline-alert">{error || 'Không tìm thấy phiếu sửa chữa.'}</div>
        <div>
          <Link to="/tickets" className="btn">
            <ArrowLeft size={15} />
            Quay lại danh sách phiếu
          </Link>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_META[ticket.status]?.step ?? 0;
  const device = ticket.deviceId || {};
  const customer = device.customerId || {};
  const delta = (ticket.actualCost || 0) - (ticket.estimatedCost || 0);
  const needsCostReminder =
    (status === 'Đã hoàn thành' || status === 'Đã bàn giao') &&
    (!actualCost || Number(actualCost) === 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/tickets" className="btn btn-sm">
              <ArrowLeft size={14} />
              Danh sách phiếu
            </Link>
            <span className="mono" style={{ fontWeight: 600, color: 'var(--ink-secondary)' }}>
              {ticket.ticketCode}
            </span>
            <StatusBadge status={ticket.status} />
          </div>
          <h1 className="page-title" style={{ marginTop: 10 }}>
            {device.name || 'Thiết bị sửa chữa'}
          </h1>
          <p className="page-subtitle tabular">
            Lập phiếu: {formatDateTime(ticket.receivedAt)}
            {ticket.completedAt ? ` · Hoàn thành: ${formatDateTime(ticket.completedAt)}` : ''}
            {ticket.deliveredAt ? ` · Bàn giao: ${formatDateTime(ticket.deliveredAt)}` : ''}
          </p>
        </div>
      </div>

      {/* 5-Stage Progress Stepper */}
      <div className="stepper" aria-label="Tiến độ 5 trạng thái sửa chữa">
        {TICKET_STATUSES.map((st, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <div
              key={st}
              className={`step-item${isDone ? ' done' : ''}${isCurrent ? ' current' : ''}`}
            >
              <span className="step-index tabular">
                {isDone ? <Check size={12} /> : `Bước ${idx + 1}`}
              </span>
              <span className="step-name">{st}</span>
            </div>
          );
        })}
      </div>

      <div className="detail-grid">
        {/* Left Main Content */}
        <div className="stack-v">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Lỗi thiết bị & Chi phí sửa chữa</h2>
              <span className="cell-sub">
                KTV: <strong>{ticket.technicianId?.fullName || '—'}</strong> ({ticket.technicianId?.code})
              </span>
            </div>
            <div className="panel-body stack-v">
              <div>
                <div className="meta-label">Lỗi tiếp nhận</div>
                <p style={{ margin: '4px 0 0', fontSize: 14 }}>{ticket.issueDescription}</p>
              </div>

              <div>
                <div className="meta-label">Chẩn đoán / kết quả kỹ thuật</div>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: ticket.diagnosisNotes ? 'var(--ink-primary)' : 'var(--ink-muted)' }}>
                  {ticket.diagnosisNotes || 'Chưa cập nhật ghi chú chẩn đoán.'}
                </p>
              </div>

              <div className="cost-row">
                <div>
                  <div className="cost-label">Chi phí dự kiến</div>
                  <div className="cost-value">{formatVND(ticket.estimatedCost)}</div>
                </div>
                <div>
                  <div className="cost-label">Chi phí thực tế</div>
                  <div className="cost-value" style={{ color: 'var(--accent)' }}>
                    {ticket.actualCost > 0 ? formatVND(ticket.actualCost) : 'Chưa chốt'}
                  </div>
                </div>
                <div>
                  <div className="cost-label">Chênh lệch</div>
                  <div
                    className="cost-value"
                    style={{
                      color:
                        ticket.actualCost === 0
                          ? 'var(--ink-muted)'
                          : delta > 0
                            ? 'var(--danger)'
                            : 'var(--success)',
                    }}
                  >
                    {ticket.actualCost === 0
                      ? '—'
                      : `${delta > 0 ? '+' : ''}${formatVND(delta)}`}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Thông tin thiết bị & Khách hàng sở hữu</h2>
              <span className="type-tag">{device.deviceType || 'Thiết bị'}</span>
            </div>
            <div className="panel-body">
              <div className="meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Mã thiết bị</span>
                  <span className="meta-value mono">{device.deviceCode || '—'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Số serial / IMEI</span>
                  <span className="meta-value mono">{device.serialNumber || '—'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Thương hiệu / Model</span>
                  <span className="meta-value">
                    {device.brand || '—'} · {device.model || '—'}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Khách hàng sở hữu</span>
                  <span className="meta-value">
                    {customer.fullName || '—'} ·{' '}
                    <span className="tabular">{customer.phone || '—'}</span>
                  </span>
                </div>
                <div className="meta-item full">
                  <span className="meta-label">Tình trạng ban đầu lúc tiếp nhận</span>
                  <span className="meta-value">{device.initialCondition || '—'}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Nhật ký cập nhật trạng thái</h2>
              <span className="cell-sub tabular">
                {(ticket.statusHistory || []).length} mốc thời gian
              </span>
            </div>
            <div className="panel-body">
              <ol className="timeline">
                {[...(ticket.statusHistory || [])].reverse().map((item, idx) => (
                  <li key={`${item.updatedAt}_${idx}`} className="timeline-item">
                    <span className="timeline-node" aria-hidden="true" />
                    <div>
                      <div className="timeline-head">
                        <StatusBadge status={item.status} />
                        <span className="timeline-time">{formatDateTime(item.updatedAt)}</span>
                      </div>
                      {item.note && <p className="timeline-note">{item.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <History size={16} />
                Lịch sử sửa chữa của thiết bị {device.deviceCode}
              </h2>
              <span className="cell-sub tabular">
                {(ticket.deviceHistory || []).length} phiếu
              </span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Ngày lập</th>
                    <th>Lỗi ghi nhận</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Chi phí TT</th>
                    <th aria-label="Mở phiếu" />
                  </tr>
                </thead>
                <tbody>
                  {(ticket.deviceHistory || []).map((h) => {
                    const isCurrent = h._id === ticket._id;
                    return (
                      <tr key={h._id} style={isCurrent ? { background: 'var(--accent-soft)' } : undefined}>
                        <td className="mono cell-primary">
                          {h.ticketCode}
                          {isCurrent && (
                            <span className="cell-sub" style={{ display: 'block', fontFamily: 'var(--font-sans)' }}>
                              Đang xem
                            </span>
                          )}
                        </td>
                        <td className="tabular cell-sub" style={{ whiteSpace: 'nowrap' }}>
                          {formatDateTime(h.receivedAt)}
                        </td>
                        <td>{h.issueDescription}</td>
                        <td>
                          <StatusBadge status={h.status} />
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular">
                          {h.actualCost > 0 ? formatVND(h.actualCost) : formatVND(h.estimatedCost)}
                        </td>
                        <td>
                          {!isCurrent && (
                            <Link to={`/tickets/${h._id}`} className="btn btn-sm">
                              Xem
                              <ArrowUpRight size={13} />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Action Rail: Form cập nhật trạng thái sửa chữa */}
        <aside className="panel" style={{ position: 'sticky', top: 20 }}>
          <div className="panel-header">
            <h2 className="panel-title">Cập nhật trạng thái sửa chữa</h2>
          </div>
          <form onSubmit={handleUpdate} className="panel-body stack-v">
            {formError && <div className="inline-alert">{formError}</div>}

            <div className="form-field">
              <label className="field-label" htmlFor="upd-status">
                Trạng thái xử lý
              </label>
              <select
                id="upd-status"
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="field-hint">{STATUS_META[status]?.hint}</span>
            </div>

            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="field-label" htmlFor="upd-cost">
                  Chi phí thực tế (VNĐ)
                </label>
                {ticket.estimatedCost > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: 12 }}
                    onClick={() => setActualCost(String(ticket.estimatedCost))}
                  >
                    Lấy bằng dự kiến
                  </button>
                )}
              </div>
              <input
                id="upd-cost"
                type="number"
                min="0"
                step="10000"
                className="input tabular"
                placeholder="Nhập chi phí thực tế sau khi kiểm tra…"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
              />
              {needsCostReminder && (
                <div className="inline-info" style={{ marginTop: 4 }}>
                  Phiếu sắp chuyển sang <strong>{status}</strong> nhưng chi phí thực tế đang là 0 ₫.
                  Bấm “Lấy bằng dự kiến” hoặc nhập số tiền thực tế trước khi lưu.
                </div>
              )}
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="upd-tech">
                Nhân viên kỹ thuật phụ trách
              </label>
              <select
                id="upd-tech"
                className="select"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
              >
                {technicians.map((tech) => (
                  <option key={tech._id} value={tech._id}>
                    {tech.code} — {tech.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="upd-diag">
                Chẩn đoán / kết quả xử lý
              </label>
              <textarea
                id="upd-diag"
                className="textarea"
                placeholder="Ghi nhận linh kiện đã thay, thông số kiểm thử hoặc thời hạn bảo hành…"
                value={diagnosisNotes}
                onChange={(e) => setDiagnosisNotes(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="upd-note">
                Ghi chú nhật ký tiến độ
              </label>
              <input
                id="upd-note"
                type="text"
                className="input"
                placeholder="Ví dụ: Đã báo giá khách đồng ý, bắt đầu thay linh kiện…"
                value={stepNote}
                onChange={(e) => setStepNote(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              {saving ? 'Đang lưu cập nhật…' : 'Lưu trạng thái & chi phí'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

