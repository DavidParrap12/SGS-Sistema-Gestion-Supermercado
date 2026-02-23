import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import {
  createBackup,
  getBackups,
  restoreBackup,
  deleteBackup,
  cleanupBackups,
  downloadBackup
} from '../controllers/backup.controller.js';

const router = Router();

// Todas las rutas requieren autenticación y permisos de admin
router.use(requireAuth, requireAdmin);

// Rutas de respaldo
router.post('/create', createBackup);
router.get('/list', getBackups);
router.post('/restore/:backupName', restoreBackup);
router.delete('/delete/:backupName', deleteBackup);
router.post('/cleanup', cleanupBackups);
router.get('/download/:backupName', downloadBackup);

export default router;