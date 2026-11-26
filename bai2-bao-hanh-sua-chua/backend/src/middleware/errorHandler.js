import { HttpError } from '../utils/helpers.js';

const DUPLICATE_FIELD_LABELS = {
  deviceCode: 'Mã thiết bị',
  serialNumber: 'Số serial',
  ticketCode: 'Mã phiếu sửa chữa',
  code: 'Mã kỹ thuật viên',
};

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, code: err.code });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Dữ liệu JSON gửi lên không hợp lệ.', code: 'INVALID_JSON' });
  }

  if (err?.name === 'CastError') {
    return res.status(400).json({ message: 'Định dạng mã định danh hoặc dữ liệu không hợp lệ.', code: 'CAST_ERROR' });
  }

  if (err?.name === 'ValidationError') {
    const firstMsg = Object.values(err.errors || {})[0]?.message;
    return res.status(400).json({
      message: firstMsg || 'Dữ liệu không hợp lệ.',
      code: 'VALIDATION_ERROR',
    });
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    const label = DUPLICATE_FIELD_LABELS[field] || field || 'Dữ liệu';
    const val = field && err.keyValue ? err.keyValue[field] : '';
    const detail = val ? ` "${val}"` : '';
    return res.status(409).json({
      message: `${label}${detail} đã tồn tại trong hệ thống.`,
      code: 'DUPLICATE_KEY',
    });
  }

  console.error('[API 500]', err);
  return res.status(500).json({
    message: 'Đã xảy ra lỗi máy chủ.',
    code: 'INTERNAL_ERROR',
  });
}
