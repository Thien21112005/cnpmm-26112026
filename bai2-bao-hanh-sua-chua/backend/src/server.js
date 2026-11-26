import 'dotenv/config';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 5002;

async function start() {
  await connectDB();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Backend Bài 2 đang chạy tại http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Không thể khởi động Backend Bài 2:', err.message);
  process.exit(1);
});
