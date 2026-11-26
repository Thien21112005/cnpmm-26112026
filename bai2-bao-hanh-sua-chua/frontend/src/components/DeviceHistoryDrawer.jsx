import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, History, Plus } from 'lucide-react';
import { Drawer } from './Drawer';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';
import { repairStore } from '../services/repairStore';
import { formatDateTime, formatVND } from '../constants/repair';

export function DeviceHistoryDrawer({ deviceId, onClose, onCreateTicketForDevice }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!deviceId) return;
    let active = true;
    setLoading(true);
    setError('');
    repairStore
      .getDeviceHistory(deviceId)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [deviceId]);

  const device = data?.device;
  const tickets = data?.tickets || [];

  return (
    <Drawer
      open={Boolean(deviceId)}
      onClose={onClose}
      title={device ? `Lịch sử sửa chữa · ${device.deviceCode}` : 'Lịch sử sửa chữa thiết bị'}
      subtitle={
        device
          ? `${device.name} (${device.brand} ${device.model}) · S/N: ${device.serialNumber}`
          : ''
      }
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Đóng
          </button>
          {device && onCreateTicketForDevice && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onCreateTicketForDevice(device);
              }}
            >
              <Plus size={15} />
              Tạo phiếu sửa mới
            </button>
          )}
        </>
      }
    >
      {loading && <p className="field-hint">Đang tải lịch sử sửa chữa…</p>}
      {error && <div className="inline-alert">{error}</div>}

      {!loading && !error && device && (
        <div className="stack-v">
          <div className="panel">
            <div className="panel-body">
              <div className="meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Khách hàng sở hữu</span>
                  <span className="meta-value">{device.customerId?.fullName || '—'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Số điện thoại</span>
                  <span className="meta-value tabular">{device.customerId?.phone || '—'}</span>
                </div>
                <div className="meta-item full">
                  <span className="meta-label">Tình trạng ban đầu lúc tiếp nhận</span>
                  <span className="meta-value">{device.initialCondition}</span>
                </div>
              </div>
            </div>
          </div>

          {tickets.length === 0 ? (
            <EmptyState
              icon={History}
              title="Chưa có phiếu sửa chữa nào"
              description="Thiết bị này đã được tiếp nhận nhưng chưa phát sinh phiếu sửa chữa."
            />
          ) : (
            <div className="stack-v">
              <div className="field-label">
                Tổng cộng {tickets.length} lần sửa chữa (mới nhất trước)
              </div>
              {tickets.map((t) => (
                <div key={t._id} className="panel">
                  <div className="panel-body">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <span className="mono cell-primary">{t.ticketCode}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 13.5 }}>{t.issueDescription}</p>
                    <div className="meta-grid" style={{ marginBottom: 10 }}>
                      <div className="meta-item">
                        <span className="meta-label">Kỹ thuật viên</span>
                        <span className="meta-value">{t.technicianId?.fullName || '—'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Ngày lập phiếu</span>
                        <span className="meta-value tabular">{formatDateTime(t.receivedAt)}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Dự kiến</span>
                        <span className="meta-value tabular">{formatVND(t.estimatedCost)}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Thực tế</span>
                        <span className="meta-value tabular">
                          {t.actualCost > 0 ? formatVND(t.actualCost) : 'Chưa chốt'}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/tickets/${t._id}`}
                      onClick={onClose}
                      className="btn btn-sm"
                    >
                      Mở chi tiết phiếu
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

