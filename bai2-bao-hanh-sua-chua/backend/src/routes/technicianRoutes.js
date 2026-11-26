import { Router } from 'express';
import { createTechnician, listTechnicians } from '../controllers/technicianController.js';

const router = Router();

router.get('/', listTechnicians);
router.post('/', createTechnician);

export default router;
