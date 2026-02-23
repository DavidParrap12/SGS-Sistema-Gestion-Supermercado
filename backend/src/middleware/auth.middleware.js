import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { TOKEN_SECRET } from '../config.js';

export const requireAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            return res.status(401).json({ message: 'No autorizado - Token no proporcionado' });
        }
        
        const decoded = jwt.verify(token, TOKEN_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'No autorizado - Usuario no encontrado' });
        }
        
        // Verificar si la cuenta está bloqueada
        if (user.isLocked) {
            return res.status(423).json({ message: 'Cuenta bloqueada temporalmente' });
        }
        
        // Verificar si el usuario está activo
        if (!user.isActive) {
            return res.status(403).json({ message: 'Cuenta desactivada' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'No autorizado - Token inválido' });
    }
};

export const requireAdmin = async (req, res, next) => {
    try {
        await requireAuth(req, res, () => {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Acceso denegado - Se requieren privilegios de administrador' });
            }
            next();
        });
    } catch (error) {
        return res.status(403).json({ message: 'Error al verificar permisos de administrador' });
    }
};

export const requirePermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            await requireAuth(req, res, () => {
                if (!req.user.hasPermission(resource, action)) {
                    return res.status(403).json({ 
                        message: `No tienes permisos para ${action.toLowerCase()} ${resource.toLowerCase()}` 
                    });
                }
                next();
            });
        } catch (error) {
            return res.status(403).json({ message: 'Error al verificar permisos' });
        }
    };
};

export const requireAnyPermission = (resource, actions) => {
    return async (req, res, next) => {
        try {
            await requireAuth(req, res, () => {
                if (!req.user.hasAnyPermission(resource, actions)) {
                    return res.status(403).json({ 
                        message: `No tienes permisos para realizar acciones sobre ${resource.toLowerCase()}` 
                    });
                }
                next();
            });
        } catch (error) {
            return res.status(403).json({ message: 'Error al verificar permisos' });
        }
    };
};

export const requireBranchAccess = (branchField = 'branch') => {
    return async (req, res, next) => {
        try {
            await requireAuth(req, res, () => {
                // Admin puede acceder a todas las sucursales
                if (req.user.role === 'admin') {
                    return next();
                }
                
                // Verificar si el usuario tiene acceso a la sucursal
                const targetBranch = req.body[branchField] || req.params[branchField] || req.query[branchField];
                
                if (targetBranch && targetBranch !== req.user.branch) {
                    return res.status(403).json({ 
                        message: 'No tienes acceso a esta sucursal' 
                    });
                }
                
                next();
            });
        } catch (error) {
            return res.status(403).json({ message: 'Error al verificar acceso a sucursal' });
        }
    };
};