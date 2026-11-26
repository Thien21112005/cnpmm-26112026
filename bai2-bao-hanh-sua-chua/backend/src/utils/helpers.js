import mongoose from 'mongoose';

export class HttpError extends Error {
  constructor(status, message, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildPhoneSearchRegex(raw = '') {
  const compact = String(raw).replace(/\s+/g, '');
  if (!compact) return null;
  const pattern = [...compact].map((ch) => escapeRegex(ch)).join('\\s*');
  return new RegExp(pattern, 'i');
}

export function assertValidObjectId(id, label = 'Mã định danh') {
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new HttpError(400, `${label} không hợp lệ.`, 'INVALID_ID');
  }
}

export function parseNonNegativeNumber(raw, label, defaultValue = 0) {
  if (raw === undefined || raw === null || raw === '') return defaultValue;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) {
    throw new HttpError(400, `${label} phải là số lớn hơn hoặc bằng 0.`, 'INVALID_NUMBER');
  }
  return num;
}

export function nextSequenceCode(prefix, existingCodes, { pad = 3, withYear = true } = {}) {
  let max = 0;
  for (const code of existingCodes) {
    const match = String(code || '').match(/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  const seq = String(max + 1).padStart(pad, '0');
  return withYear ? `${prefix}-${new Date().getFullYear()}-${seq}` : `${prefix}-${seq}`;
}

export function assertEnumFilter(val, allowedValues, label) {
  if (val === undefined || val === '') return undefined;
  if (typeof val !== 'string' || !allowedValues.includes(val)) {
    throw new HttpError(400, `${label} không hợp lệ.`, 'INVALID_FILTER');
  }
  return val;
}

export async function createWithAutoCodeRetry(isAutoCode, codeField, createFn, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await createFn();
    } catch (err) {
      const isCodeDup =
        isAutoCode && err?.code === 11000 && Boolean(err?.keyPattern?.[codeField]);
      if (!isCodeDup || attempt === maxAttempts) throw err;
    }
  }
}
