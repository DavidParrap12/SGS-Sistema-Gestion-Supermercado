import backupService from '../services/backup.service.js';
import AuditService from '../services/audit.service.js';

/**
 * Crear respaldo manual
 */
export const createBackup = async (req, res) => {
  try {
    const { type = 'manual' } = req.body;
    
    const result = await backupService.createBackup(
      type,
      req.user.id,
      req.user.username
    );

    res.json({
      success: true,
      message: 'Respaldo creado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error al crear respaldo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear respaldo',
      error: error.message
    });
  }
};

/**
 * Obtener lista de respaldos
 */
export const getBackups = async (req, res) => {
  try {
    const backups = await backupService.getBackupList();

    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Error al obtener respaldos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener respaldos',
      error: error.message
    });
  }
};

/**
 * Restaurar respaldo
 */
export const restoreBackup = async (req, res) => {
  try {
    const { backupName } = req.params;
    
    if (!backupName) {
      return res.status(400).json({
        success: false,
        message: 'Nombre del respaldo requerido'
      });
    }

    const result = await backupService.restoreBackup(
      backupName,
      req.user.id,
      req.user.username
    );

    res.json({
      success: true,
      message: 'Respaldo restaurado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error al restaurar respaldo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restaurar respaldo',
      error: error.message
    });
  }
};

/**
 * Eliminar respaldo
 */
export const deleteBackup = async (req, res) => {
  try {
    const { backupName } = req.params;
    
    if (!backupName) {
      return res.status(400).json({
        success: false,
        message: 'Nombre del respaldo requerido'
      });
    }

    await backupService.deleteBackup(
      backupName,
      req.user.id,
      req.user.username
    );

    res.json({
      success: true,
      message: 'Respaldo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar respaldo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar respaldo',
      error: error.message
    });
  }
};

/**
 * Limpiar respaldos antiguos
 */
export const cleanupBackups = async (req, res) => {
  try {
    const { retentionDays = 7 } = req.body;
    
    const deletedBackups = await backupService.cleanupOldBackups(retentionDays);

    // Registrar en auditoría
    await AuditService.logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'DELETE',
      resource: 'BACKUP',
      description: `Limpieza de respaldos antiguos (${retentionDays} días). Respaldos eliminados: ${deletedBackups.length}`,
      details: { deletedBackups, retentionDays },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      message: `Se eliminaron ${deletedBackups.length} respaldos antiguos`,
      data: { deletedBackups }
    });
  } catch (error) {
    console.error('Error al limpiar respaldos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar respaldos',
      error: error.message
    });
  }
};

/**
 * Descargar respaldo (archivo ZIP)
 */
export const downloadBackup = async (req, res) => {
  try {
    const { backupName } = req.params;
    
    if (!backupName) {
      return res.status(400).json({
        success: false,
        message: 'Nombre del respaldo requerido'
      });
    }

    const backupPath = path.join('./backups', backupName);
    
    // Verificar que existe
    try {
      await fs.access(backupPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Respaldo no encontrado'
      });
    }

    // Crear archivo ZIP
    const zip = new AdmZip();
    zip.addLocalFolder(backupPath);
    
    const zipBuffer = zip.toBuffer();
    
    // Registrar descarga en auditoría
    await AuditService.logAction({
      userId: req.user.id,
      username: req.user.username,
      action: 'EXPORT',
      resource: 'BACKUP',
      description: `Respaldo ${backupName} descargado`,
      details: { backupName },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backupName}.zip"`);
    res.send(zipBuffer);

  } catch (error) {
    console.error('Error al descargar respaldo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar respaldo',
      error: error.message
    });
  }
};