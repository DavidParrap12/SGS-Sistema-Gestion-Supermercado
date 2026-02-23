import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PermissionManager from '../components/PermissionManager';
import axios from 'axios';
import '../styles/styleAdministracion.css';

const Administracion = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usuarioEditando, setUsuarioEditando] = useState(null); // Para gestionar permisos
    const [stats, setStats] = useState({
        totalUsuarios: 0,
        totalProductos: 0,
        totalVentas: 0,
        totalIngresos: 0,
        auditStats: {
            totalActions: 0,
            successRate: 0,
            recentActions: 0
        }
    });

    // Verificar si es admin
    const esAdmin = user?.role === 'admin';

    useEffect(() => {
        if (!esAdmin) {
            navigate('/principal');
            return;
        }
        fetchStats();
        fetchUsuarios();
        fetchAuditStats();
    }, [esAdmin, navigate]);

    const fetchStats = async () => {
        try {
            const response = await axios.get('http://localhost:3005/api/admin/stats', {
                withCredentials: true
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
        }
    };

    const fetchAuditStats = async () => {
        try {
            const response = await axios.get('http://localhost:3005/api/audit/stats', {
                withCredentials: true
            });
            setStats(prev => ({
                ...prev,
                auditStats: response.data
            }));
        } catch (error) {
            console.error('Error al obtener estadísticas de auditoría:', error);
        }
    };

    const fetchUsuarios = async () => {
        try {
            const response = await axios.get('http://localhost:3005/api/admin/usuarios', {
                withCredentials: true
            });
            setUsuarios(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            setLoading(false);
        }
    };

    const handleEliminarUsuario = async (userId) => {
        if (window.confirm('¿Está seguro de eliminar este usuario?')) {
            try {
                await axios.delete(`http://localhost:3005/api/admin/usuarios/${userId}`, {
                    withCredentials: true
                });
                fetchUsuarios();
                fetchStats();
            } catch (error) {
                console.error('Error al eliminar usuario:', error);
                alert('Error al eliminar usuario');
            }
        }
    };

    const handleCambiarRol = async (userId, nuevoRol) => {
        try {
            await axios.put(`http://localhost:3005/api/admin/usuarios/${userId}/rol`, 
                { role: nuevoRol },
                { withCredentials: true }
            );
            fetchUsuarios();
        } catch (error) {
            console.error('Error al cambiar rol:', error);
            alert('Error al cambiar rol del usuario');
        }
    };

    const handleActualizarPermisos = (usuarioActualizado) => {
        // Actualizar la lista de usuarios con el usuario que tiene permisos actualizados
        setUsuarios(usuarios.map(u => 
            u._id === usuarioActualizado._id ? usuarioActualizado : u
        ));
        setUsuarioEditando(null);
    };

    const crearRespaldo = async () => {
        try {
            const response = await axios.post('http://localhost:3005/api/backup/create', {}, {
                withCredentials: true
            });
            alert(`Respaldo creado exitosamente: ${response.data.backupName}`);
        } catch (error) {
            console.error('Error al crear respaldo:', error);
            alert('Error al crear respaldo del sistema');
        }
    };

    if (!esAdmin) {
        return null;
    }

    if (loading) {
        return (
            <div className="admin-container">
                <Navbar />
                <div className="loading">Cargando panel de administración...</div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <Navbar />
            <div className="admin-content">
                <h1>Panel de Administración</h1>
                
                {/* Tarjetas de estadísticas */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                            <h3>{stats.totalUsuarios}</h3>
                            <p>Usuarios</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📦</div>
                        <div className="stat-info">
                            <h3>{stats.totalProductos}</h3>
                            <p>Productos</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div className="stat-info">
                            <h3>${stats.totalVentas}</h3>
                            <p>Ventas Totales</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📈</div>
                        <div className="stat-info">
                            <h3>${stats.totalIngresos}</h3>
                            <p>Ingresos</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🔍</div>
                        <div className="stat-info">
                            <h3>{stats.auditStats.totalActions}</h3>
                            <p>Acciones Auditadas</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <h3>{stats.auditStats.successRate}%</h3>
                            <p>Tasa de Éxito</p>
                        </div>
                    </div>
                </div>

                {/* Gestión de usuarios */}
                <div className="users-section">
                    <h2>Gestión de Usuarios</h2>
                    <div className="users-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map(usuario => (
                                    <tr key={usuario._id}>
                                        <td>{usuario.username}</td>
                                        <td>{usuario.email}</td>
                                        <td>
                                            <select 
                                                value={usuario.role}
                                                onChange={(e) => handleCambiarRol(usuario._id, e.target.value)}
                                                className="role-select"
                                            >
                                                <option value="cashier">Cajero</option>
                                                <option value="manager">Gerente</option>
                                                <option value="admin">Administrador</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div className="user-actions">
                                                <button 
                                                    onClick={() => setUsuarioEditando(usuario)}
                                                    className="btn-permisos"
                                                    title="Gestionar Permisos"
                                                >
                                                    🔐 Permisos
                                                </button>
                                                <button 
                                                    onClick={() => handleEliminarUsuario(usuario._id)}
                                                    className="btn-eliminar"
                                                    disabled={usuario._id === user._id}
                                                >
                                                    🗑️ Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Acciones rápidas */}
                <div className="quick-actions">
                    <h2>Acciones Rápidas</h2>
                    <div className="action-buttons">
                        <button onClick={() => navigate('/registro')} className="btn-action">
                            ➕ Nuevo Usuario
                        </button>
                        <button onClick={() => navigate('/inventario')} className="btn-action">
                            📦 Gestionar Inventario
                        </button>
                        <button onClick={() => navigate('/reportes')} className="btn-action">
                            📊 Ver Reportes
                        </button>
                        <button onClick={() => navigate('/auditoria')} className="btn-action">
                            🔍 Ver Auditoría
                        </button>
                        <button onClick={() => {
                            if (window.confirm('¿Deseas crear un respaldo manual del sistema?')) {
                                crearRespaldo();
                            }
                        }} className="btn-action">
                            💾 Crear Respaldo
                        </button>
                        <button onClick={() => {
                            if (window.confirm('¿Está seguro de que desea cerrar sesión?')) {
                                logout();
                            }
                        }} className="btn-action btn-logout">
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </div>

                {/* Gestor de permisos modal */}
                {usuarioEditando && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <button 
                                className="modal-close"
                                onClick={() => setUsuarioEditando(null)}
                            >
                                ×
                            </button>
                            <PermissionManager 
                                user={usuarioEditando}
                                onUpdate={handleActualizarPermisos}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Administracion;