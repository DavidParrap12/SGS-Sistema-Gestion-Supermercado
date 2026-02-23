import Audit from '../models/audit.model.js';

class AuditService {
  /**
   * Registrar una acción de auditoría
   */
  static async logAction({
    userId,
    username,
    action,
    resource,
    resourceId,
    description,
    details = {},
    ipAddress,
    userAgent,
    status = 'SUCCESS',
    errorMessage,
    duration,
    metadata = {}
  }) {
    try {
      const auditEntry = new Audit({
        userId,
        username,
        action,
        resource,
        resourceId,
        description,
        details,
        ipAddress,
        userAgent,
        status,
        errorMessage,
        duration,
        metadata
      });

      await auditEntry.save();
      return auditEntry;
    } catch (error) {
      console.error('Error al registrar auditoría:', error);
      // No lanzamos el error para no interrumpir el flujo principal
      return null;
    }
  }

  /**
   * Obtener logs con filtros
   */
  static async getAuditLogs(filters = {}, options = {}) {
    const {
      userId,
      action,
      resource,
      resourceId,
      status,
      startDate,
      endDate,
      search
    } = filters;

    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const query = {};

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (resourceId) query.resourceId = resourceId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [logs, total] = await Promise.all([
      Audit.find(query)
        .populate('userId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Audit.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtener estadísticas de auditoría
   */
  static async getAuditStats(startDate, endDate) {
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await Audit.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalActions: { $sum: 1 },
          successfulActions: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
          },
          failedActions: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
          },
          deniedActions: {
            $sum: { $cond: [{ $eq: ['$status', 'DENIED'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalActions: 1,
          successfulActions: 1,
          failedActions: 1,
          deniedActions: 1,
          successRate: {
            $multiply: [
              { $divide: ['$successfulActions', '$totalActions'] },
              100
            ]
          }
        }
      }
    ]);

    const actionStats = await Audit.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const resourceStats = await Audit.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$resource',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return {
      general: stats[0] || {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        deniedActions: 0,
        successRate: 0
      },
      actions: actionStats,
      resources: resourceStats
    };
  }

  /**
   * Limpiar logs antiguos (retención configurable)
   */
  static async cleanupOldLogs(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await Audit.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      return result.deletedCount;
    } catch (error) {
      console.error('Error al limpiar logs antiguos:', error);
      throw error;
    }
  }

  /**
   * Exportar logs a CSV
   */
  static async exportToCSV(filters = {}) {
    const { logs } = await this.getAuditLogs(filters, { limit: 10000 });

    const headers = [
      'Fecha', 'Usuario', 'Acción', 'Recurso', 'ID Recurso',
      'Descripción', 'Estado', 'IP', 'Duración (ms)'
    ].join(',');

    const rows = logs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.username,
      log.action,
      log.resource,
      log.resourceId || '',
      `"${log.description.replace(/"/g, '""')}"`,
      log.status,
      log.ipAddress,
      log.duration || ''
    ].join(','));

    return [headers, ...rows].join('\n');
  }
}

export default AuditService;