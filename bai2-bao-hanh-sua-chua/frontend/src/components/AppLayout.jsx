import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeftRight,
  ClipboardList,
  HardDrive,
  Menu,
  PackagePlus,
  RotateCcw,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { getStoreMode, repairStore, resetDemoData } from '../services/repairStore';
import { useToast } from './Toast';

const NAV_ITEMS = [
  { to: '/tickets', label: 'Phiếu sửa chữa', icon: ClipboardList },
  { to: '/intake', label: 'Tiếp nhận thiết bị', icon: PackagePlus },
  { to: '/devices', label: 'Quản lý thiết bị', icon: HardDrive },
  { to: '/customers', label: 'Khách hàng', icon: Users },
  { to: '/technicians', label: 'Kỹ thuật viên', icon: Wrench },
];

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState(getStoreMode());
  const toast = useToast();

  useEffect(() => {
    repairStore.init().then((m) => setMode(m));
  }, []);

  const handleResetDemo = () => {
    resetDemoData();
    toast('Đã khôi phục dữ liệu mẫu ban đầu.');
    window.location.reload();
  };

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
              <span className={`mode-dot ${mode}`} aria-hidden="true" />
              <span>{mode === 'api' ? 'API MongoDB :5002' : 'Dữ liệu mẫu cục bộ'}</span>
            </span>
            {mode === 'demo' && (
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                style={{ width: 24, height: 24, padding: 2 }}
                onClick={handleResetDemo}
                title="Khôi phục dữ liệu mẫu"
                aria-label="Khôi phục dữ liệu mẫu"
              >
                <RotateCcw size={13} />
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
