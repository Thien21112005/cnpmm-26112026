import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  History,
  Printer,
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
import { DeviceTypeIcon } from '../components/DeviceTypeIcon';
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
    return <p className="field-hint">Đang tải hồ sơ phiếu sửa chữa…</p>;
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
      {/* Dark Anodized Service Dossier Banner */}
      <section className="console-banner">
        <div className="console-banner-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/tickets" className="btn btn-dark btn-sm no-print">
                <ArrowLeft size={14} />
                Phiếu sửa chữa
              </Link>
              <span
                className="mono"
                style={{
                  fontWeight: 700,
                  color: '#fb923c',
                  background: 'rgba(217, 78, 12, 0.16)',
                  border: '1px solid rgba(251, 146, 60, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 5,
                }}
              >
                {ticket.ticketCode}
              </span>
              <StatusBadge status={ticket.status} />
            </div>

            <h1 className="console-title" style={{ marginTop: 12 }}>
              {device.name || 'Thiết bị sửa chữa'}
            </h1>
            <p className="console-sub tabular">
              <span className="mono">{device.deviceCode}</span> · S/N{' '}
              <span className="mono">{device.serialNumber}</span> · Lập phiếu:{' '}
              {formatDateTime(ticket.receivedAt)}
              {ticket.completedAt ? ` · Hoàn thành: ${formatDateTime(ticket.completedAt)}` : ''}
              {ticket.deliveredAt ? ` · Bàn giao: ${formatDateTime(ticket.deliveredAt)}` : ''}
            </p>
          </div>

          <div className="header-actions no-print">
            <button type="button" className="btn btn-dark" onClick={() => window.print()}>
              <Printer size={15} />
              In phiếu biên nhận
            </button>
          </div>
        </div>

        {/* Interactive 5-Stage Pipeline Track (Click any stage to target in form) */}
        <div className="stepper" role="group" aria-label="Tiến độ 5 trạng thái sửa chữa">
          {TICKET_STATUSES.map((st, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <button
                key={st}
                type="button"
                className={`step-btn${isDone ? ' done' : ''}${isCurrent ? ' current' : ''}`}
                onClick={() => {
                  setStatus(st);
                  if (
                    (st === 'Đã hoàn thành' || st === 'Đã bàn giao') &&
                    (!actualCost || Number(actualCost) === 0) &&
                    ticket.estimatedCost > 0
                  ) {
                    setActualCost(String(ticket.estimatedCost));
                  }
                }}
                title={`Chọn nhanh trạng thái "${st}" vào form cập nhật`}
              >
                <span className="step-index">
                  {isDone ? <Check size={12} /> : `0${idx + 1}`}
                  {status === st && st !== ticket.status ? ' · Đang chọn' : ''}
                </span>
                <span className="step-name">{st}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="detail-grid">
        {/* Left Main Content */}
        <div className="stack-v">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Lỗi thiết bị & Bảng đối chiếu chi phí</h2>
              <span className="serial-plate">
                KTV: {ticket.technicianId?.fullName || '—'} ({ticket.technicianId?.code})
              </span>
            </div>
            <div className="panel-body stack-v">
              <div>
                <div className="meta-label">Lỗi ghi nhận lúc tiếp nhận</div>
                <p style={{ margin: '4px 0 0', fontSize: 14.5 }}>{ticket.issueDescription}</p>
              </div>

              <div>
                <div className="meta-label">Chẩn đoán / kết quả kỹ thuật</div>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 14,
                    color: ticket.diagnosisNotes ? 'var(--ink-primary)' : 'var(--ink-muted)',
                  }}
                >
                  {ticket.diagnosisNotes || 'Chưa cập nhật ghi chú chẩn đoán kỹ thuật.'}
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
              <h2 className="panel-title">Thông số thiết bị & Khách hàng sở hữu</h2>
              <span className="type-tag">
                <DeviceTypeIcon type={device.deviceType} size={13} />
                {device.deviceType || 'Thiết bị'}
              </span>
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
              <span className="chip-count">{(ticket.statusHistory || []).length} mốc</span>
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

          <section className="panel no-print">
            <div className="panel-header">
              <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <History size={16} aria-hidden="true" />
                Lịch sử sửa chữa của thiết bị {device.deviceCode}
              </h2>
              <span className="chip-count">{(ticket.deviceHistory || []).length} phiếu</span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Ngày lập</th>
                    <th>Lỗi ghi nhận</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Chi phí</th>
                    <th aria-label="Mở phiếu" />
                  </tr>
                </thead>
                <tbody>
                  {(ticket.deviceHistory || []).map((h) => {
                    const isCurrent = h._id === ticket._id;
                    return (
                      <tr
                        key={h._id}
                        style={isCurrent ? { background: 'var(--accent-soft)' } : undefined}
                      >
                        <td className="mono cell-primary">
                          {h.ticketCode}
                          {isCurrent && (
                            <span
                              className="cell-sub"
                              style={{ display: 'block', fontFamily: 'var(--font-sans)' }}
                            >
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
        <aside className="panel no-print" style={{ position: 'sticky', top: 20 }}>
          <div className="panel-header" style={{ background: '#faf8f4' }}>
            <h2 className="panel-title">Cập nhật trạng thái & chi phí</h2>
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
                    style={{ padding: '2px 6px', fontSize: 12, color: 'var(--accent)' }}
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
                  Phiếu chuyển sang <strong>{status}</strong> nhưng chi phí thực tế đang là 0 ₫.
                  Bấm “Lấy bằng dự kiến” hoặc nhập số tiền thực tế.
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
