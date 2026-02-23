import { Router } from 'express';
import { 
    getStats, 
    getUsuarios, 
    deleteUsuario, 
    cambiarRolUsuario,
    updateUserPermissions 
} from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas requieren autenticación y ser admin
router.get('/admin/stats', requireAuth, requireAdmin, getStats);
router.get('/admin/usuarios', requireAuth, requireAdmin, getUsuarios);
router.delete('/admin/usuarios/:id', requireAuth, requireAdmin, deleteUsuario);
router.put('/admin/usuarios/:id/rol', requireAuth, requireAdmin, cambiarRolUsuario);
router.put('/admin/usuarios/:id/permissions', requireAuth, requireAdmin, updateUserPermissions);

export default router;