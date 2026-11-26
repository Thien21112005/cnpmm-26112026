import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { Technician } from '../models/Technician.js';
import { RepairTicket } from '../models/RepairTicket.js';

const SAMPLE_CUSTOMERS = [
  {
    key: 'cust_01',
    fullName: 'Nguyễn Minh Quân',
    phone: '0908 421 318',
    email: 'minhquan.ng@gmail.com',
    address: '142 Nguyễn Thị Minh Khai, Q.3, TP.HCM',
    note: 'Khách quen doanh nghiệp, ưu tiên gọi trước khi thay linh kiện',
  },
  {
    key: 'cust_02',
    fullName: 'Trần Thảo Vy',
    phone: '0932 775 840',
    email: 'thaovy.tran@outlook.com',
    address: '28 Phan Xích Long, Phú Nhuận, TP.HCM',
    note: 'Cần xuất hóa đơn điện tử khi bàn giao',
  },
  {
    key: 'cust_03',
    fullName: 'Lê Hoàng Phúc',
    phone: '0976 112 605',
    email: 'hoangphuc.le@gmail.com',
    address: '89 Lê Văn Việt, TP. Thủ Đức',
    note: '',
  },
  {
    key: 'cust_04',
    fullName: 'Phạm Quỳnh Anh',
    phone: '0914 883 229',
    email: 'quynhanh.pham@gmail.com',
    address: '54 Hoàng Hoa Thám, Tân Bình, TP.HCM',
    note: 'Liên hệ giờ hành chính',
  },
  {
    key: 'cust_05',
    fullName: 'Đỗ Tuấn Kiệt',
    phone: '0983 504 192',
    email: 'tuankiet.do@gmail.com',
    address: '310 Cách Mạng Tháng 8, Q.10, TP.HCM',
    note: 'Đã mua gói bảo hành mở rộng tại cửa hàng',
  },
  {
    key: 'cust_06',
    fullName: 'Võ Thị Ngọc Hân',
    phone: '0905 642 771',
    email: 'ngochan.vo@gmail.com',
    address: '19B Trần Hưng Đạo, Q.1, TP.HCM',
    note: '',
  },
];

const SAMPLE_TECHNICIANS = [
  {
    key: 'tech_01',
    code: 'KTV-01',
    fullName: 'Nguyễn Văn Hải',
    phone: '0901 200 101',
    specialty: 'Điện thoại & Ép kính',
    active: true,
  },
  {
    key: 'tech_02',
    code: 'KTV-02',
    fullName: 'Trần Quốc Bảo',
    phone: '0901 200 102',
    specialty: 'Laptop & Sửa Mainboard',
    active: true,
  },
  {
    key: 'tech_03',
    code: 'KTV-03',
    fullName: 'Lê Thanh Tùng',
    phone: '0901 200 103',
    specialty: 'MacBook & iPad',
    active: true,
  },
  {
    key: 'tech_04',
    code: 'KTV-04',
    fullName: 'Phạm Hữu Đạt',
    phone: '0901 200 104',
    specialty: 'PC Workstation & Nguồn',
    active: true,
  },
];

const SAMPLE_DEVICES = [
  {
    key: 'dev_01',
    deviceCode: 'TB-2026-001',
    name: 'iPhone 15 Pro Max 256GB',
    deviceType: 'Điện thoại',
    brand: 'Apple',
    model: 'A3106',
    serialNumber: 'F2LZN4Q8P091',
    initialCondition: 'Vỡ kính góc trên bên phải, màn hình còn hiển thị, khung titan xước nhẹ',
    customerKey: 'cust_01',
  },
  {
    key: 'dev_02',
    deviceCode: 'TB-2026-002',
    name: 'MacBook Pro 14 M3 Pro',
    deviceType: 'Laptop',
    brand: 'Apple',
    model: 'A2992',
    serialNumber: 'C02XM7K8MD6R',
    initialCondition: 'Không lên nguồn sau khi dính nước khu vực bàn phím bên trái, vỏ nguyên vẹn',
    customerKey: 'cust_02',
  },
  {
    key: 'dev_03',
    deviceCode: 'TB-2026-003',
    name: 'Dell XPS 13 9340',
    deviceType: 'Laptop',
    brand: 'Dell',
    model: 'XPS-9340-U7',
    serialNumber: 'DL9340-88K21X',
    initialCondition: 'Pin phồng đẩy nhẹ touchpad, quạt tản nhiệt kêu lớn khi chạy tác vụ nặng',
    customerKey: 'cust_01',
  },
  {
    key: 'dev_04',
    deviceCode: 'TB-2026-004',
    name: 'Samsung Galaxy S24 Ultra',
    deviceType: 'Điện thoại',
    brand: 'Samsung',
    model: 'SM-S928B',
    serialNumber: 'R5CX2094NTM',
    initialCondition: 'Cổng sạc USB-C lỏng, sạc chậm không nhận siêu nhanh, ngoại hình đẹp',
    customerKey: 'cust_03',
  },
  {
    key: 'dev_05',
    deviceCode: 'TB-2026-005',
    name: 'iPad Air 11 M2 Wi-Fi',
    deviceType: 'Máy tính bảng',
    brand: 'Apple',
    model: 'A2902',
    serialNumber: 'DMPM2810Q4L',
    initialCondition: 'Loạn cảm ứng vùng giữa màn hình, không cấn móp',
    customerKey: 'cust_04',
  },
  {
    key: 'dev_06',
    deviceCode: 'TB-2026-006',
    name: 'PC Workstation Ryzen 9',
    deviceType: 'Máy tính bàn',
    brand: 'ASUS / Custom',
    model: 'WS-R9-4070S',
    serialNumber: 'PCWS-2026-4410',
    initialCondition: 'Khởi động lại đột ngột khi render, đèn báo lỗi DRAM sáng trên mainboard',
    customerKey: 'cust_05',
  },
  {
    key: 'dev_07',
    deviceCode: 'TB-2026-007',
    name: 'ASUS ROG Strix G16',
    deviceType: 'Laptop',
    brand: 'ASUS',
    model: 'G614JV',
    serialNumber: 'R4NRCX081922',
    initialCondition: 'Mất âm thanh loa phải, bản lề hơi rít khi gập mở',
    customerKey: 'cust_06',
  },
];

const SAMPLE_TICKETS = [
  {
    ticketCode: 'PSC-2026-001',
    deviceKey: 'dev_01',
    techKey: 'tech_01',
    issueDescription: 'Thay pin chai còn 76% và vệ sinh loa thoại bị nhỏ tiếng',
    diagnosisNotes: 'Đã thay cell pin chính hãng dung lượng chuẩn 100%, vệ sinh màng loa sạch.',
    estimatedCost: 1450000,
    actualCost: 1450000,
    status: 'Đã bàn giao',
    receivedAt: new Date('2026-09-14T08:45:00.000Z'),
    completedAt: new Date('2026-09-14T15:20:00.000Z'),
    deliveredAt: new Date('2026-09-14T17:10:00.000Z'),
    statusHistory: [
      { status: 'Mới tiếp nhận', note: 'Tiếp nhận máy kiểm tra pin và loa thoại', updatedAt: new Date('2026-09-14T08:45:00.000Z') },
      { status: 'Đang sửa chữa', note: 'Khách xác nhận báo giá thay pin 1.450.000đ', updatedAt: new Date('2026-09-14T10:15:00.000Z') },
      { status: 'Đã hoàn thành', note: 'Test dòng sạc ổn định, âm lượng loa đạt chuẩn', updatedAt: new Date('2026-09-14T15:20:00.000Z') },
      { status: 'Đã bàn giao', note: 'Khách đã kiểm tra và nhận máy, bảo hành pin 6 tháng', updatedAt: new Date('2026-09-14T17:10:00.000Z') },
    ],
  },
  {
    ticketCode: 'PSC-2026-002',
    deviceKey: 'dev_01',
    techKey: 'tech_01',
    issueDescription: 'Rơi vỡ mặt kính màn hình, cảm ứng vẫn nhạy, kiểm tra lại ron chống nước',
    diagnosisNotes: 'Tấm nền OLED nguyên vẹn, chỉ cần ép lại kính zin và dán ron áp suất mới.',
    estimatedCost: 2200000,
    actualCost: 2150000,
    status: 'Đang sửa chữa',
    receivedAt: new Date('2026-11-24T09:15:00.000Z'),
    completedAt: null,
    deliveredAt: null,
    statusHistory: [
      { status: 'Mới tiếp nhận', note: 'Khách quay lại xử lý vỡ kính góc trên bên phải', updatedAt: new Date('2026-11-24T09:15:00.000Z') },
      { status: 'Đang kiểm tra', note: 'Kiểm tra tấm nền và FaceID hoạt động bình thường', updatedAt: new Date('2026-11-24T10:40:00.000Z') },
      { status: 'Đang sửa chữa', note: 'Đang tách kính vỡ và hấp chân không ép kính mới', updatedAt: new Date('2026-11-25T14:00:00.000Z') },
    ],
  },
  {
    ticketCode: 'PSC-2026-003',
    deviceKey: 'dev_02',
    techKey: 'tech_03',
    issueDescription: 'Máy dính nước không lên nguồn, cần sấy mạch và kiểm tra chạm đường nguồn chính',
    diagnosisNotes: 'Chạm tụ khu vực IC sạc CD3217 bên cổng Type-C trái, bàn phím oxy hóa 2 phím.',
    estimatedCost: 3800000,
    actualCost: 0,
    status: 'Đang kiểm tra',
    receivedAt: new Date('2026-11-25T10:30:00.000Z'),
    completedAt: null,
    deliveredAt: null,
    statusHistory: [
      { status: 'Mới tiếp nhận', note: 'Ngắt pin ngay tại quầy để tránh chập lan rộng', updatedAt: new Date('2026-11-25T10:30:00.000Z') },
      { status: 'Đang kiểm tra', note: 'Đang vệ sinh siêu âm mainboard và đo dòng nguồn 20V', updatedAt: new Date('2026-11-25T13:15:00.000Z') },
    ],
  },
  {
    ticketCode: 'PSC-2026-004',
    deviceKey: 'dev_03',
    techKey: 'tech_02',
    issueDescription: 'Thay pin mới chính hãng, vệ sinh quạt và tra keo tản nhiệt PTM7950',
    diagnosisNotes: 'Pin cũ phồng cell giữa. Đã thay pin zin Dell, hạ nhiệt độ tải nặng từ 96°C xuống 74°C.',
    estimatedCost: 2400000,
    actualCost: 2550000,
    status: 'Đã hoàn thành',
    receivedAt: new Date('2026-11-22T14:00:00.000Z'),
    completedAt: new Date('2026-11-25T16:40:00.000Z'),
    deliveredAt: null,
    statusHistory: [
      { status: 'Mới tiếp nhận', note: 'Tiếp nhận máy, xác nhận tình trạng touchpad bị đội nhẹ', updatedAt: new Date('2026-11-22T14:00:00.000Z') },
      { status: 'Đang kiểm tra', note: 'Kiểm tra sức khỏe SSD và mạch sạc ổn định', updatedAt: new Date('2026-11-23T08:50:00.000Z') },
      { status: 'Đang sửa chữa', note: 'Thay pin mới và thay thêm pad tản nhiệt VRM (+150.000đ đã báo khách)', updatedAt: new Date('2026-11-24T11:20:00.000Z') },
      { status: 'Đã hoàn thành', note: 'Burn-in test 2 giờ ổn định, đã nhắn khách đến nhận máy', updatedAt: new Date('2026-11-25T16:40:00.000Z') },
    ],
  },
  {
    ticketCode: 'PSC-2026-005',
    deviceKey: 'dev_04',
    techKey: 'tech_01',
    issueDescription: 'Thay cụm chân sạc USB-C nhận sạc nhanh 45W',
    diagnosisNotes: 'Thay bo mạch cụm sạc zin, test sạc nhanh 45W và truyền dữ liệu OTG bình thường.',
    estimatedCost: 850000,
    actualCost: 850000,
    status: 'Đã bàn giao',
    receivedAt: new Date('2026-11-04T10:15:00.000Z'),
    completedAt: new Date('2026-11-04T16:00:00.000Z'),
    deliveredAt: new Date('2026-11-05T09:30:00.000Z'),
    statusHistory: [
      { status: 'Mới tiếp nhận', note: 'Nhận máy kiểm tra chân sạc lỏng', updatedAt: new Date('2026-11-04T10:15:00.000Z') },
      { status: 'Đã hoàn thành', note: 'Đã thay cụm bo sạc mới', updatedAt: new Date('2026-11-04T16:00:00.000Z') },
      { status: 'Đã bàn giao', note: 'Khách test sạc nhanh tại quầy và thanh toán đủ', updatedAt: new Date('2026-11-05T09:30:00.000Z') },
    ],
  },
  {
    ticketCode: 'PSC-2026-006',
    deviceKey: 'dev_05',
    techKey: 'tech_03',
    issueDescription: 'Màn hình tự nhảy cảm ứng khi dùng Apple Pencil, kiểm tra IC cảm ứng hoặc thay màn',
    diagnosisNotes: 'Kiểm tra sơ bộ cáp socket cảm ứng hơi lỏng, đang test trên màn hình thử.',
    estimatedCost: 3100000,
    actualCost: 0,
    status: 'Đang sửa chữa',
    receivedAt: new Date('2026-11-23T15:30:00.000Z'),
    completedAt: null,
    deliveredAt: null,
    statusHistory: [
      { status: 'Mới tiếp nhận', note: 'Quay video tái hiện lỗi loạn cảm ứng cùng khách', updatedAt: new Date('2026-11-23T15:30:00.000Z') },
      { status: 'Đang kiểm tra', note: 'Loại trừ lỗi phần mềm iPadOS, xác nhận lỗi trên cụm cảm ứng', updatedAt: new Date('2026-11-24T09:00:00.000Z') },
      { status: 'Đang sửa chữa', note: 'Đang thay cụm cảm ứng và cân chỉnh True Tone', updatedAt: new Date('2026-11-25T10:20:00.000Z') },
    ],
  },
  {
    ticketCode: 'PSC-2026-007',
    deviceKey: 'dev_06',
    techKey: 'tech_04',
    issueDescription: 'Máy tự sập nguồn khi render Blender, kiểm tra PSU 850W và cặp RAM DDR5',
    diagnosisNotes: 'Đang chạy MemTest86 từng thanh RAM và đo sụt áp đường 12V của nguồn.',
    estimatedCost: 1200000,
    actualCost: 0,
    status: 'Đang kiểm tra',
    receivedAt: new Date('2026-11-25T09:00:00.000Z'),
    completedAt: null,
    deliveredAt: null,
    statusHistory: [
      { status: 'Mới tiếp nhận', note: 'Tiếp nhận thùng máy, ghi nhận đủ GPU RTX 4070 Super và 2 thanh RAM 32GB', updatedAt: new Date('2026-11-25T09:00:00.000Z') },
      { status: 'Đang kiểm tra', note: 'Phát hiện thanh RAM slot B2 báo lỗi nhẹ ở xung EXPO 6000MHz', updatedAt: new Date('2026-11-26T08:15:00.000Z') },
    ],
  },
  {
    ticketCode: 'PSC-2026-008',
    deviceKey: 'dev_07',
    techKey: 'tech_02',
    issueDescription: 'Loa phải rè rồi mất hẳn tiếng, siết lại ốc bản lề và vệ sinh bụi quạt',
    diagnosisNotes: '',
    estimatedCost: 950000,
    actualCost: 0,
    status: 'Mới tiếp nhận',
    receivedAt: new Date('2026-11-26T08:30:00.000Z'),
    completedAt: null,
    deliveredAt: null,
    statusHistory: [
      { status: 'Mới tiếp nhận', note: 'Lập phiếu tại quầy, phân công KTV Trần Quốc Bảo kiểm tra trong ngày', updatedAt: new Date('2026-11-26T08:30:00.000Z') },
    ],
  },
  {
    ticketCode: 'PSC-2026-009',
    deviceKey: 'dev_03',
    techKey: 'tech_02',
    issueDescription: 'Bảo dưỡng định kỳ & cài lại Windows 11 bản quyền do lỗi driver Wi-Fi',
    diagnosisNotes: 'Cập nhật BIOS mới nhất và cài driver Intel Wi-Fi 7 ổn định.',
    estimatedCost: 350000,
    actualCost: 350000,
    status: 'Đã bàn giao',
    receivedAt: new Date('2026-10-20T13:55:00.000Z'),
    completedAt: new Date('2026-10-20T16:40:00.000Z'),
    deliveredAt: new Date('2026-10-20T17:30:00.000Z'),
    statusHistory: [
      { status: 'Mới tiếp nhận', note: 'Tiếp nhận xử lý phần mềm và bảo dưỡng', updatedAt: new Date('2026-10-20T13:55:00.000Z') },
      { status: 'Đã hoàn thành', note: 'Hoàn tất cài đặt và kiểm tra kết nối Wi-Fi 6GHz', updatedAt: new Date('2026-10-20T16:40:00.000Z') },
      { status: 'Đã bàn giao', note: 'Đã bàn giao cho anh Quân', updatedAt: new Date('2026-10-20T17:30:00.000Z') },
    ],
  },
];

export async function seedDatabase({ reset = false } = {}) {
  if (reset) {
    await Promise.all([
      RepairTicket.deleteMany({}),
      Device.deleteMany({}),
      Technician.deleteMany({}),
      Customer.deleteMany({}),
    ]);
  } else {
    const [customers, technicians, devices, repairTickets] = await Promise.all([
      Customer.countDocuments(),
      Technician.countDocuments(),
      Device.countDocuments(),
      RepairTicket.countDocuments(),
    ]);
    if (customers + technicians + devices + repairTickets > 0) {
      return {
        skipped: true,
        counts: { customers, technicians, devices, repairTickets },
      };
    }
  }

  const customerMap = new Map();
  for (const { key, ...data } of SAMPLE_CUSTOMERS) {
    const doc = await Customer.create(data);
    customerMap.set(key, doc._id);
  }

  const techMap = new Map();
  for (const { key, ...data } of SAMPLE_TECHNICIANS) {
    const doc = await Technician.create(data);
    techMap.set(key, doc._id);
  }

  const deviceMap = new Map();
  for (const { key, customerKey, ...data } of SAMPLE_DEVICES) {
    const doc = await Device.create({ ...data, customerId: customerMap.get(customerKey) });
    deviceMap.set(key, doc._id);
  }

  for (const { deviceKey, techKey, ...data } of SAMPLE_TICKETS) {
    await RepairTicket.create({
      ...data,
      deviceId: deviceMap.get(deviceKey),
      technicianId: techMap.get(techKey),
    });
  }

  return {
    skipped: false,
    counts: {
      customers: customerMap.size,
      technicians: techMap.size,
      devices: deviceMap.size,
      repairTickets: SAMPLE_TICKETS.length,
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const reset = process.argv.includes('--reset');
  connectDB()
    .then(() => seedDatabase({ reset }))
    .then((result) => {
      if (result.skipped) {
        console.log('Database đã có dữ liệu (dùng --reset để nạp lại):', result.counts);
      } else {
        console.log('Seed dữ liệu mẫu vào repair_center_db thành công:', result.counts);
      }
      return mongoose.disconnect();
    })
    .catch((err) => {
      console.error('Lỗi seed dữ liệu:', err.message);
      process.exit(1);
    });
}
