import mongoose from 'mongoose';

export const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/repair_center_db';

export async function connectDB(uri = process.env.MONGO_URI || DEFAULT_MONGO_URI) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(uri);
  return mongoose.connection;
}
