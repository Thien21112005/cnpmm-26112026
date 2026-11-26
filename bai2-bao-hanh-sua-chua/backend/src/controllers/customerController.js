import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import {
  HttpError,
  assertValidObjectId,
  asyncHandler,
  buildPhoneSearchRegex,
  escapeRegex,
} from '../utils/helpers.js';

export const listCustomers = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const filter = {};

  if (search) {
    const nameRegex = new RegExp(escapeRegex(search), 'i');
    const phoneRegex = buildPhoneSearchRegex(search);
    filter.$or = [{ fullName: nameRegex }, ...(phoneRegex ? [{ phone: phoneRegex }] : [])];
  }

  const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
  const ids = customers.map((c) => c._id);

  const counts = ids.length
    ? await Device.aggregate([
        { $match: { customerId: { $in: ids } } },
        { $group: { _id: '$customerId', count: { $sum: 1 } } },
      ])
    : [];

  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
  res.json(
    customers.map((c) => ({
      ...c,
      deviceCount: countMap.get(String(c._id)) || 0,
    }))
  );
});

export const getCustomerById = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Mã khách hàng');
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) {
    throw new HttpError(404, 'Không tìm thấy khách hàng.', 'NOT_FOUND');
  }
  const devices = await Device.find({ customerId: customer._id }).sort({ createdAt: -1 }).lean();
  res.json({ ...customer, deviceCount: devices.length, devices });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const created = await Customer.create({
    fullName: String(req.body.fullName || '').trim(),
    phone: String(req.body.phone || '').trim(),
    email: String(req.body.email || '').trim(),
    address: String(req.body.address || '').trim(),
    note: String(req.body.note || '').trim(),
  });
  res.status(201).json({ ...created.toObject(), deviceCount: 0 });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Mã khách hàng');
  const updated = await Customer.findByIdAndUpdate(
    req.params.id,
    {
      fullName: String(req.body.fullName || '').trim(),
      phone: String(req.body.phone || '').trim(),
      email: String(req.body.email || '').trim(),
      address: String(req.body.address || '').trim(),
      note: String(req.body.note || '').trim(),
    },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    throw new HttpError(404, 'Không tìm thấy khách hàng.', 'NOT_FOUND');
  }
  const deviceCount = await Device.countDocuments({ customerId: updated._id });
  res.json({ ...updated, deviceCount });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Mã khách hàng');
  const exists = await Customer.exists({ _id: req.params.id });
  if (!exists) {
    throw new HttpError(404, 'Không tìm thấy khách hàng.', 'NOT_FOUND');
  }

  const linkedCount = await Device.countDocuments({ customerId: req.params.id });
  if (linkedCount > 0) {
    throw new HttpError(
      409,
      `Không thể xóa vì khách hàng đang sở hữu ${linkedCount} thiết bị trong hệ thống.`,
      'CUSTOMER_HAS_DEVICES'
    );
  }

  await Customer.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});
