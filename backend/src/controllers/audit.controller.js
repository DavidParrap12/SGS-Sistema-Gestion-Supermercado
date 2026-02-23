import AuditService from '../services/audit.service.js';

export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      resource,
      status,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      userId,
      action,
      resource,
      status,
      startDate,
      endDate,
      search
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    const result = await AuditService.getAuditLogs(filters, options);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error al obtener logs de auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs de auditoría',
      error: error.message
    });
  }
};

export const getAuditStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await AuditService.getAuditStats(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de auditoría',
      error: error.message
    });
  }
};

export const exportAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      action,
      resource,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    const filters = {
      userId,
      action,
      resource,
      status,
      startDate,
      endDate,
      search
    };

    const csvData = await AuditService.exportToCSV(filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvData);
  } catch (error) {
    console.error('Error al exportar logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar logs',
      error: error.message
    });
  }
};

export const cleanupOldLogs = async (req, res) => {
  try {
    const { retentionDays = 90 } = req.body;
    
    // Solo administradores pueden limpiar logs
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para limpiar logs'
      });
    }

    const deletedCount = await AuditService.cleanupOldLogs(parseInt(retentionDays));

    // Registrar la acción
    await AuditService.logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'DELETE',
      resource: 'AUDIT',
      description: `Limpieza de logs antiguos (${retentionDays} días). Registros eliminados: ${deletedCount}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `Se eliminaron ${deletedCount} registros antiguos`,
      deletedCount
    });
  } catch (error) {
    console.error('Error al limpiar logs antiguos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar logs antiguos',
      error: error.message
    });
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await AuditService.getAuditLogs(
      {}, 
      { limit: parseInt(limit), sortBy: 'createdAt', sortOrder: 'desc' }
    );

    res.json({
      success: true,
      data: result.logs
    });
  } catch (error) {
    console.error('Error al obtener actividad reciente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener actividad reciente',
      error: error.message
    });
  }
};