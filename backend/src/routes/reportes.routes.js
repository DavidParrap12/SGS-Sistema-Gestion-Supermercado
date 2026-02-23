import { Router } from 'express';
import { generarReporte } from '../controllers/reportes.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/reportes', requireAuth, requireAdmin, generarReporte);

export default router;