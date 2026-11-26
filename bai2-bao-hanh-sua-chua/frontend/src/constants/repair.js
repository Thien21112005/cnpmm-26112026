export const DEVICE_TYPES = [
  'Điện thoại',
  'Laptop',
  'Máy tính bàn',
  'Máy tính bảng',
  'Khác',
];

export const TICKET_STATUSES = [
  'Mới tiếp nhận',
  'Đang kiểm tra',
  'Đang sửa chữa',
  'Đã hoàn thành',
  'Đã bàn giao',
];

export const STATUS_META = {
  'Mới tiếp nhận': {
    key: 'received',
    step: 0,
    short: 'Tiếp nhận',
    hint: 'Thiết bị vừa được lập phiếu, chờ kỹ thuật viên tiếp quản.',
  },
  'Đang kiểm tra': {
    key: 'inspecting',
    step: 1,
    short: 'Kiểm tra',
    hint: 'Đang đo đạc, chẩn đoán lỗi và xác nhận báo giá linh kiện.',
  },
  'Đang sửa chữa': {
    key: 'repairing',
    step: 2,
    short: 'Sửa chữa',
    hint: 'Đang thay thế linh kiện, sửa mạch và chạy test ổn định.',
  },
  'Đã hoàn thành': {
    key: 'completed',
    step: 3,
    short: 'Hoàn thành',
    hint: 'Đã xử lý xong và kiểm thử đạt yêu cầu, chờ khách tới nhận.',
  },
  'Đã bàn giao': {
    key: 'delivered',
    step: 4,
    short: 'Bàn giao',
    hint: 'Khách hàng đã kiểm tra, thanh toán và nhận lại thiết bị.',
  },
};

export function formatVND(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num === 0) return '0 ₫';
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

