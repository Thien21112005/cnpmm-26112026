import { Router } from 'express';
import {
  createDevice,
  getDeviceById,
  getDeviceHistory,
  listDevices,
  updateDevice,
} from '../controllers/deviceController.js';

const router = Router();

router.get('/', listDevices);
router.get('/:id/history', getDeviceHistory);
router.get('/:id', getDeviceById);
router.post('/', createDevice);
router.put('/:id', updateDevice);

export default router;
