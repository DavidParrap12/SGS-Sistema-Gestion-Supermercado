import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
    register,
    login,
    logout,
    verifyToken,
    profile,
    principal
} from '../controllers/auth.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { auditMiddleware } from '../middleware/audit.middleware.js';

const router = Router();

// Rate limiting estricto exclusivo para rutas de autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Limita cada IP a 10 peticiones fallidas
    message: 'Demasiados intentos de inicio de sesión desde esta IP, bloqueado temporalmente.'
});

router.post('/admin/register', requireAuth, requireAdmin, auditMiddleware({ action: 'CREATE', resource: 'USER', description: 'Registro de nuevo usuario por administrador' }), register);
router.post('/login', authLimiter, auditMiddleware({ action: 'LOGIN', resource: 'AUTH', description: 'Inicio de sesión' }), login);
router.post('/logout', requireAuth, auditMiddleware({ action: 'LOGOUT', resource: 'AUTH', description: 'Cierre de sesión' }), logout);
router.get('/verify', requireAuth, verifyToken);
router.get('/principal', requireAuth, principal);
router.get('/profile', requireAuth, profile);

export default router;