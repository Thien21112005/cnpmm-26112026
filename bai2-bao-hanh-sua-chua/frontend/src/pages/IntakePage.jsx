import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { repairStore } from '../services/repairStore';
import { DEVICE_TYPES, formatVND } from '../constants/repair';
import { DeviceTypeIcon } from '../components/DeviceTypeIcon';
import { useToast } from '../components/Toast';

export function IntakePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [newCustomerMode, setNewCustomerMode] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
  });

  const [device, setDevice] = useState({
    deviceCode: '',
    name: '',
    deviceType: DEVICE_TYPES[0],
    brand: '',
    model: '',
    serialNumber: '',
    initialCondition: '',
  });

  const [openTicketNow, setOpenTicketNow] = useState(true);
  const [ticketForm, setTicketForm] = useState({
    technicianId: '',
    issueDescription: '',
    estimatedCost: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      repairStore.getCustomers(),
      repairStore.getTechnicians(),
      repairStore.suggestDeviceCode(),
    ])
      .then(([cList, tList, suggestedCode]) => {
        setCustomers(cList);
        setTechnicians(tList);
        if (cList[0]) setCustomerId(cList[0]._id);
        if (tList[0]) setTicketForm((p) => ({ ...p, technicianId: tList[0]._id }));
        setDevice((p) => ({ ...p, deviceCode: suggestedCode }));
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  const previewOwner = useMemo(() => {
    if (newCustomerMode) {
      return {
        fullName: newCustomer.fullName.trim() || 'Khách hàng mới',
        phone: newCustomer.phone.trim() || 'Chưa nhập SĐT',
      };
    }
    const found = customers.find((c) => c._id === customerId);
    return found || { fullName: 'Chưa chọn khách', phone: '—' };
  }, [newCustomerMode, newCustomer, customers, customerId]);

  const previewTech = useMemo(
    () => technicians.find((t) => t._id === ticketForm.technicianId),
    [technicians, ticketForm.technicianId]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let ownerId = customerId;
      if (newCustomerMode) {
        const createdCustomer = await repairStore.createCustomer(newCustomer);
        ownerId = createdCustomer._id;
      }
      if (!ownerId) {
        throw new Error('Vui lòng chọn khách hàng sở hữu hoặc thêm khách hàng mới.');
      }

      const createdDevice = await repairStore.createDevice({
        ...device,
        customerId: ownerId,
      });

      if (openTicketNow) {
        const createdTicket = await repairStore.createTicket({
          deviceId: createdDevice._id,
          technicianId: ticketForm.technicianId,
          issueDescription: ticketForm.issueDescription,
          estimatedCost: ticketForm.estimatedCost === '' ? 0 : Number(ticketForm.estimatedCost),
          note: 'Tiếp nhận thiết bị và mở phiếu sửa chữa tại quầy.',
        });
        toast(`Đã tiếp nhận ${createdDevice.deviceCode} và tạo phiếu ${createdTicket.ticketCode}.`);
        navigate(`/tickets/${createdTicket._id}`);
      } else {
        toast(`Đã tiếp nhận thiết bị ${createdDevice.deviceCode}.`);
        navigate('/devices');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quầy tiếp nhận thiết bị</h1>
          <p className="page-subtitle">
            Ghi nhận đủ 8 trường thông tin máy, liên kết khách hàng sở hữu và in tem tiếp nhận kèm phiếu sửa chữa.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/devices" className="btn">
            Xem kho thiết bị
          </Link>
        </div>
      </div>

      {error && (
        <div className="inline-alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="intake-grid">
        <div className="stack-v">
          {/* Customer Selection */}
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Khách hàng sở hữu</h2>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setNewCustomerMode((v) => !v)}
              >
                <UserPlus size={14} />
                {newCustomerMode ? 'Chọn khách hàng có sẵn' : 'Thêm khách hàng mới'}
              </button>
            </div>
            <div className="panel-body">
              {!newCustomerMode ? (
                <div className="form-field">
                  <label className="field-label" htmlFor="in-cust">
                    Chọn khách hàng<span className="field-req">*</span>
                  </label>
                  <select
                    id="in-cust"
                    className="select"
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  >
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.fullName} — {c.phone}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label" htmlFor="nc-name">
                      Họ tên khách hàng<span className="field-req">*</span>
                    </label>
                    <input
                      id="nc-name"
                      type="text"
                      className="input"
                      required
                      placeholder="Nguyễn Văn An"
                      value={newCustomer.fullName}
                      onChange={(e) =>
                        setNewCustomer((p) => ({ ...p, fullName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label" htmlFor="nc-phone">
                      Số điện thoại<span className="field-req">*</span>
                    </label>
                    <input
                      id="nc-phone"
                      type="tel"
                      className="input tabular"
                      required
                      placeholder="0909 123 456"
                      value={newCustomer.phone}
                      onChange={(e) =>
                        setNewCustomer((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label" htmlFor="nc-email">
                      Email
                    </label>
                    <input
                      id="nc-email"
                      type="email"
                      spellCheck={false}
                      className="input"
                      placeholder="khachhang@gmail.com"
                      value={newCustomer.email}
                      onChange={(e) =>
                        setNewCustomer((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label" htmlFor="nc-addr">
                      Địa chỉ
                    </label>
                    <input
                      id="nc-addr"
                      type="text"
                      className="input"
                      placeholder="Quận / TP"
                      value={newCustomer.address}
                      onChange={(e) =>
                        setNewCustomer((p) => ({ ...p, address: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Device 8 Fields */}
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Thông số thiết bị tiếp nhận</h2>
            </div>
            <div className="panel-body stack-v">
              <div className="form-field">
                <span className="field-label">
                  Loại thiết bị<span className="field-req">*</span>
                </span>
                <div className="type-picker" role="radiogroup" aria-label="Loại thiết bị">
                  {DEVICE_TYPES.map((type) => {
                    const selected = device.deviceType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`type-option${selected ? ' selected' : ''}`}
                        onClick={() => setDevice((d) => ({ ...d, deviceType: type }))}
                      >
                        <DeviceTypeIcon type={type} size={18} />
                        <span>{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label" htmlFor="dev-code">
                    Mã thiết bị<span className="field-req">*</span>
                  </label>
                  <input
                    id="dev-code"
                    type="text"
                    spellCheck={false}
                    className="input mono"
                    required
                    value={device.deviceCode}
                    onChange={(e) => setDevice((d) => ({ ...d, deviceCode: e.target.value }))}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="dev-serial">
                    Số serial / IMEI<span className="field-req">*</span>
                  </label>
                  <input
                    id="dev-serial"
                    type="text"
                    spellCheck={false}
                    className="input mono"
                    required
                    placeholder="Nhập chính xác số serial…"
                    value={device.serialNumber}
                    onChange={(e) => setDevice((d) => ({ ...d, serialNumber: e.target.value }))}
                  />
                </div>

                <div className="form-field full">
                  <label className="field-label" htmlFor="dev-name">
                    Tên thiết bị<span className="field-req">*</span>
                  </label>
                  <input
                    id="dev-name"
                    type="text"
                    className="input"
                    required
                    placeholder="Ví dụ: iPhone 16 Pro 256GB hoặc ThinkPad X1 Carbon Gen 11…"
                    value={device.name}
                    onChange={(e) => setDevice((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="dev-brand">
                    Thương hiệu<span className="field-req">*</span>
                  </label>
                  <input
                    id="dev-brand"
                    type="text"
                    className="input"
                    required
                    placeholder="Apple, Samsung, Dell, ASUS…"
                    value={device.brand}
                    onChange={(e) => setDevice((d) => ({ ...d, brand: e.target.value }))}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="dev-model">
                    Model<span className="field-req">*</span>
                  </label>
                  <input
                    id="dev-model"
                    type="text"
                    spellCheck={false}
                    className="input"
                    required
                    placeholder="Ví dụ: A3106, XPS-9340…"
                    value={device.model}
                    onChange={(e) => setDevice((d) => ({ ...d, model: e.target.value }))}
                  />
                </div>

                <div className="form-field full">
                  <label className="field-label" htmlFor="dev-cond">
                    Tình trạng ban đầu<span className="field-req">*</span>
                  </label>
                  <textarea
                    id="dev-cond"
                    className="textarea"
                    required
                    placeholder="Ghi nhận ngoại quan, vết trầy cấn, phụ kiện đi kèm, tình trạng nguồn/màn hình lúc nhận…"
                    value={device.initialCondition}
                    onChange={(e) =>
                      setDevice((d) => ({ ...d, initialCondition: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Panel: Live Hardware Claim Tag Preview + Instant Ticket */}
        <aside className="stack-v" style={{ position: 'sticky', top: 20 }}>
          <div className="claim-preview" aria-label="Xem trước tem tiếp nhận">
            <div className="claim-preview-head">
              <div>
                <div
                  className="mono"
                  style={{ fontWeight: 700, color: '#fb923c', fontSize: 13 }}
                >
                  {device.deviceCode || 'TB-2026-XXX'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--rail-muted)' }}>
                  Tem dán thiết bị · FixDesk Lab
                </div>
              </div>
              <div className="claim-barcode" aria-hidden="true" />
            </div>

            <div className="claim-row">
              <span>Thiết bị</span>
              <span>{device.name.trim() || 'Chưa nhập tên máy'}</span>
            </div>
            <div className="claim-row">
              <span>Phân loại</span>
              <span>
                {device.deviceType}
                {device.brand ? ` · ${device.brand}` : ''}
              </span>
            </div>
            <div className="claim-row">
              <span>Serial</span>
              <span className="mono">{device.serialNumber.trim() || '—'}</span>
            </div>
            <div className="claim-row">
              <span>Khách hàng</span>
              <span>{previewOwner.fullName}</span>
            </div>
            <div className="claim-row">
              <span>Điện thoại</span>
              <span className="tabular">{previewOwner.phone}</span>
            </div>
            {openTicketNow && (
              <>
                <div className="claim-row">
                  <span>KTV phụ trách</span>
                  <span>{previewTech ? previewTech.fullName : '—'}</span>
                </div>
                <div className="claim-row">
                  <span>Dự kiến</span>
                  <span className="tabular" style={{ color: '#4ade80' }}>
                    {formatVND(ticketForm.estimatedCost || 0)}
                  </span>
                </div>
              </>
            )}
          </div>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Phiếu sửa chữa đi kèm</h2>
            </div>
            <div className="panel-body stack-v">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={openTicketNow}
                  onChange={(e) => setOpenTicketNow(e.target.checked)}
                />
                <span>Lập ngay phiếu sửa chữa sau khi tiếp nhận</span>
              </label>

              {openTicketNow ? (
                <>
                  <div className="form-field">
                    <label className="field-label" htmlFor="in-tech">
                      Kỹ thuật viên phụ trách<span className="field-req">*</span>
                    </label>
                    <select
                      id="in-tech"
                      className="select"
                      required
                      value={ticketForm.technicianId}
                      onChange={(e) =>
                        setTicketForm((p) => ({ ...p, technicianId: e.target.value }))
                      }
                    >
                      {technicians.map((tech) => (
                        <option key={tech._id} value={tech._id}>
                          {tech.code} · {tech.fullName} ({tech.specialty})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="field-label" htmlFor="in-issue">
                      Lỗi thiết bị ghi nhận<span className="field-req">*</span>
                    </label>
                    <textarea
                      id="in-issue"
                      className="textarea"
                      required
                      placeholder="Mô tả lỗi khách phản ánh và hạng mục cần kiểm tra / sửa chữa…"
                      value={ticketForm.issueDescription}
                      onChange={(e) =>
                        setTicketForm((p) => ({ ...p, issueDescription: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label" htmlFor="in-cost">
                      Chi phí dự kiến (VNĐ)<span className="field-req">*</span>
                    </label>
                    <input
                      id="in-cost"
                      type="number"
                      min="0"
                      step="10000"
                      className="input tabular"
                      required
                      placeholder="1200000"
                      value={ticketForm.estimatedCost}
                      onChange={(e) =>
                        setTicketForm((p) => ({ ...p, estimatedCost: e.target.value }))
                      }
                    />
                    {Number(ticketForm.estimatedCost) > 0 && (
                      <span className="field-hint tabular">
                        {formatVND(ticketForm.estimatedCost)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="field-hint">
                  Hệ thống sẽ chỉ lưu hồ sơ thiết bị vào kho tiếp nhận. Bạn có thể lập phiếu sửa chữa
                  sau từ trang Kho thiết bị hoặc Phiếu sửa chữa.
                </p>
              )}

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <CheckCircle2 size={15} />
                {submitting
                  ? 'Đang xử lý…'
                  : openTicketNow
                    ? 'Hoàn tất tiếp nhận & mở phiếu'
                    : 'Lưu hồ sơ thiết bị'}
              </button>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
