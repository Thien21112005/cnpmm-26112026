import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Vui lòng nhập họ tên khách hàng.'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Vui lòng nhập số điện thoại.'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    collection: 'customers',
    timestamps: true,
  }
);

customerSchema.index({ fullName: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
