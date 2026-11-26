import {
  SEED_CUSTOMERS,
  SEED_DEVICES,
  SEED_TECHNICIANS,
  SEED_TICKETS,
} from '../data/mockData';

const STORAGE_KEY = 'fixdesk_bai2_demo_v1';
const API_BASE = '/api';

// shortcut: auto-fallback to localStorage when backend :5002 is offline; once backend runs, live API takes over automatically.
let detectedMode = null; // 'api' | 'demo'

function loadLocalDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.tickets)) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  const initial = {
    customers: structuredClone(SEED_CUSTOMERS),
    technicians: structuredClone(SEED_TECHNICIANS),
    devices: structuredClone(SEED_DEVICES),
    tickets: structuredClone(SEED_TICKETS),
  };
  saveLocalDB(initial);
  return initial;
}

function saveLocalDB(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore quota errors
  }
}

export function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY);
  return loadLocalDB();
}

export function getStoreMode() {
  return detectedMode || 'demo';
}

async function probeApi() {
  if (detectedMode !== null) return detectedMode === 'api';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 900);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      detectedMode = 'api';
      return true;
    }
  } catch {
    // backend not running
  }
  detectedMode = 'demo';
  return false;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Lỗi máy chủ (${res.status})`);
  }
  return data;
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function nextSequenceCode(prefix, list, field) {
  const year = new Date().getFullYear();
  let max = 0;
  for (const item of list) {
    const match = String(item[field] || '').match(/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`;
}

function hydrateDevice(device, db) {
  const customer = db.customers.find((c) => c._id === device.customerId) || null;
  const tickets = db.tickets
    .filter((t) => t.deviceId === device._id)
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  return {
    ...device,
    customerId: customer || { _id: device.customerId, fullName: 'Không rõ', phone: '' },
    ticketCount: tickets.length,
    latestStatus: tickets[0]?.status || null,
  };
}

function hydrateTicket(ticket, db) {
  const rawDevice = db.devices.find((d) => d._id === ticket.deviceId);
  const device = rawDevice
    ? hydrateDevice(rawDevice, db)
    : { _id: ticket.deviceId, deviceCode: '—', name: 'Thiết bị không tồn tại', customerId: null };
  const technician = db.technicians.find((t) => t._id === ticket.technicianId) || {
    _id: ticket.technicianId,
    code: '—',
    fullName: 'Chưa phân công',
    specialty: '',
  };
  return {
    ...ticket,
    deviceId: device,
    technicianId: technician,
  };
}

export const repairStore = {
  async init() {
    await probeApi();
    return detectedMode;
  },

  // --- CUSTOMERS ---
  async getCustomers(search = '') {
    if (await probeApi()) {
      const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      return apiFetch(`/customers${qs}`);
    }
    const db = loadLocalDB();
    const q = search.trim().toLowerCase();
    return db.customers
      .filter((c) => {
        if (!q) return true;
        return (
          c.fullName.toLowerCase().includes(q) ||
          c.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))
        );
      })
      .map((c) => ({
        ...c,
        deviceCount: db.devices.filter((d) => d.customerId === c._id).length,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async createCustomer(payload) {
    if (await probeApi()) {
      return apiFetch('/customers', { method: 'POST', body: JSON.stringify(payload) });
    }
    const db = loadLocalDB();
    const fullName = String(payload.fullName || '').trim();
    const phone = String(payload.phone || '').trim();
    if (!fullName || !phone) throw new Error('Vui lòng nhập họ tên và số điện thoại.');

    const created = {
      _id: makeId('cust'),
      fullName,
      phone,
      email: String(payload.email || '').trim(),
      address: String(payload.address || '').trim(),
      note: String(payload.note || '').trim(),
      createdAt: new Date().toISOString(),
    };
    db.customers.unshift(created);
    saveLocalDB(db);
    return { ...created, deviceCount: 0 };
  },

  async updateCustomer(id, payload) {
    if (await probeApi()) {
      return apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    const db = loadLocalDB();
    const idx = db.customers.findIndex((c) => c._id === id);
    if (idx === -1) throw new Error('Không tìm thấy khách hàng.');
    db.customers[idx] = {
      ...db.customers[idx],
      fullName: String(payload.fullName || '').trim(),
      phone: String(payload.phone || '').trim(),
      email: String(payload.email || '').trim(),
      address: String(payload.address || '').trim(),
      note: String(payload.note || '').trim(),
    };
    saveLocalDB(db);
    return {
      ...db.customers[idx],
      deviceCount: db.devices.filter((d) => d.customerId === id).length,
    };
  },

  async deleteCustomer(id) {
    if (await probeApi()) {
      return apiFetch(`/customers/${id}`, { method: 'DELETE' });
    }
    const db = loadLocalDB();
    const linked = db.devices.filter((d) => d.customerId === id).length;
    if (linked > 0) {
      throw new Error(
        `Không thể xóa vì khách hàng đang sở hữu ${linked} thiết bị trong hệ thống.`
      );
    }
    db.customers = db.customers.filter((c) => c._id !== id);
    saveLocalDB(db);
    return { ok: true };
  },

  // --- DEVICES ---
  async getDevices({ deviceType = '', search = '', customerId = '' } = {}) {
    if (await probeApi()) {
      const params = new URLSearchParams();
      if (deviceType) params.set('deviceType', deviceType);
      if (search.trim()) params.set('search', search.trim());
      if (customerId) params.set('customerId', customerId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return apiFetch(`/devices${qs}`);
    }
    const db = loadLocalDB();
    const q = search.trim().toLowerCase();
    return db.devices
      .map((d) => hydrateDevice(d, db))
      .filter((d) => {
        if (deviceType && d.deviceType !== deviceType) return false;
        if (customerId && d.customerId?._id !== customerId) return false;
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
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async suggestDeviceCode() {
    if (await probeApi()) {
      const devices = await this.getDevices();
      return nextSequenceCode('TB', devices, 'deviceCode');
    }
    const db = loadLocalDB();
    return nextSequenceCode('TB', db.devices, 'deviceCode');
  },

  async createDevice(payload) {
    if (await probeApi()) {
      return apiFetch('/devices', { method: 'POST', body: JSON.stringify(payload) });
    }
    const db = loadLocalDB();
    const deviceCode =
      String(payload.deviceCode || '').trim() || nextSequenceCode('TB', db.devices, 'deviceCode');
    const serialNumber = String(payload.serialNumber || '').trim();
    if (!serialNumber) throw new Error('Vui lòng nhập số serial thiết bị.');
    if (db.devices.some((d) => d.deviceCode.toLowerCase() === deviceCode.toLowerCase())) {
      throw new Error(`Mã thiết bị "${deviceCode}" đã tồn tại.`);
    }
    if (db.devices.some((d) => d.serialNumber.toLowerCase() === serialNumber.toLowerCase())) {
      throw new Error(`Số serial "${serialNumber}" đã tồn tại trong hệ thống.`);
    }
    if (!db.customers.some((c) => c._id === payload.customerId)) {
      throw new Error('Khách hàng sở hữu không tồn tại.');
    }

    const created = {
      _id: makeId('dev'),
      deviceCode,
      name: String(payload.name || '').trim(),
      deviceType: payload.deviceType,
      brand: String(payload.brand || '').trim(),
      model: String(payload.model || '').trim(),
      serialNumber,
      initialCondition: String(payload.initialCondition || '').trim(),
      customerId: payload.customerId,
      createdAt: new Date().toISOString(),
    };
    db.devices.unshift(created);
    saveLocalDB(db);
    return hydrateDevice(created, db);
  },

  async updateDevice(id, payload) {
    if (await probeApi()) {
      return apiFetch(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    const db = loadLocalDB();
    const idx = db.devices.findIndex((d) => d._id === id);
    if (idx === -1) throw new Error('Không tìm thấy thiết bị.');

    const deviceCode = String(payload.deviceCode || db.devices[idx].deviceCode).trim();
    const serialNumber = String(payload.serialNumber || db.devices[idx].serialNumber).trim();
    if (
      db.devices.some(
        (d) => d._id !== id && d.deviceCode.toLowerCase() === deviceCode.toLowerCase()
      )
    ) {
      throw new Error(`Mã thiết bị "${deviceCode}" bị trùng với thiết bị khác.`);
    }
    if (
      db.devices.some(
        (d) => d._id !== id && d.serialNumber.toLowerCase() === serialNumber.toLowerCase()
      )
    ) {
      throw new Error(`Số serial "${serialNumber}" bị trùng với thiết bị khác.`);
    }

    db.devices[idx] = {
      ...db.devices[idx],
      deviceCode,
      name: String(payload.name || '').trim(),
      deviceType: payload.deviceType,
      brand: String(payload.brand || '').trim(),
      model: String(payload.model || '').trim(),
      serialNumber,
      initialCondition: String(payload.initialCondition || '').trim(),
      customerId: payload.customerId,
    };
    saveLocalDB(db);
    return hydrateDevice(db.devices[idx], db);
  },

  async getDeviceHistory(deviceId) {
    if (await probeApi()) {
      return apiFetch(`/devices/${deviceId}/history`);
    }
    const db = loadLocalDB();
    const raw = db.devices.find((d) => d._id === deviceId);
    if (!raw) throw new Error('Không tìm thấy thiết bị.');
    const tickets = db.tickets
      .filter((t) => t.deviceId === deviceId)
      .map((t) => hydrateTicket(t, db))
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
    return {
      device: hydrateDevice(raw, db),
      tickets,
    };
  },

  // --- TECHNICIANS ---
  async getTechnicians() {
    if (await probeApi()) {
      return apiFetch('/technicians');
    }
    const db = loadLocalDB();
    return db.technicians.map((tech) => {
      const assigned = db.tickets.filter((t) => t.technicianId === tech._id);
      const activeCount = assigned.filter((t) => t.status !== 'Đã bàn giao').length;
      const completedCount = assigned.filter(
        (t) => t.status === 'Đã hoàn thành' || t.status === 'Đã bàn giao'
      ).length;
      return {
        ...tech,
        activeTicketCount: activeCount,
        completedTicketCount: completedCount,
        totalTicketCount: assigned.length,
      };
    });
  },

  async createTechnician(payload) {
    if (await probeApi()) {
      return apiFetch('/technicians', { method: 'POST', body: JSON.stringify(payload) });
    }
    const db = loadLocalDB();
    const code =
      String(payload.code || '').trim() ||
      `KTV-${String(db.technicians.length + 1).padStart(2, '0')}`;
    if (db.technicians.some((t) => t.code.toLowerCase() === code.toLowerCase())) {
      throw new Error(`Mã kỹ thuật viên "${code}" đã tồn tại.`);
    }
    const created = {
      _id: makeId('tech'),
      code,
      fullName: String(payload.fullName || '').trim(),
      phone: String(payload.phone || '').trim(),
      specialty: String(payload.specialty || 'Tổng hợp').trim(),
      active: true,
    };
    db.technicians.push(created);
    saveLocalDB(db);
    return { ...created, activeTicketCount: 0, completedTicketCount: 0, totalTicketCount: 0 };
  },

  // --- REPAIR TICKETS ---
  async getTickets({ technicianId = '', status = '', search = '', deviceId = '' } = {}) {
    if (await probeApi()) {
      const params = new URLSearchParams();
      if (technicianId) params.set('technicianId', technicianId);
      if (status) params.set('status', status);
      if (deviceId) params.set('deviceId', deviceId);
      if (search.trim()) params.set('search', search.trim());
      const qs = params.toString() ? `?${params.toString()}` : '';
      return apiFetch(`/tickets${qs}`);
    }
    const db = loadLocalDB();
    const q = search.trim().toLowerCase();
    return db.tickets
      .map((t) => hydrateTicket(t, db))
      .filter((t) => {
        if (technicianId && t.technicianId?._id !== technicianId) return false;
        if (status && t.status !== status) return false;
        if (deviceId && t.deviceId?._id !== deviceId) return false;
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
      })
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  },

  async getTicketById(id) {
    if (await probeApi()) {
      return apiFetch(`/tickets/${id}`);
    }
    const db = loadLocalDB();
    const raw = db.tickets.find((t) => t._id === id);
    if (!raw) throw new Error('Không tìm thấy phiếu sửa chữa.');
    const ticket = hydrateTicket(raw, db);
    const deviceHistory = db.tickets
      .filter((t) => t.deviceId === raw.deviceId)
      .map((t) => hydrateTicket(t, db))
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
    return { ...ticket, deviceHistory };
  },

  async createTicket(payload) {
    if (await probeApi()) {
      return apiFetch('/tickets', { method: 'POST', body: JSON.stringify(payload) });
    }
    const db = loadLocalDB();
    const estimatedCost = Number(payload.estimatedCost ?? 0);
    if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
      throw new Error('Chi phí dự kiến phải là số lớn hơn hoặc bằng 0.');
    }
    if (!payload.deviceId || !db.devices.some((d) => d._id === payload.deviceId)) {
      throw new Error('Vui lòng chọn thiết bị hợp lệ.');
    }
    if (!payload.technicianId || !db.technicians.some((t) => t._id === payload.technicianId)) {
      throw new Error('Vui lòng chọn nhân viên kỹ thuật phụ trách.');
    }
    const issueDescription = String(payload.issueDescription || '').trim();
    if (!issueDescription) throw new Error('Vui lòng ghi nhận lỗi thiết bị.');

    const now = new Date().toISOString();
    const created = {
      _id: makeId('tkt'),
      ticketCode: nextSequenceCode('PSC', db.tickets, 'ticketCode'),
      deviceId: payload.deviceId,
      technicianId: payload.technicianId,
      issueDescription,
      diagnosisNotes: String(payload.diagnosisNotes || '').trim(),
      estimatedCost,
      actualCost: 0,
      status: 'Mới tiếp nhận',
      receivedAt: now,
      completedAt: null,
      deliveredAt: null,
      statusHistory: [
        {
          status: 'Mới tiếp nhận',
          note: String(payload.note || 'Lập phiếu sửa chữa mới tại quầy tiếp nhận.').trim(),
          updatedAt: now,
        },
      ],
    };
    db.tickets.unshift(created);
    saveLocalDB(db);
    return hydrateTicket(created, db);
  },

  async updateTicketStatus(id, payload) {
    if (await probeApi()) {
      return apiFetch(`/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    }
    const db = loadLocalDB();
    const idx = db.tickets.findIndex((t) => t._id === id);
    if (idx === -1) throw new Error('Không tìm thấy phiếu sửa chữa.');

    const actualCost =
      payload.actualCost !== undefined && payload.actualCost !== ''
        ? Number(payload.actualCost)
        : db.tickets[idx].actualCost;
    if (!Number.isFinite(actualCost) || actualCost < 0) {
      throw new Error('Chi phí thực tế phải là số lớn hơn hoặc bằng 0.');
    }

    const now = new Date().toISOString();
    const nextStatus = payload.status || db.tickets[idx].status;
    const prev = db.tickets[idx];
    const historyEntry = {
      status: nextStatus,
      note:
        String(payload.note || '').trim() ||
        (nextStatus !== prev.status
          ? `Cập nhật trạng thái sang "${nextStatus}".`
          : 'Cập nhật thông tin xử lý và chi phí.'),
      updatedAt: now,
    };

    db.tickets[idx] = {
      ...prev,
      status: nextStatus,
      actualCost,
      technicianId: payload.technicianId || prev.technicianId,
      diagnosisNotes:
        payload.diagnosisNotes !== undefined
          ? String(payload.diagnosisNotes).trim()
          : prev.diagnosisNotes,
      completedAt:
        nextStatus === 'Đã hoàn thành' && !prev.completedAt ? now : prev.completedAt,
      deliveredAt:
        nextStatus === 'Đã bàn giao' && !prev.deliveredAt ? now : prev.deliveredAt,
      statusHistory: [...(prev.statusHistory || []), historyEntry],
    };
    saveLocalDB(db);
    return this.getTicketById(id);
  },
};

