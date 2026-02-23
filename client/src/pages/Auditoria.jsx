import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import '../styles/styleAuditoria.css';

const Auditoria = () => {
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        action: '',
        resource: '',
        user: '',
        status: '',
        dateFrom: '',
        dateTo: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1
    });
    const [stats, setStats] = useState({
        totalActions: 0,
        successRate: 0,
        topUsers: [],
        topActions: []
    });

    useEffect(() => {
        const puedeVerAuditoria = hasPermission('AUDIT', 'READ');
        if (!puedeVerAuditoria) {
            navigate('/principal');
            return;
        }
        fetchAuditLogs();
        fetchStats();
    }, [user, pagination.page, filters]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            setError('');

            const queryParams = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            });

            const response = await axios.get(`http://localhost:3005/api/audit/logs?${queryParams}`, {
                withCredentials: true
            });
            setAuditLogs(response.data.data || []);
            const pg = response.data.pagination || {};
            setPagination(prev => ({
                ...prev,
                total: pg.total || 0,
                totalPages: pg.pages || 1
            }));
        } catch (error) {
            console.error('Error al obtener logs de auditoría:', error);
            setError('Error al cargar los logs de auditoría');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get('http://localhost:3005/api/audit/stats', {
                withCredentials: true
            });
            const data = response?.data?.data || {};
            const general = data.general || {};
            const actions = Array.isArray(data.actions) ? data.actions : [];
            setStats({
                totalActions: general.totalActions || 0,
                successRate: Math.round(general.successRate || 0),
                topUsers: [],
                topActions: actions
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            action: '',
            resource: '',
            user: '',
            status: '',
            dateFrom: '',
            dateTo: ''
        });
    };

    const exportLogs = async () => {
        try {
            const response = await axios.get('http://localhost:3005/api/audit/export', {
                responseType: 'blob',
                withCredentials: true
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error al exportar logs:', error);
            setError('Error al exportar los logs');
        }
    };

    const cleanupOldLogs = async () => {
        if (!window.confirm('¿Estás seguro de que deseas limpiar los logs antiguos? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await axios.delete('http://localhost:3005/api/audit/cleanup', {
                withCredentials: true
            });
            fetchAuditLogs();
            fetchStats();
            alert('Logs antiguos limpiados exitosamente');
        } catch (error) {
            console.error('Error al limpiar logs:', error);
            setError('Error al limpiar los logs antiguos');
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'SUCCESS': return 'status-badge status-success';
            case 'DENIED': return 'status-badge status-denied';
            case 'FAILED': return 'status-badge status-failed';
            default: return 'status-badge status-success';
        }
    };

    const getRoleClass = (role) => {
        switch (role) {
            case 'admin': return 'role-badge role-admin';
            case 'manager': return 'role-badge role-manager';
            case 'cashier': return 'role-badge role-cashier';
            default: return 'role-badge';
        }
    };

    if (!hasPermission('AUDIT', 'READ')) {
        return null;
    }

    return (
        <div className="auditoria-container">
            <Navbar />

            <div className="auditoria-content">
                <div className="auditoria-header">
                    <h2>Panel de Auditoría de Seguridad</h2>
                    <p className="auditoria-subtitle">Monitorea las acciones, ingresos y operaciones de los usuarios en tiempo real</p>
                </div>

                {/* Estadísticas */}
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-history"></i>
                        </div>
                        <div className="metric-content">
                            <h3>Total de Acciones</h3>
                            <p className="metric-value">{Number(stats?.totalActions || 0).toLocaleString('es-ES')}</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-check-circle" style={{ color: '#28a745' }}></i>
                        </div>
                        <div className="metric-content">
                            <h3>Tasa de Éxito</h3>
                            <p className="metric-value" style={{ color: '#28a745' }}>{stats.successRate}%</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-users" style={{ color: '#6f42c1' }}></i>
                        </div>
                        <div className="metric-content">
                            <h3>Usuarios Activos</h3>
                            <p className="metric-value" style={{ color: '#6f42c1' }}>{stats.topUsers.length}</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon">
                            <i className="fas fa-fingerprint" style={{ color: '#fd7e14' }}></i>
                        </div>
                        <div className="metric-content">
                            <h3>Acciones Únicas</h3>
                            <p className="metric-value" style={{ color: '#fd7e14' }}>{stats.topActions.length}</p>
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="filters-section">
                    <div className="filters-header">
                        <h2>Explorador de Registros</h2>
                        <div className="filters-actions">
                            <button onClick={clearFilters} className="btn-action btn-secondary">
                                <i className="fas fa-broom"></i> Limpiar Filtros
                            </button>
                            <button onClick={exportLogs} className="btn-action btn-primary">
                                <i className="fas fa-download"></i> Exportar CSV
                            </button>
                            {hasPermission('AUDIT', 'CLEAN') && (
                                <button onClick={cleanupOldLogs} className="btn-action btn-danger">
                                    <i className="fas fa-trash-alt"></i> Limpiar Antiguos
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="filters-grid">
                        <div className="filter-group">
                            <label>Acción</label>
                            <select value={filters.action} onChange={(e) => handleFilterChange('action', e.target.value)}>
                                <option value="">Todas</option>
                                <option value="CREATE">Crear</option>
                                <option value="READ">Leer</option>
                                <option value="UPDATE">Actualizar</option>
                                <option value="DELETE">Eliminar</option>
                                <option value="LOGIN">Iniciar Sesión</option>
                                <option value="LOGOUT">Cerrar Sesión</option>
                                <option value="BACKUP">Respaldo</option>
                                <option value="RESTORE">Restaurar</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Recurso</label>
                            <select value={filters.resource} onChange={(e) => handleFilterChange('resource', e.target.value)}>
                                <option value="">Todos</option>
                                <option value="USER">Usuario</option>
                                <option value="PRODUCT">Producto</option>
                                <option value="SALE">Venta</option>
                                <option value="INVENTORY">Inventario</option>
                                <option value="BACKUP">Respaldo</option>
                                <option value="AUDIT">Auditoría</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Usuario</label>
                            <input
                                type="text"
                                value={filters.user}
                                onChange={(e) => handleFilterChange('user', e.target.value)}
                                placeholder="Nombre de usuario"
                            />
                        </div>

                        <div className="filter-group">
                            <label>Estado</label>
                            <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                                <option value="">Todos</option>
                                <option value="SUCCESS">Éxito</option>
                                <option value="DENIED">Denegado</option>
                                <option value="FAILED">Fallido</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Desde</label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                            />
                        </div>

                        <div className="filter-group">
                            <label>Hasta</label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabla de Logs */}
                <div className="table-container">
                    <div className="table-responsive">
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th>Usuario</th>
                                    <th>Acción</th>
                                    <th>Recurso</th>
                                    <th>Descripción</th>
                                    <th>Estado</th>
                                    <th>IP</th>
                                    <th>Duración</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                            Cargando registros...
                                        </td>
                                    </tr>
                                ) : auditLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                            No se encontraron registros que coincidan con los filtros.
                                        </td>
                                    </tr>
                                ) : (
                                    auditLogs.map((log) => (
                                        <tr key={log._id}>
                                            <td>{new Date(log.createdAt || log.timestamp).toLocaleString('es-ES')}</td>
                                            <td>
                                                <div>
                                                    <strong>{log.username}</strong>
                                                    {log.role && (
                                                        <div className={getRoleClass(log.role)}>{log.role}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td><strong>{log.action}</strong></td>
                                            <td>{log.resource}</td>
                                            <td>
                                                <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.description}>
                                                    {log.description}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={getStatusClass(log.status)}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td>{log.ipAddress}</td>
                                            <td>{log.duration ? `${log.duration}ms` : '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Paginación */}
                <div className="pagination-controls">
                    <div>
                        Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de <b>{pagination.total}</b> resultados
                    </div>
                    <div className="pagination-buttons">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page <= 1}
                            className="btn-page"
                        >
                            Anterior
                        </button>
                        <span className="page-info">
                            Página {pagination.page} de {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                            disabled={pagination.page >= pagination.totalPages}
                            className="btn-page"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="alert-error">
                        <i className="fas fa-exclamation-triangle"></i> {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Auditoria;
