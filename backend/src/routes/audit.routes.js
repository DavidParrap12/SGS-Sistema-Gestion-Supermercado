import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import {
  getAuditLogs,
  getAuditStats,
  exportAuditLogs,
  cleanupOldLogs,
  getRecentActivity
} from '../controllers/audit.controller.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Rutas de auditoría
router.get('/logs', requireAdmin, getAuditLogs);
router.get('/stats', requireAdmin, getAuditStats);
router.get('/export', requireAdmin, exportAuditLogs);
router.get('/recent', getRecentActivity); // Cualquier usuario autenticado puede ver su actividad reciente
router.delete('/cleanup', requireAdmin, cleanupOldLogs);

export default router;