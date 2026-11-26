import mongoose from 'mongoose';
import { DEVICE_TYPES } from '../constants/repair.js';

const deviceSchema = new mongoose.Schema(
  {
    deviceCode: {
      type: String,
      required: [true, 'Vui lòng nhập mã thiết bị.'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên thiết bị.'],
      trim: true,
    },
    deviceType: {
      type: String,
      required: [true, 'Vui lòng chọn loại thiết bị.'],
      enum: {
        values: DEVICE_TYPES,
        message: 'Loại thiết bị không hợp lệ.',
      },
      index: true,
    },
    brand: {
      type: String,
      required: [true, 'Vui lòng nhập thương hiệu thiết bị.'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Vui lòng nhập model thiết bị.'],
      trim: true,
    },
    serialNumber: {
      type: String,
      required: [true, 'Vui lòng nhập số serial thiết bị.'],
      unique: true,
      trim: true,
    },
    initialCondition: {
      type: String,
      required: [true, 'Vui lòng nhập tình trạng ban đầu của thiết bị.'],
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Vui lòng chọn khách hàng sở hữu.'],
      index: true,
    },
  },
  {
    collection: 'devices',
    timestamps: true,
  }
);

export const Device = mongoose.model('Device', deviceSchema);
