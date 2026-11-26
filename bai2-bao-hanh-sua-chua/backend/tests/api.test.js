import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { Customer } from '../src/models/Customer.js';
import { Device } from '../src/models/Device.js';
import { Technician } from '../src/models/Technician.js';
import { RepairTicket } from '../src/models/RepairTicket.js';
import { seedDatabase } from '../src/seed/seedData.js';

const TEST_MONGO_URI =
  process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/repair_center_db_test';

let server;
let baseUrl;

async function req(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

before(async () => {
  await connectDB(TEST_MONGO_URI);
  await Promise.all([
    Customer.init(),
    Device.init(),
    Technician.init(),
    RepairTicket.init(),
  ]);
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
});

beforeEach(async () => {
  await Promise.all([
    RepairTicket.deleteMany({}),
    Device.deleteMany({}),
    Technician.deleteMany({}),
    Customer.deleteMany({}),
  ]);
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Health & Error basics', () => {
  it('GET /api/health returns ok: true', async () => {
    const res = await req('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });
});

describe('Task 3: Customers & Technicians API', () => {
  it('CRUD khách hàng, tìm kiếm theo tên/SĐT bất kể khoảng trắng & ký tự đặc biệt regex', async () => {
    const created = await req('/customers', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Nguyễn Minh Quân',
        phone: '0908 421 318',
        email: 'quan@example.com',
        address: 'Q.3, TP.HCM',
        note: 'Khách VIP',
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.fullName, 'Nguyễn Minh Quân');
    assert.equal(created.body.deviceCount, 0);

    // Search phone without spaces
    const byPhone = await req('/customers?search=0908421318');
    assert.equal(byPhone.status, 200);
    assert.equal(byPhone.body.length, 1);
    assert.equal(byPhone.body[0]._id, created.body._id);

    // Search with regex metacharacters should not crash
    const regexSafe = await req('/customers?search=' + encodeURIComponent('+84(0908)[*'));
    assert.equal(regexSafe.status, 200);
    assert.equal(Array.isArray(regexSafe.body), true);

    // Update customer
    const updated = await req(`/customers/${created.body._id}`, {
      method: 'PUT',
      body: JSON.stringify({
        fullName: 'Nguyễn Minh Quân (Updated)',
        phone: '0908 421 318',
        email: 'quan.new@example.com',
        address: 'Q.1, TP.HCM',
        note: 'Updated',
      }),
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.fullName, 'Nguyễn Minh Quân (Updated)');

    // Delete customer without devices -> 200
    const deleted = await req(`/customers/${created.body._id}`, { method: 'DELETE' });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.ok, true);
  });

  it('Chặn xóa khách hàng đang sở hữu thiết bị (409) & xử lý ObjectId sai (400)', async () => {
    const cust = await Customer.create({ fullName: 'Trần Thảo Vy', phone: '0932 775 840' });
    await Device.create({
      deviceCode: 'TB-2026-001',
      name: 'MacBook Pro 14',
      deviceType: 'Laptop',
      brand: 'Apple',
      model: 'A2992',
      serialNumber: 'C02XM7K8MD6R',
      initialCondition: 'Không lên nguồn',
      customerId: cust._id,
    });

    const listRes = await req('/customers');
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body[0].deviceCount, 1);

    const conflict = await req(`/customers/${cust._id}`, { method: 'DELETE' });
    assert.equal(conflict.status, 409);
    assert.match(conflict.body.message, /1 thiết bị/);

    const badId = await req('/customers/not-an-object-id', { method: 'DELETE' });
    assert.equal(badId.status, 400);
    assert.ok(badId.body.message);
  });

  it('POST /api/technicians tự sinh mã KTV-XX khi để trống và GET trả đủ 3 bộ đếm phiếu', async () => {
    const t1 = await req('/technicians', {
      method: 'POST',
      body: JSON.stringify({
        code: '',
        fullName: 'Nguyễn Văn Hải',
        phone: '0901 200 101',
        specialty: 'Điện thoại',
      }),
    });
    assert.equal(t1.status, 201);
    assert.equal(t1.body.code, 'KTV-01');
    assert.equal(t1.body.activeTicketCount, 0);
    assert.equal(t1.body.completedTicketCount, 0);
    assert.equal(t1.body.totalTicketCount, 0);

    // Duplicate code -> 409
    const dup = await req('/technicians', {
      method: 'POST',
      body: JSON.stringify({
        code: 'KTV-01',
        fullName: 'Trùng Mã',
        phone: '0901 200 199',
      }),
    });
    assert.equal(dup.status, 409);
    assert.ok(dup.body.message);

    // Seed tickets to verify counters
    const cust = await Customer.create({ fullName: 'Khách A', phone: '0900 111 222' });
    const dev = await Device.create({
      deviceCode: 'TB-2026-010',
      name: 'iPhone 15',
      deviceType: 'Điện thoại',
      brand: 'Apple',
      model: 'A3106',
      serialNumber: 'SN-TECH-COUNT',
      initialCondition: 'Vỡ kính',
      customerId: cust._id,
    });
    await RepairTicket.create([
      {
        ticketCode: 'PSC-2026-001',
        deviceId: dev._id,
        technicianId: t1.body._id,
        issueDescription: 'Lỗi 1',
        estimatedCost: 500000,
        status: 'Đang sửa chữa',
      },
      {
        ticketCode: 'PSC-2026-002',
        deviceId: dev._id,
        technicianId: t1.body._id,
        issueDescription: 'Lỗi 2',
        estimatedCost: 500000,
        status: 'Đã hoàn thành',
      },
      {
        ticketCode: 'PSC-2026-003',
        deviceId: dev._id,
        technicianId: t1.body._id,
        issueDescription: 'Lỗi 3',
        estimatedCost: 500000,
        status: 'Đã bàn giao',
      },
    ]);

    const list = await req('/technicians');
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].activeTicketCount, 2); // Đang sửa chữa + Đã hoàn thành (khác Đã bàn giao)
    assert.equal(list.body[0].completedTicketCount, 2); // Đã hoàn thành + Đã bàn giao
    assert.equal(list.body[0].totalTicketCount, 3);
  });
});

describe('Task 4: Devices & Device History API', () => {
  it('Tiếp nhận thiết bị đủ 8 trường, tự sinh deviceCode, chặn trùng serial (409), lọc loại và xem lịch sử', async () => {
    const cust = await Customer.create({ fullName: 'Lê Hoàng Phúc', phone: '0976 112 605' });
    const tech = await Technician.create({
      code: 'KTV-01',
      fullName: 'Nguyễn Văn Hải',
      phone: '0901 200 101',
      specialty: 'Điện thoại',
    });

    // Non-existent customer -> 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const missingCust = await req('/devices', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Galaxy S24',
        deviceType: 'Điện thoại',
        brand: 'Samsung',
        model: 'SM-S928B',
        serialNumber: 'SN-001',
        initialCondition: 'Hỏng sạc',
        customerId: fakeId,
      }),
    });
    assert.equal(missingCust.status, 404);

    // Valid creation with empty deviceCode -> auto TB-YYYY-001
    const created = await req('/devices', {
      method: 'POST',
      body: JSON.stringify({
        deviceCode: '',
        name: 'Samsung Galaxy S24 Ultra',
        deviceType: 'Điện thoại',
        brand: 'Samsung',
        model: 'SM-S928B',
        serialNumber: 'R5CX2094NTM',
        initialCondition: 'Cổng sạc lỏng',
        customerId: cust._id.toString(),
      }),
    });
    assert.equal(created.status, 201);
    assert.match(created.body.deviceCode, /^TB-\d{4}-001$/);
    assert.equal(created.body.customerId.fullName, 'Lê Hoàng Phúc');
    assert.equal(created.body.ticketCount, 0);
    assert.equal(created.body.latestStatus, null);

    // Duplicate serialNumber -> 409
    const dupSerial = await req('/devices', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Máy khác',
        deviceType: 'Laptop',
        brand: 'Dell',
        model: 'XPS',
        serialNumber: 'R5CX2094NTM',
        initialCondition: 'Chết pin',
        customerId: cust._id.toString(),
      }),
    });
    assert.equal(dupSerial.status, 409);
    assert.match(dupSerial.body.message, /Số serial/i);

    // Update device
    const upd = await req(`/devices/${created.body._id}`, {
      method: 'PUT',
      body: JSON.stringify({
        deviceCode: created.body.deviceCode,
        name: 'Samsung Galaxy S24 Ultra 512GB',
        deviceType: 'Điện thoại',
        brand: 'Samsung',
        model: 'SM-S928B',
        serialNumber: 'R5CX2094NTM',
        initialCondition: 'Cổng sạc lỏng, xước nhẹ viền',
        customerId: cust._id.toString(),
      }),
    });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.name, 'Samsung Galaxy S24 Ultra 512GB');

    // Filter by deviceType
    const phones = await req('/devices?deviceType=' + encodeURIComponent('Điện thoại'));
    assert.equal(phones.status, 200);
    assert.equal(phones.body.length, 1);

    const laptops = await req('/devices?deviceType=Laptop');
    assert.equal(laptops.status, 200);
    assert.equal(laptops.body.length, 0);

    // History with 2 tickets sorted newest first
    await RepairTicket.create([
      {
        ticketCode: 'PSC-2026-001',
        deviceId: created.body._id,
        technicianId: tech._id,
        issueDescription: 'Thay pin cũ',
        estimatedCost: 700000,
        actualCost: 700000,
        status: 'Đã bàn giao',
        receivedAt: new Date('2026-09-01T10:00:00.000Z'),
      },
      {
        ticketCode: 'PSC-2026-002',
        deviceId: created.body._id,
        technicianId: tech._id,
        issueDescription: 'Thay chân sạc',
        estimatedCost: 850000,
        actualCost: 0,
        status: 'Đang sửa chữa',
        receivedAt: new Date('2026-11-20T10:00:00.000Z'),
      },
    ]);

    const hist = await req(`/devices/${created.body._id}/history`);
    assert.equal(hist.status, 200);
    assert.equal(hist.body.device.customerId.fullName, 'Lê Hoàng Phúc');
    assert.equal(hist.body.tickets.length, 2);
    assert.equal(hist.body.tickets[0].ticketCode, 'PSC-2026-002');
    assert.equal(hist.body.tickets[0].technicianId.fullName, 'Nguyễn Văn Hải');
  });
});

describe('Task 5: Repair Tickets & 5-Status Workflow API', () => {
  it('Tạo phiếu, lọc KTV/Trạng thái, cập nhật đủ 5 trạng thái + chi phí thực tế, kiểm tra nested populate & deviceHistory', async () => {
    const cust = await Customer.create({ fullName: 'Đỗ Tuấn Kiệt', phone: '0983 504 192' });
    const tech1 = await Technician.create({
      code: 'KTV-01',
      fullName: 'Trần Quốc Bảo',
      phone: '0901 200 102',
      specialty: 'Laptop',
    });
    const tech2 = await Technician.create({
      code: 'KTV-02',
      fullName: 'Lê Thanh Tùng',
      phone: '0901 200 103',
      specialty: 'MacBook',
    });
    const dev = await Device.create({
      deviceCode: 'TB-2026-001',
      name: 'Dell XPS 13 9340',
      deviceType: 'Laptop',
      brand: 'Dell',
      model: 'XPS-9340',
      serialNumber: 'DL9340-001',
      initialCondition: 'Pin phồng',
      customerId: cust._id,
    });

    // Reject negative estimatedCost -> 400
    const negCost = await req('/tickets', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: dev._id.toString(),
        technicianId: tech1._id.toString(),
        issueDescription: 'Thay pin',
        estimatedCost: -100000,
      }),
    });
    assert.equal(negCost.status, 400);

    // Create valid ticket
    const created = await req('/tickets', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: dev._id.toString(),
        technicianId: tech1._id.toString(),
        issueDescription: 'Thay pin zin Dell và vệ sinh quạt',
        estimatedCost: 2400000,
        note: 'Khách cần lấy sớm',
      }),
    });
    assert.equal(created.status, 201);
    assert.match(created.body.ticketCode, /^PSC-\d{4}-001$/);
    assert.equal(created.body.status, 'Mới tiếp nhận');
    assert.equal(created.body.statusHistory.length, 1);
    assert.equal(created.body.statusHistory[0].note, 'Khách cần lấy sớm');
    assert.equal(created.body.deviceId.customerId.fullName, 'Đỗ Tuấn Kiệt');
    assert.equal(created.body.technicianId.fullName, 'Trần Quốc Bảo');

    // Filter by technicianId and status
    const filtered = await req(
      `/tickets?technicianId=${tech1._id}&status=${encodeURIComponent('Mới tiếp nhận')}`
    );
    assert.equal(filtered.status, 200);
    assert.equal(filtered.body.length, 1);

    const emptyFilter = await req(`/tickets?technicianId=${tech2._id}`);
    assert.equal(emptyFilter.status, 200);
    assert.equal(emptyFilter.body.length, 0);

    // GET /:id includes deviceHistory
    const detail = await req(`/tickets/${created.body._id}`);
    assert.equal(detail.status, 200);
    assert.equal(Array.isArray(detail.body.deviceHistory), true);
    assert.equal(detail.body.deviceHistory.length, 1);

    // Reject invalid status & negative actualCost
    const badStatus = await req(`/tickets/${created.body._id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Trạng thái lạ' }),
    });
    assert.equal(badStatus.status, 400);

    const badActual = await req(`/tickets/${created.body._id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Đang kiểm tra', actualCost: -50 }),
    });
    assert.equal(badActual.status, 400);

    // Walk through remaining 4 statuses
    const step2 = await req(`/tickets/${created.body._id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'Đang kiểm tra',
        diagnosisNotes: 'Đo dòng pin chai 40%',
        note: 'Đang kiểm tra mạch sạc',
      }),
    });
    assert.equal(step2.status, 200);
    assert.equal(step2.body.status, 'Đang kiểm tra');
    assert.equal(step2.body.statusHistory.length, 2);
    assert.equal(Array.isArray(step2.body.deviceHistory), true);

    const step3 = await req(`/tickets/${created.body._id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'Đang sửa chữa',
        technicianId: tech2._id.toString(),
        note: 'Chuyển KTV Tùng thay pin',
      }),
    });
    assert.equal(step3.status, 200);
    assert.equal(step3.body.technicianId.fullName, 'Lê Thanh Tùng');

    const step4 = await req(`/tickets/${created.body._id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'Đã hoàn thành',
        actualCost: 2550000,
        diagnosisNotes: 'Đã thay pin và pad tản nhiệt',
        note: 'Test ổn định 2h',
      }),
    });
    assert.equal(step4.status, 200);
    assert.equal(step4.body.actualCost, 2550000);
    assert.ok(step4.body.completedAt);
    assert.equal(step4.body.deliveredAt, null);

    const step5 = await req(`/tickets/${created.body._id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'Đã bàn giao',
        actualCost: 2550000,
        note: 'Khách đã nhận máy',
      }),
    });
    assert.equal(step5.status, 200);
    assert.ok(step5.body.deliveredAt);
    assert.equal(step5.body.statusHistory.length, 5);
    assert.equal(step5.body.deviceHistory.length, 1);
    assert.equal(step5.body.deviceId.customerId.fullName, 'Đỗ Tuấn Kiệt');
  });
});

describe('Review Fixes: Security, Concurrency & Edge Cases', () => {
  it('Chặn NoSQL operator injection qua query filter (?status[$ne]=... & ?deviceType[$ne]=...)', async () => {
    const r1 = await req('/tickets?status[$ne]=x');
    assert.equal(r1.status, 400);
    const r2 = await req('/devices?deviceType[$ne]=x');
    assert.equal(r2.status, 400);
  });

  it('Tạo nhiều phiếu đồng thời không bị lỗi trùng mã tự sinh (409)', async () => {
    const cust = await Customer.create({ fullName: 'Khách Race', phone: '0909 000 111' });
    const tech = await Technician.create({
      code: 'KTV-99',
      fullName: 'KTV Race',
      phone: '0901 999 000',
    });
    const dev = await Device.create({
      deviceCode: 'TB-2026-900',
      name: 'MacBook Air',
      deviceType: 'Laptop',
      brand: 'Apple',
      model: 'M3',
      serialNumber: 'SN-RACE-001',
      initialCondition: 'Hỏng loa',
      customerId: cust._id,
    });

    const [a, b, c] = await Promise.all([
      req('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: dev._id.toString(),
          technicianId: tech._id.toString(),
          issueDescription: 'Lỗi 1',
          estimatedCost: 100000,
        }),
      }),
      req('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: dev._id.toString(),
          technicianId: tech._id.toString(),
          issueDescription: 'Lỗi 2',
          estimatedCost: 200000,
        }),
      }),
      req('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: dev._id.toString(),
          technicianId: tech._id.toString(),
          issueDescription: 'Lỗi 3',
          estimatedCost: 300000,
        }),
      }),
    ]);

    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.equal(c.status, 201);
    assert.equal(new Set([a.body.ticketCode, b.body.ticketCode, c.body.ticketCode]).size, 3);
  });

  it('Không ép null thành chuỗi "null" khi cập nhật phiếu sửa chữa', async () => {
    const cust = await Customer.create({ fullName: 'Khách Null', phone: '0909 000 222' });
    const tech = await Technician.create({
      code: 'KTV-98',
      fullName: 'KTV Null',
      phone: '0901 999 002',
    });
    const dev = await Device.create({
      deviceCode: 'TB-2026-901',
      name: 'iPhone 14',
      deviceType: 'Điện thoại',
      brand: 'Apple',
      model: 'A2882',
      serialNumber: 'SN-NULL-001',
      initialCondition: 'Vỡ lưng',
      customerId: cust._id,
    });
    const created = await req('/tickets', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: dev._id.toString(),
        technicianId: tech._id.toString(),
        issueDescription: 'Vỡ kính lưng',
        estimatedCost: 500000,
      }),
    });

    const patched = await req(`/tickets/${created.body._id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Đang kiểm tra', diagnosisNotes: null }),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.diagnosisNotes, '');

    const badPut = await req(`/tickets/${created.body._id}`, {
      method: 'PUT',
      body: JSON.stringify({ issueDescription: null }),
    });
    assert.equal(badPut.status, 400);
  });

  it('seedDatabase({ reset: false }) bỏ qua nếu bất kỳ collection nào đã có dữ liệu', async () => {
    await Technician.create({
      code: 'KTV-01',
      fullName: 'KTV Tồn Tại',
      phone: '0901 200 101',
    });
    const result = await seedDatabase({ reset: false });
    assert.equal(result.skipped, true);
    assert.equal(await Customer.countDocuments(), 0);
  });
});
