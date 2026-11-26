import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AppLayout } from './components/AppLayout';
import { TicketsPage } from './pages/TicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { IntakePage } from './pages/IntakePage';
import { DevicesPage } from './pages/DevicesPage';
import { CustomersPage } from './pages/CustomersPage';
import { TechniciansPage } from './pages/TechniciansPage';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/tickets" replace />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/intake" element={<IntakePage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/technicians" element={<TechniciansPage />} />
            <Route path="*" element={<Navigate to="/tickets" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

