import User from '../models/user.model.js';
import Producto from '../models/producto.model.js';
import Venta from '../models/venta.model.js';
import AuditLog from '../models/audit.model.js';

// Obtener estadísticas generales
export const getStats = async (req, res) => {
    try {
        const totalUsuarios = await User.countDocuments();
        const totalProductos = await Producto.countDocuments();
        const totalVentas = await Venta.countDocuments();
        
        // Calcular total de ingresos
        const ventas = await Venta.find();
        const totalIngresos = ventas.reduce((sum, venta) => sum + (venta.total || 0), 0);

        // Obtener estadísticas de auditoría
        const totalActions = await AuditLog.countDocuments();
        const successActions = await AuditLog.countDocuments({ status: 'SUCCESS' });
        const successRate = totalActions > 0 ? Math.round((successActions / totalActions) * 100) : 0;

        res.json({
            totalUsuarios,
            totalProductos,
            totalVentas,
            totalIngresos,
            auditStats: {
                totalActions,
                successRate,
                recentActions: await AuditLog.countDocuments({ 
                    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                })
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
};

// Obtener todos los usuarios
export const getUsuarios = async (req, res) => {
    try {
        const usuarios = await User.find().select('-password');
        res.json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

// Eliminar usuario
export const deleteUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        
        // No permitir eliminar el usuario actual (admin)
        if (id === req.user._id.toString()) {
            return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
        }
        
        const usuario = await User.findByIdAndDelete(id);
        
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ message: 'Error al eliminar usuario' });
    }
};

// Cambiar rol de usuario
export const cambiarRolUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        // Validar rol
        if (!['user', 'admin', 'cashier', 'manager'].includes(role)) {
            return res.status(400).json({ message: 'Rol inválido' });
        }
        
        // No permitir cambiar el rol del usuario actual
        if (id === req.user._id.toString()) {
            return res.status(400).json({ message: 'No puedes cambiar tu propio rol' });
        }
        
        // Obtener permisos por defecto según el nuevo rol
        const defaultPermissions = User.getDefaultPermissions(role);
        
        const usuario = await User.findByIdAndUpdate(
            id, 
            { 
                role, 
                permissions: defaultPermissions 
            }, 
            { new: true }
        ).select('-password');
        
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        res.json({
            message: 'Rol y permisos actualizados exitosamente',
            usuario
        });
    } catch (error) {
        console.error('Error al cambiar rol:', error);
        res.status(500).json({ message: 'Error al cambiar rol del usuario' });
    }
};

// Actualizar permisos de usuario
export const updateUserPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;
        
        // No permitir cambiar los permisos del usuario actual
        if (id === req.user._id.toString()) {
            return res.status(400).json({ message: 'No puedes cambiar tus propios permisos' });
        }
        
        // Validar que los permisos tengan el formato correcto
        if (!Array.isArray(permissions)) {
            return res.status(400).json({ message: 'Los permisos deben ser un array' });
        }
        
        // Validar cada permiso
        for (const permission of permissions) {
            if (!permission.resource || !Array.isArray(permission.actions)) {
                return res.status(400).json({ message: 'Formato de permisos inválido' });
            }
        }
        
        const usuario = await User.findByIdAndUpdate(
            id, 
            { permissions }, 
            { new: true }
        ).select('-password');
        
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        res.json({
            message: 'Permisos actualizados exitosamente',
            user: usuario
        });
    } catch (error) {
        console.error('Error al actualizar permisos:', error);
        res.status(500).json({ message: 'Error al actualizar permisos del usuario' });
    }
};