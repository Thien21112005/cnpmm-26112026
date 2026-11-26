import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeftRight,
  ClipboardList,
  HardDrive,
  Menu,
  PackagePlus,
  RefreshCw,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { repairStore } from '../services/repairStore';

const NAV_ITEMS = [
  { to: '/tickets', label: 'Phiếu sửa chữa', icon: ClipboardList },
  { to: '/intake', label: 'Tiếp nhận thiết bị', icon: PackagePlus },
  { to: '/devices', label: 'Quản lý thiết bị', icon: HardDrive },
  { to: '/customers', label: 'Khách hàng', icon: Users },
  { to: '/technicians', label: 'Kỹ thuật viên', icon: Wrench },
];

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking'); // 'checking' | 'online' | 'offline'

  const verifyApi = useCallback(async () => {
    setApiStatus('checking');
    const state = await repairStore.checkHealth();
    setApiStatus(state);
  }, []);

  useEffect(() => {
    verifyApi();
  }, [verifyApi]);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Bỏ qua đến nội dung chính
      </a>
      <div className="mobile-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="brand-mark" style={{ width: 28, height: 28 }}>
            <Wrench size={15} />
          </div>
          <span className="brand-title">FixDesk · Bài 2</span>
        </div>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Mở menu điều hướng"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <Wrench size={17} />
          </div>
          <div>
            <div className="brand-title">FixDesk</div>
            <div className="brand-sub">Bảo hành & Sửa chữa · Bài 2</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="mode-chip">
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span
                className={`mode-dot ${apiStatus === 'online' ? 'api' : 'offline'}`}
                aria-hidden="true"
              />
              <span>
                {apiStatus === 'online'
                  ? 'API MongoDB :5002'
                  : apiStatus === 'checking'
                    ? 'Đang kết nối :5002…'
                    : 'Mất kết nối API :5002'}
              </span>
            </span>
            {apiStatus === 'offline' && (
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                style={{ width: 24, height: 24, padding: 2 }}
                onClick={verifyApi}
                title="Kiểm tra lại kết nối Backend"
                aria-label="Kiểm tra lại kết nối Backend"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>

          <a
            href="http://localhost:5173"
            className="swap-link"
            title="Chuyển sang ứng dụng Bài 1: Quản lý đặt bàn nhà hàng"
          >
            <span>Chuyển sang Bài 1 (:5173)</span>
            <ArrowLeftRight size={14} />
          </a>
        </div>
      </aside>

      <main id="main-content" className="main-column">
        <div className="page-wrap">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
