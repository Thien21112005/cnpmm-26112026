import { DEVICE_TYPES } from '../constants/repair.js';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { RepairTicket } from '../models/RepairTicket.js';
import {
  HttpError,
  assertEnumFilter,
  assertValidObjectId,
  asyncHandler,
  buildPhoneSearchRegex,
  createWithAutoCodeRetry,
  escapeRegex,
  nextSequenceCode,
} from '../utils/helpers.js';

const CUSTOMER_FIELDS = 'fullName phone email address';

async function attachTicketMeta(devices) {
  if (!devices.length) return [];
  const ids = devices.map((d) => d._id);

  const stats = await RepairTicket.aggregate([
    { $match: { deviceId: { $in: ids } } },
    { $sort: { receivedAt: -1, createdAt: -1 } },
    {
      $group: {
        _id: '$deviceId',
        ticketCount: { $sum: 1 },
        latestStatus: { $first: '$status' },
      },
    },
  ]);

  const statMap = new Map(stats.map((s) => [String(s._id), s]));
  return devices.map((d) => {
    const meta = statMap.get(String(d._id));
    return {
      ...d,
      ticketCount: meta?.ticketCount || 0,
      latestStatus: meta?.latestStatus || null,
    };
  });
}

export const listDevices = asyncHandler(async (req, res) => {
  const { deviceType, customerId } = req.query;
  const search = String(req.query.search || '').trim();
  const filter = {};

  const validType = assertEnumFilter(deviceType, DEVICE_TYPES, 'Loại thiết bị');
  if (validType) filter.deviceType = validType;
  if (customerId) {
    assertValidObjectId(customerId, 'Mã khách hàng');
    filter.customerId = customerId;
  }

  if (search) {
    const textRegex = new RegExp(escapeRegex(search), 'i');
    const phoneRegex = buildPhoneSearchRegex(search);
    const matchedCustomers = await Customer.find({
      $or: [{ fullName: textRegex }, ...(phoneRegex ? [{ phone: phoneRegex }] : [])],
    })
      .select('_id')
      .lean();
    const matchedCustomerIds = matchedCustomers.map((c) => c._id);

    filter.$or = [
      { deviceCode: textRegex },
      { name: textRegex },
      { brand: textRegex },
      { model: textRegex },
      { serialNumber: textRegex },
      ...(matchedCustomerIds.length ? [{ customerId: { $in: matchedCustomerIds } }] : []),
    ];
  }

  const devices = await Device.find(filter)
    .populate('customerId', CUSTOMER_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  res.json(await attachTicketMeta(devices));
});

export const getDeviceById = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Mã thiết bị');
  const device = await Device.findById(req.params.id).populate('customerId', CUSTOMER_FIELDS).lean();
  if (!device) {
    throw new HttpError(404, 'Không tìm thấy thiết bị.', 'NOT_FOUND');
  }
  const [enriched] = await attachTicketMeta([device]);
  res.json(enriched);
});

export const getDeviceHistory = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Mã thiết bị');
  const device = await Device.findById(req.params.id).populate('customerId', CUSTOMER_FIELDS).lean();
  if (!device) {
    throw new HttpError(404, 'Không tìm thấy thiết bị.', 'NOT_FOUND');
  }

  const tickets = await RepairTicket.find({ deviceId: device._id })
    .populate({ path: 'deviceId', populate: { path: 'customerId', select: CUSTOMER_FIELDS } })
    .populate('technicianId', 'code fullName phone specialty')
    .sort({ receivedAt: -1, createdAt: -1 })
    .lean();

  res.json({
    device: {
      ...device,
      ticketCount: tickets.length,
      latestStatus: tickets[0]?.status || null,
    },
    tickets,
  });
});

export const createDevice = asyncHandler(async (req, res) => {
  assertValidObjectId(req.body.customerId, 'Mã khách hàng sở hữu');
  const ownerExists = await Customer.exists({ _id: req.body.customerId });
  if (!ownerExists) {
    throw new HttpError(404, 'Khách hàng sở hữu không tồn tại.', 'CUSTOMER_NOT_FOUND');
  }

  const manualCode = String(req.body.deviceCode || '').trim();
  const isAutoCode = !manualCode;

  const created = await createWithAutoCodeRetry(isAutoCode, 'deviceCode', async () => {
    let deviceCode = manualCode;
    if (isAutoCode) {
      const existing = await Device.find({}, 'deviceCode').lean();
      deviceCode = nextSequenceCode(
        'TB',
        existing.map((d) => d.deviceCode),
        { pad: 3, withYear: true }
      );
    }

    return Device.create({
      deviceCode,
      name: String(req.body.name || '').trim(),
      deviceType: req.body.deviceType,
      brand: String(req.body.brand || '').trim(),
      model: String(req.body.model || '').trim(),
      serialNumber: String(req.body.serialNumber || '').trim(),
      initialCondition: String(req.body.initialCondition || '').trim(),
      customerId: req.body.customerId,
    });
  });

  const populated = await Device.findById(created._id)
    .populate('customerId', CUSTOMER_FIELDS)
    .lean();

  res.status(201).json({ ...populated, ticketCount: 0, latestStatus: null });
});

export const updateDevice = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Mã thiết bị');

  if (req.body.customerId !== undefined) {
    assertValidObjectId(req.body.customerId, 'Mã khách hàng sở hữu');
    const ownerExists = await Customer.exists({ _id: req.body.customerId });
    if (!ownerExists) {
      throw new HttpError(404, 'Khách hàng sở hữu không tồn tại.', 'CUSTOMER_NOT_FOUND');
    }
  }

  const payload = {
    deviceCode: String(req.body.deviceCode || '').trim(),
    name: String(req.body.name || '').trim(),
    deviceType: req.body.deviceType,
    brand: String(req.body.brand || '').trim(),
    model: String(req.body.model || '').trim(),
    serialNumber: String(req.body.serialNumber || '').trim(),
    initialCondition: String(req.body.initialCondition || '').trim(),
    customerId: req.body.customerId,
  };

  const updated = await Device.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  })
    .populate('customerId', CUSTOMER_FIELDS)
    .lean();

  if (!updated) {
    throw new HttpError(404, 'Không tìm thấy thiết bị.', 'NOT_FOUND');
  }

  const [enriched] = await attachTicketMeta([updated]);
  res.json(enriched);
});
