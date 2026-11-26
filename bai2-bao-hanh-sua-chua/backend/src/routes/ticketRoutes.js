import { Router } from 'express';
import {
  createTicket,
  getTicketById,
  listTickets,
  updateTicket,
  updateTicketStatus,
} from '../controllers/ticketController.js';

const router = Router();

router.get('/', listTickets);
router.get('/:id', getTicketById);
router.post('/', createTicket);
router.put('/:id', updateTicket);
router.patch('/:id/status', updateTicketStatus);

export default router;
