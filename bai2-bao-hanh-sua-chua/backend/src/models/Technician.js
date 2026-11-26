import mongoose from 'mongoose';

const technicianSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Vui lòng nhập mã kỹ thuật viên.'],
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, 'Vui lòng nhập họ tên kỹ thuật viên.'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Vui lòng nhập số điện thoại kỹ thuật viên.'],
      trim: true,
    },
    specialty: {
      type: String,
      trim: true,
      default: 'Tổng hợp',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'technicians',
    timestamps: true,
  }
);

export const Technician = mongoose.model('Technician', technicianSchema);
