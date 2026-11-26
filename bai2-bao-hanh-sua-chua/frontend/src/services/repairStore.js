const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error('Không thể kết nối Backend (:5002). Hãy chạy "npm run bai2:be".');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Lỗi máy chủ (${res.status})`);
  }
  return data;
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

export const repairStore = {
  async checkHealth() {
    try {
      await apiFetch('/health');
      return 'online';
    } catch {
      return 'offline';
    }
  },

  // --- CUSTOMERS ---
  async getCustomers(search = '') {
    const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return apiFetch(`/customers${qs}`);
  },

  async createCustomer(payload) {
    return apiFetch('/customers', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateCustomer(id, payload) {
    return apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async deleteCustomer(id) {
    return apiFetch(`/customers/${id}`, { method: 'DELETE' });
  },

  // --- DEVICES ---
  async getDevices({ deviceType = '', search = '', customerId = '' } = {}) {
    const params = new URLSearchParams();
    if (deviceType) params.set('deviceType', deviceType);
    if (search.trim()) params.set('search', search.trim());
    if (customerId) params.set('customerId', customerId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/devices${qs}`);
  },

  async suggestDeviceCode() {
    const devices = await this.getDevices();
    return nextSequenceCode('TB', devices, 'deviceCode');
  },

  async createDevice(payload) {
    return apiFetch('/devices', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateDevice(id, payload) {
    return apiFetch(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async getDeviceHistory(deviceId) {
    return apiFetch(`/devices/${deviceId}/history`);
  },

  // --- TECHNICIANS ---
  async getTechnicians() {
    return apiFetch('/technicians');
  },

  async createTechnician(payload) {
    return apiFetch('/technicians', { method: 'POST', body: JSON.stringify(payload) });
  },

  // --- REPAIR TICKETS ---
  async getTickets({ technicianId = '', status = '', search = '', deviceId = '' } = {}) {
    const params = new URLSearchParams();
    if (technicianId) params.set('technicianId', technicianId);
    if (status) params.set('status', status);
    if (deviceId) params.set('deviceId', deviceId);
    if (search.trim()) params.set('search', search.trim());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/tickets${qs}`);
  },

  async getTicketById(id) {
    return apiFetch(`/tickets/${id}`);
  },

  async createTicket(payload) {
    return apiFetch('/tickets', { method: 'POST', body: JSON.stringify(payload) });
  },

  async updateTicketStatus(id, payload) {
    return apiFetch(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
