import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeftRight,
  ClipboardList,
  HardDrive,
  Menu,
  PackagePlus,
  RefreshCw,
  Search,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { repairStore } from '../services/repairStore';
import { CommandPalette } from './CommandPalette';

const NAV_ITEMS = [
  { to: '/tickets', label: 'Phiếu sửa chữa', icon: ClipboardList },
  { to: '/intake', label: 'Tiếp nhận thiết bị', icon: PackagePlus },
  { to: '/devices', label: 'Kho thiết bị', icon: HardDrive },
  { to: '/customers', label: 'Khách hàng', icon: Users },
  { to: '/technicians', label: 'Kỹ thuật viên', icon: Wrench },
];

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');

  const verifyApi = useCallback(async () => {
    setApiStatus('checking');
    const state = await repairStore.checkHealth();
    setApiStatus(state);
  }, []);

  useEffect(() => {
    verifyApi();
  }, [verifyApi]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Bỏ qua đến nội dung chính
      </a>

      <div className="mobile-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="brand-mark" style={{ width: 28, height: 28 }}>
            <Wrench size={14} />
          </div>
          <span className="brand-title">FixDesk Lab</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="btn-rail-icon"
            onClick={() => setCmdOpen(true)}
            aria-label="Tra cứu nhanh"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            className="btn-rail-icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Mở menu điều hướng"
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <Wrench size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="brand-title">FixDesk Lab</div>
            <div className="brand-sub">Trung tâm Bảo hành · Bài 2</div>
          </div>
        </div>

        <div className="sidebar-search-wrap">
          <button
            type="button"
            className="rail-search-trigger"
            onClick={() => setCmdOpen(true)}
          >
            <Search size={14} aria-hidden="true" />
            <span>Tra cứu nhanh…</span>
            <kbd className="rail-kbd">Ctrl K</kbd>
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-cta">
          <Link
            to="/intake"
            onClick={() => setMobileOpen(false)}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            <PackagePlus size={15} />
            Tiếp nhận máy mới
          </Link>
        </div>

        <div className="sidebar-footer">
          <div className="mode-chip">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span
                className={`mode-dot ${apiStatus === 'online' ? 'api' : 'offline'}`}
                aria-hidden="true"
              />
              <span className="truncate">
                {apiStatus === 'online'
                  ? 'MongoDB · :5002'
                  : apiStatus === 'checking'
                    ? 'Đang kết nối :5002…'
                    : 'Mất kết nối :5002'}
              </span>
            </span>
            {apiStatus === 'offline' && (
              <button
                type="button"
                className="btn-rail-icon"
                style={{ width: 24, height: 24 }}
                onClick={verifyApi}
                title="Kiểm tra lại kết nối Backend"
                aria-label="Kiểm tra lại kết nối Backend"
              >
                <RefreshCw size={12} />
              </button>
            )}
          </div>

          <a
            href="http://localhost:5173"
            className="swap-link"
            title="Chuyển sang ứng dụng Bài 1: Quản lý đặt bàn nhà hàng"
          >
            <span>Chuyển Bài 1 (:5173)</span>
            <ArrowLeftRight size={13} aria-hidden="true" />
          </a>
        </div>
      </aside>

      <main id="main-content" className="main-column">
        <div className="page-wrap">
          <Outlet />
        </div>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
