import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import cron from 'node-cron';
import AuditService from './audit.service.js';

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.mongoUri = process.env.MONGODB_URI;
    this.isScheduled = false;
  }

  /**
   * Inicializar el servicio de respaldo
   */
  async initialize() {
    try {
      // Crear directorio de respaldos si no existe
      await fs.mkdir(this.backupDir, { recursive: true });
      
      // Programar respaldos automáticos (diario a las 2 AM)
      this.scheduleAutomaticBackups();
      
      console.log('Servicio de respaldo inicializado');
    } catch (error) {
      console.error('Error al inicializar servicio de respaldo:', error);
      throw error;
    }
  }

  /**
   * Programar respaldos automáticos
   */
  scheduleAutomaticBackups() {
    if (this.isScheduled) return;

    // Respaldos diarios a las 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Iniciando respaldo automático...');
      try {
        await this.createBackup('automatic');
        
        // Limpiar respaldos antiguos (mantener últimos 7 días)
        await this.cleanupOldBackups(7);
        
        console.log('Respaldo automático completado');
      } catch (error) {
        console.error('Error en respaldo automático:', error);
        
        // Registrar el error en auditoría
        await AuditService.logAction({
          userId: null,
          username: 'SYSTEM',
          action: 'BACKUP',
          resource: 'BACKUP',
          description: 'Error en respaldo automático',
          details: { error: error.message },
          ipAddress: 'localhost',
          status: 'FAILED',
          errorMessage: error.message
        });
      }
    });

    this.isScheduled = true;
    console.log('Respaldo automático programado para las 2:00 AM diariamente');
  }

  /**
   * Crear respaldo de la base de datos
   */
  async createBackup(type = 'manual', userId = null, username = 'SYSTEM') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${type}_${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      console.log(`Iniciando respaldo ${type}: ${backupName}`);

      // Crear directorio para este respaldo
      await fs.mkdir(backupPath, { recursive: true });

      // Respaldar cada colección
      const collections = await this.getCollections();
      const backupResults = [];

      for (const collection of collections) {
        try {
          const collectionBackupPath = path.join(backupPath, `${collection}.json`);
          await this.backupCollection(collection, collectionBackupPath);
          
          backupResults.push({
            collection,
            status: 'SUCCESS',
            path: collectionBackupPath
          });
        } catch (error) {
          backupResults.push({
            collection,
            status: 'FAILED',
            error: error.message
          });
          
          console.error(`Error al respaldar colección ${collection}:`, error);
        }
      }

      // Crear metadata del respaldo
      const metadata = {
        backupName,
        type,
        timestamp: new Date(),
        collections: backupResults,
        totalCollections: collections.length,
        successfulBackups: backupResults.filter(r => r.status === 'SUCCESS').length,
        failedBackups: backupResults.filter(r => r.status === 'FAILED').length
      };

      await fs.writeFile(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Registrar en auditoría
      await AuditService.logAction({
        userId,
        username,
        action: 'BACKUP',
        resource: 'BACKUP',
        description: `Respaldo ${type} creado exitosamente`,
        details: metadata,
        ipAddress: 'localhost',
        status: 'SUCCESS'
      });

      console.log(`Respaldo ${backupName} completado exitosamente`);
      return {
        success: true,
        backupName,
        backupPath,
        metadata
      };

    } catch (error) {
      console.error(`Error al crear respaldo ${backupName}:`, error);
      
      // Registrar error en auditoría
      await AuditService.logAction({
        userId,
        username,
        action: 'BACKUP',
        resource: 'BACKUP',
        description: `Error al crear respaldo ${type}`,
        details: { error: error.message },
        ipAddress: 'localhost',
        status: 'FAILED',
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Obtener lista de colecciones de la base de datos
   */
  async getCollections() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      return collections.map(col => col.name);
    } catch (error) {
      console.error('Error al obtener colecciones:', error);
      throw error;
    }
  }

  /**
   * Respaldar una colección específica
   */
  async backupCollection(collectionName, outputPath) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      
      await fs.writeFile(outputPath, JSON.stringify(documents, null, 2));
      
      console.log(`Colección ${collectionName} respaldada: ${documents.length} documentos`);
      return documents.length;
    } catch (error) {
      console.error(`Error al respaldar colección ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Restaurar respaldo
   */
  async restoreBackup(backupName, userId = null, username = 'SYSTEM') {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      // Verificar que el respaldo existe
      try {
        await fs.access(backupPath);
      } catch (error) {
        throw new Error(`Respaldo ${backupName} no encontrado`);
      }

      // Leer metadata
      const metadataPath = path.join(backupPath, 'metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      console.log(`Iniciando restauración: ${backupName}`);

      const restoreResults = [];

      // Restaurar cada colección
      for (const collectionInfo of metadata.collections) {
        if (collectionInfo.status !== 'SUCCESS') continue;

        try {
          const collectionPath = collectionInfo.path;
          const collectionName = collectionInfo.collection;
          
          await this.restoreCollection(collectionName, collectionPath);
          
          restoreResults.push({
            collection: collectionName,
            status: 'SUCCESS'
          });
          
          console.log(`Colección ${collectionName} restaurada exitosamente`);
        } catch (error) {
          restoreResults.push({
            collection: collectionName,
            status: 'FAILED',
            error: error.message
          });
          
          console.error(`Error al restaurar colección ${collectionName}:`, error);
        }
      }

      // Registrar en auditoría
      await AuditService.logAction({
        userId,
        username,
        action: 'RESTORE',
        resource: 'BACKUP',
        description: `Respaldo ${backupName} restaurado`,
        details: {
          backupName,
          restoreResults,
          metadata
        },
        ipAddress: 'localhost',
        status: 'SUCCESS'
      });

      return {
        success: true,
        backupName,
        restoreResults
      };

    } catch (error) {
      console.error(`Error al restaurar respaldo ${backupName}:`, error);
      
      await AuditService.logAction({
        userId,
        username,
        action: 'RESTORE',
        resource: 'BACKUP',
        description: `Error al restaurar respaldo ${backupName}`,
        details: { error: error.message },
        ipAddress: 'localhost',
        status: 'FAILED',
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Restaurar una colección
   */
  async restoreCollection(collectionName, inputPath) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      
      // Leer documentos del respaldo
      const documentsContent = await fs.readFile(inputPath, 'utf8');
      const documents = JSON.parse(documentsContent);
      
      // Limpiar colección actual
      await collection.deleteMany({});
      
      // Insertar documentos del respaldo
      if (documents.length > 0) {
        await collection.insertMany(documents);
      }
      
      console.log(`Colección ${collectionName} restaurada: ${documents.length} documentos`);
      return documents.length;
    } catch (error) {
      console.error(`Error al restaurar colección ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Obtener lista de respaldos disponibles
   */
  async getBackupList() {
    try {
      const items = await fs.readdir(this.backupDir, { withFileTypes: true });
      const backups = [];

      for (const item of items) {
        if (item.isDirectory()) {
          const backupPath = path.join(this.backupDir, item.name);
          const metadataPath = path.join(backupPath, 'metadata.json');
          
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            
            // Obtener tamaño del respaldo
            const stats = await fs.stat(backupPath);
            
            backups.push({
              name: item.name,
              type: metadata.type,
              timestamp: metadata.timestamp,
              size: stats.size,
              totalCollections: metadata.totalCollections,
              successfulBackups: metadata.successfulBackups,
              failedBackups: metadata.failedBackups
            });
          } catch (error) {
            console.error(`Error al leer metadata de ${item.name}:`, error);
          }
        }
      }

      // Ordenar por fecha (más reciente primero)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return backups;
    } catch (error) {
      console.error('Error al obtener lista de respaldos:', error);
      throw error;
    }
  }

  /**
   * Eliminar respaldo antiguo
   */
  async deleteBackup(backupName, userId = null, username = 'SYSTEM') {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      // Verificar que existe
      await fs.access(backupPath);
      
      // Eliminar directorio y contenido
      await fs.rm(backupPath, { recursive: true, force: true });
      
      console.log(`Respaldo ${backupName} eliminado`);
      
      // Registrar en auditoría
      await AuditService.logAction({
        userId,
        username,
        action: 'DELETE',
        resource: 'BACKUP',
        description: `Respaldo ${backupName} eliminado`,
        ipAddress: 'localhost',
        status: 'SUCCESS'
      });
      
      return { success: true, backupName };
    } catch (error) {
      console.error(`Error al eliminar respaldo ${backupName}:`, error);
      throw error;
    }
  }

  /**
   * Limpiar respaldos antiguos
   */
  async cleanupOldBackups(retentionDays = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const backups = await this.getBackupList();
      const deletedBackups = [];
      
      for (const backup of backups) {
        const backupDate = new Date(backup.timestamp);
        
        if (backupDate < cutoffDate) {
          try {
            await this.deleteBackup(backup.name);
            deletedBackups.push(backup.name);
          } catch (error) {
            console.error(`Error al eliminar respaldo antiguo ${backup.name}:`, error);
          }
        }
      }
      
      console.log(`Respaldo antiguos eliminados: ${deletedBackups.length}`);
      return deletedBackups;
    } catch (error) {
      console.error('Error al limpiar respaldos antiguos:', error);
      throw error;
    }
  }
}

export default new BackupService();