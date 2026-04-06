import React, { useState } from 'react';
import axios from 'axios';
import { API } from '../api/auth';
import '../styles/PermissionManager.css';

const PermissionManager = ({ user, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const recursos = [
        { id: 'PRODUCT', nombre: 'Productos', acciones: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { id: 'SALE', nombre: 'Ventas', acciones: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { id: 'INVENTORY', nombre: 'Inventario', acciones: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT'] },
        { id: 'REPORT', nombre: 'Reportes', acciones: ['READ', 'EXPORT'] },
        { id: 'USER', nombre: 'Usuarios', acciones: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { id: 'CLIENT', nombre: 'Clientes', acciones: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { id: 'SUPPLIER', nombre: 'Proveedores', acciones: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { id: 'CATEGORY', nombre: 'Categorías', acciones: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { id: 'PAYMENT', nombre: 'Pagos', acciones: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { id: 'AUDIT', nombre: 'Auditoría', acciones: ['READ', 'EXPORT', 'CLEAN'] },
        { id: 'BACKUP', nombre: 'Respaldo', acciones: ['CREATE', 'RESTORE', 'DELETE'] },
        { id: 'CONFIG', nombre: 'Configuración', acciones: ['READ', 'UPDATE'] }
    ];

    const togglePermission = async (resource, action) => {
        setLoading(true);
        setError('');

        try {
            const updatedPermissions = [...user.permissions];
            const existingPermission = updatedPermissions.find(p => p.resource === resource);

            if (existingPermission) {
                if (existingPermission.actions.includes(action)) {
                    // Remover acción
                    existingPermission.actions = existingPermission.actions.filter(a => a !== action);
                    
                    // Si no quedan acciones, remover el permiso completo
                    if (existingPermission.actions.length === 0) {
                        const index = updatedPermissions.findIndex(p => p.resource === resource);
                        updatedPermissions.splice(index, 1);
                    }
                } else {
                    // Agregar acción
                    existingPermission.actions.push(action);
                }
            } else {
                // Crear nuevo permiso
                updatedPermissions.push({
                    resource,
                    actions: [action],
                    conditions: {}
                });
            }

            // Actualizar en el backend
            const response = await axios.put(
                `${API}/admin/usuarios/${user._id}/permissions`,
                { permissions: updatedPermissions },
                { withCredentials: true }
            );

            onUpdate(response.data.user);
        } catch (error) {
            console.error('Error al actualizar permisos:', error);
            setError('Error al actualizar permisos');
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (resource, action) => {
        const permission = user.permissions.find(p => p.resource === resource);
        return permission && permission.actions.includes(action);
    };

    const toggleAllActions = async (resource) => {
        const resourceConfig = recursos.find(r => r.id === resource);
        if (!resourceConfig) return;

        const hasAllActions = resourceConfig.acciones.every(action => hasPermission(resource, action));
        
        if (hasAllActions) {
            // Remover todas las acciones
            const updatedPermissions = user.permissions.filter(p => p.resource !== resource);
            
            try {
                const response = await axios.put(
                    `${API}/admin/usuarios/${user._id}/permissions`,
                    { permissions: updatedPermissions },
                    { withCredentials: true }
                );
                onUpdate(response.data.user);
            } catch (error) {
                console.error('Error al actualizar permisos:', error);
                setError('Error al actualizar permisos');
            }
        } else {
            // Agregar todas las acciones
            const existingPermission = user.permissions.find(p => p.resource === resource);
            const updatedPermissions = [...user.permissions];
            
            if (existingPermission) {
                existingPermission.actions = [...resourceConfig.acciones];
            } else {
                updatedPermissions.push({
                    resource,
                    actions: [...resourceConfig.acciones],
                    conditions: {}
                });
            }

            try {
                const response = await axios.put(
                    `${API}/admin/usuarios/${user._id}/permissions`,
                    { permissions: updatedPermissions },
                    { withCredentials: true }
                );
                onUpdate(response.data.user);
            } catch (error) {
                console.error('Error al actualizar permisos:', error);
                setError('Error al actualizar permisos');
            }
        }
    };

    return (
        <div className="permission-manager">
            <h3>Permisos de {user.username}</h3>
            {error && <div className="error-message">{error}</div>}
            
            <div className="permissions-grid">
                {recursos.map(recurso => (
                    <div key={recurso.id} className="permission-resource">
                        <div className="resource-header">
                            <h4>{recurso.nombre}</h4>
                            <button
                                className="btn-toggle-all"
                                onClick={() => toggleAllActions(recurso.id)}
                                disabled={loading}
                            >
                                {recurso.acciones.every(action => hasPermission(recurso.id, action)) ? 'Quitar Todo' : 'Seleccionar Todo'}
                            </button>
                        </div>
                        
                        <div className="actions-list">
                            {recurso.acciones.map(action => (
                                <label key={action} className="permission-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={hasPermission(recurso.id, action)}
                                        onChange={() => togglePermission(recurso.id, action)}
                                        disabled={loading}
                                    />
                                    <span>{action}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PermissionManager;