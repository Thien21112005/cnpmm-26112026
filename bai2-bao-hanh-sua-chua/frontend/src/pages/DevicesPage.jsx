import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HardDrive,
  History,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { repairStore } from '../services/repairStore';
import { DEVICE_TYPES } from '../constants/repair';
import { StatusBadge } from '../components/StatusBadge';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { DeviceHistoryDrawer } from '../components/DeviceHistoryDrawer';
import { useToast } from '../components/Toast';

export function DevicesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [devices, setDevices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deviceType, setDeviceType] = useState(searchParams.get('deviceType') || '');
  const [customerFilter, setCustomerFilter] = useState(searchParams.get('customerId') || '');
  const [search, setSearch] = useState('');

  const [historyDeviceId, setHistoryDeviceId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dList, cList] = await Promise.all([
        repairStore.getDevices(),
        repairStore.getCustomers(),
      ]);
      setDevices(dList);
      setCustomers(cList);
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
    if (deviceType) next.deviceType = deviceType;
    if (customerFilter) next.customerId = customerFilter;
    setSearchParams(next, { replace: true });
  }, [deviceType, customerFilter, setSearchParams]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      if (deviceType && d.deviceType !== deviceType) return false;
      if (customerFilter && d.customerId?._id !== customerFilter) return false;
      if (!q) return true;
      return (
        d.deviceCode.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.brand.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.serialNumber.toLowerCase().includes(q) ||
        (d.customerId?.fullName || '').toLowerCase().includes(q) ||
        (d.customerId?.phone || '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))
      );
    });
  }, [devices, deviceType, customerFilter, search]);

  const openEdit = (dev) => {
    setEditing(dev);
    setEditError('');
    setEditForm({
      deviceCode: dev.deviceCode,
      name: dev.name,
      deviceType: dev.deviceType,
      brand: dev.brand,
      model: dev.model,
      serialNumber: dev.serialNumber,
      initialCondition: dev.initialCondition,
      customerId: dev.customerId?._id || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setSaving(true);
    try {
      await repairStore.updateDevice(editing._id, editForm);
      toast(`Đã cập nhật thiết bị ${editForm.deviceCode}.`);
      setEditing(null);
      await loadData();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = Boolean(deviceType || customerFilter || search.trim());

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý thiết bị</h1>
          <p className="page-subtitle">
            Danh sách thiết bị đã tiếp nhận, lọc theo loại thiết bị và tra cứu lịch sử sửa chữa.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/intake" className="btn btn-primary">
            <PackagePlus size={15} />
            Tiếp nhận thiết bị mới
          </Link>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={15} />
            <input
              type="search"
              className="input"
              placeholder="Tìm mã thiết bị, tên, model, số serial hoặc chủ sở hữu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm thiết bị"
            />
          </div>

          <select
            className="select select-inline"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
            aria-label="Lọc theo loại thiết bị"
          >
            <option value="">Tất cả loại thiết bị</option>
            {DEVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            className="select select-inline"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            aria-label="Lọc theo khách hàng"
          >
            <option value="">Tất cả khách hàng</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.fullName}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setDeviceType('');
                setCustomerFilter('');
                setSearch('');
              }}
            >
              <X size={14} />
              Xóa lọc
            </button>
          )}
        </div>

        {loading ? (
          <div className="panel-body">
            <p className="field-hint">Đang tải danh sách thiết bị…</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <EmptyState
            icon={HardDrive}
            title="Chưa tìm thấy thiết bị phù hợp"
            description="Thay đổi bộ lọc loại thiết bị hoặc tiếp nhận thiết bị mới từ khách hàng."
            action={
              <Link to="/intake" className="btn btn-primary">
                <PackagePlus size={15} />
                Tiếp nhận thiết bị
              </Link>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã TB</th>
                  <th>Tên & Cấu hình</th>
                  <th>Loại</th>
                  <th>Số serial</th>
                  <th>Khách hàng sở hữu</th>
                  <th>Tình trạng ban đầu</th>
                  <th>Sửa chữa gần nhất</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((d) => (
                  <tr key={d._id}>
                    <td className="mono cell-primary">{d.deviceCode}</td>
                    <td>
                      <div className="cell-primary">{d.name}</div>
                      <div className="cell-sub">
                        {d.brand} · {d.model}
                      </div>
                    </td>
                    <td>
                      <span className="type-tag">{d.deviceType}</span>
                    </td>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>
                      {d.serialNumber}
                    </td>
                    <td>
                      <div className="cell-primary">{d.customerId?.fullName || '—'}</div>
                      <div className="cell-sub tabular">{d.customerId?.phone || '—'}</div>
                    </td>
                    <td style={{ maxWidth: 230 }}>
                      <div className="cell-sub" style={{ color: 'var(--ink-secondary)', marginTop: 0 }}>
                        {d.initialCondition}
                      </div>
                    </td>
                    <td>
                      {d.latestStatus ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <StatusBadge status={d.latestStatus} />
                          <span className="cell-sub tabular">{d.ticketCount} phiếu</span>
                        </div>
                      ) : (
                        <span className="cell-sub">Chưa có phiếu</span>
                      )}
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setHistoryDeviceId(d._id)}
                        >
                          <History size={13} />
                          Lịch sử
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => openEdit(d)}
                          aria-label={`Sửa ${d.deviceCode}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          title="Tạo phiếu sửa mới cho thiết bị này"
                          onClick={() => navigate(`/tickets?newForDevice=${d._id}`)}
                          aria-label={`Tạo phiếu cho ${d.deviceCode}`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeviceHistoryDrawer
        deviceId={historyDeviceId}
        onClose={() => setHistoryDeviceId(null)}
        onCreateTicketForDevice={(dev) => navigate(`/tickets?newForDevice=${dev._id}`)}
      />

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Cập nhật thiết bị · ${editing.deviceCode}` : 'Cập nhật thiết bị'}
        subtitle="Chỉnh sửa thông tin định danh, tình trạng ban đầu hoặc khách hàng sở hữu."
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEditing(null)}>
              Hủy
            </button>
            <button
              type="submit"
              form="edit-device-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        {editForm && (
          <form id="edit-device-form" onSubmit={handleSaveEdit} className="stack-v">
            {editError && <div className="inline-alert">{editError}</div>}

            <div className="form-grid">
              <div className="form-field">
                <label className="field-label" htmlFor="ed-code">
                  Mã thiết bị<span className="field-req">*</span>
                </label>
                <input
                  id="ed-code"
                  type="text"
                  className="input mono"
                  required
                  value={editForm.deviceCode}
                  onChange={(e) => setEditForm((f) => ({ ...f, deviceCode: e.target.value }))}
                />
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="ed-type">
                  Loại thiết bị<span className="field-req">*</span>
                </label>
                <select
                  id="ed-type"
                  className="select"
                  value={editForm.deviceType}
                  onChange={(e) => setEditForm((f) => ({ ...f, deviceType: e.target.value }))}
                >
                  {DEVICE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field full">
                <label className="field-label" htmlFor="ed-name">
                  Tên thiết bị<span className="field-req">*</span>
                </label>
                <input
                  id="ed-name"
                  type="text"
                  className="input"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="ed-brand">
                  Thương hiệu<span className="field-req">*</span>
                </label>
                <input
                  id="ed-brand"
                  type="text"
                  className="input"
                  required
                  value={editForm.brand}
                  onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="ed-model">
                  Model<span className="field-req">*</span>
                </label>
                <input
                  id="ed-model"
                  type="text"
                  className="input"
                  required
                  value={editForm.model}
                  onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))}
                />
              </div>

              <div className="form-field full">
                <label className="field-label" htmlFor="ed-serial">
                  Số serial / IMEI<span className="field-req">*</span>
                </label>
                <input
                  id="ed-serial"
                  type="text"
                  className="input mono"
                  required
                  value={editForm.serialNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, serialNumber: e.target.value }))}
                />
              </div>

              <div className="form-field full">
                <label className="field-label" htmlFor="ed-cust">
                  Khách hàng sở hữu<span className="field-req">*</span>
                </label>
                <select
                  id="ed-cust"
                  className="select"
                  required
                  value={editForm.customerId}
                  onChange={(e) => setEditForm((f) => ({ ...f, customerId: e.target.value }))}
                >
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.fullName} — {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field full">
                <label className="field-label" htmlFor="ed-cond">
                  Tình trạng ban đầu<span className="field-req">*</span>
                </label>
                <textarea
                  id="ed-cond"
                  className="textarea"
                  required
                  value={editForm.initialCondition}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, initialCondition: e.target.value }))
                  }
                />
              </div>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}

