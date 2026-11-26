import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  Kanban,
  PackagePlus,
  Plus,
  Search,
  Table2,
  X,
} from 'lucide-react';
import { repairStore } from '../services/repairStore';
import {
  STATUS_META,
  TICKET_STATUSES,
  formatDateShort,
  formatVND,
} from '../constants/repair';
import { StatusBadge } from '../components/StatusBadge';
import { DeviceTypeIcon } from '../components/DeviceTypeIcon';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';

const STAGE_COLORS = {
  'Mới tiếp nhận': 'var(--st-received-bar)',
  'Đang kiểm tra': 'var(--st-inspecting-bar)',
  'Đang sửa chữa': 'var(--st-repairing-bar)',
  'Đã hoàn thành': 'var(--st-completed-bar)',
  'Đã bàn giao': 'var(--st-delivered-bar)',
};

export function TicketsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [allTickets, setAllTickets] = useState([]);
  const [devices, setDevices] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancingId, setAdvancingId] = useState(null);

  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'board');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [techFilter, setTechFilter] = useState(searchParams.get('technicianId') || '');

  const [createOpen, setCreateOpen] = useState(Boolean(searchParams.get('newForDevice')));
  const [form, setForm] = useState({
    deviceId: searchParams.get('newForDevice') || '',
    technicianId: '',
    issueDescription: '',
    estimatedCost: '',
    note: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tList, dList, techList] = await Promise.all([
        repairStore.getTickets(),
        repairStore.getDevices(),
        repairStore.getTechnicians(),
      ]);
      setAllTickets(tList);
      setDevices(dList);
      setTechnicians(techList);
      setForm((prev) => ({
        ...prev,
        deviceId: prev.deviceId || dList[0]?._id || '',
        technicianId: prev.technicianId || techList[0]?._id || '',
      }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const next = {};
    if (viewMode !== 'board') next.view = viewMode;
    if (statusFilter) next.status = statusFilter;
    if (techFilter) next.technicianId = techFilter;
    if (search.trim()) next.search = search.trim();
    setSearchParams(next, { replace: true });
  }, [viewMode, statusFilter, techFilter, search, setSearchParams]);

  const metrics = useMemo(() => {
    const counts = {};
    for (const s of TICKET_STATUSES) counts[s] = 0;
    let activeCount = 0;
    let readyCount = 0;
    let openEstimate = 0;
    let realizedRevenue = 0;

    for (const t of allTickets) {
      if (counts[t.status] !== undefined) counts[t.status] += 1;
      if (t.status !== 'Đã bàn giao') {
        activeCount += 1;
        openEstimate += Number(t.estimatedCost || 0);
      }
      if (t.status === 'Đã hoàn thành') readyCount += 1;
      realizedRevenue += Number(t.actualCost || 0);
    }
    return { counts, activeCount, readyCount, openEstimate, realizedRevenue };
  }, [allTickets]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (techFilter && t.technicianId?._id !== techFilter) return false;
      if (!q) return true;
      return (
        t.ticketCode.toLowerCase().includes(q) ||
        t.issueDescription.toLowerCase().includes(q) ||
        (t.deviceId?.name || '').toLowerCase().includes(q) ||
        (t.deviceId?.deviceCode || '').toLowerCase().includes(q) ||
        (t.deviceId?.serialNumber || '').toLowerCase().includes(q) ||
        (t.deviceId?.customerId?.fullName || '').toLowerCase().includes(q) ||
        (t.deviceId?.customerId?.phone || '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))
      );
    });
  }, [allTickets, statusFilter, techFilter, search]);

  const boardColumns = useMemo(() => {
    const map = {};
    for (const s of TICKET_STATUSES) map[s] = [];
    for (const t of filteredTickets) {
      if (map[t.status]) map[t.status].push(t);
    }
    return map;
  }, [filteredTickets]);

  const hasFilters = Boolean(statusFilter || techFilter || search.trim());

  const handleAdvanceStatus = async (ticket) => {
    const curIdx = TICKET_STATUSES.indexOf(ticket.status);
    if (curIdx < 0 || curIdx >= TICKET_STATUSES.length - 1) return;
    const nextStatus = TICKET_STATUSES[curIdx + 1];
    setAdvancingId(ticket._id);
    try {
      const nextActual =
        (nextStatus === 'Đã hoàn thành' || nextStatus === 'Đã bàn giao') && !ticket.actualCost
          ? ticket.estimatedCost
          : ticket.actualCost;
      await repairStore.updateTicketStatus(ticket._id, {
        status: nextStatus,
        actualCost: nextActual,
        note: `Chuyển nhanh trên bảng tiến độ sang "${nextStatus}".`,
      });
      toast(`${ticket.ticketCode} → ${nextStatus}`);
      await loadData();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAdvancingId(null);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const created = await repairStore.createTicket({
        deviceId: form.deviceId,
        technicianId: form.technicianId,
        issueDescription: form.issueDescription,
        estimatedCost: form.estimatedCost === '' ? 0 : Number(form.estimatedCost),
        note: form.note,
      });
      toast(`Đã tạo phiếu ${created.ticketCode}.`);
      setCreateOpen(false);
      setForm((prev) => ({ ...prev, issueDescription: '', estimatedCost: '', note: '' }));
      await loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Dark Graphite Workshop Telemetry Banner */}
      <section className="console-banner">
        <div className="console-banner-top">
          <div>
            <h1 className="console-title">Điều phối phiếu sửa chữa</h1>
            <p className="console-sub">
              Theo dõi 5 giai đoạn xử lý tại xưởng, phân công kỹ thuật viên và chốt chi phí theo từng thiết bị.
            </p>
          </div>
          <div className="header-actions">
            <Link to="/intake" className="btn btn-dark">
              <PackagePlus size={15} />
              Tiếp nhận thiết bị
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setFormError('');
                setCreateOpen(true);
              }}
            >
              <Plus size={15} />
              Tạo phiếu mới
            </button>
          </div>
        </div>

        <div className="pulse-metrics">
          <div className="pulse-stat">
            <span className="pulse-label">Đang xử lý tại xưởng</span>
            <span className="pulse-value accent">{metrics.activeCount}</span>
          </div>
          <div className="pulse-stat">
            <span className="pulse-label">Chờ khách bàn giao</span>
            <span className="pulse-value ok">{metrics.readyCount}</span>
          </div>
          <div className="pulse-stat">
            <span className="pulse-label">Dự kiến đang mở</span>
            <span className="pulse-value">{formatVND(metrics.openEstimate)}</span>
          </div>
          <div className="pulse-stat">
            <span className="pulse-label">Chi phí thực tế đã chốt</span>
            <span className="pulse-value">{formatVND(metrics.realizedRevenue)}</span>
          </div>
        </div>

        {allTickets.length > 0 && (
          <div className="pipeline-bar" aria-label="Tỷ lệ phiếu theo 5 trạng thái">
            {TICKET_STATUSES.map((st) => {
              const pct = ((metrics.counts[st] || 0) / allTickets.length) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={st}
                  className="pipeline-seg"
                  title={`${st}: ${metrics.counts[st]} phiếu`}
                  style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[st] }}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Stage Filter Chips + View Mode Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div className="chip-row" style={{ marginBottom: 0 }} role="group" aria-label="Lọc nhanh theo trạng thái">
          <button
            type="button"
            className={`filter-chip${statusFilter === '' ? ' selected' : ''}`}
            onClick={() => setStatusFilter('')}
          >
            <span>Tất cả</span>
            <span className="chip-count">{allTickets.length}</span>
          </button>
          {TICKET_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-chip${statusFilter === status ? ' selected' : ''}`}
              onClick={() => setStatusFilter((cur) => (cur === status ? '' : status))}
            >
              <span
                className="kanban-col-dot"
                style={{ backgroundColor: STAGE_COLORS[status] }}
                aria-hidden="true"
              />
              <span>{STATUS_META[status].short}</span>
              <span className="chip-count">{metrics.counts[status] || 0}</span>
            </button>
          ))}
        </div>

        <div className="segmented" role="group" aria-label="Chế độ hiển thị phiếu">
          <button
            type="button"
            className={`seg-btn${viewMode === 'board' ? ' active' : ''}`}
            onClick={() => setViewMode('board')}
          >
            <Kanban size={14} aria-hidden="true" />
            Bảng tiến độ
          </button>
          <button
            type="button"
            className={`seg-btn${viewMode === 'table' ? ' active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <Table2 size={14} aria-hidden="true" />
            Danh sách
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="panel" style={{ marginBottom: viewMode === 'board' ? 14 : 0 }}>
        <div
          className="toolbar"
          style={
            viewMode === 'board'
              ? { borderBottom: 'none', borderRadius: 'var(--radius-md)' }
              : undefined
          }
        >
          <div className="search-box">
            <Search size={15} />
            <input
              type="search"
              className="input"
              placeholder="Tìm mã phiếu, thiết bị, số serial, tên hoặc SĐT khách hàng…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm phiếu sửa chữa"
            />
          </div>

          <select
            className="select select-inline"
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            aria-label="Lọc theo kỹ thuật viên"
          >
            <option value="">Tất cả kỹ thuật viên</option>
            {technicians.map((tech) => (
              <option key={tech._id} value={tech._id}>
                {tech.code} — {tech.fullName}
              </option>
            ))}
          </select>

          <select
            className="select select-inline"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái sửa chữa"
          >
            <option value="">Tất cả trạng thái</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setTechFilter('');
              }}
            >
              <X size={14} />
              Xóa lọc
            </button>
          )}
        </div>

        {/* Table Mode */}
        {viewMode === 'table' && (
          <>
            {loading ? (
              <div className="panel-body">
                <p className="field-hint">Đang tải danh sách phiếu sửa chữa…</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Không có phiếu sửa chữa phù hợp"
                description={
                  hasFilters
                    ? 'Thử bỏ bớt điều kiện lọc kỹ thuật viên, trạng thái hoặc từ khóa tìm kiếm.'
                    : 'Bắt đầu bằng cách tiếp nhận thiết bị mới hoặc lập phiếu sửa chữa cho thiết bị đã có.'
                }
                action={
                  hasFilters ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('');
                        setTechFilter('');
                      }}
                    >
                      Xem toàn bộ phiếu
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus size={15} />
                      Tạo phiếu đầu tiên
                    </button>
                  )
                }
              />
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã phiếu</th>
                      <th>Thiết bị & Khách hàng</th>
                      <th>Lỗi ghi nhận</th>
                      <th>Kỹ thuật viên</th>
                      <th style={{ textAlign: 'right' }}>Dự kiến / Thực tế</th>
                      <th>Trạng thái</th>
                      <th>Ngày lập</th>
                      <th aria-label="Thao tác" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => (
                      <tr
                        key={t._id}
                        className="row-clickable"
                        onClick={() => navigate(`/tickets/${t._id}`)}
                      >
                        <td>
                          <Link
                            to={`/tickets/${t._id}`}
                            className="job-code"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t.ticketCode}
                          </Link>
                        </td>
                        <td>
                          <div className="cell-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <DeviceTypeIcon type={t.deviceId?.deviceType} size={14} />
                            <span>{t.deviceId?.name || '—'}</span>
                          </div>
                          <div className="cell-sub">
                            <span className="mono">{t.deviceId?.deviceCode}</span> ·{' '}
                            {t.deviceId?.customerId?.fullName || '—'} ({t.deviceId?.customerId?.phone || '—'})
                          </div>
                        </td>
                        <td style={{ maxWidth: 280 }}>
                          <div style={{ lineHeight: 1.45 }}>{t.issueDescription}</div>
                        </td>
                        <td>
                          <div className="cell-primary">{t.technicianId?.fullName || '—'}</div>
                          <div className="cell-sub mono">{t.technicianId?.code}</div>
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular">
                          <div className="cell-primary">{formatVND(t.estimatedCost)}</div>
                          <div className="cell-sub">
                            {t.actualCost > 0 ? `TT: ${formatVND(t.actualCost)}` : 'Chưa chốt TT'}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="tabular cell-sub" style={{ whiteSpace: 'nowrap' }}>
                          {formatDateShort(t.receivedAt)}
                        </td>
                        <td>
                          <div className="cell-actions">
                            <Link
                              to={`/tickets/${t._id}`}
                              className="btn btn-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Chi tiết
                              <ArrowRight size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* 5-Stage Workshop Kanban Board Mode */}
      {viewMode === 'board' && (
        <>
          {loading ? (
            <div className="panel panel-body">
              <p className="field-hint">Đang tải bảng tiến độ sửa chữa…</p>
            </div>
          ) : (
            <div className="kanban-board">
              {TICKET_STATUSES.map((stage, stageIdx) => {
                const items = boardColumns[stage] || [];
                const nextStage = TICKET_STATUSES[stageIdx + 1];
                return (
                  <section key={stage} className="kanban-col" aria-label={stage}>
                    <header className="kanban-col-head">
                      <div className="kanban-col-title">
                        <span
                          className="kanban-col-dot"
                          style={{ backgroundColor: STAGE_COLORS[stage] }}
                          aria-hidden="true"
                        />
                        <span>{stage}</span>
                      </div>
                      <span className="chip-count">{items.length}</span>
                    </header>

                    <div className="kanban-col-body">
                      {items.length === 0 ? (
                        <div className="kanban-empty">Không có phiếu ở bước này</div>
                      ) : (
                        items.map((t) => (
                          <article key={t._id} className="job-card">
                            <div className="job-card-head">
                              <Link to={`/tickets/${t._id}`} className="job-code">
                                {t.ticketCode}
                              </Link>
                              <span className="cell-sub mono" style={{ marginTop: 0 }}>
                                {formatDateShort(t.receivedAt)}
                              </span>
                            </div>

                            <div>
                              <Link to={`/tickets/${t._id}`} className="job-device">
                                {t.deviceId?.name || '—'}
                              </Link>
                              <div className="cell-sub">
                                {t.deviceId?.customerId?.fullName || '—'} ·{' '}
                                <span className="mono">{t.deviceId?.deviceCode}</span>
                              </div>
                            </div>

                            <p className="job-issue">{t.issueDescription}</p>

                            <div className="job-meta">
                              <span className="truncate">{t.technicianId?.fullName || '—'}</span>
                              <strong className="tabular" style={{ color: 'var(--ink-primary)' }}>
                                {formatVND(t.actualCost > 0 ? t.actualCost : t.estimatedCost)}
                              </strong>
                            </div>

                            <div className="job-actions">
                              <Link to={`/tickets/${t._id}`} className="btn btn-sm">
                                Chi tiết
                              </Link>
                              {nextStage && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                                  disabled={advancingId === t._id}
                                  onClick={() => handleAdvanceStatus(t)}
                                  title={`Chuyển nhanh sang ${nextStage}`}
                                >
                                  {advancingId === t._id ? 'Đang chuyển…' : STATUS_META[nextStage].short}
                                  <ChevronRight size={13} />
                                </button>
                              )}
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create Ticket Drawer */}
      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo phiếu sửa chữa mới"
        subtitle="Chọn thiết bị đã tiếp nhận, mô tả lỗi và gán nhân viên kỹ thuật xử lý."
        footer={
          <>
            <button type="button" className="btn" onClick={() => setCreateOpen(false)}>
              Hủy
            </button>
            <button
              type="submit"
              form="create-ticket-form"
              className="btn btn-primary"
              disabled={saving || devices.length === 0}
            >
              {saving ? 'Đang tạo phiếu…' : 'Lưu phiếu sửa chữa'}
            </button>
          </>
        }
      >
        <form id="create-ticket-form" onSubmit={handleCreateTicket} className="stack-v">
          {formError && <div className="inline-alert">{formError}</div>}

          <div className="form-field">
            <label className="field-label" htmlFor="tk-device">
              Thiết bị sửa chữa<span className="field-req">*</span>
            </label>
            <select
              id="tk-device"
              className="select"
              required
              value={form.deviceId}
              onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))}
            >
              {devices.length === 0 && <option value="">Chưa có thiết bị nào</option>}
              {devices.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.deviceCode} · {d.name} — {d.customerId?.fullName || 'Khách lẻ'}
                </option>
              ))}
            </select>
            <span className="field-hint">
              Thiết bị chưa có trong kho?{' '}
              <Link to="/intake" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Chuyển sang trang Tiếp nhận thiết bị
              </Link>
            </span>
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="tk-tech">
              Nhân viên kỹ thuật phụ trách<span className="field-req">*</span>
            </label>
            <select
              id="tk-tech"
              className="select"
              required
              value={form.technicianId}
              onChange={(e) => setForm((f) => ({ ...f, technicianId: e.target.value }))}
            >
              {technicians.map((tech) => (
                <option key={tech._id} value={tech._id}>
                  {tech.code} · {tech.fullName} ({tech.specialty} · đang giữ {tech.activeTicketCount} phiếu)
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="tk-issue">
              Ghi nhận lỗi thiết bị<span className="field-req">*</span>
            </label>
            <textarea
              id="tk-issue"
              className="textarea"
              required
              placeholder="Ví dụ: Màn hình sọc xanh, mất cảm ứng nửa dưới, cần kiểm tra cáp màn hoặc thay cụm màn mới…"
              value={form.issueDescription}
              onChange={(e) => setForm((f) => ({ ...f, issueDescription: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="tk-est">
              Chi phí dự kiến (VNĐ)<span className="field-req">*</span>
            </label>
            <input
              id="tk-est"
              type="number"
              min="0"
              step="10000"
              className="input tabular"
              required
              placeholder="1500000"
              value={form.estimatedCost}
              onChange={(e) => setForm((f) => ({ ...f, estimatedCost: e.target.value }))}
            />
            {Number(form.estimatedCost) > 0 && (
              <span className="field-hint tabular">
                Hiển thị: {formatVND(form.estimatedCost)}
              </span>
            )}
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="tk-note">
              Ghi chú tiếp nhận ban đầu
            </label>
            <input
              id="tk-note"
              type="text"
              className="input"
              placeholder="Ví dụ: Khách cần gấp trong ngày, không kèm sạc…"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
