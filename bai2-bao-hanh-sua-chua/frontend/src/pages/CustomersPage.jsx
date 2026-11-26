import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { repairStore } from '../services/repairStore';
import { Drawer } from '../components/Drawer';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  note: '',
};

export function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadCustomers = useCallback(
    async (q = '') => {
      setLoading(true);
      try {
        const list = await repairStore.getCustomers(q);
        setCustomers(list);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    const next = {};
    if (search.trim()) next.search = search.trim();
    setSearchParams(next, { replace: true });

    const timer = setTimeout(() => {
      loadCustomers(search);
    }, 120);
    return () => clearTimeout(timer);
  }, [search, loadCustomers, setSearchParams]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDrawerOpen(true);
  };

  const openEdit = (c) => {
    setEditingId(c._id);
    setForm({
      fullName: c.fullName || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      note: c.note || '',
    });
    setFormError('');
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editingId) {
        await repairStore.updateCustomer(editingId, form);
        toast(`Đã cập nhật khách hàng ${form.fullName}.`);
      } else {
        await repairStore.createCustomer(form);
        toast(`Đã thêm khách hàng ${form.fullName}.`);
      }
      setDrawerOpen(false);
      await loadCustomers(search);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer) => {
    try {
      await repairStore.deleteCustomer(customer._id);
      toast(`Đã xóa khách hàng ${customer.fullName}.`);
      setConfirmDeleteId(null);
      await loadCustomers(search);
    } catch (err) {
      toast(err.message, 'error');
      setConfirmDeleteId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Danh bạ khách hàng</h1>
          <p className="page-subtitle">
            Tra cứu theo họ tên hoặc số điện thoại, theo dõi thiết bị sở hữu và bảo vệ dữ liệu liên kết khi xóa.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} />
            Thêm khách hàng
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={15} />
            <input
              type="search"
              className="input"
              placeholder="Tìm kiếm khách hàng theo tên hoặc số điện thoại…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm khách hàng theo tên hoặc số điện thoại"
            />
          </div>
          <span className="chip-count">{customers.length} khách hàng</span>
        </div>

        {loading ? (
          <div className="panel-body">
            <p className="field-hint">Đang tải danh sách khách hàng…</p>
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Không tìm thấy khách hàng"
            description={
              search
                ? `Không có khách hàng nào khớp với "${search}".`
                : 'Chưa có dữ liệu khách hàng trong hệ thống.'
            }
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                <Plus size={15} />
                Thêm khách hàng mới
              </button>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Email & Địa chỉ</th>
                  <th>Thiết bị sở hữu</th>
                  <th>Ghi chú</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id}>
                    <td className="cell-primary">{c.fullName}</td>
                    <td>
                      <span className="serial-plate tabular">{c.phone}</span>
                    </td>
                    <td>
                      <div>{c.email || '—'}</div>
                      {c.address && <div className="cell-sub">{c.address}</div>}
                    </td>
                    <td>
                      {c.deviceCount > 0 ? (
                        <Link
                          to={`/devices?customerId=${c._id}`}
                          className="job-code"
                          title="Xem danh sách thiết bị của khách hàng này"
                        >
                          {c.deviceCount} thiết bị
                        </Link>
                      ) : (
                        <span className="cell-sub">0 thiết bị</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 230 }}>
                      <span className="cell-sub">{c.note || '—'}</span>
                    </td>
                    <td>
                      <div className="cell-actions">
                        {confirmDeleteId === c._id ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(c)}
                            >
                              Xác nhận xóa
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil size={13} />
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmDeleteId(c._id)}
                              aria-label={`Xóa ${c.fullName}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'Cập nhật thông tin khách hàng' : 'Thêm khách hàng mới'}
        subtitle="Số điện thoại và họ tên dùng để tra cứu nhanh khi tiếp nhận hoặc bàn giao thiết bị."
        footer={
          <>
            <button type="button" className="btn" onClick={() => setDrawerOpen(false)}>
              Hủy
            </button>
            <button
              type="submit"
              form="customer-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Đang lưu…' : editingId ? 'Lưu cập nhật' : 'Thêm khách hàng'}
            </button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSubmit} className="stack-v">
          {formError && <div className="inline-alert">{formError}</div>}

          <div className="form-field">
            <label className="field-label" htmlFor="c-name">
              Họ tên khách hàng<span className="field-req">*</span>
            </label>
            <input
              id="c-name"
              type="text"
              className="input"
              required
              placeholder="Nguyễn Minh Quân"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="c-phone">
              Số điện thoại<span className="field-req">*</span>
            </label>
            <input
              id="c-phone"
              type="tel"
              className="input tabular"
              required
              placeholder="0908 421 318"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="c-email">
              Email
            </label>
            <input
              id="c-email"
              type="email"
              spellCheck={false}
              className="input"
              placeholder="example@gmail.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="c-address">
              Địa chỉ
            </label>
            <input
              id="c-address"
              type="text"
              className="input"
              placeholder="Số nhà, đường, quận/huyện…"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="c-note">
              Ghi chú
            </label>
            <textarea
              id="c-note"
              className="textarea"
              placeholder="Yêu cầu xuất hóa đơn, khung giờ liên hệ…"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
