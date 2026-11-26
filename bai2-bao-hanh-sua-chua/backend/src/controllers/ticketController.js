import { TICKET_STATUSES } from '../constants/repair.js';
import { Customer } from '../models/Customer.js';
import { Device } from '../models/Device.js';
import { RepairTicket } from '../models/RepairTicket.js';
import { Technician } from '../models/Technician.js';
import {
  HttpError,
  assertEnumFilter,
  assertValidObjectId,
  asyncHandler,
  buildPhoneSearchRegex,
  createWithAutoCodeRetry,
  escapeRegex,
  nextSequenceCode,
  parseNonNegativeNumber,
} from '../utils/helpers.js';

const CUSTOMER_FIELDS = 'fullName phone email address';
const TECH_FIELDS = 'code fullName phone specialty';

function populateTicket(query) {
  return query
    .populate({ path: 'deviceId', populate: { path: 'customerId', select: CUSTOMER_FIELDS } })
    .populate('technicianId', TECH_FIELDS);
}

async function getTicketWithHistory(id) {
  const ticket = await populateTicket(RepairTicket.findById(id)).lean();
  if (!ticket) {
    throw new HttpError(404, 'Không tìm thấy phiếu sửa chữa.', 'NOT_FOUND');
  }

  const rawDeviceId = ticket.deviceId?._id || ticket.deviceId;
  const deviceHistory = rawDeviceId
    ? await populateTicket(
        RepairTicket.find({ deviceId: rawDeviceId }).sort({ receivedAt: -1, createdAt: -1 })
      ).lean()
    : [];

  return { ...ticket, deviceHistory };
}

export const listTickets = asyncHandler(async (req, res) => {
  const { technicianId, status, deviceId } = req.query;
  const search = String(req.query.search || '').trim();
  const filter = {};

  if (technicianId) {
    assertValidObjectId(technicianId, 'Mã kỹ thuật viên');
    filter.technicianId = technicianId;
  }
  if (deviceId) {
    assertValidObjectId(deviceId, 'Mã thiết bị');
    filter.deviceId = deviceId;
  }
  const validStatus = assertEnumFilter(status, TICKET_STATUSES, 'Trạng thái sửa chữa');
  if (validStatus) {
    filter.status = validStatus;
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

    const matchedDevices = await Device.find({
      $or: [
        { deviceCode: textRegex },
        { name: textRegex },
        { serialNumber: textRegex },
        ...(matchedCustomerIds.length ? [{ customerId: { $in: matchedCustomerIds } }] : []),
      ],
    })
      .select('_id')
      .lean();
    const matchedDeviceIds = matchedDevices.map((d) => d._id);

    filter.$or = [
      { ticketCode: textRegex },
      { issueDescription: textRegex },
      ...(matchedDeviceIds.length ? [{ deviceId: { $in: matchedDeviceIds } }] : []),
    ];
  }

  const tickets = await populateTicket(
    RepairTicket.find(filter).sort({ receivedAt: -1, createdAt: -1 })
  ).lean();

  res.json(tickets);
});

export const getTicketById = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Mã phiếu sửa chữa');
  res.json(await getTicketWithHistory(req.params.id));
});

export const createTicket = asyncHandler(async (req, res) => {
  assertValidObjectId(req.body.deviceId, 'Mã thiết bị');
  assertValidObjectId(req.body.technicianId, 'Mã nhân viên kỹ thuật');

  const [deviceExists, techExists] = await Promise.all([
    Device.exists({ _id: req.body.deviceId }),
    Technician.exists({ _id: req.body.technicianId }),
  ]);

  if (!deviceExists) {
    throw new HttpError(404, 'Thiết bị không tồn tại trong hệ thống.', 'DEVICE_NOT_FOUND');
  }
  if (!techExists) {
    throw new HttpError(404, 'Nhân viên kỹ thuật không tồn tại.', 'TECHNICIAN_NOT_FOUND');
  }

  const issueDescription = String(req.body.issueDescription || '').trim();
  if (!issueDescription) {
    throw new HttpError(400, 'Vui lòng ghi nhận lỗi thiết bị.', 'VALIDATION_ERROR');
  }

  const estimatedCost = parseNonNegativeNumber(req.body.estimatedCost, 'Chi phí dự kiến', 0);

  const manualCode = String(req.body.ticketCode || '').trim();
  const isAutoCode = !manualCode;
  const now = new Date();

  const created = await createWithAutoCodeRetry(isAutoCode, 'ticketCode', async () => {
    let ticketCode = manualCode;
    if (isAutoCode) {
      const existing = await RepairTicket.find({}, 'ticketCode').lean();
      ticketCode = nextSequenceCode(
        'PSC',
        existing.map((t) => t.ticketCode),
        { pad: 3, withYear: true }
      );
    }

    return RepairTicket.create({
      ticketCode,
      deviceId: req.body.deviceId,
      technicianId: req.body.technicianId,
      issueDescription,
      diagnosisNotes: String(req.body.diagnosisNotes ?? '').trim(),
      estimatedCost,
      actualCost: 0,
      status: 'Mới tiếp nhận',
      receivedAt: now,
      completedAt: null,
      deliveredAt: null,
      statusHistory: [
        {
          status: 'Mới tiếp nhận',
          note: String(req.body.note ?? '').trim() || 'Lập phiếu sửa chữa mới tại quầy tiếp nhận.',
          updatedAt: now,
        },
      ],
    });
  });

  const populated = await populateTicket(RepairTicket.findById(created._id)).lean();
  res.status(201).json(populated);
});

export const updateTicketStatus = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Mã phiếu sửa chữa');
  const ticket = await RepairTicket.findById(req.params.id);
  if (!ticket) {
    throw new HttpError(404, 'Không tìm thấy phiếu sửa chữa.', 'NOT_FOUND');
  }

  const nextStatus = req.body.status !== undefined ? String(req.body.status).trim() : ticket.status;
  if (!TICKET_STATUSES.includes(nextStatus)) {
    throw new HttpError(
      400,
      `Trạng thái "${nextStatus}" không hợp lệ. Chỉ chấp nhận 5 trạng thái quy định.`,
      'INVALID_STATUS'
    );
  }

  const actualCost =
    req.body.actualCost !== undefined && req.body.actualCost !== ''
      ? parseNonNegativeNumber(req.body.actualCost, 'Chi phí thực tế')
      : ticket.actualCost;

  if (req.body.technicianId) {
    assertValidObjectId(req.body.technicianId, 'Mã nhân viên kỹ thuật');
    const techExists = await Technician.exists({ _id: req.body.technicianId });
    if (!techExists) {
      throw new HttpError(404, 'Nhân viên kỹ thuật không tồn tại.', 'TECHNICIAN_NOT_FOUND');
    }
    ticket.technicianId = req.body.technicianId;
  }

  const now = new Date();
  const prevStatus = ticket.status;
  const note =
    String(req.body.note || '').trim() ||
    (nextStatus !== prevStatus
      ? `Cập nhật trạng thái sang "${nextStatus}".`
      : 'Cập nhật thông tin xử lý và chi phí.');

  ticket.status = nextStatus;
  ticket.actualCost = actualCost;
  if (req.body.diagnosisNotes !== undefined) {
    ticket.diagnosisNotes = String(req.body.diagnosisNotes ?? '').trim();
  }
  if (nextStatus === 'Đã hoàn thành' && !ticket.completedAt) {
    ticket.completedAt = now;
  }
  if (nextStatus === 'Đã bàn giao' && !ticket.deliveredAt) {
    ticket.deliveredAt = now;
  }
  ticket.statusHistory.push({ status: nextStatus, note, updatedAt: now });

  await ticket.save();
  res.json(await getTicketWithHistory(ticket._id));
});

export const updateTicket = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Mã phiếu sửa chữa');
  const ticket = await RepairTicket.findById(req.params.id);
  if (!ticket) {
    throw new HttpError(404, 'Không tìm thấy phiếu sửa chữa.', 'NOT_FOUND');
  }

  if (req.body.deviceId) {
    assertValidObjectId(req.body.deviceId, 'Mã thiết bị');
    if (!(await Device.exists({ _id: req.body.deviceId }))) {
      throw new HttpError(404, 'Thiết bị không tồn tại.', 'DEVICE_NOT_FOUND');
    }
    ticket.deviceId = req.body.deviceId;
  }

  if (req.body.technicianId) {
    assertValidObjectId(req.body.technicianId, 'Mã nhân viên kỹ thuật');
    if (!(await Technician.exists({ _id: req.body.technicianId }))) {
      throw new HttpError(404, 'Nhân viên kỹ thuật không tồn tại.', 'TECHNICIAN_NOT_FOUND');
    }
    ticket.technicianId = req.body.technicianId;
  }

  if (req.body.issueDescription !== undefined) {
    const desc = String(req.body.issueDescription ?? '').trim();
    if (!desc) throw new HttpError(400, 'Vui lòng ghi nhận lỗi thiết bị.', 'VALIDATION_ERROR');
    ticket.issueDescription = desc;
  }
  if (req.body.diagnosisNotes !== undefined) {
    ticket.diagnosisNotes = String(req.body.diagnosisNotes ?? '').trim();
  }
  if (req.body.estimatedCost !== undefined) {
    ticket.estimatedCost = parseNonNegativeNumber(req.body.estimatedCost, 'Chi phí dự kiến');
  }
  if (req.body.actualCost !== undefined) {
    ticket.actualCost = parseNonNegativeNumber(req.body.actualCost, 'Chi phí thực tế');
  }
  if (req.body.status !== undefined) {
    const nextStatus = String(req.body.status).trim();
    if (!TICKET_STATUSES.includes(nextStatus)) {
      throw new HttpError(400, 'Trạng thái sửa chữa không hợp lệ.', 'INVALID_STATUS');
    }
    if (nextStatus !== ticket.status) {
      const now = new Date();
      ticket.status = nextStatus;
      if (nextStatus === 'Đã hoàn thành' && !ticket.completedAt) ticket.completedAt = now;
      if (nextStatus === 'Đã bàn giao' && !ticket.deliveredAt) ticket.deliveredAt = now;
      ticket.statusHistory.push({
        status: nextStatus,
        note: String(req.body.note || '').trim() || `Cập nhật trạng thái sang "${nextStatus}".`,
        updatedAt: now,
      });
    }
  }

  await ticket.save();
  res.json(await getTicketWithHistory(ticket._id));
});
