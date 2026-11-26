import mongoose from 'mongoose';
import { TICKET_STATUSES } from '../constants/repair.js';

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: TICKET_STATUSES,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const repairTicketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: [true, 'Vui lòng nhập mã phiếu sửa chữa.'],
      unique: true,
      trim: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: [true, 'Vui lòng chọn thiết bị sửa chữa.'],
      index: true,
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Technician',
      required: [true, 'Vui lòng chọn nhân viên kỹ thuật phụ trách.'],
      index: true,
    },
    issueDescription: {
      type: String,
      required: [true, 'Vui lòng ghi nhận lỗi thiết bị.'],
      trim: true,
    },
    diagnosisNotes: {
      type: String,
      trim: true,
      default: '',
    },
    estimatedCost: {
      type: Number,
      required: true,
      min: [0, 'Chi phí dự kiến phải lớn hơn hoặc bằng 0.'],
      default: 0,
    },
    actualCost: {
      type: Number,
      min: [0, 'Chi phí thực tế phải lớn hơn hoặc bằng 0.'],
      default: 0,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: TICKET_STATUSES,
        message: 'Trạng thái sửa chữa không hợp lệ.',
      },
      default: 'Mới tiếp nhận',
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    collection: 'repairTickets',
    timestamps: true,
  }
);

repairTicketSchema.index({ deviceId: 1, receivedAt: -1 });
repairTicketSchema.index({ technicianId: 1, status: 1 });
repairTicketSchema.index({ status: 1, receivedAt: -1 });

export const RepairTicket = mongoose.model('RepairTicket', repairTicketSchema);
