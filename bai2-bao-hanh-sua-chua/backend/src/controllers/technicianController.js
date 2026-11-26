import { Technician } from '../models/Technician.js';
import { RepairTicket } from '../models/RepairTicket.js';
import { asyncHandler, createWithAutoCodeRetry, nextSequenceCode } from '../utils/helpers.js';

export const listTechnicians = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.active === 'true') filter.active = true;
  if (req.query.active === 'false') filter.active = false;

  const technicians = await Technician.find(filter).sort({ code: 1 }).lean();
  const ids = technicians.map((t) => t._id);

  const stats = ids.length
    ? await RepairTicket.aggregate([
        { $match: { technicianId: { $in: ids } } },
        {
          $group: {
            _id: '$technicianId',
            totalTicketCount: { $sum: 1 },
            activeTicketCount: {
              $sum: { $cond: [{ $ne: ['$status', 'Đã bàn giao'] }, 1, 0] },
            },
            completedTicketCount: {
              $sum: {
                $cond: [{ $in: ['$status', ['Đã hoàn thành', 'Đã bàn giao']] }, 1, 0],
              },
            },
          },
        },
      ])
    : [];

  const statMap = new Map(stats.map((s) => [String(s._id), s]));
  res.json(
    technicians.map((tech) => {
      const s = statMap.get(String(tech._id));
      return {
        ...tech,
        activeTicketCount: s?.activeTicketCount || 0,
        completedTicketCount: s?.completedTicketCount || 0,
        totalTicketCount: s?.totalTicketCount || 0,
      };
    })
  );
});

export const createTechnician = asyncHandler(async (req, res) => {
  const manualCode = String(req.body.code || '').trim();
  const isAutoCode = !manualCode;

  const created = await createWithAutoCodeRetry(isAutoCode, 'code', async () => {
    let code = manualCode;
    if (isAutoCode) {
      const existing = await Technician.find({}, 'code').lean();
      code = nextSequenceCode(
        'KTV',
        existing.map((t) => t.code),
        { pad: 2, withYear: false }
      );
    }

    return Technician.create({
      code,
      fullName: String(req.body.fullName || '').trim(),
      phone: String(req.body.phone || '').trim(),
      specialty: String(req.body.specialty || '').trim() || 'Tổng hợp',
      active: req.body.active !== undefined ? Boolean(req.body.active) : true,
    });
  });

  res.status(201).json({
    ...created.toObject(),
    activeTicketCount: 0,
    completedTicketCount: 0,
    totalTicketCount: 0,
  });
});
